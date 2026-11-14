import { describe, expect, it } from 'vitest';
import { localDateTimeToUtc } from '@/lib/dates';
import type { FlightUpdates } from '@/lib/flightUpdate';
import type { ConnectionUpdates } from '@/lib/connectionUpdate';
import {
  buildSearchSelection,
  canContinueSearch,
  isValidSearchSelection,
  matchesDepartureTimeSlot,
  searchFlights,
  suggestAlternativeDates,
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

describe('CU-03 — departure time slot (PR #1)', () => {
  const criteria: SearchCriteria = {
    routeId: 'sdq-sju',
    departureDate: '2026-11-09',
    returnDate: '2026-11-11',
    adults: 1,
    children: 0,
    infants: 0,
  };

  it('returns every outbound occurrence when no slot is chosen', () => {
    expect(searchFlights(criteria, '2026-11-02').outbound).toHaveLength(2);
    expect(
      searchFlights({ ...criteria, departureTimeSlot: 'any' }, '2026-11-02')
        .outbound,
    ).toHaveLength(2);
  });

  it('matchesDepartureTimeSlot covers the three ranges and overnight', () => {
    expect(matchesDepartureTimeSlot('08:00', 'morning')).toBe(true);
    expect(matchesDepartureTimeSlot('12:00', 'morning')).toBe(false);
    expect(matchesDepartureTimeSlot('12:00', 'afternoon')).toBe(true);
    expect(matchesDepartureTimeSlot('18:00', 'evening')).toBe(true);
    expect(matchesDepartureTimeSlot('04:59', 'evening')).toBe(true);
    expect(matchesDepartureTimeSlot('05:00', 'evening')).toBe(false);
    expect(matchesDepartureTimeSlot('23:59', undefined)).toBe(true);
  });

  it('filters outbound occurrences inside the slot', () => {
    const morning = searchFlights(
      { ...criteria, departureTimeSlot: 'morning' },
      '2026-11-02',
    );
    expect(morning.outbound.map((o) => o.service.flightNumber)).toEqual([
      'CN101',
    ]);
    expect(morning.outbound[0].departureTime).toBe('08:00');
  });

  it('keeps the afternoon departure CN103 at 17:00', () => {
    const afternoon = searchFlights(
      { ...criteria, departureTimeSlot: 'afternoon' },
      '2026-11-02',
    );
    expect(afternoon.outbound.map((o) => o.service.flightNumber)).toEqual([
      'CN103',
    ]);
  });

  it('returns no outbound options when no departure matches the slot', () => {
    const none = searchFlights(
      { ...criteria, departureTimeSlot: 'evening' },
      '2026-11-02',
    );
    expect(none.outbound).toHaveLength(0);
  });

  it('does not filter the return leg', () => {
    const results = searchFlights(
      { ...criteria, departureTimeSlot: 'morning' },
      '2026-11-02',
    );
    // CN102 departs SJU at 10:30; the slot applies to the outbound leg only.
    expect(results.returnOptions.map((o) => o.service.flightNumber)).toContain(
      'CN102',
    );
  });

  it('filters by the effective CU-07 schedule, not the base one', () => {
    const departureMs = localDateTimeToUtc(
      '2026-11-09',
      '08:00',
      'America/Santo_Domingo',
    ).getTime();
    // Move CN101 08:00 -> 12:30 so it leaves the morning slot: the filter
    // must use the effective schedule, not the base one.
    const afternoonUpdates: FlightUpdates = {
      CN101: [
        {
          departureLocal: '12:30',
          durationMinutes: 90,
          effectiveAtMs: departureMs - 1_000,
        },
      ],
    };
    // Base schedule would keep CN101 in the morning slot; the update moves
    // it to the afternoon, so morning returns nothing and afternoon both.
    expect(
      searchFlights(
        { ...criteria, departureTimeSlot: 'morning' },
        '2026-11-02',
        afternoonUpdates,
      ).outbound,
    ).toEqual([]);
    expect(
      searchFlights(
        { ...criteria, departureTimeSlot: 'afternoon' },
        '2026-11-02',
        afternoonUpdates,
      ).outbound.map((o) => o.service.flightNumber),
    ).toEqual(['CN101', 'CN103']);
  });

  it('blocks continuing when the selected outbound is outside the slot', () => {
    const results = searchFlights(criteria, '2026-11-02');
    expect(
      canContinueSearch(
        { ...criteria, departureTimeSlot: 'evening' },
        results.outbound[0],
        results.returnOptions[0],
      ),
    ).toBe(false);
    expect(
      canContinueSearch(criteria, results.outbound[0], results.returnOptions[0]),
    ).toBe(true);
  });

  it('only suggests dates with an outbound inside the slot', () => {
    const suggestions = suggestAlternativeDates(
      { ...criteria, departureTimeSlot: 'afternoon' },
      '2026-11-02',
      3,
    );
    expect(suggestions.length).toBeGreaterThan(0);
    for (const date of suggestions) {
      const day = searchFlights(
        { ...criteria, departureTimeSlot: 'afternoon', departureDate: date },
        '2026-11-02',
      );
      expect(day.outbound.map((o) => o.service.flightNumber)).toEqual(['CN103']);
    }

    // A slot with no scheduled departure produces no suggestions.
    expect(
      suggestAlternativeDates(
        { ...criteria, departureTimeSlot: 'evening' },
        '2026-11-02',
        3,
      ),
    ).toEqual([]);
  });
});

describe('CU-07 — availability in search results', () => {
  const criteria: SearchCriteria = {
    routeId: 'sdq-sju',
    departureDate: '2026-11-09',
    returnDate: '2026-11-11',
    adults: 1,
    children: 0,
    infants: 0,
  };
  const departureMs = localDateTimeToUtc(
    '2026-11-09',
    '08:00',
    'America/Santo_Domingo',
  ).getTime();
  const updates: FlightUpdates = {
    CN101: [
      {
        departureLocal: '08:00',
        durationMinutes: 75,
        available: false,
        effectiveAtMs: departureMs - 1_000,
      },
    ],
  };

  it('marks every occurrence available by default', () => {
    const results = searchFlights(criteria, '2026-11-02');
    expect(results.outbound.every((o) => o.available)).toBe(true);
    expect(results.returnOptions.every((o) => o.available)).toBe(true);
  });

  it('keeps the unavailable flight listed but flagged (D-8)', () => {
    const results = searchFlights(criteria, '2026-11-02', updates);
    const cn101 = results.outbound.find(
      (o) => o.service.flightNumber === 'CN101',
    )!;
    expect(cn101.available).toBe(false);
    expect(results.outbound).toHaveLength(2);
  });

  it('blocks continuing with an unavailable outbound or return', () => {
    const results = searchFlights(criteria, '2026-11-02', updates);
    const cn101 = results.outbound.find(
      (o) => o.service.flightNumber === 'CN101',
    )!;
    expect(
      canContinueSearch(criteria, cn101, results.returnOptions[0]),
    ).toBe(false);

    const returnUpdates: FlightUpdates = {
      CN102: [
        {
          departureLocal: '10:30',
          durationMinutes: 75,
          available: false,
          effectiveAtMs:
            localDateTimeToUtc(
              '2026-11-11',
              '10:30',
              'America/Santo_Domingo',
            ).getTime() - 1_000,
        },
      ],
    };
    const withReturn = searchFlights(criteria, '2026-11-02', returnUpdates);
    expect(
      canContinueSearch(criteria, withReturn.outbound[0], withReturn.returnOptions[0]),
    ).toBe(false);
  });

  it('keeps the availability of a past occurrence historical', () => {
    const past = searchFlights(
      { ...criteria, departureDate: '2026-11-06', returnDate: '2026-11-09' },
      '2026-11-02',
      updates,
    );
    // The update was recorded just before the 11-09 departure, so the
    // 11-06 occurrence keeps its historical (available) state.
    expect(
      past.outbound.find((o) => o.service.flightNumber === 'CN101')!.available,
    ).toBe(true);
  });
});

describe('CU-07 — connection destination (D-6/D-7)', () => {
  const criteria: SearchCriteria = {
    routeId: 'sdq-sju',
    departureDate: '2026-11-09',
    returnDate: '2026-11-11',
    adults: 1,
    children: 0,
    infants: 0,
  };
  const departureMs = localDateTimeToUtc(
    '2026-11-09',
    '08:00',
    'America/Santo_Domingo',
  ).getTime();
  const updates: ConnectionUpdates = {
    'sdq-sju': [
      { destinationIata: 'MIA', effectiveAtMs: departureMs - 1_000 },
    ],
  };

  it('moves both legs and the fare to the effective destination', () => {
    const results = searchFlights(criteria, '2026-11-02', undefined, updates);
    expect(
      results.outbound.every(
        (o) => o.service.origin.iata === 'SDQ' && o.service.destination.iata === 'MIA',
      ),
    ).toBe(true);
    expect(
      results.returnOptions.every(
        (o) => o.service.origin.iata === 'MIA' && o.service.destination.iata === 'SDQ',
      ),
    ).toBe(true);
    expect(
      results.outbound.every((o) => o.farePerPassenger === 9_900),
    ).toBe(true);
    expect(
      results.returnOptions.every((o) => o.farePerPassenger === 9_900),
    ).toBe(true);
  });

  it('keeps the base route when the first departure already left', () => {
    const late: ConnectionUpdates = {
      'sdq-sju': [
        { destinationIata: 'MIA', effectiveAtMs: departureMs + 1_000 },
      ],
    };
    const results = searchFlights(criteria, '2026-11-02', undefined, late);
    expect(results.outbound[0].service.destination.iata).toBe('SJU');
    expect(results.outbound[0].farePerPassenger).toBe(7_900);
  });

  it('builds a selection with effective labels and fare', () => {
    const results = searchFlights(criteria, '2026-11-02', undefined, updates);
    const selection = buildSearchSelection(
      criteria,
      results.outbound[0],
      results.returnOptions[0],
    )!;
    expect(selection.destinationLabel).toBe('Miami (MIA)');
    expect(selection.outbound.destinationLabel).toBe('Miami (MIA)');
    expect(selection.returnFlight.originLabel).toBe('Miami (MIA)');
    expect(selection.outbound.fare).toBe(9_900);
    expect(selection.totalPrice).toBe(19_800);
    expect(isValidSearchSelection(selection, undefined, updates)).toBe(true);
    // The same selection is stale against the base catalog.
    expect(isValidSearchSelection(selection)).toBe(false);
  });

  it('rejects a selection captured before the destination change', () => {
    const baseResults = searchFlights(criteria, '2026-11-02');
    const stale = buildSearchSelection(
      criteria,
      baseResults.outbound[0],
      baseResults.returnOptions[0],
    )!;
    expect(isValidSearchSelection(stale, undefined, updates)).toBe(false);
  });

  it('keeps a past trip bookable at its historical route and fare', () => {
    const past = { ...criteria, departureDate: '2026-11-06', returnDate: '2026-11-09' };
    const results = searchFlights(past, '2026-11-02', undefined, updates);
    const selection = buildSearchSelection(
      past,
      results.outbound[0],
      results.returnOptions[0],
    )!;
    expect(selection.destinationLabel).toBe('San Juan (SJU)');
    expect(selection.totalPrice).toBe(15_800);
    expect(isValidSearchSelection(selection, undefined, updates)).toBe(true);
  });

  it('suggests dates whose effective pair is consistent', () => {
    const suggestions = suggestAlternativeDates(
      criteria,
      '2026-11-02',
      2,
      undefined,
      updates,
    );
    expect(suggestions.length).toBeGreaterThan(0);
    for (const date of suggestions) {
      const day = searchFlights(
        { ...criteria, departureDate: date },
        '2026-11-02',
        undefined,
        updates,
      );
      expect(
        day.outbound.every((o) => o.service.destination.iata === 'MIA'),
      ).toBe(true);
    }
  });

  it('keeps the departure slot applied to the effective pair', () => {
    const results = searchFlights(
      { ...criteria, departureTimeSlot: 'afternoon' },
      '2026-11-02',
      undefined,
      updates,
    );
    expect(results.outbound.map((o) => o.service.flightNumber)).toEqual([
      'CN103',
    ]);
    expect(results.outbound[0].service.destination.iata).toBe('MIA');
  });
});

describe('CU-07 — schedule updates (flightUpdates)', () => {
  const criteria: SearchCriteria = {
    routeId: 'sdq-sju',
    departureDate: '2026-11-09',
    returnDate: '2026-11-11',
    adults: 1,
    children: 0,
    infants: 0,
  };
  const cn101DepartureMs = localDateTimeToUtc(
    '2026-11-09',
    '08:00',
    'America/Santo_Domingo',
  ).getTime();
  const updates: FlightUpdates = {
    CN101: [
      {
        departureLocal: '09:30',
        durationMinutes: 90,
        effectiveAtMs: cn101DepartureMs - 1_000,
      },
    ],
  };

  it('shows the updated schedule for a future occurrence', () => {
    const results = searchFlights(criteria, '2026-11-02', updates);
    const cn101 = results.outbound.find(
      (o) => o.service.flightNumber === 'CN101',
    )!;
    expect(cn101.departureTime).toBe('09:30');
    expect(cn101.durationMinutes).toBe(90);
    // 09:30 SDQ (UTC-4) + 90 min -> 11:00 SJU (UTC-4), same day.
    expect(cn101.arrivalTime).toBe('11:00');
    expect(cn101.arrivalNextDay).toBe(false);
    // Untouched services keep their schedule.
    const cn103 = results.outbound.find(
      (o) => o.service.flightNumber === 'CN103',
    )!;
    expect(cn103.departureTime).toBe('17:00');
    expect(cn103.durationMinutes).toBe(75);
  });

  it('keeps the base schedule when the update postdates the departure', () => {
    const late: FlightUpdates = {
      CN101: [
        {
          departureLocal: '09:30',
          durationMinutes: 90,
          effectiveAtMs: cn101DepartureMs + 1_000,
        },
      ],
    };
    const results = searchFlights(criteria, '2026-11-02', late);
    const cn101 = results.outbound.find(
      (o) => o.service.flightNumber === 'CN101',
    )!;
    expect(cn101.departureTime).toBe('08:00');
    expect(cn101.durationMinutes).toBe(75);
  });

  it('still respects the operating days', () => {
    const tuesday: SearchCriteria = {
      ...criteria,
      departureDate: '2026-11-10',
    };
    expect(
      searchFlights(tuesday, '2026-11-02', updates).outbound,
    ).toHaveLength(0);
  });

  it('validates a fresh selection and rejects the stale one', () => {
    const results = searchFlights(criteria, '2026-11-02', updates);
    const fresh = buildSearchSelection(
      criteria,
      results.outbound.find((o) => o.service.flightNumber === 'CN101')!,
      results.returnOptions[0],
    )!;
    expect(isValidSearchSelection(fresh, updates)).toBe(true);
    // The same selection is stale against the base schedule.
    expect(isValidSearchSelection(fresh)).toBe(false);

    // A selection captured before the update is stale with updates on.
    const baseResults = searchFlights(criteria, '2026-11-02');
    const stale = buildSearchSelection(
      criteria,
      baseResults.outbound[0],
      baseResults.returnOptions[0],
    )!;
    expect(isValidSearchSelection(stale)).toBe(true);
    expect(isValidSearchSelection(stale, updates)).toBe(false);
  });
});
