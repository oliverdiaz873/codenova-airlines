/**
 * Purchase (booking) logic for CU-04.
 * Source: PLAN_CODENOVA.md — sections 3.9, 4.2, 4.4.1, 4.7.2, 4.8 (C-3),
 * 5.2 (miles rules), and decisions D-1..D-6.
 *
 * Internal prototype layer only: the academic model is unchanged. A purchase
 * groups one academic reservation per passenger per leg; the first component
 * (outbound, passenger 1) is the main reservation whose code is visible.
 * Confirmation is all-or-nothing: nothing is created, held or charged when
 * any validation fails.
 */

import { distanceMilesForRoute } from '@/data/routeDistances';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { isValidSeatId } from '@/data/seatMap';
import type { DemoCustomer } from '@/data/customers';
import { isValidISODate, localDateTimeToUtc } from '@/lib/dates';
import {
  computeAccruedMiles,
  milesToDiscount,
  validateRedemptionMiles,
} from '@/lib/miles';
import type { PassengerCounts, SearchSelection } from '@/lib/flightSearch';

export type PassengerKind = 'adult' | 'child' | 'infant';

export const PASSENGER_KIND_LABELS: Record<PassengerKind, string> = {
  adult: 'Adulto',
  child: 'Niño',
  infant: 'Infante',
};

export type PurchaseStatus = 'confirmada' | 'cancelada';

export interface BookingComponent {
  /** 0-based position of the passenger inside the purchase. */
  passengerIndex: number;
  passengerKind: PassengerKind;
  leg: 'ida' | 'vuelta';
  flightNumber: string;
  /** Departure date 'YYYY-MM-DD' at the origin. */
  date: string;
  seatId: string;
  /** Fare of the leg per passenger (RD$). */
  fare: number;
}

export interface Purchase {
  /** Visible code of the main reservation, e.g. 'CN-0001'. */
  code: string;
  /** Email of the customer account that owns the reservation (D-4). */
  customerEmail: string;
  routeId: string;
  components: BookingComponent[];
  passengerCount: number;
  grossTotal: number;
  /** Miles redeemed on this purchase (RD$ discount = milesUsed / 10). */
  milesUsed: number;
  /** Discount applied in RD$, registered on the main reservation. */
  discountApplied: number;
  netTotal: number;
  status: PurchaseStatus;
  /** CU-06: instant (ms) of cancellation; set only when status is 'cancelada'. */
  cancelledAtMs?: number;
  /** CU-06: simulated refund registered at cancellation (80 % of netTotal). */
  refundAmount?: number;
  /** Miles pending accrual after trip completion (corporate only). */
  pendingMiles: number;
  /** Whether the pending miles were already credited to the account. */
  milesCredited: boolean;
  /** UTC instant (ms) of the return flight arrival; completion marker (D-1). */
  returnArrivalUtcMs: number;
}

/** Ordered passenger kinds matching the search counts (P-4). */
export function passengerKinds(counts: PassengerCounts): PassengerKind[] {
  return [
    ...Array<PassengerKind>(counts.adults).fill('adult'),
    ...Array<PassengerKind>(counts.children).fill('child'),
    ...Array<PassengerKind>(counts.infants).fill('infant'),
  ];
}

/** One seat per passenger for each leg, aligned with passengerKinds order. */
export interface LegSeatSelection {
  outbound: string[];
  return: string[];
}

/** Session-scoped sequential reservation codes (P-3). */
export function nextReservationCode(sequence: number): string {
  return `CN-${String(sequence).padStart(4, '0')}`;
}

/** Wall-clock 'HH:mm' with valid hour/minute ranges. */
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * UTC instant (ms) of the return leg arrival, via IANA zones per date.
 * Returns NaN — never throws — when the flight, date or time cannot produce
 * a valid instant; buildPurchase rejects non-finite results.
 */
export function returnArrivalUtcMs(selection: SearchSelection): number {
  const leg = selection?.returnFlight;
  if (typeof leg !== 'object' || leg === null) return Number.NaN;
  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === leg.flightNumber,
  );
  if (!service) return Number.NaN;
  if (typeof leg.date !== 'string' || !isValidISODate(leg.date)) {
    return Number.NaN;
  }
  if (
    typeof leg.departureTime !== 'string' ||
    !LOCAL_TIME_PATTERN.test(leg.departureTime)
  ) {
    return Number.NaN;
  }
  try {
    const departureUtc = localDateTimeToUtc(
      leg.date,
      leg.departureTime,
      service.origin.timeZone,
    );
    const arrivalMs =
      departureUtc.getTime() + service.durationMinutes * 60_000;
    return Number.isFinite(arrivalMs) ? arrivalMs : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Validates a prospective purchase before anything is created.
 * Returns an error message, or null when the purchase can proceed.
 * Mirrors the all-or-nothing rule (4.8.1): every leg, seat and amount is
 * checked before a single component exists.
 */
export function validatePurchase(
  selection: SearchSelection,
  seats: LegSeatSelection,
  milesUsed: number,
  customer: DemoCustomer,
): string | null {
  // Structural guards (4.1.1): a degenerate or manipulated selection is
  // rejected here even when the caller skips the CU-03 boundary check.
  if (typeof selection !== 'object' || selection === null) {
    return 'La selección de la compra no es válida.';
  }
  if (
    !Number.isInteger(selection.totalPassengers) ||
    selection.totalPassengers < 1
  ) {
    return 'La selección debe incluir al menos un pasajero.';
  }
  const counts = selection.passengers;
  if (
    typeof counts !== 'object' ||
    counts === null ||
    ![counts.adults, counts.children, counts.infants].every(
      (count) => Number.isInteger(count) && count >= 0,
    ) ||
    counts.adults + counts.children + counts.infants !==
      selection.totalPassengers
  ) {
    return 'Los datos de pasajeros no son coherentes.';
  }
  if (!Number.isFinite(selection.totalPrice) || selection.totalPrice < 0) {
    return 'El importe total de la compra no es válido.';
  }
  const outbound = selection.outbound;
  const returnFlight = selection.returnFlight;
  if (
    typeof outbound !== 'object' ||
    outbound === null ||
    typeof returnFlight !== 'object' ||
    returnFlight === null ||
    ![outbound.fare, returnFlight.fare].every(
      (fare) => Number.isFinite(fare) && fare >= 0,
    )
  ) {
    return 'Las tarifas del itinerario no son válidas.';
  }
  const outboundService = SCHEDULED_SERVICES.find(
    (service) => service.flightNumber === outbound.flightNumber,
  );
  const returnService = SCHEDULED_SERVICES.find(
    (service) => service.flightNumber === returnFlight.flightNumber,
  );
  if (!outboundService || !returnService) {
    return 'Uno de los vuelos no existe en la programación.';
  }
  if (
    outbound.date !== selection.departureDate ||
    returnFlight.date !== selection.returnDate
  ) {
    return 'Las fechas de los vuelos no coinciden con la selección.';
  }
  if (
    typeof seats !== 'object' ||
    seats === null ||
    !Array.isArray(seats.outbound) ||
    !Array.isArray(seats.return)
  ) {
    return 'La selección de asientos no es válida.';
  }

  const passengerCount = selection.totalPassengers;
  if (seats.outbound.length !== passengerCount || seats.return.length !== passengerCount) {
    return 'Debes indicar un asiento por pasajero en cada trayecto.';
  }
  const allSeats = [...seats.outbound, ...seats.return];
  if (allSeats.some((seat) => !isValidSeatId(seat))) {
    return 'Hay identificadores de asiento inválidos.';
  }
  if (hasDuplicates(seats.outbound) || hasDuplicates(seats.return)) {
    return 'No puedes asignar el mismo asiento dos veces en un mismo trayecto.';
  }

  if (!Number.isInteger(milesUsed) || milesUsed < 0) {
    return 'La cantidad de millas debe ser un número entero no negativo.';
  }

  if (milesUsed > 0) {
    if (customer.type !== 'Corporativo') {
      return 'Solo los clientes corporativos pueden canjear millas.';
    }
    const milesError = validateRedemptionMiles(customer.miles, milesUsed);
    if (milesError) return milesError;
    if (milesToDiscount(milesUsed) > selection.totalPrice) {
      return 'El descuento por millas no puede superar el importe de la compra.';
    }
  }

  return null;
}

/**
 * Builds the purchase. The function validates its own inputs: it returns null
 * when validatePurchase rejects them, so an invalid purchase can never be
 * produced even if the caller skips the explicit validation step.
 * Seat availability is still the caller's responsibility (seatOccupancy).
 */
export function buildPurchase(
  selection: SearchSelection,
  seats: LegSeatSelection,
  milesUsed: number,
  customer: DemoCustomer,
  code: string,
): Purchase | null {
  if (validatePurchase(selection, seats, milesUsed, customer) !== null) {
    return null;
  }

  // Domain defense (H-5): the gross amount is recomputed from the leg
  // fares and passenger count; a mismatched selection.totalPrice rejects
  // the build even if a caller skipped boundary validation.
  const grossTotal =
    (selection.outbound.fare + selection.returnFlight.fare) *
    selection.totalPassengers;
  if (grossTotal !== selection.totalPrice) {
    return null;
  }

  const kinds = passengerKinds(selection.passengers);
  const components: BookingComponent[] = [];

  const pushLeg = (
    leg: 'ida' | 'vuelta',
    legSummary: SearchSelection['outbound'],
    seatIds: string[],
  ) => {
    kinds.forEach((kind, index) => {
      components.push({
        passengerIndex: index,
        passengerKind: kind,
        leg,
        flightNumber: legSummary.flightNumber,
        date: selection[
          leg === 'ida' ? 'departureDate' : 'returnDate'
        ],
        seatId: seatIds[index],
        fare: legSummary.fare,
      });
    });
  };

  pushLeg('ida', selection.outbound, seats.outbound);
  pushLeg('vuelta', selection.returnFlight, seats.return);

  const discountApplied = milesToDiscount(milesUsed);
  const distance = distanceMilesForRoute(selection.routeId);
  const pendingMiles =
    customer.type === 'Corporativo' && distance !== null
      ? computeAccruedMiles(distance, selection.totalPassengers)
      : 0;

  const arrivalMs = returnArrivalUtcMs(selection);
  if (!Number.isFinite(arrivalMs)) {
    return null;
  }

  return {
    code,
    customerEmail: customer.email,
    routeId: selection.routeId,
    components,
    passengerCount: selection.totalPassengers,
    grossTotal,
    milesUsed,
    discountApplied,
    netTotal: grossTotal - discountApplied,
    status: 'confirmada',
    pendingMiles,
    milesCredited: false,
    returnArrivalUtcMs: arrivalMs,
  };
}

/**
 * Whether the round trip completed (D-1): confirmed purchase whose return
 * arrival instant is in the past. Cancelled purchases never complete (v2.10).
 */
export function isTripCompleted(purchase: Purchase, nowMs: number): boolean {
  return purchase.status === 'confirmada' && nowMs > purchase.returnArrivalUtcMs;
}

/**
 * Miles due for accrual at `nowMs`: pending miles of a completed, uncredited,
 * non-cancelled purchase. Idempotent through the milesCredited flag.
 */
export function accrualDueMiles(purchase: Purchase, nowMs: number): number {
  if (purchase.milesCredited || !isTripCompleted(purchase, nowMs)) return 0;
  return purchase.pendingMiles;
}
