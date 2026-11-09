/**
 * Demonstration bookings used as deterministic seat occupancy (CU-03).
 * Source: PLAN_CODENOVA.md — sections 3.6 (PA-1.10), 3.9, 4.4
 *
 * These bookings represent the demonstration reservations approved in
 * PA-1.10 (confirmed round trip, cancelable, outside the refund window).
 * Until CU-04/CU-06 exist, they only discount seat availability on the
 * specific flight occurrences they occupy. Dates are anchored to operating
 * days relative to the reference date so they always fall inside the
 * 30-day search horizon.
 */

import {
  addDaysISO,
  lastOperatingDateOnOrBefore,
  nextOperatingDateOnOrAfter,
} from '@/lib/dates';

export type DemoScenario = 'confirmada' | 'cancelable' | 'fuera-de-plazo';

export interface DemoBooking {
  id: string;
  /** PA-1.10 scenario this booking represents. */
  scenario: DemoScenario;
  /** Connection shared by the outbound and return legs. */
  routeId: string;
  outboundFlightNumber: string;
  returnFlightNumber: string;
  /** Departure is the first operating day on or after today + this many days. */
  departureMinDays: number;
  /** Return is the first operating day on or after departure + this many days. */
  returnGapDays: number;
  /** Seats occupied on each leg occurrence (infants included). */
  seats: number;
}

export const SEARCH_HORIZON_DAYS = 30;

export const DEMO_BOOKINGS: DemoBooking[] = [
  {
    id: 'demo-confirmada',
    scenario: 'confirmada',
    routeId: 'sdq-sju',
    outboundFlightNumber: 'CN101',
    returnFlightNumber: 'CN102',
    departureMinDays: 1,
    returnGapDays: 7,
    seats: 2,
  },
  {
    id: 'demo-cancelable',
    scenario: 'cancelable',
    routeId: 'sdq-mia',
    outboundFlightNumber: 'CN301',
    returnFlightNumber: 'CN302',
    departureMinDays: 7,
    returnGapDays: 5,
    seats: 1,
  },
  {
    id: 'demo-fuera-plazo',
    scenario: 'fuera-de-plazo',
    routeId: 'jbq-hav',
    outboundFlightNumber: 'CN501',
    returnFlightNumber: 'CN502',
    departureMinDays: 1,
    returnGapDays: 3,
    seats: 1,
  },
];

export interface ResolvedDemoBooking extends DemoBooking {
  outboundDate: string;
  returnDate: string;
}

function clampToHorizon(
  candidate: string,
  referenceDateISO: string,
  horizonEndISO: string,
): string {
  if (candidate <= horizonEndISO) return candidate;
  const fallback = lastOperatingDateOnOrBefore(horizonEndISO);
  return fallback >= referenceDateISO ? fallback : candidate;
}

/** Resolves the deterministic dates of every demo booking for a reference day. */
export function resolveDemoBookings(referenceDateISO: string): ResolvedDemoBooking[] {
  const horizonEnd = addDaysISO(referenceDateISO, SEARCH_HORIZON_DAYS);
  return DEMO_BOOKINGS.map((booking) => {
    const departureDate = clampToHorizon(
      nextOperatingDateOnOrAfter(addDaysISO(referenceDateISO, booking.departureMinDays)),
      referenceDateISO,
      horizonEnd,
    );
    const returnCandidate = nextOperatingDateOnOrAfter(
      addDaysISO(departureDate, booking.returnGapDays),
    );
    const returnDate =
      returnCandidate <= horizonEnd
        ? returnCandidate
        : clampToHorizon(returnCandidate, referenceDateISO, horizonEnd);
    return { ...booking, outboundDate: departureDate, returnDate };
  });
}

/**
 * Occupied seats per occurrence, keyed as `${flightNumber}|${YYYY-MM-DD}`.
 * Deterministic for a given reference date; resets on page reload.
 */
export function buildOccupancyMap(referenceDateISO: string): Map<string, number> {
  const occupancy = new Map<string, number>();
  for (const booking of resolveDemoBookings(referenceDateISO)) {
    const legs = [
      [booking.outboundFlightNumber, booking.outboundDate],
      [booking.returnFlightNumber, booking.returnDate],
    ] as const;
    for (const [flightNumber, date] of legs) {
      const key = `${flightNumber}|${date}`;
      occupancy.set(key, (occupancy.get(key) ?? 0) + booking.seats);
    }
  }
  return occupancy;
}
