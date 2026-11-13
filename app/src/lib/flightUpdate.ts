/**
 * CU-07 — Actualizar información de vuelo.
 *
 * Pure logic for the agent flight-update use case. A recurring scheduled
 * service (identified by flightNumber) keeps an ordered list of update
 * versions; each version snapshots the two editable fields
 * (departureLocal, durationMinutes) plus the instant it was recorded.
 *
 * Temporal rule (approved plan): an update applies to an occurrence
 * (flightNumber + date) only while the departure instant — computed with
 * the schedule in effect just before that version, in the origin
 * airport's IANA zone — is strictly after the version's effectiveAtMs.
 * Occurrences that already departed keep their historical schedule.
 *
 * effectiveAtMs is non-decreasing per service: each version clamps to
 * max(nowMs, previous.effectiveAtMs) and is appended, so array order is
 * the stable causal order even for equal or regressing clocks.
 *
 * Frontend-only: no persistence, no backend. The simulated failure
 * flag exists for tests and is never exposed in the UI.
 */

import {
  SCHEDULED_SERVICES,
  type ScheduledService,
} from '@/data/scheduledServices';
import {
  addDaysISO,
  localDateTimeToUtc,
  nextOperatingDateOnOrAfter,
  todayISO,
} from '@/lib/dates';

/** Editable snapshot recorded at each accepted update. */
export interface FlightServiceUpdate {
  departureLocal: string;
  durationMinutes: number;
  effectiveAtMs: number;
}

/** Update history keyed by flightNumber; array order = insertion order. */
export type FlightUpdates = Partial<
  Record<string, FlightServiceUpdate[]>
>;

/** Fields an agent may change; everything else is protected. */
export interface FlightUpdateChanges {
  departureLocal?: string;
  durationMinutes?: number;
}

export type ApplyFlightUpdateResult =
  | {
      ok: true;
      flightUpdates: FlightUpdates;
      update: FlightServiceUpdate;
    }
  | { ok: false; error: string };

export interface FlightUpdateOptions {
  /** Deterministic internal failure for tests; never shown in the UI. */
  simulateFailure?: boolean;
}

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const FLIGHT_NOT_FOUND = 'No encontramos ese vuelo.';
const UPDATE_FAILED = 'No se pudo completar la actualización.';
const NO_CHANGES = 'No hay cambios que guardar.';

function currentScheduleFields(
  service: ScheduledService,
  updates: readonly FlightServiceUpdate[] | undefined,
): { departureLocal: string; durationMinutes: number } {
  const latest = updates && updates.length > 0 ? updates[updates.length - 1] : undefined;
  return latest
    ? {
        departureLocal: latest.departureLocal,
        durationMinutes: latest.durationMinutes,
      }
    : { departureLocal: service.departureLocal, durationMinutes: service.durationMinutes };
}

/**
 * Atomic transition: validates everything before producing the new
 * FlightUpdates map. On any failure the input map is returned untouched
 * conceptually (the error result carries no state); on success a new
 * map is returned — the input is never mutated.
 */
export function applyFlightUpdate(
  flightUpdates: FlightUpdates,
  flightNumber: string,
  changes: FlightUpdateChanges,
  nowMs: number,
  options?: FlightUpdateOptions,
): ApplyFlightUpdateResult {
  if (options?.simulateFailure) {
    return { ok: false, error: UPDATE_FAILED };
  }

  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === flightNumber,
  );
  if (!service) {
    return { ok: false, error: FLIGHT_NOT_FOUND };
  }

  const provided: FlightUpdateChanges = {};
  if (changes.departureLocal !== undefined) {
    if (
      typeof changes.departureLocal !== 'string' ||
      !LOCAL_TIME_PATTERN.test(changes.departureLocal)
    ) {
      return {
        ok: false,
        error: 'La hora de salida debe tener formato HH:mm entre 00:00 y 23:59.',
      };
    }
    provided.departureLocal = changes.departureLocal;
  }
  if (changes.durationMinutes !== undefined) {
    if (
      !Number.isInteger(changes.durationMinutes) ||
      changes.durationMinutes <= 0
    ) {
      return {
        ok: false,
        error: 'La duración debe ser un número entero de minutos mayor que cero.',
      };
    }
    provided.durationMinutes = changes.durationMinutes;
  }

  const history = flightUpdates[flightNumber];
  const current = currentScheduleFields(service, history);
  const merged = { ...current, ...provided };
  if (
    merged.departureLocal === current.departureLocal &&
    merged.durationMinutes === current.durationMinutes
  ) {
    return { ok: false, error: NO_CHANGES };
  }

  const previous = history && history.length > 0 ? history[history.length - 1] : undefined;
  const update: FlightServiceUpdate = {
    departureLocal: merged.departureLocal,
    durationMinutes: merged.durationMinutes,
    effectiveAtMs: previous
      ? Math.max(nowMs, previous.effectiveAtMs)
      : nowMs,
  };

  return {
    ok: true,
    flightUpdates: {
      ...flightUpdates,
      [flightNumber]: [...(history ?? []), update],
    },
    update,
  };
}

/** UTC ms of a wall-clock departure, or null when it cannot be resolved. */
function departureInstantMs(
  service: ScheduledService,
  date: string,
  departureLocal: string,
): number | null {
  try {
    const instant = localDateTimeToUtc(
      date,
      departureLocal,
      service.origin.timeZone,
    );
    const ms = instant.getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the schedule of a service for one occurrence date by walking
 * its update history in insertion order. A version applies only while
 * the departure instant under the currently effective schedule is
 * strictly after the version's effectiveAtMs; the first inapplicable
 * version ends the chain. Returns the base service untouched when no
 * version applies, preserving referential equality.
 */
export function serviceForDate(
  service: ScheduledService,
  updates: readonly FlightServiceUpdate[] | undefined,
  date: string,
): ScheduledService {
  if (!updates || updates.length === 0) return service;

  let departureLocal = service.departureLocal;
  let durationMinutes = service.durationMinutes;
  let changed = false;

  for (const update of updates) {
    const departureMs = departureInstantMs(service, date, departureLocal);
    if (departureMs === null || !(departureMs > update.effectiveAtMs)) {
      break;
    }
    departureLocal = update.departureLocal;
    durationMinutes = update.durationMinutes;
    changed = true;
  }

  return changed
    ? { ...service, departureLocal, durationMinutes }
    : service;
}

/** Convenience lookup: base service by flightNumber + updates + date. */
export function scheduledServiceForDate(
  flightNumber: string,
  flightUpdates: FlightUpdates | undefined,
  date: string,
): ScheduledService | undefined {
  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === flightNumber,
  );
  if (!service) return undefined;
  return serviceForDate(service, flightUpdates?.[flightNumber], date);
}

/**
 * Latest recorded schedule for a service regardless of occurrence date —
 * the "current information" an agent sees in the panel (last version or
 * base fields when never updated).
 */
export function currentScheduleFieldsForService(
  service: ScheduledService,
  updates: readonly FlightServiceUpdate[] | undefined,
): { departureLocal: string; durationMinutes: number } {
  return currentScheduleFields(service, updates);
}

/**
 * Resolves the schedule a service will show on its next upcoming
 * departure — the occurrence the public landing advertises (E1). The
 * date respects the Mon/Wed/Fri operating rule AND skips occurrences
 * whose departure instant (under the schedule in effect for that date,
 * in the origin IANA zone) is not strictly after `nowMs`: a same-day
 * flight that already departed keeps its historical schedule and is not
 * advertised as the next departure. `nowMs` is injectable for
 * deterministic tests.
 */
export function serviceForNextOperatingDate(
  service: ScheduledService,
  flightUpdates: FlightUpdates | undefined,
  fromDateISO: string = todayISO(),
  nowMs: number = Date.now(),
): { date: string; service: ScheduledService } {
  const updates = flightUpdates?.[service.flightNumber];
  const fallbackDate = nextOperatingDateOnOrAfter(fromDateISO);
  let date = fallbackDate;
  for (let i = 0; i < 60; i += 1) {
    const resolved = serviceForDate(service, updates, date);
    const departureMs = departureInstantMs(
      service,
      date,
      resolved.departureLocal,
    );
    if (departureMs !== null && departureMs > nowMs) {
      return { date, service: resolved };
    }
    date = nextOperatingDateOnOrAfter(addDaysISO(date, 1));
  }
  return {
    date: fallbackDate,
    service: serviceForDate(service, updates, fallbackDate),
  };
}

/**
 * Store-facing operations for CU-07, decoupled from React so the commit
 * contract is unit-testable. The provider wires `getFlightUpdates` to
 * storeRef.current and `commitFlightUpdates` to its atomic commit; the
 * ops guarantee commit happens only on an ok transition and that
 * resolveService never duplicates the temporal logic.
 */
export interface FlightUpdateOps {
  updateFlightService: (
    flightNumber: string,
    changes: FlightUpdateChanges,
    options?: FlightUpdateOptions,
  ) => ApplyFlightUpdateResult;
  resolveService: (
    flightNumber: string,
    date: string,
  ) => ScheduledService | undefined;
}

export function createFlightUpdateOps(
  getFlightUpdates: () => FlightUpdates,
  commitFlightUpdates: (next: FlightUpdates) => void,
  now: () => number = () => Date.now(),
): FlightUpdateOps {
  return {
    updateFlightService(flightNumber, changes, options) {
      const result = applyFlightUpdate(
        getFlightUpdates(),
        flightNumber,
        changes,
        now(),
        options,
      );
      if (!result.ok) return result;
      commitFlightUpdates(result.flightUpdates);
      return result;
    },
    resolveService(flightNumber, date) {
      return scheduledServiceForDate(
        flightNumber,
        getFlightUpdates(),
        date,
      );
    },
  };
}
