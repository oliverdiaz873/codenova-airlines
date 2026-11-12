import { describe, expect, it } from 'vitest';
import { ALL_SEATS } from '@/data/seatMap';
import { resolveDemoBookings } from '@/data/demoReservations';
import type { DemoCustomer } from '@/data/customers';
import { buildPurchase, type LegSeatSelection } from '@/lib/booking';
import {
  availableSeatCount,
  availableSeatIds,
  demoOccupiedSeats,
  occurrenceKey,
  userOccupiedSeats,
  validateSeatAvailability,
  type SeatRequest,
} from '@/lib/seatOccupancy';
import type { SearchSelection } from '@/lib/flightSearch';

const minorista: DemoCustomer = {
  email: 'minorista@codenova.demo',
  type: 'Minorista',
  miles: 0,
};

const selection: SearchSelection = {
  routeId: 'sdq-aua',
  originLabel: 'Santo Domingo (SDQ)',
  destinationLabel: 'Aruba (AUA)',
  departureDate: '2026-11-11',
  returnDate: '2026-11-13',
  passengers: { adults: 1, children: 0, infants: 0 },
  totalPassengers: 1,
  outbound: {
    flightNumber: 'CN201',
    originLabel: 'Santo Domingo (SDQ)',
    destinationLabel: 'Aruba (AUA)',
    date: '2026-11-11',
    departureTime: '08:00',
    arrivalTime: '09:30',
    arrivalNextDay: false,
    durationMinutes: 90,
    fare: 9_600,
  },
  returnFlight: {
    flightNumber: 'CN202',
    originLabel: 'Aruba (AUA)',
    destinationLabel: 'Santo Domingo (SDQ)',
    date: '2026-11-13',
    departureTime: '10:45',
    arrivalTime: '12:15',
    arrivalNextDay: false,
    durationMinutes: 90,
    fare: 9_600,
  },
  totalPrice: 19_200,
};

const seats: LegSeatSelection = { outbound: ['5A'], return: ['5B'] };

describe('demoOccupiedSeats', () => {
  it('is deterministic for a reference date (P-2)', () => {
    const first = demoOccupiedSeats('2026-11-09');
    const second = demoOccupiedSeats('2026-11-09');
    expect([...first.entries()]).toEqual([...second.entries()]);
  });

  it('occupies the first N seats of the map per demo leg', () => {
    const demo = demoOccupiedSeats('2026-11-09');
    const bookings = resolveDemoBookings('2026-11-09');
    const confirmed = bookings.find((b) => b.scenario === 'confirmada');
    expect(confirmed).toBeDefined();
    const key = occurrenceKey(
      confirmed!.outboundFlightNumber,
      confirmed!.outboundDate,
    );
    const occupied = demo.get(key);
    expect(occupied?.size).toBe(confirmed!.seats);
    expect(occupied?.has(ALL_SEATS[0])).toBe(true);
    expect(occupied?.has(ALL_SEATS[confirmed!.seats])).toBe(false);
  });
});

describe('userOccupiedSeats', () => {
  it('maps purchase components to their occurrences', () => {
    const purchase = buildPurchase(selection, seats, 0, minorista, 'CN-0001');
    expect(purchase).not.toBeNull();
    const user = userOccupiedSeats([purchase!]);
    expect(user.get(occurrenceKey('CN201', '2026-11-11'))?.has('5A')).toBe(true);
    expect(user.get(occurrenceKey('CN202', '2026-11-13'))?.has('5B')).toBe(true);
    expect(user.get(occurrenceKey('CN201', '2026-11-11'))?.size).toBe(1);
  });

  it('ignores cancelled purchases', () => {
    const built = buildPurchase(selection, seats, 0, minorista, 'CN-0002');
    expect(built).not.toBeNull();
    const purchase = {
      ...built!,
      status: 'cancelada' as const,
    };
    const user = userOccupiedSeats([purchase]);
    expect(user.size).toBe(0);
  });
});

describe('available seats', () => {
  const demo = demoOccupiedSeats('2026-11-09');
  const empty = new Map<string, Set<string>>();

  it('returns all 30 seats when nothing is occupied', () => {
    expect(availableSeatIds('CN999', '2026-11-10', empty, empty)).toHaveLength(30);
    expect(availableSeatCount('CN999', '2026-11-10', empty, empty)).toBe(30);
  });

  it('subtracts user-occupied seats', () => {
    const built = buildPurchase(selection, seats, 0, minorista, 'CN-0001');
    expect(built).not.toBeNull();
    const user = userOccupiedSeats([built!]);
    const available = availableSeatIds('CN201', '2026-11-11', empty, user);
    expect(available).toHaveLength(29);
    expect(available).not.toContain('5A');
    expect(available).toContain('5B');
  });

  it('subtracts demo-occupied seats', () => {
    const bookings = resolveDemoBookings('2026-11-09');
    const mia = bookings.find((b) => b.routeId === 'sdq-mia');
    expect(mia).toBeDefined();
    const key = occurrenceKey(mia!.outboundFlightNumber, mia!.outboundDate);
    const occupied = demo.get(key);
    expect(occupied?.size).toBe(mia!.seats);
    const available = availableSeatIds(
      mia!.outboundFlightNumber,
      mia!.outboundDate,
      demo,
      empty,
    );
    expect(available).toHaveLength(30 - mia!.seats);
    for (const seat of occupied ?? []) {
      expect(available).not.toContain(seat);
    }
  });
});

describe('validateSeatAvailability (H-3)', () => {
  const demo = demoOccupiedSeats('2026-11-09');
  const empty = new Map<string, Set<string>>();

  const requests = (list: Array<[string, string, string]>): SeatRequest[] =>
    list.map(([flightNumber, date, seatId]) => ({ flightNumber, date, seatId }));

  it('accepts seats that are free in both legs', () => {
    const result = validateSeatAvailability(
      requests([
        ['CN201', '2026-11-11', '5A'],
        ['CN202', '2026-11-13', '5B'],
      ]),
      demo,
      empty,
    );
    expect(result).toBeNull();
  });

  it('rejects a seat occupied by a demo booking', () => {
    const bookings = resolveDemoBookings('2026-11-09');
    const mia = bookings.find((b) => b.routeId === 'sdq-mia');
    expect(mia).toBeDefined();
    const occupiedSeat = ALL_SEATS[0];
    const result = validateSeatAvailability(
      requests([[mia!.outboundFlightNumber, mia!.outboundDate, occupiedSeat]]),
      demo,
      empty,
    );
    expect(result).not.toBeNull();
    expect(result).toContain(occupiedSeat);
  });

  it('rejects a seat occupied by a user purchase', () => {
    const built = buildPurchase(selection, seats, 0, minorista, 'CN-0001');
    expect(built).not.toBeNull();
    const user = userOccupiedSeats([built!]);
    const result = validateSeatAvailability(
      requests([['CN201', '2026-11-11', '5A']]),
      demo,
      user,
    );
    expect(result).not.toBeNull();
  });

  it('does not confuse different dates of the same service', () => {
    const built = buildPurchase(
      {
        ...selection,
        returnDate: '2026-11-18',
        returnFlight: { ...selection.returnFlight, date: '2026-11-18' },
      },
      seats,
      0,
      minorista,
      'CN-0001',
    );
    expect(built).not.toBeNull();
    const user = userOccupiedSeats([built!]);
    // '5A' is taken on CN201 @ 2026-11-11, but free on another date.
    expect(
      validateSeatAvailability(
        requests([['CN201', '2026-11-18', '5A']]),
        demo,
        user,
      ),
    ).toBeNull();
    expect(
      validateSeatAvailability(
        requests([['CN201', '2026-11-11', '5A']]),
        demo,
        user,
      ),
    ).not.toBeNull();
  });

  it('rejects the same seat requested twice for one occurrence', () => {
    const result = validateSeatAvailability(
      requests([
        ['CN201', '2026-11-11', '7C'],
        ['CN201', '2026-11-11', '7C'],
      ]),
      demo,
      empty,
    );
    expect(result).not.toBeNull();
  });

  it('does not modify the occupancy maps', () => {
    const demoBefore = demoOccupiedSeats('2026-11-09');
    const userBefore = userOccupiedSeats([]);
    const snapshot = JSON.stringify([...demoBefore.entries()]);
    validateSeatAvailability(
      requests([['CN201', '2026-11-11', '9C']]),
      demoBefore,
      userBefore,
    );
    expect(JSON.stringify([...demoBefore.entries()])).toBe(snapshot);
    expect(userBefore.size).toBe(0);
  });
});
