/**
 * CU-03 flight search logic: occurrences, availability, validation.
 * Source: PLAN_CODENOVA.md — sections 3.9, 4.1, 4.3, 4.4, 4.7, 4.8
 *
 * Pure functions only: searching never mutates availability and never
 * reserves seats. Availability is deterministic per flight occurrence and
 * date, reduced only by the demonstration bookings in demoReservations.ts.
 */

import { FLIGHT_CONNECTIONS } from '@/data/flights';
import {
  buildOccupancyMap,
  SEARCH_HORIZON_DAYS,
} from '@/data/demoReservations';
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
  routeId: string,
  iata: string,
): ScheduledService[] {
  return SCHEDULED_SERVICES.filter(
    (service) => service.routeId === routeId && service.origin.iata === iata,
  );
}

function buildOccurrence(
  service: ScheduledService,
  date: string,
  occupancy: Map<string, number>,
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
): FlightSearchResults {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return { outbound: [], returnOptions: [] };

  const occupancy = buildOccupancyMap(referenceDateISO);

  const outbound = servicesForDirection(criteria.routeId, connection.origin.iata)
    .map((service) => buildOccurrence(service, criteria.departureDate, occupancy, flightUpdates))
    .filter((occurrence): occurrence is FlightOccurrence => occurrence !== null)
    .sort(byDepartureTime);

  const returnOptions = servicesForDirection(
    criteria.routeId,
    connection.destination.iata,
  )
    .map((service) => buildOccurrence(service, criteria.returnDate, occupancy, flightUpdates))
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
): string[] {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return [];

  const occupancy = buildOccupancyMap(referenceDateISO);
  const services = servicesForDirection(criteria.routeId, connection.origin.iata);
  const horizonEnd = addDaysISO(referenceDateISO, SEARCH_HORIZON_DAYS);
  const total = totalPassengers(criteria);
  const suggestions: string[] = [];

  let date = addDaysISO(criteria.departureDate, 1);
  while (date <= horizonEnd && suggestions.length < count) {
    if (isOperatingDate(date)) {
      const hasCapacity = services.some((service) => {
        const occurrence = buildOccurrence(service, date, occupancy, flightUpdates);
        return occurrence !== null && occurrence.availableSeats >= total;
      });
      if (hasCapacity) suggestions.push(date);
    }
    date = addDaysISO(date, 1);
  }
  return suggestions;
}

function toLegSummary(
  occurrence: FlightOccurrence,
  fare: number,
): SelectedLegSummary {
  return {
    flightNumber: occurrence.service.flightNumber,
    originLabel: `${occurrence.service.origin.city} (${occurrence.service.origin.iata})`,
    destinationLabel: `${occurrence.service.destination.city} (${occurrence.service.destination.iata})`,
    date: occurrence.date,
    departureTime: occurrence.departureTime,
    arrivalTime: occurrence.arrivalTime,
    arrivalNextDay: occurrence.arrivalNextDay,
    durationMinutes: occurrence.durationMinutes,
    fare,
  };
}

/**
 * Verifies a leg summary against the real scheduled service: the flight
 * number must exist, belong to the route, fly the expected direction on an
 * operating date, and every descriptive field must match what
 * buildOccurrence/toLegSummary would produce — including the IANA-based
 * arrival time and next-day flag. Nothing from location.state is trusted.
 */
function isValidLegSummary(
  leg: unknown,
  routeId: string,
  expectedDate: string,
  expectedOriginIata: string,
  expectedDestinationIata: string,
  fare: number,
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
  const service = scheduledServiceForDate(
    summary.flightNumber,
    flightUpdates,
    expectedDate,
  );
  if (!service || service.routeId !== routeId) return false;
  if (
    service.origin.iata !== expectedOriginIata ||
    service.destination.iata !== expectedDestinationIata
  ) {
    return false;
  }
  if (summary.date !== expectedDate || !isOperatingDate(expectedDate)) {
    return false;
  }
  if (summary.departureTime !== service.departureLocal) return false;
  if (summary.durationMinutes !== service.durationMinutes) return false;
  if (summary.fare !== fare) return false;

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
 * dates, complete leg summaries at the connection fare, and a total price
 * equal to fare x 2 legs x passengers. Pure and side-effect free.
 */
export function isValidSearchSelection(
  value: unknown,
  flightUpdates?: FlightUpdates,
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

  if (
    !isValidLegSummary(
      selection.outbound,
      connection.id,
      selection.departureDate,
      connection.origin.iata,
      connection.destination.iata,
      connection.farePerPassenger,
      flightUpdates,
    ) ||
    !isValidLegSummary(
      selection.returnFlight,
      connection.id,
      selection.returnDate,
      connection.destination.iata,
      connection.origin.iata,
      connection.farePerPassenger,
      flightUpdates,
    )
  ) {
    return false;
  }

  return (
    Number.isFinite(selection.totalPrice) &&
    selection.totalPrice ===
      connection.farePerPassenger * 2 * (selection.totalPassengers as number)
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

  const fare = connection.farePerPassenger;
  const total = totalPassengers(criteria);
  return {
    routeId: criteria.routeId,
    originLabel: `${connection.origin.city} (${connection.origin.iata})`,
    destinationLabel: `${connection.destination.city} (${connection.destination.iata})`,
    departureDate: criteria.departureDate,
    returnDate: criteria.returnDate,
    passengers: {
      adults: criteria.adults,
      children: criteria.children,
      infants: criteria.infants,
    },
    totalPassengers: total,
    outbound: toLegSummary(outbound, fare),
    returnFlight: toLegSummary(returnFlight, fare),
    // Round trip sums both legs; same fare each way and per passenger (4.2, 4.8).
    totalPrice: fare * 2 * total,
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
