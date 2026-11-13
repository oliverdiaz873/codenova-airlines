import { describe, expect, it } from 'vitest';
import type { BookingComponent, Purchase } from '@/lib/booking';
import { localDateTimeToUtc } from '@/lib/dates';
import type { FlightUpdates } from '@/lib/flightUpdate';
import { purchaseLegs, purchaseRouteLabel } from '@/lib/purchaseView';

function component(
  leg: 'ida' | 'vuelta',
  flightNumber: string,
  date: string,
): BookingComponent {
  return {
    passengerIndex: 0,
    passengerKind: 'adult',
    leg,
    flightNumber,
    date,
    seatId: '1A',
    fare: 7_900,
  };
}

function makePurchase(): Purchase {
  return {
    code: 'CN-0001',
    customerEmail: 'minorista@codenova.demo',
    routeId: 'sdq-sju',
    components: [
      component('ida', 'CN101', '2026-11-09'),
      component('vuelta', 'CN102', '2026-11-11'),
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
  };
}

const cn101DepMs = localDateTimeToUtc(
  '2026-11-09',
  '08:00',
  'America/Santo_Domingo',
).getTime();

describe('purchaseLegs — CU-07 schedule resolution', () => {
  it('shows the base schedule without updates', () => {
    const legs = purchaseLegs(makePurchase());
    const ida = legs.find((leg) => leg.leg === 'ida')!;
    expect(ida.departureTime).toBe('08:00');
    expect(ida.durationMinutes).toBe(75);
    expect(ida.arrivalTime).toBe('09:15');
  });

  it('shows the updated schedule for a future flight', () => {
    const updates: FlightUpdates = {
      CN101: [
        {
          departureLocal: '09:30',
          durationMinutes: 90,
          effectiveAtMs: cn101DepMs - 1_000,
        },
      ],
    };
    const legs = purchaseLegs(makePurchase(), updates);
    const ida = legs.find((leg) => leg.leg === 'ida')!;
    expect(ida.departureTime).toBe('09:30');
    expect(ida.durationMinutes).toBe(90);
    // 09:30 SDQ (UTC-4) + 90 min -> 11:00 SJU (UTC-4).
    expect(ida.arrivalTime).toBe('11:00');
    // The untouched return leg keeps its schedule.
    const vuelta = legs.find((leg) => leg.leg === 'vuelta')!;
    expect(vuelta.departureTime).toBe('10:30');
    expect(vuelta.durationMinutes).toBe(75);
    // Route labels are unaffected by schedule updates.
    expect(purchaseRouteLabel(makePurchase(), updates)).toBe(
      purchaseRouteLabel(makePurchase()),
    );
  });

  it('keeps the historical schedule for a flight that already departed', () => {
    const late: FlightUpdates = {
      CN101: [
        {
          departureLocal: '09:30',
          durationMinutes: 90,
          effectiveAtMs: cn101DepMs + 1_000,
        },
      ],
    };
    const legs = purchaseLegs(makePurchase(), late);
    const ida = legs.find((leg) => leg.leg === 'ida')!;
    expect(ida.departureTime).toBe('08:00');
    expect(ida.durationMinutes).toBe(75);
    expect(ida.arrivalTime).toBe('09:15');
  });
});
