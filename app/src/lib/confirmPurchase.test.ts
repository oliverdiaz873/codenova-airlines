import { describe, expect, it } from 'vitest';
import type { DemoCustomer } from '@/data/customers';
import { applyDueAccrual } from '@/lib/accrual';
import type { Purchase } from '@/lib/booking';
import {
  applyPurchaseConfirmation,
  type ConfirmPurchaseInput,
  type ConfirmPurchaseResult,
} from '@/lib/confirmPurchase';
import type { LegSeatSelection } from '@/lib/booking';
import type { SearchSelection } from '@/lib/flightSearch';

const corporate: DemoCustomer = {
  email: 'corporativo@codenova.demo',
  type: 'Corporativo',
  miles: 10_000,
};
const corporateB: DemoCustomer = {
  email: 'corp-b@demo',
  type: 'Corporativo',
  miles: 2_000,
};
const minorista: DemoCustomer = {
  email: 'minorista@codenova.demo',
  type: 'Minorista',
  miles: 0,
};
const customers = [corporate, corporateB, minorista];

const NOW = Date.parse('2026-11-01T00:00:00.000Z');
const REF = '2026-11-02';

function makeSelection(
  overrides: Partial<SearchSelection> = {},
): SearchSelection {
  return {
    routeId: 'sdq-sju',
    originLabel: 'Santo Domingo (SDQ)',
    destinationLabel: 'San Juan (SJU)',
    departureDate: '2026-11-09',
    returnDate: '2026-11-16',
    passengers: { adults: 1, children: 0, infants: 0 },
    totalPassengers: 1,
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

function makeInput(
  seats: LegSeatSelection = { outbound: ['5A'], return: ['5B'] },
  milesUsed = 0,
  selection = makeSelection(),
): ConfirmPurchaseInput {
  return { selection, seats, milesUsed };
}

function makePendingPurchase(
  overrides: Partial<Purchase> = {},
): Purchase {
  return {
    code: 'CN-0001',
    customerEmail: corporate.email,
    routeId: 'sdq-sju',
    components: [],
    passengerCount: 1,
    grossTotal: 15_800,
    milesUsed: 0,
    discountApplied: 0,
    netTotal: 15_800,
    status: 'confirmada',
    pendingMiles: 500,
    milesCredited: false,
    returnArrivalUtcMs: 1_000,
    ...overrides,
  };
}

const confirm = (
  purchases: Purchase[],
  input: ConfirmPurchaseInput,
  activeEmail: string | null = corporate.email,
  custs: DemoCustomer[] = customers,
  nowMs = NOW,
) => applyPurchaseConfirmation(purchases, custs, activeEmail, input, nowMs, REF);

describe('applyPurchaseConfirmation — valid confirmations', () => {
  it('creates CN-0001 and preserves the balance without miles', () => {
    const result = confirm([], makeInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchase.code).toBe('CN-0001');
    expect(result.purchases).toHaveLength(1);
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(10_000);
    expect(result.purchase.pendingMiles).toBe(500);
  });

  it('sequences codes CN-0001, CN-0002 across confirmations', () => {
    const first = confirm([], makeInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = confirm(
      first.purchases,
      makeInput({ outbound: ['6A'], return: ['6B'] }),
      corporate.email,
      first.customers,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.purchase.code).toBe('CN-0002');
  });

  it('deducts redeemed miles exactly once', () => {
    const result = confirm([], makeInput(undefined, 1_000));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchase.milesUsed).toBe(1_000);
    expect(result.purchase.discountApplied).toBe(100);
    expect(result.purchase.netTotal).toBe(15_700);
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(9_000);
  });

  it('confirms for a minorista without touching miles', () => {
    const result = confirm([], makeInput(), minorista.email);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchase.pendingMiles).toBe(0);
    expect(
      result.customers.find((c) => c.email === minorista.email)?.miles,
    ).toBe(0);
  });
});

describe('applyPurchaseConfirmation — atomicity on failure', () => {
  it('rejects a seat occupied by a demo booking', () => {
    const selection = makeSelection({
      departureDate: '2026-11-04',
      returnDate: '2026-11-11',
    });
    const result = confirm(
      [],
      makeInput({ outbound: ['1A'], return: ['5B'] }, 0, selection),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('1A');
  });

  it('rejects a seat occupied by a previous user purchase', () => {
    const first = confirm([], makeInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = confirm(
      first.purchases,
      makeInput(),
      corporate.email,
      first.customers,
    );
    expect(second.ok).toBe(false);
  });

  it('rejects insufficient miles balance', () => {
    const broke: DemoCustomer = { ...corporate, miles: 5_000 };
    const result = confirm(
      [],
      makeInput(undefined, 20_000),
      corporate.email,
      [broke, corporateB, minorista],
    );
    expect(result.ok).toBe(false);
  });

  it('rejects invalid miles amounts', () => {
    for (const bad of [500, 1_500, -1_000, Number.NaN]) {
      const result = confirm([], makeInput(undefined, bad));
      expect(result.ok).toBe(false);
    }
  });

  it('rejects an inconsistent purchase amount (H-5)', () => {
    const selection = makeSelection({ totalPrice: 16_000 });
    const result = confirm([], makeInput(undefined, 0, selection));
    expect(result.ok).toBe(false);
  });

  it('rejects without an active session', () => {
    const result = confirm([], makeInput(), null);
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown session customer', () => {
    const result = confirm([], makeInput(), 'ghost@demo');
    expect(result.ok).toBe(false);
  });

  it('rejects miles redemption for a minorista', () => {
    const result = confirm([], makeInput(undefined, 1_000), minorista.email);
    expect(result.ok).toBe(false);
  });

  it('leaves inputs untouched on failure', () => {
    const purchases: Purchase[] = [];
    const custs = [...customers];
    const before = JSON.stringify({ purchases, custs });
    const selection = makeSelection({
      departureDate: '2026-11-04',
      returnDate: '2026-11-11',
    });
    const result = confirm(
      purchases,
      makeInput({ outbound: ['1A'], return: ['5B'] }, 0, selection),
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify({ purchases, custs })).toBe(before);
  });
});

describe('applyPurchaseConfirmation — lazy accrual before redemption (H-2.1)', () => {
  it('credits pending miles before validating the redemption', () => {
    const pending = makePendingPurchase(); // +500 due at NOW
    const result = confirm(
      [pending],
      makeInput(undefined, 1_000),
      corporate.email,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchases[0].milesCredited).toBe(true);
    // 10,000 + 500 credited - 1,000 redeemed = 9,500 (not 9,000)
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(9_500);
  });

  it('does not credit a cancelled purchase', () => {
    const cancelled = makePendingPurchase({ status: 'cancelada' });
    const result = confirm(
      [cancelled],
      makeInput(undefined, 1_000),
      corporate.email,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchases[0].milesCredited).toBe(false);
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(9_000);
  });

  it('does not credit before the return arrival instant', () => {
    const pending = makePendingPurchase({ returnArrivalUtcMs: NOW + 60_000 });
    const result = confirm(
      [pending],
      makeInput(undefined, 1_000),
      corporate.email,
      customers,
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchases[0].milesCredited).toBe(false);
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(9_000);
  });

  it('credits each corporate owner independently', () => {
    const pendingForB = makePendingPurchase({
      code: 'CN-0007',
      customerEmail: corporateB.email,
      pendingMiles: 300,
    });
    const result = confirm(
      [pendingForB],
      makeInput(undefined, 0),
      corporate.email,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.customers.find((c) => c.email === corporateB.email)?.miles,
    ).toBe(2_300);
    expect(
      result.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(10_000);
  });

  it('does not double-credit on a second confirmation', () => {
    const pending = makePendingPurchase();
    const first = confirm([pending], makeInput(undefined, 0));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = confirm(
      first.purchases,
      makeInput({ outbound: ['6A'], return: ['6B'] }, 1_000),
      corporate.email,
      first.customers,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    // 10,000 + 500 - 1,000 = 9,500 exactly once
    expect(
      second.customers.find((c) => c.email === corporate.email)?.miles,
    ).toBe(9_500);
    expect(second.purchases[0].milesCredited).toBe(true);
  });

  it('discards the whole transition, accrual included, on failure', () => {
    const pending = makePendingPurchase();
    const selection = makeSelection({
      departureDate: '2026-11-04',
      returnDate: '2026-11-11',
    });
    const result = confirm(
      [pending],
      makeInput({ outbound: ['1A'], return: ['5B'] }, 0, selection),
    );
    expect(result.ok).toBe(false);
    // The pending purchase is untouched: accrual remains due for later.
    const stillDue = applyDueAccrual([pending], customers, NOW);
    expect(stillDue.changed).toBe(true);
  });
});

describe('applyPurchaseConfirmation — degenerate inputs (4.1.1)', () => {
  it('rejects zero passengers without throwing or partial state', () => {
    const selection = makeSelection({
      passengers: { adults: 0, children: 0, infants: 0 },
      totalPassengers: 0,
      totalPrice: 0,
    });
    const purchases: Purchase[] = [];
    const custs = [...customers];
    let result: ConfirmPurchaseResult | undefined;
    let threw = false;
    try {
      result = confirm(
        purchases,
        makeInput({ outbound: [], return: [] }, 0, selection),
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result?.ok).toBe(false);
    expect(purchases).toHaveLength(0);
    expect(custs).toEqual(customers);
  });

  it('rejects offsetting negative fares that would pass the gross check', () => {
    // outbound.fare + returnFlight.fare = 0 -> gross 0 === totalPrice 0,
    // so H-5 alone would have accepted this purchase.
    const selection = makeSelection({ totalPrice: 0 });
    selection.outbound = { ...selection.outbound, fare: -7_900 };
    selection.returnFlight = { ...selection.returnFlight, fare: 7_900 };
    const result = confirm([], makeInput(undefined, 0, selection));
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown flight number', () => {
    const selection = makeSelection();
    selection.outbound = { ...selection.outbound, flightNumber: 'CN999' };
    const result = confirm([], makeInput(undefined, 0, selection));
    expect(result.ok).toBe(false);
  });

  it('rejects a leg date inconsistent with the selection dates', () => {
    const selection = makeSelection();
    selection.returnFlight = {
      ...selection.returnFlight,
      date: '2026-11-17',
    };
    const result = confirm([], makeInput(undefined, 0, selection));
    expect(result.ok).toBe(false);
  });

  it('rejects malformed seats and selection without throwing', () => {
    let result: ConfirmPurchaseResult | undefined;
    let threw = false;
    try {
      result = confirm(
        [],
        makeInput(null as unknown as LegSeatSelection),
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result?.ok).toBe(false);

    result = undefined;
    threw = false;
    try {
      result = confirm(
        [],
        { selection: null, seats: { outbound: [], return: [] }, milesUsed: 0 } as unknown as ConfirmPurchaseInput,
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result?.ok).toBe(false);
  });
});

describe('applyPurchaseConfirmation — reservation codes', () => {
  it('does not reuse codes of cancelled purchases', () => {
    const first = confirm([], makeInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const cancelledPurchases = first.purchases.map((p) => ({
      ...p,
      status: 'cancelada' as const,
    }));
    const second = confirm(
      cancelledPurchases,
      makeInput({ outbound: ['6A'], return: ['6B'] }),
      corporate.email,
      first.customers,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.purchase.code).toBe('CN-0002');
    const third = confirm(
      second.purchases,
      makeInput({ outbound: ['7A'], return: ['7B'] }),
      corporate.email,
      second.customers,
    );
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.purchase.code).toBe('CN-0003');
  });

  it('does not consume a code on failed confirmation', () => {
    const selection = makeSelection({
      departureDate: '2026-11-04',
      returnDate: '2026-11-11',
    });
    const failed = confirm(
      [],
      makeInput({ outbound: ['1A'], return: ['5B'] }, 0, selection),
    );
    expect(failed.ok).toBe(false);
    const success = confirm([], makeInput());
    expect(success.ok).toBe(true);
    if (!success.ok) return;
    expect(success.purchase.code).toBe('CN-0001');
  });
});
