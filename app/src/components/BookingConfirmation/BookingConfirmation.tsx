import { Link, useLocation } from 'react-router';
import { formatCurrency } from '@/data/flights';
import {
  PASSENGER_KIND_LABELS,
  type BookingComponent,
  type Purchase,
} from '@/lib/booking';
import {
  formatDateLong,
  formatDurationMinutes,
  isValidSearchSelection,
  type SearchSelection,
} from '@/lib/flightSearch';
import { useBooking } from '@/components/BookingProvider/useBooking';
import './BookingConfirmation.css';

type Leg = 'ida' | 'vuelta';

const LEG_LABELS: Record<Leg, string> = { ida: 'Ida', vuelta: 'Regreso' };

const VALID_PASSENGER_KINDS = new Set<string>([
  'adult',
  'child',
  'infant',
]);

interface FlightLegProps {
  label: string;
  leg: SearchSelection['outbound'];
}

function FlightLeg({ label, leg }: FlightLegProps) {
  return (
    <li className="confirmation__leg">
      <span className="confirmation__leg-label">{label}</span>
      <span className="confirmation__leg-flight">
        {leg.flightNumber} · {leg.originLabel} → {leg.destinationLabel}
      </span>
      <span className="confirmation__leg-time">
        {formatDateLong(leg.date)} · {leg.departureTime} – {leg.arrivalTime}
        {leg.arrivalNextDay && ' (+1 día)'} ·{' '}
        {formatDurationMinutes(leg.durationMinutes)}
      </span>
    </li>
  );
}

function legComponents(
  purchase: Purchase,
  leg: Leg,
): BookingComponent[] {
  return purchase.components
    .filter((component) => component.leg === leg)
    .sort((a, b) => a.passengerIndex - b.passengerIndex);
}

/**
 * Cross-check that the router-state selection is the one that produced
 * this purchase: same route, same leg flights and dates, same passenger
 * count, and consistent components on both legs. Any divergence means the
 * state was manipulated or is stale, so the screen falls back to the
 * controlled empty state instead of mixing data from two reservations.
 */
function selectionMatchesPurchase(
  selection: SearchSelection,
  purchase: Purchase,
): boolean {
  if (
    selection.routeId !== purchase.routeId ||
    selection.totalPassengers !== purchase.passengerCount
  ) {
    return false;
  }
  // buildPurchase emits exactly passengerCount components per leg, one per
  // passenger, with passengerIndex covering 0..passengerCount-1 exactly
  // once. Anything missing, duplicated or out of range is inconsistent.
  const passengerCount = purchase.passengerCount;
  const legsComplete = (['ida', 'vuelta'] as const).every((leg) => {
    const legComponents = purchase.components.filter(
      (component) => component.leg === leg,
    );
    if (legComponents.length !== passengerCount) return false;
    const seen = new Set<number>();
    return legComponents.every((component) => {
      const index = component.passengerIndex;
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= passengerCount ||
        seen.has(index) ||
        !VALID_PASSENGER_KINDS.has(component.passengerKind)
      ) {
        return false;
      }
      seen.add(index);
      return true;
    });
  });
  if (!legsComplete) return false;
  return purchase.components.every((component) => {
    if (component.leg === 'ida') {
      return (
        component.flightNumber === selection.outbound.flightNumber &&
        component.date === selection.departureDate
      );
    }
    if (component.leg === 'vuelta') {
      return (
        component.flightNumber === selection.returnFlight.flightNumber &&
        component.date === selection.returnDate
      );
    }
    return false;
  });
}

/**
 * CU-04 — Booking confirmation screen.
 * Read-only view of a purchase already committed by confirmPurchase: it
 * never re-confirms, never mutates balances and renders only recorded
 * values. Router state supplies the code and the validated selection;
 * the purchase itself is resolved from BookingProvider. Missing or
 * unknown data produces a controlled empty state — never a fictitious
 * reservation.
 */
export function BookingConfirmation() {
  const location = useLocation();
  const { purchases } = useBooking();

  const state = location.state as {
    code?: unknown;
    selection?: unknown;
  } | null;
  const code = typeof state?.code === 'string' ? state.code : null;
  const selection = isValidSearchSelection(state?.selection)
    ? state.selection
    : null;
  const purchase = code
    ? purchases.find((candidate) => candidate.code === code)
    : undefined;
  const matches =
    selection !== null && purchase !== undefined
      ? selectionMatchesPurchase(selection, purchase)
      : false;

  if (!code || !selection || !purchase || !matches) {
    return (
      <main className="confirmation">
        <div className="container">
          <section className="confirmation__card">
            <span className="confirmation__eyebrow">Reserva de vuelos</span>
            <h1 className="confirmation__title">Sin reserva que mostrar</h1>
            <p className="confirmation__text">
              No hay una compra confirmada asociada a esta vista. El acceso
              directo o una recarga de página no recuperan la confirmación,
              que solo existe en la sesión actual del prototipo.
            </p>
            <div className="confirmation__actions">
              <Link to="/panel" className="btn btn-primary">
                Ir al panel
              </Link>
              <Link to="/buscar" className="confirmation__secondary">
                Buscar vuelos
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const idaComponents = legComponents(purchase, 'ida');
  const vueltaComponents = legComponents(purchase, 'vuelta');
  const kindCounts = { adult: 0, child: 0, infant: 0 };
  for (const component of idaComponents) {
    kindCounts[component.passengerKind] += 1;
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

  const statusLabel =
    purchase.status === 'confirmada' ? 'Confirmada' : 'Cancelada';

  return (
    <main className="confirmation">
      <div className="container">
        <header className="confirmation__header">
          <span className="confirmation__eyebrow">Reserva de vuelos</span>
          <h1 className="confirmation__title">Reserva {purchase.code}</h1>
        </header>

        <section
          className="confirmation__card"
          aria-label="Estado de la reserva"
        >
          <div className="confirmation__status-row">
            <span
              className={`confirmation__status confirmation__status--${purchase.status}`}
            >
              {statusLabel}
            </span>
            <span className="confirmation__code">
              Código de confirmación: <strong>{purchase.code}</strong>
            </span>
          </div>
        </section>

        <section className="confirmation__card" aria-label="Vuelos">
          <h2 className="confirmation__section-title">Tus vuelos</h2>
          <ul className="confirmation__legs">
            <FlightLeg label="Ida" leg={selection.outbound} />
            <FlightLeg label="Regreso" leg={selection.returnFlight} />
          </ul>
          <dl className="confirmation__details">
            <div className="confirmation__row">
              <dt>Pasajeros</dt>
              <dd>
                {passengerSummary} ({purchase.passengerCount} en total)
              </dd>
            </div>
          </dl>
        </section>

        <section className="confirmation__card" aria-label="Asientos">
          <h2 className="confirmation__section-title">Asientos</h2>
          <div className="confirmation__seats">
            {(
              [
                ['ida', selection.outbound.flightNumber, idaComponents],
                ['vuelta', selection.returnFlight.flightNumber, vueltaComponents],
              ] as const
            ).map(([leg, flightNumber, components]) => (
              <div key={leg} className="confirmation__seats-leg">
                <h3>
                  {LEG_LABELS[leg]} · {flightNumber}
                </h3>
                <ul>
                  {components.map((component) => (
                    <li key={component.passengerIndex}>
                      Pasajero {component.passengerIndex + 1} (
                      {PASSENGER_KIND_LABELS[component.passengerKind]}):{' '}
                      <strong>{component.seatId}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="confirmation__card" aria-label="Importe">
          <h2 className="confirmation__section-title">Importe de la compra</h2>
          <dl className="confirmation__totals">
            <div className="confirmation__row">
              <dt>Precio bruto</dt>
              <dd>{formatCurrency(purchase.grossTotal)}</dd>
            </div>
            {purchase.milesUsed > 0 && (
              <>
                <div className="confirmation__row">
                  <dt>Millas utilizadas</dt>
                  <dd>{purchase.milesUsed.toLocaleString('es-DO')}</dd>
                </div>
                <div className="confirmation__row">
                  <dt>Descuento por millas</dt>
                  <dd>−{formatCurrency(purchase.discountApplied)}</dd>
                </div>
              </>
            )}
            <div className="confirmation__row confirmation__row--total">
              <dt>Total pagado</dt>
              <dd>{formatCurrency(purchase.netTotal)}</dd>
            </div>
          </dl>

          <div className="confirmation__actions">
            <Link to="/panel" className="btn btn-primary">
              Volver al panel
            </Link>
            <Link to="/buscar" className="confirmation__secondary">
              Nueva búsqueda
            </Link>
          </div>

          <p className="confirmation__note">
            Esta es una demostración: la reserva existe solo en la sesión
            actual y se reinicia al recargar la página.
          </p>
        </section>
      </div>
    </main>
  );
}
