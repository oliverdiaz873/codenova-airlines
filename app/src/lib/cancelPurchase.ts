/**
 * CU-06 — Purchase cancellation transition.
 * Source: PLAN_CODENOVA.md — 4.8.6, 4.8.8, 6.2 (PA-5) and the approved
 * CU-06 functional decisions: full-purchase cancellation only, eligible
 * strictly up to 168 hours before the first flight departure (origin
 * airport local time, IANA zone), simulated refund of 80 % of the net
 * amount paid rounded to the nearest peso, miles never restored or
 * reversed, seats freed as a consequence of the status change.
 *
 * Pure transition: validates everything first and returns either the new
 * purchases array plus the cancelled purchase, or an error. A failed
 * cancellation changes nothing — purchase, seats and miles stay intact.
 */

import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import type { Purchase } from '@/lib/booking';
import { localDateTimeToUtc } from '@/lib/dates';

/** Minimum anticipation before the first flight, in hours (approved CU-06). */
export const CANCELLATION_DEADLINE_HOURS = 168;
/** Simulated refund rate over the net amount paid (PA-5 / 4.8.6). */
export const CANCELLATION_REFUND_RATE = 0.8;

const WALL_CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * UTC instant (ms) of the first flight departure for this purchase: the
 * 'ida' leg flight resolved through the scheduled services, interpreted
 * in the origin airport's IANA zone. Returns null — never throws — when
 * the flight or its data cannot produce a valid instant.
 */
export function firstFlightDepartureUtcMs(purchase: Purchase): number | null {
  const first = purchase.components.find(
    (component) => component.leg === 'ida',
  );
  if (!first) return null;
  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === first.flightNumber,
  );
  if (!service) return null;
  if (!WALL_CLOCK_TIME_PATTERN.test(service.departureLocal)) return null;
  try {
    const departure = localDateTimeToUtc(
      first.date,
      service.departureLocal,
      service.origin.timeZone,
    );
    return Number.isFinite(departure.getTime()) ? departure.getTime() : null;
  } catch {
    return null;
  }
}

/**
 * UTC instant (ms) of the cancellation deadline: exactly
 * CANCELLATION_DEADLINE_HOURS before the first flight departure. The
 * purchase is still eligible at this exact instant.
 */
export function cancelDeadlineUtcMs(purchase: Purchase): number | null {
  const departureMs = firstFlightDepartureUtcMs(purchase);
  if (departureMs === null) return null;
  return departureMs - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000;
}

/**
 * Whether the purchase can still be cancelled at `nowMs`: confirmed and
 * at or before the exact deadline instant (inclusive boundary).
 */
export function isCancellationEligible(
  purchase: Purchase,
  nowMs: number,
): boolean {
  if (purchase.status !== 'confirmada') return false;
  const deadlineMs = cancelDeadlineUtcMs(purchase);
  return deadlineMs !== null && nowMs <= deadlineMs;
}

/**
 * Simulated refund breakdown over the net amount paid. The refund is the
 * 80 % rate rounded to the nearest peso; the non-refundable part is the
 * exact difference so both amounts always reconcile with the net total.
 */
export function refundBreakdown(netTotal: number): {
  refundAmount: number;
  nonRefundableAmount: number;
} {
  const refundAmount = Math.round(netTotal * CANCELLATION_REFUND_RATE);
  return {
    refundAmount,
    nonRefundableAmount: netTotal - refundAmount,
  };
}

export type CancelPurchaseResult =
  | {
      ok: true;
      purchases: Purchase[];
      purchase: Purchase;
      refundAmount: number;
    }
  | { ok: false; error: string };

/**
 * Cancels a purchase atomically. Evaluation order:
 *  1. Purchase exists and belongs to the active customer (customerEmail).
 *  2. Status is 'confirmada' (a cancelled purchase can never re-cancel).
 *  3. The 168-hour deadline against the first flight departure is met.
 *  4. The refund is computed from the stored netTotal.
 * Only then is the new state committed by the caller: status becomes
 * 'cancelada' with cancelledAtMs and refundAmount recorded in the same
 * transition. Seats are freed implicitly because occupancy derives from
 * confirmed purchases only; miles are untouched (D-5).
 */
export function applyPurchaseCancellation(
  purchases: Purchase[],
  activeEmail: string | null,
  code: string,
  nowMs: number,
): CancelPurchaseResult {
  const purchase = purchases.find((candidate) => candidate.code === code);
  if (!purchase) {
    return { ok: false, error: 'No encontramos esa reservación.' };
  }
  if (!activeEmail || purchase.customerEmail !== activeEmail) {
    return {
      ok: false,
      error: 'Solo puedes cancelar reservaciones de tu cuenta.',
    };
  }
  if (purchase.status === 'cancelada') {
    return { ok: false, error: 'Esta reservación ya fue cancelada.' };
  }
  if (purchase.status !== 'confirmada') {
    return { ok: false, error: 'Esta reservación no se puede cancelar.' };
  }
  if (!isCancellationEligible(purchase, nowMs)) {
    return {
      ok: false,
      error:
        'La cancelación solo está disponible hasta 168 horas antes del primer vuelo.',
    };
  }

  const { refundAmount } = refundBreakdown(purchase.netTotal);
  const cancelled: Purchase = {
    ...purchase,
    status: 'cancelada',
    cancelledAtMs: nowMs,
    refundAmount,
  };

  return {
    ok: true,
    purchases: purchases.map((candidate) =>
      candidate.code === code ? cancelled : candidate,
    ),
    purchase: cancelled,
    refundAmount,
  };
}
