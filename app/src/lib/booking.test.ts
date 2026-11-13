import { describe, expect, it, vi } from 'vitest';
import type { DemoCustomer } from '@/data/customers';
import { applyPurchaseConfirmation } from '@/lib/confirmPurchase';
import { localDateTimeToUtc } from '@/lib/dates';
import type { FlightUpdates } from '@/lib/flightUpdate';
import {
  accrualDueMiles,
  buildPurchase,
  isTripCompleted,
  nextReservationCode,
  passengerKinds,
  returnArrivalUtcMs,
  validatePurchase,
  type LegSeatSelection,
  type Purchase,
} from '@/lib/booking';
import type { SearchSelection } from '@/lib/flightSearch';

// Simulates a time-zone conversion failure for one specific wall-clock
// time ('12:34' passes the format guard but the mocked converter throws),
// exercising the try/catch inside returnArrivalUtcMs. All other inputs
// delegate to the real implementation.
vi.mock('@/lib/dates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/dates')>();
  return {
    ...actual,
    localDateTimeToUtc: (
      dateISO: string,
      time: string,
      timeZone: string,
    ) => {
      if (time === '12:34') {
        throw new RangeError('Invalid time value');
      }
      return actual.localDateTimeToUtc(dateISO, time, timeZone);
    },
  };
});

const corporate: DemoCustomer = {
  email: 'corporativo@codenova.demo',
  type: 'Corporativo',
  miles: 10_000,
};

const minorista: DemoCustomer = {
  email: 'minorista@codenova.demo',
  type: 'Minorista',
  miles: 0,
};

function makeSelection(
  overrides: Partial<SearchSelection> = {},
): SearchSelection {
  return {
    routeId: 'sdq-sju',
    originLabel: 'Santo Domingo (SDQ)',
    destinationLabel: 'San Juan (SJU)',
    departureDate: '2026-11-10',
    returnDate: '2026-11-16',
    passengers: { adults: 1, children: 0, infants: 0 },
    totalPassengers: 1,
    outbound: {
      flightNumber: 'CN101',
      originLabel: 'Santo Domingo (SDQ)',
      destinationLabel: 'San Juan (SJU)',
      date: '2026-11-10',
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
      date: '2026-11-16',
      departureTime: '10:30',
      arrivalTime: '11:45',
      arrivalNextDay: false,
      durationMinutes: 75,
      fare: 7_900,
    },
    totalPrice: 15_800,
    ...overrides,
  };
}

const oneSeat: LegSeatSelection = { outbound: ['1A'], return: ['2B'] };

function mustBuild(
  ...args: Parameters<typeof buildPurchase>
): Purchase {
  const purchase = buildPurchase(...args);
  if (!purchase) throw new Error('Expected a valid purchase');
  return purchase;
}

describe('passengerKinds', () => {
  it('orders adults, children, infants preserving counts (P-4)', () => {
    expect(
      passengerKinds({ adults: 2, children: 1, infants: 1 }),
    ).toEqual(['adult', 'adult', 'child', 'infant']);
  });
});

describe('nextReservationCode', () => {
  it('formats sequential CN codes (P-3)', () => {
    expect(nextReservationCode(1)).toBe('CN-0001');
    expect(nextReservationCode(42)).toBe('CN-0042');
    expect(nextReservationCode(12_345)).toBe('CN-12345');
  });
});

describe('validatePurchase', () => {
  it('accepts a valid single-passenger purchase', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 0, minorista)).toBeNull();
  });

  it('rejects wrong seat counts', () => {
    const seats: LegSeatSelection = { outbound: [], return: ['1A'] };
    expect(validatePurchase(makeSelection(), seats, 0, minorista)).not.toBeNull();
  });

  it('rejects invalid seat identifiers', () => {
    const seats: LegSeatSelection = { outbound: ['X9'], return: ['1A'] };
    expect(validatePurchase(makeSelection(), seats, 0, minorista)).not.toBeNull();
  });

  it('rejects duplicate seats within the same leg', () => {
    const selection = makeSelection({
      passengers: { adults: 2, children: 0, infants: 0 },
      totalPassengers: 2,
      totalPrice: 31_600,
    });
    const seats: LegSeatSelection = {
      outbound: ['1A', '1A'],
      return: ['2A', '2B'],
    };
    expect(validatePurchase(selection, seats, 0, minorista)).not.toBeNull();
  });

  it('allows the same seat id on different legs', () => {
    expect(
      validatePurchase(makeSelection(), { outbound: ['1A'], return: ['1A'] }, 0, minorista),
    ).toBeNull();
  });

  it('rejects miles redemption for minoristas', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 1_000, minorista)).not.toBeNull();
  });

  it('rejects redemption above the corporate balance', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 20_000, corporate)).not.toBeNull();
  });

  it('rejects redemption below the 1,000 minimum', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 500, corporate)).not.toBeNull();
  });

  it('rejects a discount larger than the purchase amount', () => {
    const broke: DemoCustomer = { ...corporate, miles: 1_000_000 };
    expect(validatePurchase(makeSelection(), oneSeat, 200_000, broke)).not.toBeNull();
  });

  it('rejects negative, decimal, NaN and infinite miles (H-1)', () => {
    for (const bad of [-1_000, 500.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validatePurchase(makeSelection(), oneSeat, bad, corporate),
      ).not.toBeNull();
    }
  });

  it('accepts exactly zero miles as no redemption', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 0, minorista)).toBeNull();
    expect(validatePurchase(makeSelection(), oneSeat, 0, corporate)).toBeNull();
  });
});

describe('buildPurchase', () => {
  it('creates one component per passenger per leg', () => {
    const selection = makeSelection({
      passengers: { adults: 2, children: 1, infants: 0 },
      totalPassengers: 3,
      totalPrice: 47_400,
    });
    const seats: LegSeatSelection = {
      outbound: ['1A', '1B', '1C'],
      return: ['2A', '2B', '2C'],
    };
    const purchase = mustBuild(selection, seats, 0, minorista, 'CN-0007');
    expect(purchase.code).toBe('CN-0007');
    expect(purchase.components).toHaveLength(6);
    expect(purchase.components.filter((c) => c.leg === 'ida')).toHaveLength(3);
    expect(purchase.components.filter((c) => c.leg === 'vuelta')).toHaveLength(3);
    expect(purchase.components[0]).toMatchObject({
      passengerIndex: 0,
      passengerKind: 'adult',
      leg: 'ida',
      flightNumber: 'CN101',
      date: '2026-11-10',
      seatId: '1A',
      fare: 7_900,
    });
    expect(purchase.grossTotal).toBe(47_400);
    expect(purchase.netTotal).toBe(47_400);
    expect(purchase.status).toBe('confirmada');
    expect(purchase.customerEmail).toBe(minorista.email);
  });

  it('applies the miles discount to the total (10:1)', () => {
    const purchase = mustBuild(makeSelection(), oneSeat, 10_000, corporate, 'CN-0001');
    expect(purchase.milesUsed).toBe(10_000);
    expect(purchase.discountApplied).toBe(1_000);
    expect(purchase.netTotal).toBe(14_800);
  });

  it('computes pending miles for corporates only (D-3)', () => {
    const corporatePurchase = mustBuild(
      makeSelection(),
      oneSeat,
      0,
      corporate,
      'CN-0001',
    );
    // SDQ-SJU = 250 miles/leg x 2 legs x 1 passenger
    expect(corporatePurchase.pendingMiles).toBe(500);

    const minoristaPurchase = mustBuild(
      makeSelection(),
      oneSeat,
      0,
      minorista,
      'CN-0002',
    );
    expect(minoristaPurchase.pendingMiles).toBe(0);
  });
});

describe('buildPurchase rejects invalid input without prior validation (H-2)', () => {
  it('returns null for wrong seat count', () => {
    const seats: LegSeatSelection = { outbound: [], return: ['1A'] };
    expect(buildPurchase(makeSelection(), seats, 0, minorista, 'CN-0001')).toBeNull();
  });

  it('returns null for invalid seat identifiers', () => {
    const seats: LegSeatSelection = { outbound: ['X9'], return: ['1A'] };
    expect(buildPurchase(makeSelection(), seats, 0, minorista, 'CN-0001')).toBeNull();
  });

  it('returns null for duplicate seats within a leg', () => {
    const selection = makeSelection({
      passengers: { adults: 2, children: 0, infants: 0 },
      totalPassengers: 2,
      totalPrice: 31_600,
    });
    const seats: LegSeatSelection = {
      outbound: ['1A', '1A'],
      return: ['2A', '2B'],
    };
    expect(buildPurchase(selection, seats, 0, minorista, 'CN-0001')).toBeNull();
  });

  it('returns null for minorista miles redemption', () => {
    expect(buildPurchase(makeSelection(), oneSeat, 1_000, minorista, 'CN-0001')).toBeNull();
  });

  it('returns null when the discount exceeds the gross total', () => {
    const broke: DemoCustomer = { ...corporate, miles: 1_000_000 };
    expect(buildPurchase(makeSelection(), oneSeat, 200_000, broke, 'CN-0001')).toBeNull();
  });

  it('returns null for negative miles', () => {
    expect(buildPurchase(makeSelection(), oneSeat, -1_000, corporate, 'CN-0001')).toBeNull();
  });
});

describe('buildPurchase gross amount defense (H-5)', () => {
  it('rejects a selection whose totalPrice is inconsistent', () => {
    const tampered = makeSelection({ totalPrice: 16_000 });
    expect(
      buildPurchase(tampered, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('recomputes the gross from leg fares and passengers', () => {
    const selection = makeSelection({
      passengers: { adults: 2, children: 0, infants: 0 },
      totalPassengers: 2,
      totalPrice: 31_600,
    });
    const seats: LegSeatSelection = { outbound: ['1A', '1B'], return: ['2A', '2B'] };
    const purchase = mustBuild(selection, seats, 0, minorista, 'CN-0001');
    expect(purchase.grossTotal).toBe(31_600);
    expect(purchase.netTotal).toBe(31_600);
  });
});

describe('validatePurchase structural guards (4.1.1)', () => {
  const emptySeats: LegSeatSelection = { outbound: [], return: [] };

  it('rejects zero passengers', () => {
    const selection = makeSelection({
      passengers: { adults: 0, children: 0, infants: 0 },
      totalPassengers: 0,
      totalPrice: 0,
    });
    expect(
      validatePurchase(selection, emptySeats, 0, minorista),
    ).not.toBeNull();
    expect(
      buildPurchase(selection, emptySeats, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('rejects a negative passenger count', () => {
    const selection = makeSelection({
      passengers: { adults: -1, children: 2, infants: 0 },
      totalPassengers: 1,
    });
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('rejects a decimal passenger count', () => {
    const selection = makeSelection({
      passengers: { adults: 0.5, children: 0.5, infants: 0 },
      totalPassengers: 1,
    });
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('rejects a passenger sum inconsistent with totalPassengers', () => {
    const selection = makeSelection({
      passengers: { adults: 2, children: 0, infants: 0 },
      totalPassengers: 1,
    });
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('rejects a negative outbound fare', () => {
    const selection = makeSelection();
    selection.outbound = { ...selection.outbound, fare: -100 };
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('rejects a negative return fare', () => {
    const selection = makeSelection();
    selection.returnFlight = { ...selection.returnFlight, fare: -100 };
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('rejects NaN and infinite fares', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const selection = makeSelection();
      selection.returnFlight = { ...selection.returnFlight, fare: bad };
      expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
    }
  });

  it('rejects a negative total price', () => {
    const selection = makeSelection({ totalPrice: -1 });
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('rejects a non-finite total price', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const selection = makeSelection({ totalPrice: bad });
      expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
    }
  });

  it('rejects an unknown flight number on either leg', () => {
    const outboundBad = makeSelection();
    outboundBad.outbound = { ...outboundBad.outbound, flightNumber: 'CN999' };
    expect(validatePurchase(outboundBad, oneSeat, 0, minorista)).not.toBeNull();

    const returnBad = makeSelection();
    returnBad.returnFlight = {
      ...returnBad.returnFlight,
      flightNumber: 'CN999',
    };
    expect(validatePurchase(returnBad, oneSeat, 0, minorista)).not.toBeNull();
    expect(
      buildPurchase(returnBad, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('rejects a leg date inconsistent with departureDate', () => {
    const selection = makeSelection();
    selection.outbound = { ...selection.outbound, date: '2026-11-11' };
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('rejects a return leg date inconsistent with returnDate', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      date: '2026-11-17',
    };
    expect(validatePurchase(selection, oneSeat, 0, minorista)).not.toBeNull();
  });

  it('returns an error instead of throwing on malformed input', () => {
    const garbage = { totalPassengers: -1 } as unknown as SearchSelection;
    const seats = {} as LegSeatSelection;
    expect(() =>
      validatePurchase(garbage, seats, 0, minorista),
    ).not.toThrow();
    expect(validatePurchase(garbage, seats, 0, minorista)).not.toBeNull();
    expect(() =>
      buildPurchase(garbage, seats, 0, minorista, 'CN-0001'),
    ).not.toThrow();
  });

  it('still accepts a legitimate CU-03 selection', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 0, minorista)).toBeNull();
    expect(
      buildPurchase(makeSelection(), oneSeat, 0, minorista, 'CN-0001'),
    ).not.toBeNull();
  });
});

describe('returnArrivalUtcMs and trip completion (D-1)', () => {
  const selection = makeSelection();
  const purchase: Purchase = mustBuild(selection, oneSeat, 0, minorista, 'CN-0001');
  const arrivalMs = returnArrivalUtcMs(selection);

  it('computes the return arrival as a UTC instant', () => {
    expect(Number.isFinite(arrivalMs)).toBe(true);
    // CN102 departs SJU 2026-11-16 10:30 (UTC-4) + 75 min -> 15:45 UTC
    expect(new Date(arrivalMs).toISOString()).toBe('2026-11-16T15:45:00.000Z');
    expect(purchase.returnArrivalUtcMs).toBe(arrivalMs);
  });

  it('is not completed before the return arrival', () => {
    expect(isTripCompleted(purchase, arrivalMs - 1)).toBe(false);
    expect(accrualDueMiles(purchase, arrivalMs - 1)).toBe(0);
  });

  it('is completed after the return arrival', () => {
    expect(isTripCompleted(purchase, arrivalMs + 1)).toBe(true);
    // minorista purchase has no pending miles
    expect(accrualDueMiles(purchase, arrivalMs + 1)).toBe(0);
  });

  it('accrues pending miles once completed for corporates', () => {
    const corpPurchase = mustBuild(selection, oneSeat, 0, corporate, 'CN-0003');
    expect(accrualDueMiles(corpPurchase, arrivalMs + 1)).toBe(500);
    corpPurchase.milesCredited = true;
    expect(accrualDueMiles(corpPurchase, arrivalMs + 1)).toBe(0);
  });

  it('never completes when cancelled (v2.10)', () => {
    const cancelled: Purchase = { ...purchase, status: 'cancelada' };
    expect(isTripCompleted(cancelled, arrivalMs + 1)).toBe(false);
    expect(accrualDueMiles(cancelled, arrivalMs + 1)).toBe(0);
  });
});

describe('returnArrivalUtcMs invalid input protection (4.1.2)', () => {
  it('returns NaN for an impossible return time', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      departureTime: '99:99',
    };
    expect(returnArrivalUtcMs(selection)).toBeNaN();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('returns NaN for incomplete or malformed return times', () => {
    for (const bad of ['7:30', '10:', ':30', '1030', '10:60', '24:00']) {
      const selection = makeSelection();
      selection.returnFlight = {
        ...selection.returnFlight,
        departureTime: bad,
      };
      expect(returnArrivalUtcMs(selection)).toBeNaN();
      expect(
        buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
      ).toBeNull();
    }
  });

  it('returns NaN for an invalid return date', () => {
    const selection = makeSelection();
    selection.returnDate = '2026-13-40';
    selection.returnFlight = {
      ...selection.returnFlight,
      date: '2026-13-40',
    };
    expect(returnArrivalUtcMs(selection)).toBeNaN();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('returns NaN when the return date is absent', () => {
    const selection = makeSelection();
    selection.returnDate = undefined as unknown as string;
    selection.returnFlight = {
      ...selection.returnFlight,
      date: undefined as unknown as string,
    };
    expect(() => returnArrivalUtcMs(selection)).not.toThrow();
    expect(returnArrivalUtcMs(selection)).toBeNaN();
    expect(() =>
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).not.toThrow();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('returns NaN when the return time is absent', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      departureTime: undefined as unknown as string,
    };
    expect(returnArrivalUtcMs(selection)).toBeNaN();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('returns NaN when the zone conversion cannot produce an instant', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      departureTime: '12:34',
    };
    expect(() => returnArrivalUtcMs(selection)).not.toThrow();
    expect(returnArrivalUtcMs(selection)).toBeNaN();
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001'),
    ).toBeNull();
  });

  it('keeps the expected UTC instant for a valid return leg', () => {
    const selection = makeSelection();
    // CN102 departs SJU 2026-11-16 10:30 (UTC-4) + 75 min -> 15:45 UTC
    const expected = Date.parse('2026-11-16T15:45:00.000Z');
    expect(returnArrivalUtcMs(selection)).toBe(expected);
    expect(
      buildPurchase(selection, oneSeat, 0, minorista, 'CN-0001')
        ?.returnArrivalUtcMs,
    ).toBe(expected);
  });

  it('applyPurchaseConfirmation returns a controlled error and keeps state', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      departureTime: '99:99',
    };
    const purchases: Purchase[] = [];
    const custs: DemoCustomer[] = [minorista];
    const result = applyPurchaseConfirmation(
      purchases,
      custs,
      minorista.email,
      { selection, seats: oneSeat, milesUsed: 0 },
      Date.now(),
      '2026-11-02',
    );
    expect(result.ok).toBe(false);
    expect(purchases).toHaveLength(0);
    expect(custs).toHaveLength(1);
    expect(custs[0]).toEqual(minorista);
  });
});

describe('CU-07 — purchase validation with schedule updates', () => {
  // CN101 departs SDQ 2026-11-10 08:00; CN102 departs SJU 2026-11-16 10:30.
  const cn101DepMs = localDateTimeToUtc(
    '2026-11-10',
    '08:00',
    'America/Santo_Domingo',
  ).getTime();
  const updates: FlightUpdates = {
    CN101: [
      {
        departureLocal: '09:30',
        durationMinutes: 90,
        effectiveAtMs: cn101DepMs - 1_000,
      },
    ],
  };

  function freshSelection(): SearchSelection {
    const selection = makeSelection();
    selection.outbound = {
      ...selection.outbound,
      departureTime: '09:30',
      arrivalTime: '11:00',
      durationMinutes: 90,
    };
    return selection;
  }

  it('rejects a stale selection captured before the update', () => {
    expect(
      validatePurchase(makeSelection(), oneSeat, 0, minorista, updates),
    ).toBe('La información del vuelo cambió; realiza una nueva búsqueda.');
    expect(
      buildPurchase(makeSelection(), oneSeat, 0, minorista, 'CN-0001', updates),
    ).toBeNull();
  });

  it('accepts a selection matching the updated schedule', () => {
    expect(
      validatePurchase(freshSelection(), oneSeat, 0, minorista, updates),
    ).toBeNull();
    const purchase = buildPurchase(
      freshSelection(),
      oneSeat,
      0,
      minorista,
      'CN-0001',
      updates,
    );
    expect(purchase).not.toBeNull();
  });

  it('keeps base behavior when no updates exist', () => {
    expect(validatePurchase(makeSelection(), oneSeat, 0, minorista)).toBeNull();
    expect(validatePurchase(makeSelection(), oneSeat, 0, minorista, {})).toBeNull();
  });

  it('returnArrivalUtcMs uses the resolved duration and departure', () => {
    const cn102DepMs = localDateTimeToUtc(
      '2026-11-16',
      '10:30',
      'America/Puerto_Rico',
    ).getTime();
    const returnUpdates: FlightUpdates = {
      CN102: [
        {
          departureLocal: '12:00',
          durationMinutes: 90,
          effectiveAtMs: cn102DepMs - 1_000,
        },
      ],
    };
    // Fresh selection carries the updated departure; duration resolves
    // from the schedule in effect: 12:00 SJU (UTC-4) + 90 min -> 17:30 UTC.
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      departureTime: '12:00',
      durationMinutes: 90,
    };
    expect(returnArrivalUtcMs(selection, returnUpdates)).toBe(
      Date.parse('2026-11-16T17:30:00.000Z'),
    );
    // Without updates the base schedule still applies.
    expect(returnArrivalUtcMs(makeSelection())).toBe(
      Date.parse('2026-11-16T15:45:00.000Z'),
    );
  });
});
