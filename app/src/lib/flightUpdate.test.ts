import { describe, expect, it } from 'vitest';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { localDateTimeToUtc } from '@/lib/dates';
import {
  applyFlightUpdate,
  currentScheduleFieldsForService,
  scheduledServiceForDate,
  serviceForDate,
  serviceForNextOperatingDate,
  type FlightServiceUpdate,
  type FlightUpdates,
} from '@/lib/flightUpdate';

const SDQ_TZ = 'America/Santo_Domingo';
// CN101: SDQ -> SJU, base departure 08:00 local, duration 75 min.
const CN101 = SCHEDULED_SERVICES.find((s) => s.flightNumber === 'CN101')!;

/** UTC ms of CN101's departure on a given date under `departureLocal`. */
function departureMs(date: string, departureLocal = '08:00'): number {
  return localDateTimeToUtc(date, departureLocal, SDQ_TZ).getTime();
}

function update(
  departureLocal: string,
  durationMinutes: number,
  effectiveAtMs: number,
): FlightServiceUpdate {
  return { departureLocal, durationMinutes, effectiveAtMs };
}

describe('applyFlightUpdate', () => {
  it('accepts a valid update of departure time and duration', () => {
    const result = applyFlightUpdate(
      {},
      'CN101',
      { departureLocal: '09:30', durationMinutes: 80 },
      1_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.update).toEqual({
      departureLocal: '09:30',
      durationMinutes: 80,
      effectiveAtMs: 1_000,
    });
    expect(result.flightUpdates.CN101).toHaveLength(1);
  });

  it('accepts a partial update keeping the other editable field', () => {
    const result = applyFlightUpdate(
      {},
      'CN101',
      { durationMinutes: 95 },
      1_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.update.departureLocal).toBe('08:00');
    expect(result.update.durationMinutes).toBe(95);
  });

  it.each(['24:00', '8:00', '25:61', 'ab:cd', '08:60', ''])(
    'rejects invalid departure time %s',
    (departureLocal) => {
      const result = applyFlightUpdate(
        {},
        'CN101',
        { departureLocal },
        1_000,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain('hora de salida');
    },
  );

  it.each([0, -10, 90.5, Number.NaN])(
    'rejects invalid duration %s',
    (durationMinutes) => {
      const result = applyFlightUpdate(
        {},
        'CN101',
        { durationMinutes },
        1_000,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain('duración');
    },
  );

  it('rejects an unknown flight number', () => {
    const result = applyFlightUpdate(
      {},
      'CN999',
      { departureLocal: '09:00' },
      1_000,
    );
    expect(result).toEqual({ ok: false, error: 'No encontramos ese vuelo.' });
  });

  it('rejects an update without changes', () => {
    expect(
      applyFlightUpdate({}, 'CN101', {}, 1_000).ok,
    ).toBe(false);
    expect(
      applyFlightUpdate(
        {},
        'CN101',
        { departureLocal: '08:00', durationMinutes: 75 },
        1_000,
      ).ok,
    ).toBe(false);
  });

  it('treats resubmitting the latest values as a no-op', () => {
    const first = applyFlightUpdate(
      {},
      'CN101',
      { departureLocal: '09:30', durationMinutes: 80 },
      1_000,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyFlightUpdate(
      first.flightUpdates,
      'CN101',
      { departureLocal: '09:30', durationMinutes: 80 },
      2_000,
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toContain('No hay cambios');
  });

  it('simulated failure leaves the state untouched', () => {
    const before: FlightUpdates = {
      CN101: [update('09:30', 80, 500)],
    };
    const result = applyFlightUpdate(
      before,
      'CN101',
      { departureLocal: '10:00' },
      1_000,
      { simulateFailure: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('No se pudo completar la actualización.');
    expect(before.CN101).toHaveLength(1);
  });

  it('does not mutate the input map or history arrays', () => {
    const before: FlightUpdates = {
      CN101: [update('09:30', 80, 500)],
      CN102: [update('11:00', 75, 400)],
    };
    const cn101Ref = before.CN101;
    const result = applyFlightUpdate(
      before,
      'CN101',
      { departureLocal: '10:00', durationMinutes: 90 },
      1_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(before.CN101).toBe(cn101Ref);
    expect(before.CN101).toHaveLength(1);
    expect(result.flightUpdates.CN101).toHaveLength(2);
    expect(result.flightUpdates.CN102).toBe(before.CN102);
  });

  it('keeps effectiveAtMs non-decreasing across successive updates', () => {
    let map: FlightUpdates = {};
    const r1 = applyFlightUpdate(map, 'CN101', { departureLocal: '09:00' }, 5_000);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    map = r1.flightUpdates;
    const r2 = applyFlightUpdate(map, 'CN101', { departureLocal: '10:00' }, 1_000);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.update.effectiveAtMs).toBe(5_000);
    const r3 = applyFlightUpdate(r2.flightUpdates, 'CN101', { durationMinutes: 90 }, 9_000);
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.update.effectiveAtMs).toBe(9_000);
    expect(r3.flightUpdates.CN101!.map((u) => u.effectiveAtMs)).toEqual([
      5_000, 5_000, 9_000,
    ]);
  });

  it('preserves insertion order for identical timestamps', () => {
    let map: FlightUpdates = {};
    const r1 = applyFlightUpdate(map, 'CN101', { departureLocal: '09:00' }, 7_000);
    if (!r1.ok) throw new Error('unexpected');
    const r2 = applyFlightUpdate(r1.flightUpdates, 'CN101', { departureLocal: '10:00' }, 7_000);
    if (!r2.ok) throw new Error('unexpected');
    expect(r2.flightUpdates.CN101!.map((u) => u.departureLocal)).toEqual([
      '09:00',
      '10:00',
    ]);
  });
});

describe('serviceForDate', () => {
  const DATE = '2026-11-09'; // departure 08:00 SDQ
  const DEP = departureMs(DATE);

  it('returns the base service when there are no updates', () => {
    expect(serviceForDate(CN101, undefined, DATE)).toBe(CN101);
    expect(serviceForDate(CN101, [], DATE)).toBe(CN101);
  });

  it('keeps the historical schedule for an occurrence that already departed', () => {
    const updates = [update('09:30', 80, DEP + 60_000)];
    expect(serviceForDate(CN101, updates, DATE)).toBe(CN101);
  });

  it('applies the override to a future occurrence', () => {
    const updates = [update('09:30', 80, DEP - 60_000)];
    const resolved = serviceForDate(CN101, updates, DATE);
    expect(resolved.departureLocal).toBe('09:30');
    expect(resolved.durationMinutes).toBe(80);
  });

  it('does not apply when departure equals the update instant exactly', () => {
    const updates = [update('09:30', 80, DEP)];
    expect(serviceForDate(CN101, updates, DATE)).toBe(CN101);
  });

  it('distinguishes same-day occurrences before and after departure', () => {
    // Update recorded one hour after this date's departure.
    const updates = [update('09:30', 80, DEP + 3_600_000)];
    expect(serviceForDate(CN101, updates, DATE)).toBe(CN101);
    // A later operating date departs after the update instant.
    const later = serviceForDate(CN101, updates, '2026-11-11');
    expect(later.departureLocal).toBe('09:30');
    expect(later.durationMinutes).toBe(80);
  });

  it('chains successive updates and resolves the latest applicable one', () => {
    const updates = [
      update('09:00', 80, DEP - 7_200_000),
      update('10:00', 90, DEP - 3_600_000),
    ];
    const resolved = serviceForDate(CN101, updates, DATE);
    expect(resolved.departureLocal).toBe('10:00');
    expect(resolved.durationMinutes).toBe(90);
  });

  it('stops the chain at the first inapplicable version', () => {
    // v1 recorded after DATE's departure; v2 even later. Neither applies.
    const updates = [
      update('09:00', 80, DEP + 1_000),
      update('10:00', 90, DEP + 2_000),
    ];
    expect(serviceForDate(CN101, updates, DATE)).toBe(CN101);
  });

  it('applies later versions to occurrences that had not departed yet', () => {
    // v1 after DATE's departure but before the next date's departure.
    const nextDep = departureMs('2026-11-11');
    const updates = [
      update('09:00', 80, DEP + 1_000),
      update('10:30', 85, DEP + 2_000),
    ];
    expect(nextDep).toBeGreaterThan(updates[1].effectiveAtMs);
    const resolved = serviceForDate(CN101, updates, '2026-11-11');
    expect(resolved.departureLocal).toBe('10:30');
    expect(resolved.durationMinutes).toBe(85);
  });

  it('accepts a new departure left in the past relative to the update', () => {
    // Updated one hour before departure, moving it to an already-past hour.
    const updates = [update('06:00', 75, DEP - 3_600_000)];
    const resolved = serviceForDate(CN101, updates, DATE);
    expect(resolved.departureLocal).toBe('06:00');
  });

  it('keeps the last valid schedule on invalid dates or conversions', () => {
    const updates = [update('09:30', 80, DEP - 60_000)];
    expect(serviceForDate(CN101, updates, 'not-a-date').departureLocal).toBe(
      '08:00',
    );
  });

  it('preserves route, airports and other base fields', () => {
    const updates = [update('09:30', 80, DEP - 60_000)];
    const resolved = serviceForDate(CN101, updates, DATE);
    expect(resolved.routeId).toBe(CN101.routeId);
    expect(resolved.origin).toBe(CN101.origin);
    expect(resolved.destination).toBe(CN101.destination);
    expect(resolved.flightNumber).toBe('CN101');
  });
});

describe('scheduledServiceForDate / currentScheduleFieldsForService', () => {
  const DATE = '2026-11-09';

  it('resolves a service by flightNumber with its updates', () => {
    const dep = departureMs(DATE);
    const flightUpdates: FlightUpdates = {
      CN101: [update('09:30', 80, dep - 1_000)],
    };
    const resolved = scheduledServiceForDate('CN101', flightUpdates, DATE);
    expect(resolved?.departureLocal).toBe('09:30');
    expect(scheduledServiceForDate('CN999', flightUpdates, DATE)).toBeUndefined();
  });

  it('reports the latest recorded schedule regardless of date', () => {
    const fields = currentScheduleFieldsForService(CN101, [
      update('09:30', 80, 100),
      update('10:00', 90, 200),
    ]);
    expect(fields).toEqual({ departureLocal: '10:00', durationMinutes: 90 });
    expect(currentScheduleFieldsForService(CN101, undefined)).toEqual({
      departureLocal: '08:00',
      durationMinutes: 75,
    });
  });
});

describe('serviceForNextOperatingDate (E1 landing)', () => {
  // November 2026: Fri 13, Sat 14, Sun 15, Mon 16, Tue 17, Wed 18,
  // Thu 19, Fri 20. Operating days are Mon/Wed/Fri only.
  const FRIDAY = '2026-11-13';
  const SATURDAY = '2026-11-14';
  const MONDAY = '2026-11-16';
  const WEDNESDAY = '2026-11-18';
  const NEXT_FRIDAY = '2026-11-20';
  // CN101 departs 08:00 America/Santo_Domingo (UTC-4) = 12:00 UTC.
  const FRI_DEP = departureMs(FRIDAY);
  const SAT_MORNING = Date.parse('2026-11-14T14:00:00.000Z');

  it('uses today when it is operating and the departure is still future', () => {
    const next = serviceForNextOperatingDate(
      CN101,
      undefined,
      FRIDAY,
      FRI_DEP - 60_000,
    );
    expect(next.date).toBe(FRIDAY);
    expect(next.service.departureLocal).toBe('08:00');
  });

  it('skips today when its departure already occurred', () => {
    const next = serviceForNextOperatingDate(
      CN101,
      undefined,
      FRIDAY,
      FRI_DEP + 60_000,
    );
    expect(next.date).toBe(MONDAY);
    expect(next.service.departureLocal).toBe('08:00');
  });

  it('skips non-operating days: Saturday resolves to Monday', () => {
    const next = serviceForNextOperatingDate(
      CN101,
      undefined,
      SATURDAY,
      SAT_MORNING,
    );
    expect(next.date).toBe(MONDAY);
  });

  it('treats nowMs exactly at departure as already departed (strict >)', () => {
    const next = serviceForNextOperatingDate(
      CN101,
      undefined,
      FRIDAY,
      FRI_DEP,
    );
    expect(next.date).toBe(MONDAY);
  });

  it('skips several operating dates until the first future departure', () => {
    // Wednesday's departure already passed; Thursday is not operating,
    // so the first future departure is Friday the 20th.
    const wedDep = departureMs(WEDNESDAY);
    const next = serviceForNextOperatingDate(
      CN101,
      undefined,
      WEDNESDAY,
      wedDep + 60_000,
    );
    expect(next.date).toBe(NEXT_FRIDAY);
  });

  it('shows the updated schedule on the next upcoming departure', () => {
    // Update recorded Friday evening — after today's 08:00 departure —
    // so it applies to Monday's occurrence.
    const mondayDep = departureMs(MONDAY);
    const flightUpdates: FlightUpdates = {
      CN101: [update('10:00', 90, FRI_DEP + 3_600_000)],
    };
    const next = serviceForNextOperatingDate(
      CN101,
      flightUpdates,
      FRIDAY,
      FRI_DEP + 7_200_000, // Friday evening, after today's departure
    );
    expect(next.date).toBe(MONDAY);
    expect(next.service.departureLocal).toBe('10:00');
    expect(next.service.durationMinutes).toBe(90);
    expect(mondayDep).toBeGreaterThan(FRI_DEP + 3_600_000);
  });

  it('keeps the historical schedule of an occurrence that already departed', () => {
    // Same update: today's occurrence must still resolve to the base
    // schedule — the update cannot rewrite a flight that already left.
    const flightUpdates: FlightUpdates = {
      CN101: [update('10:00', 90, FRI_DEP + 3_600_000)],
    };
    const today = serviceForDate(CN101, flightUpdates.CN101, FRIDAY);
    expect(today.departureLocal).toBe('08:00');
    expect(today.durationMinutes).toBe(75);
    const next = serviceForNextOperatingDate(
      CN101,
      flightUpdates,
      FRIDAY,
      FRI_DEP + 7_200_000,
    );
    expect(next.date).toBe(MONDAY);
    expect(next.service.departureLocal).toBe('10:00');
  });

  it('compares real UTC instants using the origin time zone', () => {
    // Friday 09:30 local (13:30 UTC): today's 08:00 departure already
    // left even though the calendar date is still Friday.
    const nowMs = localDateTimeToUtc(FRIDAY, '09:30', SDQ_TZ).getTime();
    const next = serviceForNextOperatingDate(CN101, undefined, FRIDAY, nowMs);
    expect(next.date).toBe(MONDAY);
  });

  it('resolves through the override chain on the selected date', () => {
    const wedDep = departureMs(WEDNESDAY);
    const flightUpdates: FlightUpdates = {
      CN101: [update('09:30', 80, wedDep - 60_000)],
    };
    const next = serviceForNextOperatingDate(
      CN101,
      flightUpdates,
      '2026-11-17', // Tuesday: next operating date is Wednesday
      wedDep - 120_000,
    );
    expect(next.date).toBe(WEDNESDAY);
    expect(next.service.departureLocal).toBe('09:30');
    expect(next.service.durationMinutes).toBe(80);
  });
});
