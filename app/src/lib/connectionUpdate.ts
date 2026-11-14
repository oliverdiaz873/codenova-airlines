/**
 * CU-07 — Connection-level destination updates.
 *
 * The academic operation is `Vuelo.actualizarInformacion(destino, ...)`.
 * The prototype sells round trips on one connection, so changing a single
 * flight's destination would break the ida/vuelta pairing. Decision D-6
 * applies the change to the whole connection: the outbound destination
 * and the return origin move together.
 *
 * Each version stores only the new destination and the instant it was
 * recorded. The temporal rule mirrors flight updates: a version applies
 * to an occurrence date only while the connection's earliest departure
 * on that date is strictly after the version's effectiveAtMs. Past
 * departures keep their historical route, and confirmed purchases keep
 * their paid amount (D-7) plus an airport snapshot for display.
 */

import { FLIGHT_CONNECTIONS, type FlightConnection } from '@/data/flights';
import {
  AIRPORTS,
  SCHEDULED_SERVICES,
  type Airport,
  type ScheduledService,
} from '@/data/scheduledServices';
import { localDateTimeToUtc } from '@/lib/dates';
import { serviceForDate, type FlightUpdates } from '@/lib/flightUpdate';

export interface ConnectionUpdate {
  destinationIata: string;
  effectiveAtMs: number;
}

/** Update history keyed by connection id; array order = insertion order. */
export type ConnectionUpdates = Partial<Record<string, ConnectionUpdate[]>>;

export type ApplyConnectionUpdateResult =
  | {
      ok: true;
      connectionUpdates: ConnectionUpdates;
      update: ConnectionUpdate;
    }
  | { ok: false; error: string };

const CONNECTION_NOT_FOUND = 'No encontramos esa conexión.';
const DESTINATION_NOT_SERVED =
  'El destino seleccionado no está disponible para esa conexión.';
const NO_CHANGES = 'No hay cambios que guardar.';

export function baseConnection(routeId: string): FlightConnection | undefined {
  return FLIGHT_CONNECTIONS.find((connection) => connection.id === routeId);
}

/** Approved fare for an origin → destination pair, or null if not served. */
export function fareForRoute(
  originIata: string,
  destinationIata: string,
): number | null {
  const connection = FLIGHT_CONNECTIONS.find(
    (candidate) =>
      candidate.origin.iata === originIata &&
      candidate.destination.iata === destinationIata,
  );
  return connection?.farePerPassenger ?? null;
}

/**
 * Destinations an agent may assign to a connection: every approved
 * destination served from the same origin, always with an approved fare.
 */
export function allowedDestinations(originIata: string): Airport[] {
  const seen = new Set<string>();
  const airports: Airport[] = [];
  for (const connection of FLIGHT_CONNECTIONS) {
    if (connection.origin.iata !== originIata) continue;
    const iata = connection.destination.iata;
    if (seen.has(iata) || !AIRPORTS[iata]) continue;
    seen.add(iata);
    airports.push(AIRPORTS[iata]);
  }
  return airports;
}

/** Latest recorded destination for the agent panel, regardless of date. */
export function currentDestinationIata(
  connection: FlightConnection,
  updates: ConnectionUpdates | undefined,
): string {
  const history = updates?.[connection.id];
  const latest = history && history.length > 0 ? history[history.length - 1] : undefined;
  return latest?.destinationIata ?? connection.destination.iata;
}

/**
 * Builds the effective connection for a destination: the destination
 * airport changes and the fare becomes the approved fare of the new
 * origin → destination pair (D-7). Returns null when the destination is
 * not served from the origin.
 */
export function effectiveConnection(
  connection: FlightConnection,
  destinationIata: string,
): FlightConnection | null {
  const airport = AIRPORTS[destinationIata];
  const fare = fareForRoute(connection.origin.iata, destinationIata);
  if (!airport || fare === null) return null;
  return {
    ...connection,
    destination: { city: airport.city, iata: airport.iata },
    farePerPassenger: fare,
  };
}

/** Effective connection at an instant (latest version recorded before it). */
export function effectiveConnectionAt(
  connection: FlightConnection,
  updates: ConnectionUpdates | undefined,
  atMs: number,
): FlightConnection {
  const history = updates?.[connection.id];
  if (!history || history.length === 0) return connection;
  let destinationIata = connection.destination.iata;
  for (const update of history) {
    if (!(update.effectiveAtMs < atMs)) break;
    destinationIata = update.destinationIata;
  }
  return effectiveConnection(connection, destinationIata) ?? connection;
}

/**
 * Earliest scheduled departure of the connection's outbound direction on
 * a date. Used to decide whether a connection version applies. Resolves
 * CU-07 flight updates so a moved departure shifts the boundary too.
 */
function earliestOutboundDepartureMs(
  connection: FlightConnection,
  dateISO: string,
  flightUpdates?: FlightUpdates,
): number | null {
  let earliest: number | null = null;
  for (const service of SCHEDULED_SERVICES) {
    if (
      service.routeId !== connection.id ||
      service.origin.iata !== connection.origin.iata
    ) {
      continue;
    }
    const resolved = serviceForDate(
      service,
      flightUpdates?.[service.flightNumber],
      dateISO,
    );
    try {
      const ms = localDateTimeToUtc(
        dateISO,
        resolved.departureLocal,
        resolved.origin.timeZone,
      ).getTime();
      if (Number.isFinite(ms) && (earliest === null || ms < earliest)) {
        earliest = ms;
      }
    } catch {
      // An invalid date simply makes this service unusable for the check.
    }
  }
  return earliest;
}

/** Effective connection for one occurrence date (temporal version rule). */
export function effectiveConnectionForDate(
  connection: FlightConnection,
  updates: ConnectionUpdates | undefined,
  dateISO: string,
  flightUpdates?: FlightUpdates,
): FlightConnection {
  const history = updates?.[connection.id];
  if (!history || history.length === 0) return connection;

  const departureMs = earliestOutboundDepartureMs(
    connection,
    dateISO,
    flightUpdates,
  );
  let destinationIata = connection.destination.iata;
  for (const update of history) {
    if (departureMs === null || !(departureMs > update.effectiveAtMs)) break;
    destinationIata = update.destinationIata;
  }
  return effectiveConnection(connection, destinationIata) ?? connection;
}

/**
 * Rewrites a scheduled service to the effective connection: outbound
 * services keep their origin and take the new destination; return
 * services keep their destination and take the new origin.
 */
export function serviceForConnection(
  service: ScheduledService,
  connection: FlightConnection,
  destinationIata: string,
): ScheduledService {
  const airport = AIRPORTS[destinationIata];
  if (!airport) return service;
  if (service.origin.iata === connection.origin.iata) {
    return { ...service, destination: airport };
  }
  return { ...service, origin: airport };
}

/**
 * Atomic destination transition for CU-07. Validates the connection and
 * the destination (which must have an approved fare from the origin),
 * rejects no-ops, and returns a new history map without mutating input.
 */
export function applyConnectionUpdate(
  connectionUpdates: ConnectionUpdates,
  routeId: string,
  destinationIata: string,
  nowMs: number,
): ApplyConnectionUpdateResult {
  const connection = baseConnection(routeId);
  if (!connection) {
    return { ok: false, error: CONNECTION_NOT_FOUND };
  }
  if (
    !AIRPORTS[destinationIata] ||
    fareForRoute(connection.origin.iata, destinationIata) === null
  ) {
    return { ok: false, error: DESTINATION_NOT_SERVED };
  }

  const history = connectionUpdates[routeId] ?? [];
  const previous = history.length > 0 ? history[history.length - 1] : undefined;
  const currentDestination = previous?.destinationIata ?? connection.destination.iata;
  if (currentDestination === destinationIata) {
    return { ok: false, error: NO_CHANGES };
  }

  const update: ConnectionUpdate = {
    destinationIata,
    effectiveAtMs: previous
      ? Math.max(nowMs, previous.effectiveAtMs)
      : nowMs,
  };

  return {
    ok: true,
    connectionUpdates: {
      ...connectionUpdates,
      [routeId]: [...history, update],
    },
    update,
  };
}
