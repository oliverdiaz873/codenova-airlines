/**
 * Miles rules for SkyNova Airlines.
 * Source: PLAN_CODENOVA.md — section 5.2 (PA-3, C-2, D-1..D-6)
 *
 * - Only corporate customers accrue and redeem miles.
 * - Accrual: 100% of distance; distances per leg in routeDistances.ts (D-2).
 * - Redemption: 10 miles = RD$1; minimum and steps of 1,000 miles.
 * - Discount never exceeds the pending amount; total can be RD$0, never negative.
 * - Miles are deducted only on purchase confirmation; used miles are not
 *   restored on cancellation and credited miles are not reversed (D-5).
 */

export const MILES_TO_CURRENCY = 10;
export const MIN_REDEMPTION_MILES = 1_000;
export const REDEMPTION_STEP_MILES = 1_000;

/** Converts redeemed miles to a discount in RD$. */
export function milesToDiscount(miles: number): number {
  return miles / MILES_TO_CURRENCY;
}

/**
 * Miles accrued for a completed round trip (D-1, D-3):
 * distance per leg x 2 legs x passengers, at 100%.
 */
export function computeAccruedMiles(
  distanceMilesPerLeg: number,
  passengerCount: number,
): number {
  return distanceMilesPerLeg * 2 * passengerCount;
}

/**
 * Validates a redemption amount against the customer balance.
 * Returns an error message, or null when valid.
 */
export function validateRedemptionMiles(
  balance: number,
  miles: number,
): string | null {
  if (!Number.isInteger(miles) || miles <= 0) {
    return 'La cantidad de millas debe ser un número entero positivo.';
  }
  if (miles < MIN_REDEMPTION_MILES) {
    return `El canje mínimo es ${MIN_REDEMPTION_MILES.toLocaleString('es-DO')} millas.`;
  }
  if (miles % REDEMPTION_STEP_MILES !== 0) {
    return `El canje debe ser en pasos de ${REDEMPTION_STEP_MILES.toLocaleString('es-DO')} millas.`;
  }
  if (miles > balance) {
    return 'No tienes millas suficientes para ese canje.';
  }
  return null;
}

/**
 * Largest redeemable amount in miles for a balance and a pending amount:
 * steps of 1,000 not exceeding the balance, and whose discount does not
 * exceed the pending amount (total never negative).
 */
export function maxRedeemableMiles(
  balance: number,
  pendingAmount: number,
): number {
  const byBalance = Math.floor(balance / REDEMPTION_STEP_MILES) * REDEMPTION_STEP_MILES;
  const byPending = Math.floor((pendingAmount * MILES_TO_CURRENCY) / REDEMPTION_STEP_MILES) * REDEMPTION_STEP_MILES;
  return Math.max(0, Math.min(byBalance, byPending));
}
