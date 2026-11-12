/**
 * Per-seat occupancy for CU-04.
 * Source: PLAN_CODENOVA.md — sections 3.6, 3.9, 4.4, 4.8
 *
 * Occupancy is tracked per flight occurrence (`flightNumber|date`) at seat
 * level. It combines:
 * - demonstration bookings (PA-1.10), which occupy a deterministic seat set
 *   per occurrence (decision P-2);
 * - user purchases, one seat per component (C-3).
 * Everything lives in memory and resets on reload (C-1.8).
 */

import { resolveDemoBookings } from '@/data/demoReservations';
import { ALL_SEATS, isValidSeatId } from '@/data/seatMap';
import type { Purchase } from '@/lib/booking';

export function occurrenceKey(flightNumber: string, date: string): string {
  return `${flightNumber}|${date}`;
}

/**
 * Seats occupied by the demonstration bookings, keyed by occurrence.
 * Deterministic: each demo booking occupies the first `seats` seats of the
 * map on each of its two legs (P-2).
 */
export function demoOccupiedSeats(
  referenceDateISO: string,
): Map<string, Set<string>> {
  const occupancy = new Map<string, Set<string>>();
  const addSeats = (flightNumber: string, date: string, count: number) => {
    const key = occurrenceKey(flightNumber, date);
    const seats = occupancy.get(key) ?? new Set<string>();
    for (const seat of ALL_SEATS.slice(0, count)) seats.add(seat);
    occupancy.set(key, seats);
  };

  for (const booking of resolveDemoBookings(referenceDateISO)) {
    addSeats(booking.outboundFlightNumber, booking.outboundDate, booking.seats);
    addSeats(booking.returnFlightNumber, booking.returnDate, booking.seats);
  }
  return occupancy;
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

/** Union of demo and user occupancy for one occurrence. */
export function occupiedSeatIds(
  flightNumber: string,
  date: string,
  demoOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  userOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
): Set<string> {
  const key = occurrenceKey(flightNumber, date);
  const occupied = new Set<string>();
  for (const seat of demoOccupancy.get(key) ?? []) occupied.add(seat);
  for (const seat of userOccupancy.get(key) ?? []) occupied.add(seat);
  return occupied;
}

/** Seat ids still available for an occurrence. */
export function availableSeatIds(
  flightNumber: string,
  date: string,
  demoOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  userOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const occupied = occupiedSeatIds(flightNumber, date, demoOccupancy, userOccupancy);
  return ALL_SEATS.filter((seat) => !occupied.has(seat));
}

/** Number of seats still available for an occurrence. */
export function availableSeatCount(
  flightNumber: string,
  date: string,
  demoOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  userOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
): number {
  return availableSeatIds(flightNumber, date, demoOccupancy, userOccupancy).length;
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
  demoOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
  userOccupancy: ReadonlyMap<string, ReadonlySet<string>>,
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
      demoOccupancy,
      userOccupancy,
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
