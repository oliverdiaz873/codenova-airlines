/**
 * Read-only view helpers for a confirmed Purchase (CU-06 detail/list).
 * Derives itinerary, passengers and route labels strictly from the
 * purchase components and the approved scheduled services — nothing is
 * invented. Flight times are wall-clock values resolved through the IANA
 * zones in scheduledServices.ts, same as booking.ts/confirmationEmail.ts.
 */

import { FLIGHT_CONNECTIONS } from '@/data/flights';
import type { ScheduledService } from '@/data/scheduledServices';
import {
  scheduledServiceForDate,
  type FlightUpdates,
} from '@/lib/flightUpdate';
import {
  PASSENGER_KIND_LABELS,
  type BookingComponent,
  type PassengerKind,
  type Purchase,
} from '@/lib/booking';
import { localDateTimeToUtc, utcToLocalDateTime } from '@/lib/dates';

export type PurchaseLeg = 'ida' | 'vuelta';

export interface PurchaseLegSeat {
  passengerLabel: string;
  seatId: string;
}

export interface PurchaseLegView {
  leg: PurchaseLeg;
  label: string;
  flightNumber: string;
  routeLabel: string;
  /** Departure date 'YYYY-MM-DD' at the origin. */
  date: string;
  departureTime: string | null;
  arrivalTime: string | null;
  arrivalNextDay: boolean;
  durationMinutes: number | null;
  seats: PurchaseLegSeat[];
}

const LEG_ORDER: readonly PurchaseLeg[] = ['ida', 'vuelta'];
const LEG_LABELS: Record<PurchaseLeg, string> = {
  ida: 'Ida',
  vuelta: 'Regreso',
};

function airportLabel(airport: { city: string; iata: string }): string {
  return `${airport.city} (${airport.iata})`;
}

function legComponents(
  purchase: Purchase,
  leg: PurchaseLeg,
): BookingComponent[] {
  return purchase.components
    .filter((component) => component.leg === leg)
    .sort((a, b) => a.passengerIndex - b.passengerIndex);
}

function passengerLabel(component: BookingComponent): string {
  return `Pasajero ${component.passengerIndex + 1} (${PASSENGER_KIND_LABELS[component.passengerKind]})`;
}

/**
 * Direction label for one leg. The scheduled service carries the real
 * origin/destination of that flight; the connection is only a fallback,
 * mirrored for the return leg (same rule as the confirmation email).
 */
function legRouteLabel(
  purchase: Purchase,
  leg: PurchaseLeg,
  service: ScheduledService | undefined,
): string {
  if (service) {
    return `${airportLabel(service.origin)} → ${airportLabel(service.destination)}`;
  }
  const connection = FLIGHT_CONNECTIONS.find(
    (candidate) => candidate.id === purchase.routeId,
  );
  if (!connection) return purchase.routeId;
  return leg === 'ida'
    ? `${airportLabel(connection.origin)} → ${airportLabel(connection.destination)}`
    : `${airportLabel(connection.destination)} → ${airportLabel(connection.origin)}`;
}

/** Ordered itinerary of the purchase: one view per leg present. */
export function purchaseLegs(
  purchase: Purchase,
  flightUpdates?: FlightUpdates,
): PurchaseLegView[] {
  return LEG_ORDER.map((leg) => {
    const components = legComponents(purchase, leg);
    const first = components[0];
    // CU-07: times resolve against the schedule in effect for the leg date.
    const service = first
      ? scheduledServiceForDate(
          first.flightNumber,
          flightUpdates,
          first.date,
        )
      : undefined;

    let arrivalTime: string | null = null;
    let arrivalNextDay = false;
    if (first && service) {
      try {
        const departureUtc = localDateTimeToUtc(
          first.date,
          service.departureLocal,
          service.origin.timeZone,
        );
        const arrivalUtc = new Date(
          departureUtc.getTime() + service.durationMinutes * 60_000,
        );
        const arrival = utcToLocalDateTime(
          arrivalUtc,
          service.destination.timeZone,
        );
        arrivalTime = arrival.time;
        arrivalNextDay = arrival.date !== first.date;
      } catch {
        arrivalTime = null;
      }
    }

    return {
      leg,
      label: LEG_LABELS[leg],
      flightNumber: first?.flightNumber ?? '',
      routeLabel: legRouteLabel(purchase, leg, service),
      date: first?.date ?? '',
      departureTime: service?.departureLocal ?? null,
      arrivalTime,
      arrivalNextDay,
      durationMinutes: service?.durationMinutes ?? null,
      seats: components.map((component) => ({
        passengerLabel: passengerLabel(component),
        seatId: component.seatId,
      })),
    };
  }).filter((view) => view.flightNumber !== '');
}

/** Route label of the whole trip, from the first (ida) leg. */
export function purchaseRouteLabel(
  purchase: Purchase,
  flightUpdates?: FlightUpdates,
): string {
  const firstLeg = purchaseLegs(purchase, flightUpdates).find(
    (view) => view.leg === 'ida',
  );
  return firstLeg?.routeLabel ?? purchase.routeId;
}

/** Departure date of the first flight ('YYYY-MM-DD'). */
export function purchaseFirstFlightDate(purchase: Purchase): string {
  const first = purchase.components.find(
    (component) => component.leg === 'ida',
  );
  return first?.date ?? '';
}

/** Passenger composition summary, e.g. '1 adulto · 1 niño'. */
export function purchasePassengerSummary(purchase: Purchase): string {
  const kindCounts: Partial<Record<PassengerKind, number>> = {};
  for (const component of legComponents(purchase, 'ida')) {
    kindCounts[component.passengerKind] =
      (kindCounts[component.passengerKind] ?? 0) + 1;
  }
  const labels: Record<PassengerKind, string> = {
    adult: 'adulto',
    child: 'niño',
    infant: 'infante',
  };
  const order: PassengerKind[] = ['adult', 'child', 'infant'];
  return order
    .filter((kind) => (kindCounts[kind] ?? 0) > 0)
    .map((kind) => {
      const count = kindCounts[kind] ?? 0;
      return `${count} ${labels[kind]}${count === 1 ? '' : 's'}`;
    })
    .join(' · ');
}
