import { describe, expect, it } from 'vitest';
import type { DemoCustomer } from '@/data/customers';
import { applyDueAccrual } from '@/lib/accrual';
import type { Purchase } from '@/lib/booking';

const corporate: DemoCustomer = {
  email: 'corp@demo',
  type: 'Corporativo',
  miles: 10_000,
};
const minorista: DemoCustomer = {
  email: 'minor@demo',
  type: 'Minorista',
  miles: 0,
};

const customers = [corporate, minorista];

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
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

describe('applyDueAccrual', () => {
  it('credits pending miles to the owning account after return arrival', () => {
    const result = applyDueAccrual([makePurchase()], customers, 2_000);
    expect(result.changed).toBe(true);
    expect(result.customers.find((c) => c.email === corporate.email)?.miles).toBe(10_500);
    expect(result.purchases[0].milesCredited).toBe(true);
  });

  it('is idempotent: a second pass credits nothing', () => {
    const first = applyDueAccrual([makePurchase()], customers, 2_000);
    const second = applyDueAccrual(first.purchases, first.customers, 3_000);
    expect(second.changed).toBe(false);
    expect(second.customers).toBe(first.customers);
    expect(second.purchases).toBe(first.purchases);
  });

  it('does not credit before the return arrival instant', () => {
    const result = applyDueAccrual([makePurchase()], customers, 1_000);
    expect(result.changed).toBe(false);
  });

  it('never credits cancelled purchases', () => {
    const result = applyDueAccrual(
      [makePurchase({ status: 'cancelada' })],
      customers,
      2_000,
    );
    expect(result.changed).toBe(false);
  });

  it('does not credit unconfirmed or already credited purchases', () => {
    const result = applyDueAccrual(
      [makePurchase({ milesCredited: true })],
      customers,
      2_000,
    );
    expect(result.changed).toBe(false);
  });

  it('sums multiple purchases for the same customer', () => {
    const purchases = [
      makePurchase({ code: 'CN-0001', pendingMiles: 500 }),
      makePurchase({ code: 'CN-0002', pendingMiles: 300 }),
    ];
    const result = applyDueAccrual(purchases, customers, 2_000);
    expect(result.customers.find((c) => c.email === corporate.email)?.miles).toBe(10_800);
    expect(result.purchases.every((p) => p.milesCredited)).toBe(true);
  });

  it('ignores purchases whose owner is not in the customer list', () => {
    const orphan = makePurchase({ customerEmail: 'ghost@demo' });
    const result = applyDueAccrual([orphan], customers, 2_000);
    expect(result.changed).toBe(false);
    expect(orphan.milesCredited).toBe(false);
  });
});
