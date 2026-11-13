import { afterEach, describe, expect, it } from 'vitest';
import { initialCustomers, type DemoCustomer } from '@/data/customers';
import type { Purchase } from '@/lib/booking';
import type { FlightUpdates } from '@/lib/flightUpdate';
import {
  buildConfirmationEmail,
  finishEmailSend,
  setSimulatedEmailFailure,
  shouldForceEmailFailure,
  simulateEmailDelivery,
  startEmailSend,
} from '@/lib/confirmationEmail';

const basePurchase: Purchase = {
  code: 'CN-0007',
  customerEmail: 'corporativo@codenova.demo',
  routeId: 'sdq-sju',
  components: [
    {
      passengerIndex: 0,
      passengerKind: 'adult',
      leg: 'ida',
      flightNumber: 'CN101',
      date: '2026-11-09',
      seatId: '1A',
      fare: 7_900,
    },
    {
      passengerIndex: 1,
      passengerKind: 'child',
      leg: 'ida',
      flightNumber: 'CN101',
      date: '2026-11-09',
      seatId: '1B',
      fare: 7_900,
    },
    {
      passengerIndex: 0,
      passengerKind: 'adult',
      leg: 'vuelta',
      flightNumber: 'CN102',
      date: '2026-11-11',
      seatId: '2A',
      fare: 7_900,
    },
    {
      passengerIndex: 1,
      passengerKind: 'child',
      leg: 'vuelta',
      flightNumber: 'CN102',
      date: '2026-11-11',
      seatId: '2B',
      fare: 7_900,
    },
  ],
  passengerCount: 2,
  grossTotal: 31_600,
  milesUsed: 10_000,
  discountApplied: 1_000,
  netTotal: 30_600,
  status: 'confirmada',
  pendingMiles: 0,
  milesCredited: false,
  returnArrivalUtcMs: Date.UTC(2026, 10, 11, 15, 45),
};

afterEach(() => setSimulatedEmailFailure(false));

describe('demo failure account fixture', () => {
  it('marks only correo-fallido@codenova.demo with simulatedEmailFailure', () => {
    const demo = initialCustomers.find(
      (customer) => customer.email === 'correo-fallido@codenova.demo',
    );
    expect(demo).toMatchObject({
      type: 'Minorista',
      miles: 0,
      name: 'Prueba',
      simulatedEmailFailure: true,
    });
    for (const customer of initialCustomers) {
      if (customer.email !== 'correo-fallido@codenova.demo') {
        expect(customer.simulatedEmailFailure).not.toBe(true);
      }
    }
  });
});

describe('shouldForceEmailFailure', () => {
  it('forces FAILED for a purchase owned by the demo failure account', () => {
    const purchase: Purchase = {
      ...basePurchase,
      customerEmail: 'correo-fallido@codenova.demo',
    };
    expect(shouldForceEmailFailure(purchase, initialCustomers)).toBe(true);
    const pending = startEmailSend(purchase);
    expect(finishEmailSend(pending, shouldForceEmailFailure(purchase, initialCustomers)).confirmationEmailStatus).toBe('FAILED');
  });

  it('keeps SENT for purchases owned by normal accounts', () => {
    for (const email of [
      'minorista@codenova.demo',
      'corporativo@codenova.demo',
    ]) {
      const purchase: Purchase = { ...basePurchase, customerEmail: email };
      expect(shouldForceEmailFailure(purchase, initialCustomers)).toBe(false);
      const pending = startEmailSend(purchase);
      expect(
        finishEmailSend(
          pending,
          shouldForceEmailFailure(purchase, initialCustomers),
        ).confirmationEmailStatus,
      ).toBe('SENT');
    }
  });

  it('keeps SENT when the purchase owner is not found', () => {
    const purchase: Purchase = {
      ...basePurchase,
      customerEmail: 'desconocido@codenova.demo',
    };
    expect(shouldForceEmailFailure(purchase, initialCustomers)).toBe(false);
  });

  it('keeps SENT for a CU-02 registered customer (no flag assigned)', () => {
    const registered: DemoCustomer = {
      email: 'nuevo@codenova.demo',
      type: 'Minorista',
      miles: 0,
      name: 'Nuevo',
    };
    const customers = [...initialCustomers, registered];
    const purchase: Purchase = { ...basePurchase, customerEmail: registered.email };
    expect(registered.simulatedEmailFailure).toBeUndefined();
    expect(shouldForceEmailFailure(purchase, customers)).toBe(false);
  });
});

describe('simulateEmailDelivery', () => {
  it('returns SENT by default', () => {
    expect(simulateEmailDelivery()).toBe('SENT');
  });

  it('returns FAILED only when the internal failure flag is set', () => {
    setSimulatedEmailFailure(true);
    expect(simulateEmailDelivery()).toBe('FAILED');
    setSimulatedEmailFailure(false);
    expect(simulateEmailDelivery()).toBe('SENT');
  });

  it('returns FAILED when the per-purchase forceFailure is set', () => {
    expect(simulateEmailDelivery(true)).toBe('FAILED');
    expect(simulateEmailDelivery(false)).toBe('SENT');
  });

  it('combines the global flag and forceFailure with OR', () => {
    setSimulatedEmailFailure(true);
    expect(simulateEmailDelivery(false)).toBe('FAILED');
    expect(simulateEmailDelivery(true)).toBe('FAILED');
    setSimulatedEmailFailure(false);
  });
});

describe('startEmailSend', () => {
  it('marks an unprocessed purchase as PENDING', () => {
    const pending = startEmailSend(basePurchase);
    expect(pending.confirmationEmailStatus).toBe('PENDING');
    expect(pending.code).toBe(basePurchase.code);
    expect(pending.netTotal).toBe(basePurchase.netTotal);
  });

  it('is idempotent: PENDING, SENT and FAILED are never restarted', () => {
    const pending = startEmailSend(basePurchase);
    expect(startEmailSend(pending)).toBe(pending);
    const sent = { ...pending, confirmationEmailStatus: 'SENT' as const };
    expect(startEmailSend(sent)).toBe(sent);
    const failed = { ...pending, confirmationEmailStatus: 'FAILED' as const };
    expect(startEmailSend(failed)).toBe(failed);
  });
});

describe('finishEmailSend', () => {
  it('completes a PENDING send as SENT by default', () => {
    const pending = startEmailSend(basePurchase);
    const finished = finishEmailSend(pending);
    expect(finished.confirmationEmailStatus).toBe('SENT');
  });

  it('completes a PENDING send as FAILED when the service fails', () => {
    setSimulatedEmailFailure(true);
    const pending = startEmailSend(basePurchase);
    expect(finishEmailSend(pending).confirmationEmailStatus).toBe('FAILED');
  });

  it('completes a PENDING send as FAILED with forceFailure', () => {
    const pending = startEmailSend(basePurchase);
    expect(finishEmailSend(pending, true).confirmationEmailStatus).toBe(
      'FAILED',
    );
    expect(finishEmailSend(pending, false).confirmationEmailStatus).toBe(
      'SENT',
    );
  });

  it('never alters a purchase that is not PENDING', () => {
    expect(finishEmailSend(basePurchase)).toBe(basePurchase);
    const sent = {
      ...basePurchase,
      confirmationEmailStatus: 'SENT' as const,
    };
    expect(finishEmailSend(sent)).toBe(sent);
  });

  it('never marks a cancelled purchase', () => {
    const cancelledPending = {
      ...startEmailSend(basePurchase),
      status: 'cancelada' as const,
    };
    expect(finishEmailSend(cancelledPending).confirmationEmailStatus).toBe(
      'PENDING',
    );
  });

  it('FAILED leaves every purchase field untouched', () => {
    setSimulatedEmailFailure(true);
    const finished = finishEmailSend(startEmailSend(basePurchase));
    expect(finished.confirmationEmailStatus).toBe('FAILED');
    expect(finished.status).toBe('confirmada');
    expect(finished.components).toEqual(basePurchase.components);
    expect(finished.netTotal).toBe(basePurchase.netTotal);
    expect(finished.milesUsed).toBe(basePurchase.milesUsed);
  });
});

describe('buildConfirmationEmail', () => {
  it('addresses the purchase owner and uses the reservation code', () => {
    const email = buildConfirmationEmail(basePurchase);
    expect(email.to).toBe('corporativo@codenova.demo');
    expect(email.subject).toContain('CN-0007');
    expect(email.code).toBe('CN-0007');
  });

  it('includes both legs with flights, dates, routes and seats', () => {
    const email = buildConfirmationEmail(basePurchase, 'Ana');
    expect(email.greeting).toBe('Hola, Ana.');
    expect(email.legs).toHaveLength(2);
    expect(email.legs[0]).toMatchObject({
      label: 'Ida',
      flightNumber: 'CN101',
      departureTime: '08:00',
    });
    expect(email.legs[0].routeLabel).toContain('Santo Domingo (SDQ)');
    expect(email.legs[0].routeLabel).toContain('San Juan (SJU)');
    expect(email.legs[0].seats).toEqual([
      { passengerLabel: 'Pasajero 1 (Adulto)', seatId: '1A' },
      { passengerLabel: 'Pasajero 2 (Niño)', seatId: '1B' },
    ]);
    expect(email.legs[1].flightNumber).toBe('CN102');
    expect(email.legs[1].seats[0].seatId).toBe('2A');
  });

  it('shows each leg in its own flight direction (SDQ→SJU ida, SJU→SDQ vuelta)', () => {
    const email = buildConfirmationEmail(basePurchase);
    expect(email.legs[0].routeLabel).toBe(
      'Santo Domingo (SDQ) → San Juan (SJU)',
    );
    expect(email.legs[1].routeLabel).toBe(
      'San Juan (SJU) → Santo Domingo (SDQ)',
    );
  });

  it('mirrors the direction for a purchase booked SJU→SDQ', () => {
    const reversedPurchase: Purchase = {
      ...basePurchase,
      components: basePurchase.components.map((component) => ({
        ...component,
        flightNumber:
          component.leg === 'ida' ? 'CN102' : 'CN101',
      })),
    };
    const email = buildConfirmationEmail(reversedPurchase);
    expect(email.legs[0].routeLabel).toBe(
      'San Juan (SJU) → Santo Domingo (SDQ)',
    );
    expect(email.legs[1].routeLabel).toBe(
      'Santo Domingo (SDQ) → San Juan (SJU)',
    );
  });

  it('greets without a name using the corporate fallback', () => {
    const email = buildConfirmationEmail(basePurchase);
    expect(email.greeting).toBe(
      'Hola, gracias por elegir SkyNova Airlines.',
    );
  });

  it('reflects passengers, miles, discount and totals from the purchase', () => {
    const email = buildConfirmationEmail(basePurchase);
    expect(email.passengerSummary).toBe('1 adulto · 1 niño');
    expect(email.milesUsed).toBe(10_000);
    expect(email.discountApplied).toBe(1_000);
    expect(email.grossTotal).toBe(31_600);
    expect(email.netTotal).toBe(30_600);
  });
});

describe('CU-07 — email content snapshot and schedule resolution', () => {
  const cn101DepMs = Date.parse('2026-11-09T12:00:00.000Z'); // 08:00 SDQ
  const updates: FlightUpdates = {
    CN101: [
      {
        departureLocal: '09:30',
        durationMinutes: 90,
        effectiveAtMs: cn101DepMs - 1_000,
      },
    ],
  };

  it('builds the email with the base schedule without updates', () => {
    const email = buildConfirmationEmail(basePurchase);
    expect(email.legs[0].departureTime).toBe('08:00');
  });

  it('builds the email with the resolved schedule after an update', () => {
    const email = buildConfirmationEmail(basePurchase, undefined, updates);
    expect(email.legs[0].departureTime).toBe('09:30');
    // The untouched return leg keeps its base schedule.
    expect(email.legs[1].departureTime).toBe('10:30');
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
    const email = buildConfirmationEmail(basePurchase, undefined, late);
    expect(email.legs[0].departureTime).toBe('08:00');
  });

  it('stores the content snapshot when the send starts', () => {
    const content = buildConfirmationEmail(basePurchase, undefined, updates);
    const pending = startEmailSend(basePurchase, content);
    expect(pending.confirmationEmailStatus).toBe('PENDING');
    expect(pending.confirmationEmailContent).toBe(content);
    expect(pending.confirmationEmailContent?.legs[0].departureTime).toBe(
      '09:30',
    );
  });

  it('preserves the snapshot through SENT and FAILED', () => {
    const content = buildConfirmationEmail(basePurchase, undefined, updates);
    const pending = startEmailSend(basePurchase, content);
    const sent = finishEmailSend(pending, false);
    expect(sent.confirmationEmailStatus).toBe('SENT');
    expect(sent.confirmationEmailContent?.legs[0].departureTime).toBe('09:30');

    const failed = finishEmailSend(pending, true);
    expect(failed.confirmationEmailStatus).toBe('FAILED');
    expect(failed.confirmationEmailContent?.legs[0].departureTime).toBe('09:30');
  });

  it('freezes the content: later schedule updates cannot alter it', () => {
    const content = buildConfirmationEmail(basePurchase, undefined, updates);
    const sent = finishEmailSend(startEmailSend(basePurchase, content), false);
    // A second, different schedule update exists afterwards.
    const later: FlightUpdates = {
      CN101: [
        ...updates.CN101!,
        {
          departureLocal: '14:00',
          durationMinutes: 100,
          effectiveAtMs: cn101DepMs + 2_000,
        },
      ],
    };
    const rebuilt = buildConfirmationEmail(sent, undefined, later);
    expect(rebuilt.legs[0].departureTime).toBe('14:00');
    // The stored snapshot still shows what the email contained.
    expect(sent.confirmationEmailContent?.legs[0].departureTime).toBe('09:30');
  });

  it('does not overwrite an existing snapshot on repeated sends', () => {
    const first = buildConfirmationEmail(basePurchase);
    const pending = startEmailSend(basePurchase, first);
    const second = buildConfirmationEmail(basePurchase, undefined, updates);
    const again = startEmailSend(pending, second);
    expect(again).toBe(pending);
    expect(again.confirmationEmailContent?.legs[0].departureTime).toBe('08:00');
  });

  it('allows PENDING without a snapshot (live preview fallback)', () => {
    const pending = startEmailSend(basePurchase);
    expect(pending.confirmationEmailStatus).toBe('PENDING');
    expect(pending.confirmationEmailContent).toBeUndefined();
  });
});
