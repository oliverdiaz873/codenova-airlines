import { Link, useLocation } from 'react-router';
import {
  formatCurrency,
} from '@/data/flights';
import {
  formatDateLong,
  formatDurationMinutes,
  type SearchSelection,
} from '@/lib/flightSearch';
import './BookingStub.css';

interface LegRowProps {
  label: string;
  leg: SearchSelection['outbound'];
}

function LegRow({ label, leg }: LegRowProps) {
  return (
    <li className="booking-stub__leg">
      <span className="booking-stub__leg-label">{label}</span>
      <span className="booking-stub__leg-flight">
        {leg.flightNumber} · {leg.originLabel} → {leg.destinationLabel}
      </span>
      <span className="booking-stub__leg-time">
        {formatDateLong(leg.date)} · {leg.departureTime} – {leg.arrivalTime}
        {leg.arrivalNextDay && ' (+1 día)'} ·{' '}
        {formatDurationMinutes(leg.durationMinutes)}
      </span>
    </li>
  );
}

/**
 * Provisional CU-04 entry point (D3).
 * Receives the CU-03 selection via router state and informs that the
 * booking flow will be implemented later. No reservation is created.
 */
export function BookingStub() {
  const location = useLocation();
  const selection = location.state as SearchSelection | null;
  const isValid =
    selection && selection.outbound && selection.returnFlight && selection.departureDate;

  if (!isValid) {
    return (
      <main className="booking-stub">
        <section className="booking-stub__card">
          <h1 className="booking-stub__title">Reserva de vuelos</h1>
          <p className="booking-stub__text">
            No hay una búsqueda seleccionada. Realiza una búsqueda de vuelos
            para continuar.
          </p>
          <Link to="/buscar" className="btn btn-primary">
            Buscar vuelos
          </Link>
        </section>
      </main>
    );
  }

  const pax = selection.passengers;
  const paxSummary = [
    pax.adults > 0 && `${pax.adults} adulto${pax.adults === 1 ? '' : 's'}`,
    pax.children > 0 && `${pax.children} niño${pax.children === 1 ? '' : 's'}`,
    pax.infants > 0 && `${pax.infants} infante${pax.infants === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="booking-stub">
      <section className="booking-stub__card" aria-label="Resumen de la búsqueda">
        <span className="booking-stub__eyebrow">Reserva de vuelos</span>
        <h1 className="booking-stub__title">
          {selection.originLabel} → {selection.destinationLabel}
        </h1>

        <ul className="booking-stub__legs">
          <LegRow label="Ida" leg={selection.outbound} />
          <LegRow label="Regreso" leg={selection.returnFlight} />
        </ul>

        <dl className="booking-stub__details">
          <div className="booking-stub__row">
            <dt>Pasajeros</dt>
            <dd>
              {paxSummary} ({selection.totalPassengers} en total)
            </dd>
          </div>
          <div className="booking-stub__row">
            <dt>Tarifa estimada ida y vuelta</dt>
            <dd>{formatCurrency(selection.totalPrice)}</dd>
          </div>
        </dl>

        <p className="booking-stub__notice" role="status">
          Esta es una página provisional. CU-04 (reserva de vuelos) se
          implementará posteriormente; aquí no se crean reservas, no se
          seleccionan asientos y no se aplican millas.
        </p>

        <div className="booking-stub__actions">
          <Link to="/buscar" className="btn btn-primary">
            Nueva búsqueda
          </Link>
          <Link to="/panel" className="booking-stub__secondary">
            Volver al panel
          </Link>
        </div>
      </section>
    </main>
  );
}
