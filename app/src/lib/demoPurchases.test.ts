import { describe, expect, it } from 'vitest';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { ALL_SEATS } from '@/data/seatMap';
import {
  isDemoReservationCode,
  nextUserReservationCode,
  type Purchase,
} from '@/lib/booking';
import {
  applyPurchaseCancellation,
  isCancellationEligible,
} from '@/lib/cancelPurchase';
import { localDateTimeToUtc } from '@/lib/dates';
import {
  buildDemoPurchases,
  buildAccrualDemoPurchases,
  DEMO_CODE_START,
  DEMO_CUSTOMER_EMAIL,
  ACCRUAL_DEMO_CODE,
  ACCRUAL_DEMO_CUSTOMER_EMAIL,
  demoReservationCode,
} from '@/lib/demoPurchases';
import { applyDueAccrual } from '@/lib/accrual';
import { initialCustomers } from '@/data/customers';
import { resolveDemoBookings } from '@/data/demoReservations';
import { searchFlights, type SearchCriteria } from '@/lib/flightSearch';
import {
  demoOccupiedSeats,
  occurrenceKey,
  userOccupiedSeats,
} from '@/lib/seatOccupancy';

const REF = '2026-11-02';

describe('buildDemoPurchases (D-9, D-10, D-11)', () => {
  it('creates one purchase per approved demo booking', () => {
    const purchases = buildDemoPurchases(REF);
    const bookings = resolveDemoBookings(REF);
    expect(purchases).toHaveLength(bookings.length);
    expect(purchases.map((purchase) => purchase.routeId)).toEqual(
      bookings.map((booking) => booking.routeId),
    );
  });

  it('assigns them to the retail demo account in the CN-9xxx range', () => {
    const purchases = buildDemoPurchases(REF);
    expect(purchases.map((purchase) => purchase.code)).toEqual([
      'CN-9001',
      'CN-9002',
      'CN-9003',
    ]);
    for (const purchase of purchases) {
      expect(purchase.customerEmail).toBe(DEMO_CUSTOMER_EMAIL);
      expect(isDemoReservationCode(purchase.code)).toBe(true);
      expect(purchase.status).toBe('confirmada');
    }
  });

  it('keeps the demo sequence independent from the user sequence', () => {
    expect(demoReservationCode(1)).toBe('CN-9002');
    expect(DEMO_CODE_START).toBe(9_001);
    const purchases = buildDemoPurchases(REF);
    expect(nextUserReservationCode(purchases)).toBe('CN-0001');
    // A real sale still gets the first user code even with demo purchases.
    const userSale = {
      ...purchases[0],
      code: 'CN-0001',
    };
    expect(nextUserReservationCode([...purchases, userSale])).toBe('CN-0002');
  });

  it('stores the seat assignment, amounts and airport snapshots', () => {
    const purchases = buildDemoPurchases(REF);
    const bookings = resolveDemoBookings(REF);
    purchases.forEach((purchase, index) => {
      const booking = bookings[index];
      expect(purchase.passengerCount).toBe(booking.seats);
      expect(purchase.components).toHaveLength(booking.seats * 2);
      for (const component of purchase.components) {
        expect(component.seatId).toMatch(/^\d{1,2}[A-C]$/);
        expect(component.originAirport).toBeDefined();
        expect(component.destinationAirport).toBeDefined();
        expect(component.fare).toBe(purchase.grossTotal / (booking.seats * 2));
      }
      expect(purchase.grossTotal).toBe(purchase.netTotal);
      expect(purchase.milesUsed).toBe(0);
      expect(purchase.discountApplied).toBe(0);
    });
  });

  it('is deterministic for the same reference date', () => {
    expect(JSON.stringify(buildDemoPurchases(REF))).toBe(
      JSON.stringify(buildDemoPurchases(REF)),
    );
  });
});

describe('demo occupancy derives from the purchases (D-11)', () => {
  it('matches the seats of the materialized purchases', () => {
    expect([...demoOccupiedSeats(REF).entries()]).toEqual([
      ...userOccupiedSeats(buildDemoPurchases(REF)).entries(),
    ]);
  });

  it('does not overlap seats between demo bookings on one occurrence', () => {
    const purchases = buildDemoPurchases(REF);
    const seats = new Map<string, Set<string>>();
    for (const purchase of purchases) {
      for (const component of purchase.components) {
        const key = occurrenceKey(component.flightNumber, component.date);
        const set = seats.get(key) ?? new Set<string>();
        expect(set.has(component.seatId)).toBe(false);
        set.add(component.seatId);
        seats.set(key, set);
      }
    }
  });

  it('frees the seats when a demo reservation is cancelled', () => {
    const purchases = buildDemoPurchases(REF);
    const cancelable = purchases.find((p) => p.code === 'CN-9002')!;
    const nowMs = localDateTimeToUtc(
      REF,
      '00:00',
      'America/Santo_Domingo',
    ).getTime();
    const result = applyPurchaseCancellation(
      purchases,
      DEMO_CUSTOMER_EMAIL,
      cancelable.code,
      nowMs,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purchase.status).toBe('cancelada');
    const after = userOccupiedSeats(result.purchases);
    for (const component of cancelable.components) {
      const key = occurrenceKey(component.flightNumber, component.date);
      expect(after.get(key)?.has(component.seatId) ?? false).toBe(false);
    }
  });

  it('maps the demo scenarios to real cancellation eligibility', () => {
    const purchases = buildDemoPurchases(REF);
    const nowMs = localDateTimeToUtc(
      REF,
      '00:00',
      'America/Santo_Domingo',
    ).getTime();
    const eligible = purchases
      .filter((purchase) => isCancellationEligible(purchase, nowMs))
      .map((purchase) => purchase.code);
    expect(eligible).toEqual(['CN-9002']);
  });
});

describe('miles accrual demo (5.2, D-1)', () => {
  const nowMs = localDateTimeToUtc(
    REF,
    '12:00',
    'America/Santo_Domingo',
  ).getTime();

  it('seeds one completed corporate round trip as pending miles', () => {
    const [purchase] = buildAccrualDemoPurchases(REF);
    expect(purchase).toBeDefined();
    expect(purchase.code).toBe(ACCRUAL_DEMO_CODE);
    expect(purchase.customerEmail).toBe(ACCRUAL_DEMO_CUSTOMER_EMAIL);
    expect(purchase.status).toBe('confirmada');
    expect(purchase.milesCredited).toBe(false);
    expect(purchase.pendingMiles).toBe(500);
    expect(purchase.components.map((c) => c.leg)).toEqual(['ida', 'vuelta']);
    // The trip already finished, so it is due on session start.
    expect(purchase.returnArrivalUtcMs).toBeLessThan(nowMs);
  });

  it('credits the earned miles on session start and is idempotent', () => {
    const purchases = [
      ...buildDemoPurchases(REF),
      ...buildAccrualDemoPurchases(REF),
    ];
    const first = applyDueAccrual(purchases, initialCustomers, nowMs);
    expect(first.changed).toBe(true);
    expect(
      first.customers.find(
        (customer) => customer.email === ACCRUAL_DEMO_CUSTOMER_EMAIL,
      )?.miles,
    ).toBe(10_500);
    expect(
      first.purchases.find((p) => p.code === ACCRUAL_DEMO_CODE)?.milesCredited,
    ).toBe(true);
    // The retail demo reservations never accrue miles.
    for (const purchase of first.purchases.filter(
      (p) => p.customerEmail === DEMO_CUSTOMER_EMAIL,
    )) {
      expect(purchase.milesCredited).toBe(false);
      expect(purchase.pendingMiles).toBe(0);
    }

    const second = applyDueAccrual(
      first.purchases,
      first.customers,
      nowMs,
    );
    expect(second.changed).toBe(false);
    expect(second.customers).toBe(first.customers);
  });
});

describe('search availability from purchases', () => {
  const criteria: SearchCriteria = {
    routeId: 'sdq-sju',
    departureDate: '2026-11-04',
    returnDate: '2026-11-11',
    adults: 1,
    children: 0,
    infants: 0,
  };

  function purchaseOnSeat(seatId: string, status: Purchase['status'] = 'confirmada'): Purchase {
    const service = SCHEDULED_SERVICES.find((s) => s.flightNumber === 'CN101')!;
    return {
      code: 'CN-0001',
      customerEmail: 'cliente@demo',
      routeId: 'sdq-sju',
      components: [
        {
          passengerIndex: 0,
          passengerKind: 'adult',
          leg: 'ida',
          flightNumber: 'CN101',
          date: '2026-11-04',
          seatId,
          fare: 7_900,
          originAirport: service.origin,
          destinationAirport: service.destination,
        },
      ],
      passengerCount: 1,
      grossTotal: 7_900,
      milesUsed: 0,
      discountApplied: 0,
      netTotal: 7_900,
      status,
      pendingMiles: 0,
      milesCredited: false,
      returnArrivalUtcMs: 0,
    };
  }

  it('subtracts the demo purchases from the occurrence capacity', () => {
    const demo = buildDemoPurchases(REF);
    const results = searchFlights(criteria, REF, undefined, undefined, demo);
    const outbound = results.outbound.find((o) => o.service.flightNumber === 'CN101')!;
    // demo-confirmada occupies two seats on CN101 @ 2026-11-04.
    expect(outbound.availableSeats).toBe(28);
  });

  it('subtracts confirmed user purchases and ignores cancelled ones', () => {
    const demo = buildDemoPurchases(REF);
    const confirmed = searchFlights(
      criteria,
      REF,
      undefined,
      undefined,
      [...demo, purchaseOnSeat(ALL_SEATS[5])],
    );
    expect(
      confirmed.outbound.find((o) => o.service.flightNumber === 'CN101')!
        .availableSeats,
    ).toBe(27);

    const cancelled = searchFlights(
      criteria,
      REF,
      undefined,
      undefined,
      [...demo, purchaseOnSeat(ALL_SEATS[5], 'cancelada')],
    );
    expect(
      cancelled.outbound.find((o) => o.service.flightNumber === 'CN101')!
        .availableSeats,
    ).toBe(28);
  });
});
