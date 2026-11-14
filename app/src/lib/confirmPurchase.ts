/**
 * Atomic purchase confirmation transition for CU-04 (C-3, 4.8; D-1..D-6;
 * v2.10; H-2.1, M-2, H-5).
 *
 * Pure function: computes everything first and returns either a complete
 * new state slice plus the created purchase, or an error. A failed
 * confirmation applies nothing — no purchase, no occupied seats, no miles
 * deducted, no pending accrual from this transition, no code consumed.
 */

import type { DemoCustomer } from '@/data/customers';
import { todayISO } from '@/lib/dates';
import { applyDueAccrual } from '@/lib/accrual';
import {
  buildPurchase,
  nextUserReservationCode,
  validatePurchase,
  type LegSeatSelection,
  type Purchase,
} from '@/lib/booking';
import type { SearchSelection } from '@/lib/flightSearch';
import type { FlightUpdates } from '@/lib/flightUpdate';
import type { ConnectionUpdates } from '@/lib/connectionUpdate';
import {
  userOccupiedSeats,
  validateSeatAvailability,
  type SeatRequest,
} from '@/lib/seatOccupancy';

export interface ConfirmPurchaseInput {
  selection: SearchSelection;
  seats: LegSeatSelection;
  milesUsed: number;
}

export type ConfirmPurchaseResult =
  | {
      ok: true;
      purchases: Purchase[];
      customers: DemoCustomer[];
      purchase: Purchase;
    }
  | { ok: false; error: string };

function seatRequestsFor(
  selection: SearchSelection,
  seats: LegSeatSelection,
): SeatRequest[] {
  const requests: SeatRequest[] = [];
  const push = (
    flightNumber: string | undefined,
    date: string | undefined,
    seatIds: unknown,
  ) => {
    if (!Array.isArray(seatIds)) return;
    for (const seatId of seatIds) {
      if (typeof seatId === 'string') {
        requests.push({
          flightNumber: flightNumber ?? '',
          date: date ?? '',
          seatId,
        });
      }
    }
  };
  push(
    selection?.outbound?.flightNumber,
    selection?.departureDate,
    seats?.outbound,
  );
  push(
    selection?.returnFlight?.flightNumber,
    selection?.returnDate,
    seats?.return,
  );
  return requests;
}

/**
 * Confirms a purchase atomically. Order of evaluation:
 *  1. Lazy mileage accrual (H-2.1) so the redemption check sees balances
 *     after every due credit, independent of any visual sync.
 *  2. Seat availability rebuilt from the freshest purchases (M-2), per
 *     flight|date; cancelled purchases free seats.
 *  3. Purchase rules against the post-accrual customer balance.
 *  4. buildPurchase with the next user code (D-10: demo `CN-9xxx` codes
 *     are excluded from the visible sequence; failures consume none).
 *  5. Redeemed miles deducted in the same transition.
 */
export function applyPurchaseConfirmation(
  purchases: Purchase[],
  customers: DemoCustomer[],
  activeEmail: string | null,
  input: ConfirmPurchaseInput,
  nowMs: number,
  referenceDateISO: string = todayISO(),
  flightUpdates?: FlightUpdates,
  connectionUpdates?: ConnectionUpdates,
): ConfirmPurchaseResult {
  // D-11: availability derives from the purchases themselves (the demo
  // reservations are seeded as purchases), so no reference date is needed.
  // The parameter stays in the signature for existing callers.
  void referenceDateISO;
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Los datos de la compra no son válidos.' };
  }
  const accrual = applyDueAccrual(purchases, customers, nowMs);
  const accruedPurchases = accrual.purchases;
  const accruedCustomers = accrual.customers;

  const availabilityError = validateSeatAvailability(
    seatRequestsFor(input.selection, input.seats),
    userOccupiedSeats(accruedPurchases),
  );
  if (availabilityError) return { ok: false, error: availabilityError };

  if (!activeEmail) {
    return { ok: false, error: 'No hay una sesión de cliente activa.' };
  }
  const customer = accruedCustomers.find(
    (candidate) => candidate.email === activeEmail,
  );
  if (!customer) {
    return { ok: false, error: 'El cliente de la sesión no existe.' };
  }

  const purchaseError = validatePurchase(
    input.selection,
    input.seats,
    input.milesUsed,
    customer,
    flightUpdates,
    connectionUpdates,
  );
  if (purchaseError) return { ok: false, error: purchaseError };

  const code = nextUserReservationCode(accruedPurchases);
  const purchase = buildPurchase(
    input.selection,
    input.seats,
    input.milesUsed,
    customer,
    code,
    flightUpdates,
    connectionUpdates,
  );
  if (!purchase) {
    return { ok: false, error: 'No se pudo construir la compra.' };
  }

  const updatedCustomers = accruedCustomers.map((candidate) =>
    candidate.email === customer.email && input.milesUsed > 0
      ? { ...candidate, miles: candidate.miles - input.milesUsed }
      : candidate,
  );

  return {
    ok: true,
    purchases: [...accruedPurchases, purchase],
    customers: updatedCustomers,
    purchase,
  };
}
