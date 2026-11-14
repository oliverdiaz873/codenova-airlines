/**
 * CU-03 flight search logic: occurrences, availability, validation.
 * Source: PLAN_CODENOVA.md — sections 3.9, 4.1, 4.3, 4.4, 4.7, 4.8
 *
 * Pure functions only: searching never mutates availability and never
 * reserves seats. Availability is deterministic per flight occurrence and
 * date, reduced only by the occupied seats derived from confirmed purchases
 * (which include the demonstration reservations, D-11).
 */

import { FLIGHT_CONNECTIONS, type FlightConnection } from '@/data/flights';
import { SEARCH_HORIZON_DAYS } from '@/data/demoReservations';
import {
  SCHEDULED_SERVICES,
  type ScheduledService,
} from '@/data/scheduledServices';
import {
  scheduledServiceForDate,
  serviceForDate,
  type FlightUpdates,
} from '@/lib/flightUpdate';
import {
  effectiveConnectionForDate,
  serviceForConnection,
  type ConnectionUpdates,
} from '@/lib/connectionUpdate';
import { buildDemoPurchases } from '@/lib/demoPurchases';
import { occupiedSeatCounts } from '@/lib/seatOccupancy';
import type { Purchase } from '@/lib/booking';
import {
  addDaysISO,
  isOperatingDate,
  isValidISODate,
  localDateTimeToUtc,
  todayISO,
  utcToLocalDateTime,
} from '@/lib/dates';

export const MAX_SEATS_PER_OCCURRENCE = 30;
export const MAX_PASSENGERS_PER_SEARCH = 30;
export { SEARCH_HORIZON_DAYS };

/**
 * CU-03 (Paso 3.2 / Paso 5): the customer searches by destino y hora de
 * partida. The departure time is chosen as a time-of-day range at the
 * origin (local time) and applies to the outbound leg.
 */
export type DepartureTimeSlot = 'any' | 'morning' | 'afternoon' | 'evening';

export const DEPARTURE_TIME_SLOTS: readonly {
  value: DepartureTimeSlot;
  label: string;
}[] = [
  { value: 'any', label: 'Cualquier hora' },
  { value: 'morning', label: 'Mañana (05:00 – 11:59)' },
  { value: 'afternoon', label: 'Tarde (12:00 – 17:59)' },
  { value: 'evening', label: 'Noche (18:00 – 04:59)' },
];

/** Whether a local 'HH:mm' departure time falls inside the chosen range. */
export function matchesDepartureTimeSlot(
  time: string,
  slot: DepartureTimeSlot | undefined,
): boolean {
  if (!slot || slot === 'any') return true;
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  if (slot === 'morning') return totalMinutes >= 5 * 60 && totalMinutes < 12 * 60;
  if (slot === 'afternoon') return totalMinutes >= 12 * 60 && totalMinutes < 18 * 60;
  return totalMinutes >= 18 * 60 || totalMinutes < 5 * 60;
}

export function departureTimeSlotLabel(slot: DepartureTimeSlot): string {
  return DEPARTURE_TIME_SLOTS.find((option) => option.value === slot)?.label ?? '';
}

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface SearchCriteria extends PassengerCounts {
  /** Connection id from FLIGHT_CONNECTIONS (e.g. 'sdq-sju'). */
  routeId: string;
  /** 'YYYY-MM-DD' local departure date at the origin. */
  departureDate: string;
  /** 'YYYY-MM-DD' local departure date at the destination. */
  returnDate: string;
  /** Outbound departure time range (CU-03 "hora de partida"). Defaults to 'any'. */
  departureTimeSlot?: DepartureTimeSlot;
}

export interface FlightOccurrence {
  /** Stable key: `${flightNumber}@${date}`. */
  key: string;
  service: ScheduledService;
  /** Departure date 'YYYY-MM-DD' at the origin. */
  date: string;
  /** Local departure time 'HH:mm' at the origin. */
  departureTime: string;
  /** Local arrival time 'HH:mm' at the destination. */
  arrivalTime: string;
  /** Whether the local arrival date differs from the departure date. */
  arrivalNextDay: boolean;
  durationMinutes: number;
  /** CU-07 availability; false only when an agent marked it unavailable. */
  available: boolean;
  /** Effective fare per passenger for this occurrence (D-7). */
  farePerPassenger: number;
  /** Seats still available for this occurrence (30 minus demo bookings). */
  availableSeats: number;
}

export interface FlightSearchResults {
  outbound: FlightOccurrence[];
  returnOptions: FlightOccurrence[];
}

export interface SelectedLegSummary {
  flightNumber: string;
  originLabel: string;
  destinationLabel: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  arrivalNextDay: boolean;
  durationMinutes: number;
  fare: number;
}

export interface SearchSelection {
  routeId: string;
  originLabel: string;
  destinationLabel: string;
  departureDate: string;
  returnDate: string;
  passengers: PassengerCounts;
  totalPassengers: number;
  outbound: SelectedLegSummary;
  returnFlight: SelectedLegSummary;
  totalPrice: number;
}

export function totalPassengers(counts: PassengerCounts): number {
  return counts.adults + counts.children + counts.infants;
}

function servicesForDirection(
  connection: FlightConnection,
  direction: 'outbound' | 'return',
): ScheduledService[] {
  return SCHEDULED_SERVICES.filter((service) => {
    if (service.routeId !== connection.id) return false;
    // Classify by the stored base direction, so the result stays stable
    // after a CU-07 destination override rewrites the airport.
    return direction === 'outbound'
      ? service.origin.iata === connection.origin.iata
      : service.destination.iata === connection.origin.iata;
  });
}

function buildOccurrence(
  service: ScheduledService,
  date: string,
  occupancy: Map<string, number>,
  farePerPassenger: number,
  flightUpdates?: FlightUpdates,
): FlightOccurrence | null {
  if (!isOperatingDate(date)) return null;

  // CU-07: resolve the schedule in effect for this occurrence date —
  // updates apply only while the flight had not departed.
  const resolved = serviceForDate(service, flightUpdates?.[service.flightNumber], date);

  const departureUtc = localDateTimeToUtc(
    date,
    resolved.departureLocal,
    resolved.origin.timeZone,
  );
  const arrivalUtc = new Date(
    departureUtc.getTime() + resolved.durationMinutes * 60_000,
  );
  const arrival = utcToLocalDateTime(arrivalUtc, resolved.destination.timeZone);
  const occupied = occupancy.get(`${service.flightNumber}|${date}`) ?? 0;

  return {
    key: `${service.flightNumber}@${date}`,
    service: resolved,
    date,
    departureTime: resolved.departureLocal,
    arrivalTime: arrival.time,
    arrivalNextDay: arrival.date !== date,
    durationMinutes: resolved.durationMinutes,
    available: resolved.available !== false,
    farePerPassenger,
    availableSeats: MAX_SEATS_PER_OCCURRENCE - occupied,
  };
}

function byDepartureTime(a: FlightOccurrence, b: FlightOccurrence): number {
  return a.departureTime.localeCompare(b.departureTime);
}

/**
 * Runs CU-03: outbound services of the chosen connection on the departure
 * date and return services of the same connection (reverse direction) on
 * the return date. Returns empty lists when a date has no operation.
 */
export function searchFlights(
  criteria: SearchCriteria,
  referenceDateISO: string = todayISO(),
  flightUpdates?: FlightUpdates,
  connectionUpdates?: ConnectionUpdates,
  purchases?: readonly Purchase[],
): FlightSearchResults {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return { outbound: [], returnOptions: [] };

  // CU-07 (D-6): resolve the effective connection once for the whole trip,
  // using the outbound departure date, so both legs share the destination.
  const effective = effectiveConnectionForDate(
    connection,
    connectionUpdates,
    criteria.departureDate,
    flightUpdates,
  );
  // D-11: occupancy derives from confirmed purchases. Without an explicit
  // list (pure search/tests) the demonstration purchases are the baseline.
  const occupancy = occupiedSeatCounts(
    purchases ?? buildDemoPurchases(referenceDateISO),
  );

  const outbound = servicesForDirection(connection, 'outbound')
    .map((service) =>
      serviceForConnection(service, connection, effective.destination.iata),
    )
    .map((service) =>
      buildOccurrence(
        service,
        criteria.departureDate,
        occupancy,
        effective.farePerPassenger,
        flightUpdates,
      ),
    )
    .filter((occurrence): occurrence is FlightOccurrence => occurrence !== null)
    // CU-03 time-of-day range applies to the outbound leg only (D-2) and is
    // applied after CU-07 resolution, so it uses the effective schedule.
    .filter((occurrence) =>
      matchesDepartureTimeSlot(occurrence.departureTime, criteria.departureTimeSlot),
    )
    .sort(byDepartureTime);

  const returnOptions = servicesForDirection(connection, 'return')
    .map((service) =>
      serviceForConnection(service, connection, effective.destination.iata),
    )
    .map((service) =>
      buildOccurrence(
        service,
        criteria.returnDate,
        occupancy,
        effective.farePerPassenger,
        flightUpdates,
      ),
    )
    .filter((occurrence): occurrence is FlightOccurrence => occurrence !== null)
    .sort(byDepartureTime);

  return { outbound, returnOptions };
}

/** Validates the search form. Returns an error message or null. */
export function validateSearchCriteria(
  criteria: SearchCriteria,
  referenceDateISO: string = todayISO(),
): string | null {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) {
    return 'Selecciona un origen y un destino válidos.';
  }

  const { departureDate, returnDate, adults, children, infants } = criteria;
  const counts = [adults, children, infants];
  if (
    counts.some((count) => !Number.isInteger(count) || count < 0) ||
    counts.some((count) => count > MAX_PASSENGERS_PER_SEARCH)
  ) {
    return 'Revisa la cantidad de pasajeros: deben ser números enteros.';
  }

  const total = totalPassengers(criteria);
  if (total < 1) return 'Agrega al menos un pasajero.';
  if (total > MAX_PASSENGERS_PER_SEARCH) {
    return 'Máximo 30 pasajeros por búsqueda, incluidos los infantes.';
  }

  if (!isValidISODate(departureDate) || !isValidISODate(returnDate)) {
    return 'Selecciona fechas válidas para la ida y el regreso.';
  }

  const today = referenceDateISO;
  const horizonEnd = addDaysISO(today, SEARCH_HORIZON_DAYS);
  if (departureDate < today || departureDate > horizonEnd) {
    return 'La fecha de ida debe estar dentro de los próximos 30 días.';
  }
  if (returnDate < today || returnDate > horizonEnd) {
    return 'La fecha de regreso debe estar dentro de los próximos 30 días.';
  }
  if (returnDate < departureDate) {
    return 'La fecha de regreso no puede ser anterior a la de ida.';
  }

  return null;
}

/**
 * CU-03 can continue to CU-04 only when both legs are selected and each
 * occurrence has enough seats for the whole group. Selecting flights never
 * modifies availability.
 */
export function canContinueSearch(
  criteria: SearchCriteria,
  outbound: FlightOccurrence | null,
  returnFlight: FlightOccurrence | null,
): boolean {
  if (!outbound || !returnFlight) return false;
  if (!outbound.available || !returnFlight.available) return false;
  if (
    !matchesDepartureTimeSlot(
      outbound.departureTime,
      criteria.departureTimeSlot,
    )
  ) {
    return false;
  }
  const total = totalPassengers(criteria);
  return (
    outbound.availableSeats >= total && returnFlight.availableSeats >= total
  );
}

/**
 * Suggests upcoming operating dates (within the horizon) that have at least
 * one outbound occurrence with enough seats for the group (4.3).
 */
export function suggestAlternativeDates(
  criteria: SearchCriteria,
  referenceDateISO: string = todayISO(),
  count = 3,
  flightUpdates?: FlightUpdates,
  connectionUpdates?: ConnectionUpdates,
  purchases?: readonly Purchase[],
): string[] {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return [];

  const occupancy = occupiedSeatCounts(
    purchases ?? buildDemoPurchases(referenceDateISO),
  );
  const horizonEnd = addDaysISO(referenceDateISO, SEARCH_HORIZON_DAYS);
  const total = totalPassengers(criteria);
  const suggestions: string[] = [];

  let date = addDaysISO(criteria.departureDate, 1);
  while (date <= horizonEnd && suggestions.length < count) {
    if (isOperatingDate(date)) {
      // The destination can differ per date if an update takes effect
      // between two candidate dates (D-6).
      const effective = effectiveConnectionForDate(
        connection,
        connectionUpdates,
        date,
        flightUpdates,
      );
      const hasCapacity = servicesForDirection(connection, 'outbound').some(
        (service) => {
          const occurrence = buildOccurrence(
            serviceForConnection(
              service,
              connection,
              effective.destination.iata,
            ),
            date,
            occupancy,
            effective.farePerPassenger,
            flightUpdates,
          );
          return (
            occurrence !== null &&
            occurrence.availableSeats >= total &&
            occurrence.available &&
            matchesDepartureTimeSlot(
              occurrence.departureTime,
              criteria.departureTimeSlot,
            )
          );
        },
      );
      if (hasCapacity) suggestions.push(date);
    }
    date = addDaysISO(date, 1);
  }
  return suggestions;
}

function toLegSummary(occurrence: FlightOccurrence): SelectedLegSummary {
  return {
    flightNumber: occurrence.service.flightNumber,
    originLabel: `${occurrence.service.origin.city} (${occurrence.service.origin.iata})`,
    destinationLabel: `${occurrence.service.destination.city} (${occurrence.service.destination.iata})`,
    date: occurrence.date,
    departureTime: occurrence.departureTime,
    arrivalTime: occurrence.arrivalTime,
    arrivalNextDay: occurrence.arrivalNextDay,
    durationMinutes: occurrence.durationMinutes,
    fare: occurrence.farePerPassenger,
  };
}

/**
 * Verifies a leg summary against the real scheduled service: the flight
 * number must exist, belong to the route, fly the expected direction on an
 * operating date, and every descriptive field must match what
 * buildOccurrence/toLegSummary would produce — including the effective
 * CU-07 connection destination, the IANA-based arrival time and the
 * next-day flag. Nothing from location.state is trusted.
 */
function isValidLegSummary(
  leg: unknown,
  connection: FlightConnection,
  expectedDate: string,
  expectedDirection: 'outbound' | 'return',
  effective: FlightConnection,
  flightUpdates?: FlightUpdates,
): leg is SelectedLegSummary {
  if (typeof leg !== 'object' || leg === null) return false;
  const summary = leg as Partial<SelectedLegSummary>;
  if (
    typeof summary.flightNumber !== 'string' ||
    summary.flightNumber.length === 0
  ) {
    return false;
  }

  // CU-07: the leg must match the schedule in effect for its date —
  // a selection captured before a schedule update is stale and rejected.
  const baseService = scheduledServiceForDate(
    summary.flightNumber,
    flightUpdates,
    expectedDate,
  );
  if (!baseService || baseService.routeId !== connection.id) return false;

  const service = serviceForConnection(
    baseService,
    connection,
    effective.destination.iata,
  );

  // Direction coherence: the outbound departs from the connection origin
  // and the return arrives there (D-6 keeps both directions aligned).
  if (
    expectedDirection === 'outbound'
      ? service.origin.iata !== connection.origin.iata
      : service.destination.iata !== connection.origin.iata
  ) {
    return false;
  }
  if (summary.date !== expectedDate || !isOperatingDate(expectedDate)) {
    return false;
  }
  if (summary.departureTime !== service.departureLocal) return false;
  if (summary.durationMinutes !== service.durationMinutes) return false;
  if (summary.fare !== effective.farePerPassenger) return false;

  const departureUtc = localDateTimeToUtc(
    expectedDate,
    service.departureLocal,
    service.origin.timeZone,
  );
  const arrivalUtc = new Date(
    departureUtc.getTime() + service.durationMinutes * 60_000,
  );
  const arrival = utcToLocalDateTime(arrivalUtc, service.destination.timeZone);
  if (summary.arrivalTime !== arrival.time) return false;
  if (summary.arrivalNextDay !== (arrival.date !== expectedDate)) return false;

  if (
    summary.originLabel !==
      `${service.origin.city} (${service.origin.iata})` ||
    summary.destinationLabel !==
      `${service.destination.city} (${service.destination.iata})`
  ) {
    return false;
  }

  return true;
}

/**
 * Hard boundary check for a SearchSelection arriving via router state
 * (CU-04 entry). Rejects anything that is not exactly what
 * buildSearchSelection produces: known route, coherent passengers and
 * dates, complete leg summaries at the effective connection fare, and a
 * total price equal to that fare x 2 legs x passengers. Pure and
 * side-effect free.
 */
export function isValidSearchSelection(
  value: unknown,
  flightUpdates?: FlightUpdates,
  connectionUpdates?: ConnectionUpdates,
): value is SearchSelection {
  if (typeof value !== 'object' || value === null) return false;
  const selection = value as Partial<SearchSelection>;

  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === selection.routeId);
  if (!connection) return false;

  if (
    typeof selection.departureDate !== 'string' ||
    !isValidISODate(selection.departureDate) ||
    typeof selection.returnDate !== 'string' ||
    !isValidISODate(selection.returnDate) ||
    selection.returnDate < selection.departureDate
  ) {
    return false;
  }

  const passengers = selection.passengers;
  if (typeof passengers !== 'object' || passengers === null) return false;
  const { adults, children, infants } = passengers;
  if (
    ![adults, children, infants].every(
      (count) => Number.isInteger(count) && (count as number) >= 0,
    )
  ) {
    return false;
  }
  if (
    !Number.isInteger(selection.totalPassengers) ||
    (selection.totalPassengers as number) <= 0 ||
    (selection.totalPassengers as number) > MAX_PASSENGERS_PER_SEARCH ||
    (adults as number) + (children as number) + (infants as number) !==
      selection.totalPassengers
  ) {
    return false;
  }

  // D-6: both legs share the destination in effect on the outbound date.
  const effective = effectiveConnectionForDate(
    connection,
    connectionUpdates,
    selection.departureDate,
    flightUpdates,
  );

  if (
    !isValidLegSummary(
      selection.outbound,
      connection,
      selection.departureDate,
      'outbound',
      effective,
      flightUpdates,
    ) ||
    !isValidLegSummary(
      selection.returnFlight,
      connection,
      selection.returnDate,
      'return',
      effective,
      flightUpdates,
    )
  ) {
    return false;
  }

  const outboundFare = (selection.outbound as SelectedLegSummary).fare;
  const returnFare = (selection.returnFlight as SelectedLegSummary).fare;
  // Both legs must use the same effective fare; a mixed trip would mean an
  // incoherent round trip across a destination-change boundary.
  if (outboundFare !== returnFare) return false;

  return (
    Number.isFinite(selection.totalPrice) &&
    selection.totalPrice ===
      outboundFare * 2 * (selection.totalPassengers as number)
  );
}

/** Serializable summary handed to CU-04 via router state. */
export function buildSearchSelection(
  criteria: SearchCriteria,
  outbound: FlightOccurrence,
  returnFlight: FlightOccurrence,
): SearchSelection | null {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return null;

  const total = totalPassengers(criteria);
  return {
    routeId: criteria.routeId,
    // Effective labels come from the resolved occurrences (D-6), so a
    // destination update is reflected without consulting the base catalog.
    originLabel: `${outbound.service.origin.city} (${outbound.service.origin.iata})`,
    destinationLabel: `${outbound.service.destination.city} (${outbound.service.destination.iata})`,
    departureDate: criteria.departureDate,
    returnDate: criteria.returnDate,
    passengers: {
      adults: criteria.adults,
      children: criteria.children,
      infants: criteria.infants,
    },
    totalPassengers: total,
    outbound: toLegSummary(outbound),
    returnFlight: toLegSummary(returnFlight),
    // Round trip sums both legs; same effective fare each way (4.2, 4.8).
    totalPrice:
      (outbound.farePerPassenger + returnFlight.farePerPassenger) * total,
  };
}

export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatDateLong(dateISO: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dateISO}T12:00:00.000Z`));
}
