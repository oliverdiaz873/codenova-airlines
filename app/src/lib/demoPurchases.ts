/**
 * CU-06 demonstration reservations materialized as real purchases.
 *
 * The approved demo bookings (PA-1.10) used to exist only as a synthetic
 * seat map. Decision D-9 makes them reservations of the retail demo
 * customer, D-10 gives them an independent `CN-9xxx` code sequence and
 * D-11 makes these purchases the single source of their seat occupancy.
 *
 * Pure and deterministic for a reference date: the dates are resolved with
 * the same operating-day rules as the search, and the seat ids are the
 * first seats of the 10 × 3 map per occurrence. Nothing is persisted.
 */

import { FLIGHT_CONNECTIONS } from '@/data/flights';
import { resolveDemoBookings } from '@/data/demoReservations';
import { ALL_SEATS } from '@/data/seatMap';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { distanceMilesForRoute } from '@/data/routeDistances';
import { nextReservationCode, type BookingComponent, type Purchase } from '@/lib/booking';
import {
  addDaysISO,
  lastOperatingDateOnOrBefore,
  localDateTimeToUtc,
} from '@/lib/dates';

/** Retail demo account that owns every demonstration reservation (D-9). */
export const DEMO_CUSTOMER_EMAIL = 'minorista@codenova.demo';

/** Corporate demo account used to show mileage accrual. */
export const ACCRUAL_DEMO_CUSTOMER_EMAIL = 'corporativo@codenova.demo';

/** First numeric suffix of the demo sequence (D-10): CN-9001. */
export const DEMO_CODE_START = 9_001;

/** Demo code of the completed corporate trip used for the accrual demo. */
export const ACCRUAL_DEMO_CODE = 'CN-9004';

export function demoReservationCode(index: number): string {
  return nextReservationCode(DEMO_CODE_START + index);
}

function arrivalUtcMs(flightNumber: string, dateISO: string): number {
  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === flightNumber,
  );
  if (!service) return Number.NaN;
  try {
    const departure = localDateTimeToUtc(
      dateISO,
      service.departureLocal,
      service.origin.timeZone,
    );
    return departure.getTime() + service.durationMinutes * 60_000;
  } catch {
    return Number.NaN;
  }
}

/**
 * Builds the demonstration purchases for a reference date, including the
 * seat assignments and airport snapshots used by the rest of the app.
 * Invalid schedule data is skipped rather than invented.
 */
export function buildDemoPurchases(referenceDateISO: string): Purchase[] {
  const usedSeats = new Map<string, number>();
  const takeSeats = (key: string, count: number): string[] => {
    const start = usedSeats.get(key) ?? 0;
    usedSeats.set(key, start + count);
    return ALL_SEATS.slice(start, start + count);
  };

  return resolveDemoBookings(referenceDateISO).flatMap((booking, index) => {
    const connection = FLIGHT_CONNECTIONS.find(
      (candidate) => candidate.id === booking.routeId,
    );
    const outbound = SCHEDULED_SERVICES.find(
      (candidate) => candidate.flightNumber === booking.outboundFlightNumber,
    );
    const returning = SCHEDULED_SERVICES.find(
      (candidate) => candidate.flightNumber === booking.returnFlightNumber,
    );
    if (!connection || !outbound || !returning) return [];

    const outboundSeats = takeSeats(
      `${booking.outboundFlightNumber}|${booking.outboundDate}`,
      booking.seats,
    );
    const returnSeats = takeSeats(
      `${booking.returnFlightNumber}|${booking.returnDate}`,
      booking.seats,
    );
    const components: BookingComponent[] = [];
    for (let passengerIndex = 0; passengerIndex < booking.seats; passengerIndex += 1) {
      components.push({
        passengerIndex,
        passengerKind: 'adult',
        leg: 'ida',
        flightNumber: booking.outboundFlightNumber,
        date: booking.outboundDate,
        seatId: outboundSeats[passengerIndex],
        fare: connection.farePerPassenger,
        originAirport: outbound.origin,
        destinationAirport: outbound.destination,
      });
      components.push({
        passengerIndex,
        passengerKind: 'adult',
        leg: 'vuelta',
        flightNumber: booking.returnFlightNumber,
        date: booking.returnDate,
        seatId: returnSeats[passengerIndex],
        fare: connection.farePerPassenger,
        originAirport: returning.origin,
        destinationAirport: returning.destination,
      });
    }

    const grossTotal = connection.farePerPassenger * 2 * booking.seats;
    const returnArrival = arrivalUtcMs(
      booking.returnFlightNumber,
      booking.returnDate,
    );
    if (!Number.isFinite(returnArrival)) return [];

    return [
      {
        code: demoReservationCode(index),
        customerEmail: DEMO_CUSTOMER_EMAIL,
        routeId: booking.routeId,
        components,
        passengerCount: booking.seats,
        grossTotal,
        milesUsed: 0,
        discountApplied: 0,
        netTotal: grossTotal,
        status: 'confirmada' as const,
        pendingMiles: 0,
        milesCredited: false,
        returnArrivalUtcMs: returnArrival,
      },
    ];
  });
}

/**
 * Completed corporate trip used to demonstrate mileage accrual (5.2, D-1).
 *
 * The PA-1.10 demo reservations are future retail trips, so nothing would
 * ever accrue in a demo session. This purchase is a round trip that already
 * finished: it starts uncredited with its pending miles, so the lazy
 * `applyDueAccrual` transition credits them on session start and the
 * corporate balance visibly reflects the earned miles. It belongs to the
 * corporate demo account and uses the independent `CN-9xxx` range (D-10).
 */
export function buildAccrualDemoPurchases(referenceDateISO: string): Purchase[] {
  const connection = FLIGHT_CONNECTIONS.find(
    (candidate) => candidate.id === 'sdq-sju',
  );
  const outbound = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === 'CN101',
  );
  const returning = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === 'CN102',
  );
  const distance = distanceMilesForRoute('sdq-sju');
  if (!connection || !outbound || !returning || distance === null) return [];

  // Past operating dates: 14 days before the reference date, returning one
  // week later, so the trip is already completed on session start.
  const outboundDate = lastOperatingDateOnOrBefore(
    addDaysISO(referenceDateISO, -14),
  );
  const returnDate = lastOperatingDateOnOrBefore(
    addDaysISO(outboundDate, 7),
  );
  if (returnDate <= outboundDate) return [];
  const returnArrival = arrivalUtcMs('CN102', returnDate);
  if (!Number.isFinite(returnArrival)) return [];

  const passengerCount = 1;
  const seat = ALL_SEATS[ALL_SEATS.length - 1];
  const components: BookingComponent[] = [
    {
      passengerIndex: 0,
      passengerKind: 'adult',
      leg: 'ida',
      flightNumber: 'CN101',
      date: outboundDate,
      seatId: seat,
      fare: connection.farePerPassenger,
      originAirport: outbound.origin,
      destinationAirport: outbound.destination,
    },
    {
      passengerIndex: 0,
      passengerKind: 'adult',
      leg: 'vuelta',
      flightNumber: 'CN102',
      date: returnDate,
      seatId: seat,
      fare: connection.farePerPassenger,
      originAirport: returning.origin,
      destinationAirport: returning.destination,
    },
  ];
  const grossTotal = connection.farePerPassenger * 2 * passengerCount;

  return [
    {
      code: ACCRUAL_DEMO_CODE,
      customerEmail: ACCRUAL_DEMO_CUSTOMER_EMAIL,
      routeId: 'sdq-sju',
      components,
      passengerCount,
      grossTotal,
      milesUsed: 0,
      discountApplied: 0,
      netTotal: grossTotal,
      status: 'confirmada',
      pendingMiles: distance * 2 * passengerCount,
      milesCredited: false,
      returnArrivalUtcMs: returnArrival,
    },
  ];
}
