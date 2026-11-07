import { FLIGHT_CONNECTIONS, DAYS_OF_OPERATION, formatCurrency } from '@/data/flights';
import './Routes.css';

const proposedConnection = {
  id: 'mad-sjo-proposal',
  origin: { city: 'Madrid', iata: 'MAD' },
  destination: { city: 'San José', iata: 'SJO' },
  farePerPassenger: 12000,
  scheduleLabel: 'Todos los días',
  image: '/hero-airplane.png',
  badge: 'Propuesta ficticia',
};

export function Routes() {
  const connections = [
    ...FLIGHT_CONNECTIONS.map((connection) => ({
      ...connection,
      scheduleLabel: connection.schedule ?? 'Horario por confirmar',
      badge: 'Vuelo directo',
    })),
    proposedConnection,
  ];

  return (
    <section className="routes" id="routes">
      <div className="container">
        <div className="routes__header">
          <span className="routes__label">Nuestras rutas</span>
          <h2 className="heading-lg routes__title">Conexiones directas</h2>
          <p className="text-lg routes__subtitle">
            Cinco conexiones aprobadas y una propuesta ficticia. Tarifas con impuestos incluidos.
          </p>
        </div>

        <div className="routes__days">
          <span className="routes__days-label">Días de operación de las rutas aprobadas:</span>
          {DAYS_OF_OPERATION.map((day) => (
            <span key={day} className="routes__day-badge">{day}</span>
          ))}
        </div>

        <div className="routes__grid">
          {connections.map((conn) => (
            <article className="route-card" key={conn.id} id={`route-${conn.id}`}>
              <div className="route-card__image">
                <img
                  src={conn.image}
                  alt={`Vista de ${conn.destination.city}`}
                  loading="lazy"
                />
                <span className={`route-card__badge${conn.id === proposedConnection.id ? ' route-card__badge--proposal' : ''}`}>
                  {conn.badge}
                </span>
              </div>

              <div className="route-card__body">
                <div className="route-card__route-display">
                  <div className="route-card__city">
                    <div className="route-card__iata">{conn.origin.iata}</div>
                    <div className="route-card__city-name">{conn.origin.city}</div>
                  </div>

                  <div className="route-card__divider">
                    <span className="route-card__divider-line" />
                    <span className="route-card__divider-icon">✈</span>
                    <span className="route-card__divider-line" />
                  </div>

                  <div className="route-card__city">
                    <div className="route-card__iata">{conn.destination.iata}</div>
                    <div className="route-card__city-name">{conn.destination.city}</div>
                  </div>
                </div>

                <div className="route-card__details">
                  <div className="route-card__price">
                    <span className="route-card__price-label">Tarifa fija por pasajero</span>
                    <span className="route-card__price-value">
                      {formatCurrency(conn.farePerPassenger)}
                    </span>
                  </div>
                  <span className="route-card__schedule">
                    {conn.scheduleLabel}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="routes__note">
          Tarifas de demostración por trayecto, con impuestos incluidos. Mismo
          precio en ambas direcciones y para todas las categorías de pasajero.
        </p>
      </div>
    </section>
  );
}
