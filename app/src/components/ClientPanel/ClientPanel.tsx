import { Link, useNavigate, useOutletContext } from 'react-router';
import type { DemoCustomer } from '@/data/customers';
import { useAccrualSync } from '@/components/BookingProvider/useBooking';
import './ClientPanel.css';

interface ClientPanelProps {
  onLogout: () => void;
}

/**
 * Minimal Client panel entry point (D1-B).
 * Shows basic account info and access to CU-03 flight search.
 * Full booking history and other panel features are out of scope.
 */
export function ClientPanel({ onLogout }: ClientPanelProps) {
  const customer = useOutletContext<DemoCustomer>();
  const navigate = useNavigate();
  useAccrualSync();

  const handleLogout = () => {
    onLogout();
    navigate('/', { replace: true });
  };

  return (
    <main className="client-panel">
      <section className="client-panel__card" aria-label="Panel del cliente">
        <span className="client-panel__eyebrow">Panel del cliente</span>
        <h1 className="client-panel__title">
          Hola, cliente {customer.type.toLowerCase()}
        </h1>

        <dl className="client-panel__account">
          <div className="client-panel__row">
            <dt>Correo</dt>
            <dd>{customer.email}</dd>
          </div>
          <div className="client-panel__row">
            <dt>Millas</dt>
            <dd>{customer.miles.toLocaleString('es-DO')}</dd>
          </div>
          {customer.company && (
            <div className="client-panel__row">
              <dt>Compañía</dt>
              <dd>{customer.company}</dd>
            </div>
          )}
        </dl>

        <div className="client-panel__actions">
          <Link to="/buscar" className="btn btn-primary client-panel__search">
            Buscar vuelos
          </Link>
          <Link
            to="/panel/reservas"
            className="btn btn-primary client-panel__search"
          >
            Mis reservaciones
          </Link>
          <button
            type="button"
            className="client-panel__logout"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>

        <p className="client-panel__note">
          Esta es una demostración. Tu sesión y los datos se reinician al
          recargar la página.
        </p>
      </section>
    </main>
  );
}
