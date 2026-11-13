import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatCurrency } from '@/data/flights';
import { scheduledServiceForDate } from '@/lib/flightUpdate';
import {
  cancelDeadlineUtcMs,
  isCancellationEligible,
  refundBreakdown,
} from '@/lib/cancelPurchase';
import { utcToLocalDateTime } from '@/lib/dates';
import {
  formatDateLong,
  formatDurationMinutes,
} from '@/lib/flightSearch';
import {
  purchaseLegs,
  purchasePassengerSummary,
  purchaseRouteLabel,
} from '@/lib/purchaseView';
import { useBooking } from '@/components/BookingProvider/useBooking';
import './ReservationDetail.css';

function formatInstant(ms: number): string {
  return new Date(ms).toLocaleString('es-DO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/**
 * CU-06 — Reservation detail and cancellation flow.
 * Read-only itinerary/payment view plus the approved cancellation
 * window: eligibility is recomputed from the purchase at render time and
 * the actual transition is delegated to BookingProvider.cancelPurchase,
 * which commits atomically. A failed transition changes nothing.
 */
export function ReservationDetail() {
  const { code } = useParams<{ code: string }>();
  const { purchases, activeCustomer, cancelPurchase, flightUpdates } =
    useBooking();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [justCancelled, setJustCancelled] = useState(false);
  // Eligibility snapshot at mount: the authoritative check always runs
  // inside cancelPurchase with a fresh timestamp, so a stale render can
  // never cancel outside the deadline.
  const [viewedAtMs] = useState(() => Date.now());

  const purchase = useMemo(
    () =>
      purchases.find(
        (candidate) =>
          candidate.code === code &&
          candidate.customerEmail === activeCustomer?.email,
      ) ?? null,
    [purchases, code, activeCustomer],
  );

  const legs = useMemo(
    () => (purchase ? purchaseLegs(purchase, flightUpdates) : []),
    [purchase, flightUpdates],
  );

  if (!purchase) {
    return (
      <main className="reservation">
        <div className="container">
          <section className="reservation__card">
            <h1 className="reservation__title">Reservación no encontrada</h1>
            <p>
              No existe una reservación con ese código en tu cuenta, o ya no
              está disponible en esta sesión.
            </p>
            <Link to="/panel/reservas" className="btn btn-primary">
              Mis reservaciones
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const eligible = isCancellationEligible(purchase, viewedAtMs, flightUpdates);
  const isCancelled = purchase.status === 'cancelada';
  const breakdown = refundBreakdown(purchase.netTotal);

  // Deadline shown to the customer in the origin airport's local time.
  const firstComponent = purchase.components.find(
    (component) => component.leg === 'ida',
  );
  const originService = firstComponent
    ? scheduledServiceForDate(
        firstComponent.flightNumber,
        flightUpdates,
        firstComponent.date,
      )
    : undefined;
  const deadlineMs = cancelDeadlineUtcMs(purchase, flightUpdates);
  const deadlineLabel =
    deadlineMs !== null && originService
      ? (() => {
          const local = utcToLocalDateTime(
            new Date(deadlineMs),
            originService.origin.timeZone,
          );
          return `${formatDateLong(local.date)} · ${local.time}`;
        })()
      : null;

  const handleConfirmCancel = () => {
    const result = cancelPurchase(purchase.code);
    if (result.ok) {
      setJustCancelled(true);
      setConfirmOpen(false);
      setCancelError('');
    } else {
      setCancelError(result.error);
    }
  };

  return (
    <main className="reservation">
      <div className="container">
        <header className="reservation__header">
          <span className="reservation__eyebrow">Reservación</span>
          <h1 className="reservation__title">
            {purchase.code}{' '}
            <span
              className={`reservation__status reservation__status--${purchase.status}`}
            >
              {isCancelled ? 'Cancelada' : 'Confirmada'}
            </span>
          </h1>
          <p className="reservation__route">
            {purchaseRouteLabel(purchase, flightUpdates)}
          </p>
        </header>

        {justCancelled && (
          <div className="reservation__result" role="status">
            <strong>Reservación cancelada</strong>
            <p>
              Tu reservación {purchase.code} fue cancelada. Se liberaron
              todos los asientos y registramos un reembolso simulado de{' '}
              <strong>{formatCurrency(purchase.refundAmount ?? 0)}</strong>.
            </p>
            <Link to="/panel/reservas" className="btn btn-primary">
              Mis reservaciones
            </Link>
          </div>
        )}

        <section className="reservation__card" aria-label="Itinerario">
          <h2 className="reservation__section-title">Itinerario</h2>
          <ul className="reservation__legs">
            {legs.map((leg) => (
              <li key={leg.leg} className="reservation__leg">
                <span className="reservation__leg-label">{leg.label}</span>
                <span className="reservation__leg-flight">
                  {leg.flightNumber} · {leg.routeLabel}
                </span>
                <span className="reservation__leg-time">
                  {formatDateLong(leg.date)}
                  {leg.departureTime && ` · ${leg.departureTime}`}
                  {leg.arrivalTime &&
                    ` – ${leg.arrivalTime}${leg.arrivalNextDay ? ' (+1 día)' : ''}`}
                  {leg.durationMinutes !== null &&
                    ` · ${formatDurationMinutes(leg.durationMinutes)}`}
                </span>
                <ul className="reservation__seats">
                  {leg.seats.map((seat) => (
                    <li key={seat.passengerLabel}>
                      {seat.passengerLabel}: asiento{' '}
                      <strong>{seat.seatId}</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className="reservation__card" aria-label="Pasajeros">
          <h2 className="reservation__section-title">Pasajeros</h2>
          <p>{purchasePassengerSummary(purchase)}</p>
        </section>

        <section className="reservation__card" aria-label="Pago">
          <h2 className="reservation__section-title">Pago</h2>
          <dl className="reservation__payment">
            <div className="reservation__row">
              <dt>Precio bruto</dt>
              <dd>{formatCurrency(purchase.grossTotal)}</dd>
            </div>
            {purchase.milesUsed > 0 && (
              <>
                <div className="reservation__row">
                  <dt>Millas utilizadas</dt>
                  <dd>{purchase.milesUsed.toLocaleString('es-DO')}</dd>
                </div>
                <div className="reservation__row">
                  <dt>Descuento por millas</dt>
                  <dd>−{formatCurrency(purchase.discountApplied)}</dd>
                </div>
              </>
            )}
            <div className="reservation__row reservation__row--total">
              <dt>Total pagado</dt>
              <dd>{formatCurrency(purchase.netTotal)}</dd>
            </div>
            {isCancelled && purchase.refundAmount !== undefined && (
              <>
                <div className="reservation__row reservation__row--refund">
                  <dt>Reembolso simulado (80 %)</dt>
                  <dd>{formatCurrency(purchase.refundAmount)}</dd>
                </div>
                <div className="reservation__row">
                  <dt>No reembolsable (20 %)</dt>
                  <dd>
                    {formatCurrency(
                      purchase.netTotal - purchase.refundAmount,
                    )}
                  </dd>
                </div>
                <div className="reservation__row">
                  <dt>Fecha de cancelación</dt>
                  <dd>
                    {purchase.cancelledAtMs !== undefined
                      ? formatInstant(purchase.cancelledAtMs)
                      : '—'}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {!isCancelled && (
          <section className="reservation__card" aria-label="Cancelación">
            <h2 className="reservation__section-title">
              Cancelar reservación
            </h2>
            {eligible ? (
              <>
                <p>
                  Puedes cancelar esta reservación hasta el{' '}
                  <strong>{deadlineLabel}</strong> (168 horas antes del
                  primer vuelo). El reembolso simulado es del 80 % del
                  importe neto pagado.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setCancelError('');
                    setConfirmOpen(true);
                  }}
                >
                  Cancelar reservación
                </button>
              </>
            ) : (
              <>
                <p className="reservation__blocked">
                  La cancelación no está disponible: el plazo de 168 horas
                  antes del primer vuelo ya venció
                  {deadlineLabel && <> (límite: {deadlineLabel})</>}. Tu
                  reservación permanece confirmada.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled
                  aria-disabled="true"
                >
                  Cancelar reservación
                </button>
              </>
            )}
          </section>
        )}

        {isCancelled && (
          <p className="reservation__note">
            Esta reservación fue cancelada y todos sus asientos fueron
            liberados. Las millas utilizadas no se devolvieron y las
            millas acumuladas no se revirtieron.
          </p>
        )}

        {confirmOpen && (
          <div
            className="reservation__dialog-backdrop"
            role="presentation"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="reservation__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="cancel-dialog-title" className="reservation__dialog-title">
                Confirmar cancelación
              </h2>
              <dl className="reservation__dialog-amounts">
                <div className="reservation__row">
                  <dt>Importe neto pagado</dt>
                  <dd>{formatCurrency(purchase.netTotal)}</dd>
                </div>
                <div className="reservation__row">
                  <dt>Reembolso del 80 %</dt>
                  <dd>{formatCurrency(breakdown.refundAmount)}</dd>
                </div>
                <div className="reservation__row">
                  <dt>No reembolsable (20 %)</dt>
                  <dd>{formatCurrency(breakdown.nonRefundableAmount)}</dd>
                </div>
                <div className="reservation__row reservation__row--total">
                  <dt>Recibirás</dt>
                  <dd>{formatCurrency(breakdown.refundAmount)}</dd>
                </div>
              </dl>
              <p className="reservation__dialog-miles">
                Las millas utilizadas en esta compra no se devolverán y las
                millas acumuladas no se revertirán.
              </p>
              {cancelError && (
                <p className="reservation__dialog-error" role="alert">
                  {cancelError}
                </p>
              )}
              <div className="reservation__dialog-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmCancel}
                >
                  Confirmar cancelación
                </button>
                <button
                  type="button"
                  className="reservation__dialog-cancel"
                  onClick={() => setConfirmOpen(false)}
                >
                  Volver sin cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
