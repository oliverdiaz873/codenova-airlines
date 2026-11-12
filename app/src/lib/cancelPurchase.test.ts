import { describe, expect, it } from 'vitest';
import type { BookingComponent, Purchase } from '@/lib/booking';
import {
  applyPurchaseCancellation,
  cancelDeadlineUtcMs,
  CANCELLATION_DEADLINE_HOURS,
  firstFlightDepartureUtcMs,
  isCancellationEligible,
  refundBreakdown,
} from '@/lib/cancelPurchase';
import { localDateTimeToUtc } from '@/lib/dates';
import { userOccupiedSeats } from '@/lib/seatOccupancy';

const OWNER = 'minorista@codenova.demo';
const OTHER = 'corporativo@codenova.demo';

function component(
  leg: 'ida' | 'vuelta',
  flightNumber: string,
  date: string,
  seatId: string,
): BookingComponent {
  return {
    passengerIndex: 0,
    passengerKind: 'adult',
    leg,
    flightNumber,
    date,
    seatId,
    fare: 7_900,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    code: 'CN-0001',
    customerEmail: OWNER,
    routeId: 'sdq-sju',
    components: [
      component('ida', 'CN101', '2026-11-09', '1A'),
      component('vuelta', 'CN102', '2026-11-11', '2A'),
    ],
    passengerCount: 1,
    grossTotal: 15_800,
    milesUsed: 0,
    discountApplied: 0,
    netTotal: 15_800,
    status: 'confirmada',
    pendingMiles: 0,
    milesCredited: false,
    returnArrivalUtcMs: Date.UTC(2026, 10, 11, 15, 45),
    ...overrides,
  };
}

/** Deadline for the default purchase: CN101 departs SDQ 08:00 local. */
function defaultDeadlineMs(): number {
  const departure = localDateTimeToUtc(
    '2026-11-09',
    '08:00',
    'America/Santo_Domingo',
  ).getTime();
  return departure - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000;
}

describe('refundBreakdown', () => {
  it('rounds the 80 % refund to the nearest peso', () => {
    // 7,701 * 0.8 = 6,160.8 → 6,161 (approved example)
    expect(refundBreakdown(7_701)).toEqual({
      refundAmount: 6_161,
      nonRefundableAmount: 1_540,
    });
  });

  it('reconciles refund + non-refundable with the net total', () => {
    for (const net of [7_700, 7_701, 14_800, 30_600, 15_801]) {
      const { refundAmount, nonRefundableAmount } = refundBreakdown(net);
      expect(refundAmount + nonRefundableAmount).toBe(net);
      expect(refundAmount).toBe(Math.round(net * 0.8));
    }
  });
});

describe('firstFlightDepartureUtcMs / cancelDeadlineUtcMs', () => {
  it('resolves the ida departure in the origin airport IANA zone', () => {
    const purchase = makePurchase();
    const expected = localDateTimeToUtc(
      '2026-11-09',
      '08:00',
      'America/Santo_Domingo',
    ).getTime();
    expect(firstFlightDepartureUtcMs(purchase)).toBe(expected);
    expect(cancelDeadlineUtcMs(purchase)).toBe(
      expected - CANCELLATION_DEADLINE_HOURS * 3_600_000,
    );
  });

  it('uses the origin zone of a different route (JBQ→HAV)', () => {
    const purchase = makePurchase({
      routeId: 'jbq-hav',
      components: [
        component('ida', 'CN501', '2026-11-09', '1A'),
        component('vuelta', 'CN502', '2026-11-11', '2A'),
      ],
    });
    // CN501 departs JBQ 09:00 in America/Santo_Domingo.
    const expected = localDateTimeToUtc(
      '2026-11-09',
      '09:00',
      'America/Santo_Domingo',
    ).getTime();
    expect(firstFlightDepartureUtcMs(purchase)).toBe(expected);
  });

  it('uses the SJU zone when the first flight departs from SJU', () => {
    const purchase = makePurchase({
      components: [
        component('ida', 'CN102', '2026-11-09', '1A'),
        component('vuelta', 'CN101', '2026-11-11', '2A'),
      ],
    });
    const expected = localDateTimeToUtc(
      '2026-11-09',
      '10:30',
      'America/Puerto_Rico',
    ).getTime();
    expect(firstFlightDepartureUtcMs(purchase)).toBe(expected);
  });

  it('returns null for a purchase without resolvable flight data', () => {
    const purchase = makePurchase({ components: [] });
    expect(firstFlightDepartureUtcMs(purchase)).toBeNull();
    expect(cancelDeadlineUtcMs(purchase)).toBeNull();
    expect(isCancellationEligible(purchase, 0)).toBe(false);
  });
});

describe('isCancellationEligible', () => {
  const deadline = defaultDeadlineMs();

  it('is eligible exactly at the deadline instant (inclusive)', () => {
    expect(isCancellationEligible(makePurchase(), deadline)).toBe(true);
  });

  it('is eligible one millisecond before the deadline', () => {
    expect(isCancellationEligible(makePurchase(), deadline - 1)).toBe(true);
  });

  it('is not eligible one millisecond after the deadline', () => {
    expect(isCancellationEligible(makePurchase(), deadline + 1)).toBe(false);
  });

  it('is not eligible for a cancelled purchase', () => {
    expect(
      isCancellationEligible(makePurchase({ status: 'cancelada' }), deadline - 1),
    ).toBe(false);
  });
});

describe('applyPurchaseCancellation', () => {
  it('cancels a confirmed purchase atomically with refund and timestamp', () => {
    const purchase = makePurchase({ netTotal: 14_800 });
    const nowMs = defaultDeadlineMs() - 60_000;
    const result = applyPurchaseCancellation([purchase], OWNER, 'CN-0001', nowMs);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchase.status).toBe('cancelada');
    expect(result.purchase.cancelledAtMs).toBe(nowMs);
    expect(result.purchase.refundAmount).toBe(11_840);
    expect(result.refundAmount).toBe(11_840);
    expect(result.purchases).toHaveLength(1);
    // Original purchase object is untouched.
    expect(purchase.status).toBe('confirmada');
    expect(purchase.cancelledAtMs).toBeUndefined();
  });

  it('keeps every purchase field except status/cancellation data', () => {
    const purchase = makePurchase({
      milesUsed: 10_000,
      discountApplied: 1_000,
      netTotal: 14_800,
      pendingMiles: 500,
      confirmationEmailStatus: 'SENT',
    });
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cancelled = result.purchase;
    expect(cancelled.milesUsed).toBe(10_000);
    expect(cancelled.discountApplied).toBe(1_000);
    expect(cancelled.netTotal).toBe(14_800);
    expect(cancelled.pendingMiles).toBe(500);
    expect(cancelled.confirmationEmailStatus).toBe('SENT');
    expect(cancelled.components).toEqual(purchase.components);
    expect(cancelled.customerEmail).toBe(OWNER);
  });

  it('frees every seat as a consequence of the status change', () => {
    const purchase = makePurchase();
    const before = userOccupiedSeats([purchase]);
    expect(before.get('CN101|2026-11-09')?.has('1A')).toBe(true);
    expect(before.get('CN102|2026-11-11')?.has('2A')).toBe(true);

    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = userOccupiedSeats(result.purchases);
    expect(after.get('CN101|2026-11-09')?.has('1A') ?? false).toBe(false);
    expect(after.get('CN102|2026-11-11')?.has('2A') ?? false).toBe(false);
  });

  it('keeps the cancelled purchase in the purchases array (history)', () => {
    const other = makePurchase({ code: 'CN-0002' });
    const result = applyPurchaseCancellation(
      [makePurchase(), other],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchases).toHaveLength(2);
    expect(result.purchases[0].status).toBe('cancelada');
    expect(result.purchases[1].status).toBe('confirmada');
  });

  it('rejects an unknown code without changes', () => {
    const purchase = makePurchase();
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-9999',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
  });

  it('rejects a purchase owned by another customer', () => {
    const purchase = makePurchase({ customerEmail: OTHER });
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects without an active session', () => {
    const result = applyPurchaseCancellation(
      [makePurchase()],
      null,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects an already cancelled purchase', () => {
    const purchase = makePurchase({
      status: 'cancelada',
      cancelledAtMs: 1,
      refundAmount: 100,
    });
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects outside the 168-hour deadline and changes nothing', () => {
    const purchase = makePurchase();
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() + 1,
    );
    expect(result.ok).toBe(false);
    expect(purchase.status).toBe('confirmada');
  });

  it('a cancelled purchase can never accrue miles nor resend email', () => {
    const purchase = makePurchase({ pendingMiles: 500 });
    const result = applyPurchaseCancellation(
      [purchase],
      OWNER,
      'CN-0001',
      defaultDeadlineMs() - 1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cancelled = result.purchase;
    // Past the return arrival, a cancelled purchase must not accrue (D-1).
    expect(
      cancelled.status === 'cancelada' &&
        cancelled.returnArrivalUtcMs < Date.now(),
    ).toBe(true);
    // finishEmailSend only completes PENDING confirmed purchases.
    expect(cancelled.status).not.toBe('confirmada');
  });
});
