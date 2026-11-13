import { Link } from 'react-router';
import { useBooking } from '@/components/BookingProvider/useBooking';
import { formatDateLong } from '@/lib/flightSearch';
import {
  purchaseFirstFlightDate,
  purchaseRouteLabel,
} from '@/lib/purchaseView';
import './ReservationList.css';

/**
 * CU-06 — «Mis reservaciones» list (/panel/reservas).
 * Shows only the purchases owned by the authenticated customer
 * (Purchase.customerEmail); cancelled purchases stay visible with their
 * status. Each card links to the reservation detail.
 */
export function ReservationList() {
  const { purchases, activeCustomer, flightUpdates } = useBooking();

  const myPurchases = purchases.filter(
    (purchase) => purchase.customerEmail === activeCustomer?.email,
  );

  return (
    <main className="reservation-list">
      <div className="container">
        <header className="reservation-list__header">
          <span className="reservation-list__eyebrow">Panel del cliente</span>
          <h1 className="reservation-list__title">Mis reservaciones</h1>
        </header>

        {myPurchases.length === 0 ? (
          <section className="reservation-list__card">
            <p className="reservation-list__empty">
              Todavía no tienes reservaciones.{' '}
              <Link to="/buscar">Buscar vuelos</Link>
            </p>
          </section>
        ) : (
          <ul className="reservation-list__items">
            {myPurchases.map((purchase) => (
              <li key={purchase.code} className="reservation-list__item">
                <div className="reservation-list__item-info">
                  <span className="reservation-list__item-route">
                    {purchaseRouteLabel(purchase, flightUpdates)}
                  </span>
                  <span className="reservation-list__item-meta">
                    {formatDateLong(purchaseFirstFlightDate(purchase))} ·{' '}
                    {purchase.passengerCount}{' '}
                    {purchase.passengerCount === 1
                      ? 'pasajero'
                      : 'pasajeros'}
                  </span>
                </div>
                <div className="reservation-list__item-side">
                  <span className="reservation-list__item-code">
                    {purchase.code}
                  </span>
                  <span
                    className={`reservation-list__item-status reservation-list__item-status--${purchase.status}`}
                  >
                    {purchase.status === 'confirmada'
                      ? 'Confirmada'
                      : 'Cancelada'}
                  </span>
                  <Link
                    to={`/panel/reservas/${purchase.code}`}
                    className="reservation-list__item-link"
                  >
                    Ver reservación
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="reservation-list__back">
          <Link to="/panel">← Volver al panel</Link>
        </p>
      </div>
    </main>
  );
}
