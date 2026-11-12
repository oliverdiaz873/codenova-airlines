/**
 * CU-05 — Simulated confirmation email for a confirmed purchase.
 * Source: PLAN_CODENOVA.md — 3.5, 4.8.5, 4.8.7 (one confirmation per
 * purchase) and the academic CU-05 scenario (cu.txt): the external mail
 * service either confirms the send or reports a failure, and a failure
 * never alters the reservation.
 *
 * Frontend-only simulation: no SMTP, no network, no persistence. The send
 * result is produced by an internal deterministic mechanism that is never
 * exposed in the UI.
 */

import { FLIGHT_CONNECTIONS } from '@/data/flights';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import type { DemoCustomer } from '@/data/customers';
import {
  PASSENGER_KIND_LABELS,
  type BookingComponent,
  type Purchase,
} from '@/lib/booking';
import { formatDateLong } from '@/lib/flightSearch';

/** Visible delay of the simulated send (PENDING phase). */
export const EMAIL_SEND_DELAY_MS = 400;

let forceEmailFailure = false;

/**
 * Internal test/demo hook: forces the simulated mail service to fail.
 * Deterministic, invisible to the client and never touches purchase data.
 * Not referenced by any UI control.
 */
export function setSimulatedEmailFailure(fail: boolean): void {
  forceEmailFailure = fail;
}

/**
 * Result of the simulated external mail service. Fails when the internal
 * test flag is active or when the purchase owner account requests a
 * forced failure (demo account); the two indicators combine with OR.
 */
export function simulateEmailDelivery(forceFailure = false): 'SENT' | 'FAILED' {
  return forceEmailFailure || forceFailure ? 'FAILED' : 'SENT';
}

/**
 * Marks the purchase email as PENDING. Idempotent: a purchase that already
 * has any email status (PENDING in flight, SENT or FAILED) is returned
 * unchanged, so repeated triggers never restart the process.
 */
export function startEmailSend(purchase: Purchase): Purchase {
  if (purchase.confirmationEmailStatus !== undefined) return purchase;
  return { ...purchase, confirmationEmailStatus: 'PENDING' };
}

/**
 * Completes a PENDING send with the simulated service result. Only a
 * confirmed purchase still in PENDING transitions; anything else is a
 * no-op, which also guarantees a FAILED result can never be produced for
 * an already-resolved or cancelled purchase.
 */
export function finishEmailSend(
  purchase: Purchase,
  forceFailure = false,
): Purchase {
  if (
    purchase.confirmationEmailStatus !== 'PENDING' ||
    purchase.status !== 'confirmada'
  ) {
    return purchase;
  }
  return {
    ...purchase,
    confirmationEmailStatus: simulateEmailDelivery(forceFailure),
  };
}

/**
 * Resolves whether the simulated send must fail for this purchase. The
 * decision belongs to the purchase owner (`customerEmail`), never to the
 * currently authenticated session; a missing owner never fails.
 */
export function shouldForceEmailFailure(
  purchase: Purchase,
  customers: DemoCustomer[],
): boolean {
  const owner = customers.find(
    (customer) => customer.email === purchase.customerEmail,
  );
  return owner?.simulatedEmailFailure === true;
}

export interface EmailLegSeat {
  passengerLabel: string;
  seatId: string;
}

export interface EmailLeg {
  label: string;
  flightNumber: string;
  routeLabel: string;
  dateLabel: string;
  departureTime: string | null;
  seats: EmailLegSeat[];
}

export interface ConfirmationEmail {
  to: string;
  subject: string;
  greeting: string;
  code: string;
  legs: EmailLeg[];
  passengerSummary: string;
  milesUsed: number;
  discountApplied: number;
  grossTotal: number;
  netTotal: number;
  footer: string;
}

const LEG_ORDER = ['ida', 'vuelta'] as const;
const LEG_LABELS: Record<(typeof LEG_ORDER)[number], string> = {
  ida: 'Ida',
  vuelta: 'Regreso',
};

function legComponents(
  purchase: Purchase,
  leg: (typeof LEG_ORDER)[number],
): BookingComponent[] {
  return purchase.components
    .filter((component) => component.leg === leg)
    .sort((a, b) => a.passengerIndex - b.passengerIndex);
}

function airportLabel(airport: { city: string; iata: string }): string {
  return `${airport.city} (${airport.iata})`;
}

/**
 * Builds the email content strictly from the confirmed purchase. Flight
 * times come from the approved scheduled services (4.7); everything else
 * comes from the purchase itself — nothing is invented.
 */
export function buildConfirmationEmail(
  purchase: Purchase,
  recipientName?: string,
): ConfirmationEmail {
  const connection = FLIGHT_CONNECTIONS.find(
    (candidate) => candidate.id === purchase.routeId,
  );

  const kindCounts: Record<string, number> = {};
  for (const component of legComponents(purchase, 'ida')) {
    kindCounts[component.passengerKind] =
      (kindCounts[component.passengerKind] ?? 0) + 1;
  }
  const passengerSummary = (
    [
      ['adult', 'adulto'],
      ['child', 'niño'],
      ['infant', 'infante'],
    ] as const
  )
    .map(
      ([kind, label]) =>
        kindCounts[kind] > 0 &&
        `${kindCounts[kind]} ${label}${kindCounts[kind] === 1 ? '' : 's'}`,
    )
    .filter(Boolean)
    .join(' · ');

  const legs: EmailLeg[] = LEG_ORDER.map((leg) => {
    const components = legComponents(purchase, leg);
    const first = components[0];
    const service = first
      ? SCHEDULED_SERVICES.find(
          (candidate) => candidate.flightNumber === first.flightNumber,
        )
      : undefined;
    // Each leg shows the direction of its own flight: the scheduled
    // service carries the real origin/destination; the connection is
    // only a fallback, mirrored for the return leg.
    const routeLabel = service
      ? `${airportLabel(service.origin)} → ${airportLabel(service.destination)}`
      : connection
        ? leg === 'ida'
          ? `${airportLabel(connection.origin)} → ${airportLabel(connection.destination)}`
          : `${airportLabel(connection.destination)} → ${airportLabel(connection.origin)}`
        : purchase.routeId;
    return {
      label: LEG_LABELS[leg],
      flightNumber: first?.flightNumber ?? '',
      routeLabel,
      dateLabel: first ? formatDateLong(first.date) : '',
      departureTime: service?.departureLocal ?? null,
      seats: components.map((component) => ({
        passengerLabel: `Pasajero ${component.passengerIndex + 1} (${PASSENGER_KIND_LABELS[component.passengerKind]})`,
        seatId: component.seatId,
      })),
    };
  });

  return {
    to: purchase.customerEmail,
    subject: `Confirmación de reserva ${purchase.code}`,
    greeting: recipientName
      ? `Hola, ${recipientName}.`
      : 'Hola, gracias por elegir SkyNova Airlines.',
    code: purchase.code,
    legs,
    passengerSummary,
    milesUsed: purchase.milesUsed,
    discountApplied: purchase.discountApplied,
    grossTotal: purchase.grossTotal,
    netTotal: purchase.netTotal,
    footer:
      'SkyNova Airlines · Este correo es una simulación del prototipo académico.',
  };
}
