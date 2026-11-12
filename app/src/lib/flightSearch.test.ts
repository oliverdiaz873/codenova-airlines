import { describe, expect, it } from 'vitest';
import {
  buildSearchSelection,
  isValidSearchSelection,
  searchFlights,
  type SearchCriteria,
  type SearchSelection,
} from '@/lib/flightSearch';

// Real scheduled values: CN101 SDQ->SJU dep 08:00 (+75min) arrives 09:15;
// CN102 SJU->SDQ dep 10:30 (+75min) arrives 11:45 (all UTC-4 zones).
const validSelection: SearchSelection = {
  routeId: 'sdq-sju',
  originLabel: 'Santo Domingo (SDQ)',
  destinationLabel: 'San Juan (SJU)',
  departureDate: '2026-11-09',
  returnDate: '2026-11-11',
  passengers: { adults: 2, children: 1, infants: 0 },
  totalPassengers: 3,
  outbound: {
    flightNumber: 'CN101',
    originLabel: 'Santo Domingo (SDQ)',
    destinationLabel: 'San Juan (SJU)',
    date: '2026-11-09',
    departureTime: '08:00',
    arrivalTime: '09:15',
    arrivalNextDay: false,
    durationMinutes: 75,
    fare: 7_900,
  },
  returnFlight: {
    flightNumber: 'CN102',
    originLabel: 'San Juan (SJU)',
    destinationLabel: 'Santo Domingo (SDQ)',
    date: '2026-11-11',
    departureTime: '10:30',
    arrivalTime: '11:45',
    arrivalNextDay: false,
    durationMinutes: 75,
    fare: 7_900,
  },
  totalPrice: 7_900 * 2 * 3,
};

function clone(): SearchSelection {
  return structuredClone(validSelection);
}

describe('isValidSearchSelection', () => {
  it('accepts a selection produced by CU-03', () => {
    expect(isValidSearchSelection(validSelection)).toBe(true);
    expect(isValidSearchSelection(clone())).toBe(true);
  });

  it('rejects non-objects and null', () => {
    for (const bad of [null, undefined, 'selection', 42, []]) {
      expect(isValidSearchSelection(bad)).toBe(false);
    }
  });

  it('rejects an unknown routeId', () => {
    const s = clone();
    s.routeId = 'sdq-xxx';
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects invalid or incoherent dates', () => {
    const badDeparture = clone();
    badDeparture.departureDate = '2026-13-40';
    expect(isValidSearchSelection(badDeparture)).toBe(false);

    const badReturn = clone();
    badReturn.returnDate = '2026-11-01';
    expect(isValidSearchSelection(badReturn)).toBe(false);

    const legDateMismatch = clone();
    legDateMismatch.outbound.date = '2026-11-10';
    expect(isValidSearchSelection(legDateMismatch)).toBe(false);

    const returnLegMismatch = clone();
    returnLegMismatch.returnFlight.date = '2026-11-12';
    expect(isValidSearchSelection(returnLegMismatch)).toBe(false);
  });

  it('rejects invalid passenger counts', () => {
    const negative = clone();
    negative.passengers.adults = -1;
    negative.totalPassengers = 2;
    expect(isValidSearchSelection(negative)).toBe(false);

    const decimal = clone();
    decimal.passengers.children = 1.5;
    expect(isValidSearchSelection(decimal)).toBe(false);

    const nan = clone();
    nan.passengers.infants = Number.NaN;
    expect(isValidSearchSelection(nan)).toBe(false);
  });

  it('rejects passenger sum mismatches and invalid totals', () => {
    const mismatch = clone();
    mismatch.passengers.infants = 1; // sum becomes 4, total stays 3
    expect(isValidSearchSelection(mismatch)).toBe(false);

    const zero = clone();
    zero.totalPassengers = 0;
    zero.passengers = { adults: 0, children: 0, infants: 0 };
    expect(isValidSearchSelection(zero)).toBe(false);

    const overLimit = clone();
    overLimit.totalPassengers = 31;
    overLimit.passengers = { adults: 31, children: 0, infants: 0 };
    expect(isValidSearchSelection(overLimit)).toBe(false);

    const missing = clone();
    // @ts-expect-error - intentionally malformed input
    delete missing.passengers;
    expect(isValidSearchSelection(missing)).toBe(false);
  });

  it('rejects incomplete or mistyped leg summaries', () => {
    const noOutbound = clone();
    // @ts-expect-error - intentionally malformed input
    delete noOutbound.outbound;
    expect(isValidSearchSelection(noOutbound)).toBe(false);

    const badDuration = clone();
    // @ts-expect-error - intentionally malformed input
    badDuration.outbound.durationMinutes = '75';
    expect(isValidSearchSelection(badDuration)).toBe(false);

    const badNextDay = clone();
    // @ts-expect-error - intentionally malformed input
    badNextDay.returnFlight.arrivalNextDay = 'no';
    expect(isValidSearchSelection(badNextDay)).toBe(false);

    const emptyFlight = clone();
    emptyFlight.outbound.flightNumber = '';
    expect(isValidSearchSelection(emptyFlight)).toBe(false);
  });

  it('rejects fares inconsistent with the connection', () => {
    const wrongFare = clone();
    wrongFare.outbound.fare = 8_000;
    expect(isValidSearchSelection(wrongFare)).toBe(false);

    const wrongReturnFare = clone();
    wrongReturnFare.returnFlight.fare = 7_000;
    expect(isValidSearchSelection(wrongReturnFare)).toBe(false);
  });

  it('rejects invalid or inconsistent totalPrice', () => {
    const negative = clone();
    negative.totalPrice = -1;
    expect(isValidSearchSelection(negative)).toBe(false);

    const nan = clone();
    nan.totalPrice = Number.NaN;
    expect(isValidSearchSelection(nan)).toBe(false);

    const infinite = clone();
    infinite.totalPrice = Number.POSITIVE_INFINITY;
    expect(isValidSearchSelection(infinite)).toBe(false);

    const mismatched = clone();
    mismatched.totalPrice = validSelection.totalPrice + 100;
    expect(isValidSearchSelection(mismatched)).toBe(false);
  });
});

describe('isValidSearchSelection — coherence with SCHEDULED_SERVICES', () => {
  it('accepts a selection built by buildSearchSelection (CU-03)', () => {
    const criteria: SearchCriteria = {
      routeId: 'sdq-sju',
      departureDate: '2026-11-09',
      returnDate: '2026-11-11',
      adults: 2,
      children: 1,
      infants: 0,
    };
    const results = searchFlights(criteria, '2026-11-02');
    expect(results.outbound.length).toBeGreaterThan(0);
    expect(results.returnOptions.length).toBeGreaterThan(0);
    const selection = buildSearchSelection(
      criteria,
      results.outbound[0],
      results.returnOptions[0],
    );
    expect(selection).not.toBeNull();
    expect(isValidSearchSelection(selection)).toBe(true);
  });

  it('rejects a flight number that does not exist', () => {
    const s = clone();
    s.outbound.flightNumber = 'XX999';
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a flight from another route', () => {
    const s = clone();
    s.outbound.flightNumber = 'CN201'; // sdq-aua service
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects an outbound leg flying the reverse direction', () => {
    const s = clone();
    s.outbound.flightNumber = 'CN102'; // SJU -> SDQ
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a return leg flying the wrong direction', () => {
    const s = clone();
    s.returnFlight.flightNumber = 'CN101'; // SDQ -> SJU
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a date on which the service does not operate', () => {
    const s = clone();
    s.departureDate = '2026-11-10'; // Tuesday: not Mon/Wed/Fri
    s.outbound.date = '2026-11-10';
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a manipulated departure time', () => {
    const s = clone();
    s.outbound.departureTime = '07:00';
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a manipulated arrival time', () => {
    const s = clone();
    s.outbound.arrivalTime = '10:00';
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects a manipulated duration', () => {
    const s = clone();
    s.outbound.durationMinutes = 80;
    expect(isValidSearchSelection(s)).toBe(false);
  });

  it('rejects wrong airport labels', () => {
    const s = clone();
    s.outbound.originLabel = 'Fake City (XXX)';
    expect(isValidSearchSelection(s)).toBe(false);

    const s2 = clone();
    s2.returnFlight.destinationLabel = 'Santiago (STI)';
    expect(isValidSearchSelection(s2)).toBe(false);
  });

  it('rejects an incoherent arrivalNextDay flag', () => {
    const s = clone();
    s.outbound.arrivalNextDay = true; // real arrival is same-day
    expect(isValidSearchSelection(s)).toBe(false);
  });
});
