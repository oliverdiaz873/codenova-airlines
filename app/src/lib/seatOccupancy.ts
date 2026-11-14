/**
 * Per-seat occupancy for CU-04.
 * Source: PLAN_CODENOVA.md — sections 3.6, 3.9, 4.4, 4.8
 *
 * Occupancy is tracked per flight occurrence (`flightNumber|date`) at seat
 * level and derives from confirmed purchases only (D-11). The demonstration
 * reservations are ordinary purchases owned by the retail demo customer
 * (D-9), so there is a single source of truth for every occupied seat.
 * Everything lives in memory and resets on reload (C-1.8).
 */

import { buildDemoPurchases } from '@/lib/demoPurchases';
import { ALL_SEATS, isValidSeatId } from '@/data/seatMap';
import type { Purchase } from '@/lib/booking';

export function occurrenceKey(flightNumber: string, date: string): string {
  return `${flightNumber}|${date}`;
}

/**
 * Seats occupied by the demonstration purchases for a reference date.
 * Derived from the purchases themselves (D-11) — never from a parallel
 * seat map — so cancelling a demo reservation frees its seats.
 */
export function demoOccupiedSeats(
  referenceDateISO: string,
): Map<string, Set<string>> {
  return userOccupiedSeats(buildDemoPurchases(referenceDateISO));
}

/** Seats occupied by confirmed user purchases, keyed by occurrence. */
export function userOccupiedSeats(
  purchases: readonly Purchase[],
): Map<string, Set<string>> {
  const occupancy = new Map<string, Set<string>>();
  for (const purchase of purchases) {
    if (purchase.status !== 'confirmada') continue;
    for (const component of purchase.components) {
      const key = occurrenceKey(component.flightNumber, component.date);
      const seats = occupancy.get(key) ?? new Set<string>();
      seats.add(component.seatId);
      occupancy.set(key, seats);
    }
  }
  return occupancy;
}

/**
 * Number of occupied seats per occurrence, derived from purchases. Search
 * only needs the count, not the individual seats.
 */
export function occupiedSeatCounts(
  purchases: readonly Purchase[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key, seats] of userOccupiedSeats(purchases)) {
    counts.set(key, seats.size);
  }
  return counts;
}

/**
 * Union of all occupancy maps passed for one occurrence. Callers normally
 * pass a single purchases-derived map; the optional second map keeps the
 * historical demo/user split usable while the model converges (D-11).
 */
export function occupiedSeatIds(
  flightNumber: string,
  date: string,
  firstOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  secondOccupancy?: ReadonlyMap<string, ReadonlySet<string>>,
): Set<string> {
  const key = occurrenceKey(flightNumber, date);
  const occupied = new Set<string>();
  for (const seat of firstOccupancy.get(key) ?? []) occupied.add(seat);
  for (const seat of secondOccupancy?.get(key) ?? []) occupied.add(seat);
  return occupied;
}

/** Seat ids still available for an occurrence. */
export function availableSeatIds(
  flightNumber: string,
  date: string,
  firstOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  secondOccupancy?: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const occupied = occupiedSeatIds(
    flightNumber,
    date,
    firstOccupancy,
    secondOccupancy,
  );
  return ALL_SEATS.filter((seat) => !occupied.has(seat));
}

/** Number of seats still available for an occurrence. */
export function availableSeatCount(
  flightNumber: string,
  date: string,
  firstOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  secondOccupancy?: ReadonlyMap<string, ReadonlySet<string>>,
): number {
  return availableSeatIds(
    flightNumber,
    date,
    firstOccupancy,
    secondOccupancy,
  ).length;
}

/** A single seat request for one flight occurrence. */
export interface SeatRequest {
  flightNumber: string;
  /** Departure date 'YYYY-MM-DD' at the origin. */
  date: string;
  seatId: string;
}

/**
 * Pure check that every requested seat is available for its occurrence.
 * Each request is evaluated against its own `flightNumber|date` key, so
 * outbound and return legs are independent and different dates of the same
 * service do not interfere. Seats claimed earlier in the same batch count
 * as taken, preventing double booking within the purchase. Occupancy maps
 * are read-only: nothing is modified.
 * Returns an error message, or null when every seat is available.
 */
export function validateSeatAvailability(
  requests: readonly SeatRequest[],
  firstOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  secondOccupancy?: ReadonlyMap<string, ReadonlySet<string>>,
): string | null {
  const claimed = new Map<string, Set<string>>();

  for (const request of requests) {
    if (!isValidSeatId(request.seatId)) {
      return `Identificador de asiento inválido: ${request.seatId}.`;
    }

    const key = occurrenceKey(request.flightNumber, request.date);
    const occupied = occupiedSeatIds(
      request.flightNumber,
      request.date,
      firstOccupancy,
      secondOccupancy,
    );
    if (occupied.has(request.seatId)) {
      return `El asiento ${request.seatId} del vuelo ${request.flightNumber} del ${request.date} no está disponible.`;
    }

    const batch = claimed.get(key) ?? new Set<string>();
    if (batch.has(request.seatId)) {
      return `El asiento ${request.seatId} está solicitado más de una vez para el mismo vuelo.`;
    }
    batch.add(request.seatId);
    claimed.set(key, batch);
  }

  return null;
}
