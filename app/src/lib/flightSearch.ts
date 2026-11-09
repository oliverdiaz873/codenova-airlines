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
): FlightOccurrence | null {
  if (!isOperatingDate(date)) return null;

  const departureUtc = localDateTimeToUtc(
    date,
    service.departureLocal,
    service.origin.timeZone,
  );
  const arrivalUtc = new Date(
    departureUtc.getTime() + service.durationMinutes * 60_000,
  );
  const arrival = utcToLocalDateTime(arrivalUtc, service.destination.timeZone);
  const occupied = occupancy.get(`${service.flightNumber}|${date}`) ?? 0;

  return {
    key: `${service.flightNumber}@${date}`,
    service,
    date,
    departureTime: service.departureLocal,
    arrivalTime: arrival.time,
    arrivalNextDay: arrival.date !== date,
    durationMinutes: service.durationMinutes,
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
): FlightSearchResults {
  const connection = FLIGHT_CONNECTIONS.find((c) => c.id === criteria.routeId);
  if (!connection) return { outbound: [], returnOptions: [] };

  const occupancy = buildOccupancyMap(referenceDateISO);

  const outbound = servicesForDirection(criteria.routeId, connection.origin.iata)
    .map((service) => buildOccurrence(service, criteria.departureDate, occupancy))
    .filter((occurrence): occurrence is FlightOccurrence => occurrence !== null)
    .sort(byDepartureTime);

  const returnOptions = servicesForDirection(
    criteria.routeId,
    connection.destination.iata,
  )
    .map((service) => buildOccurrence(service, criteria.returnDate, occupancy))
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
        const occurrence = buildOccurrence(service, date, occupancy);
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
