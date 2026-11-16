import { Link } from 'react-router';
import { FLIGHT_CONNECTIONS, DAYS_OF_OPERATION, formatCurrency } from '@/data/flights';
import type { FlightConnection } from '@/data/flights';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { serviceForNextOperatingDate } from '@/lib/flightUpdate';
import { effectiveConnectionForDate } from '@/lib/connectionUpdate';
import { todayISO } from '@/lib/dates';
import { useBooking } from '@/components/BookingProvider/useBooking';
import type { FlightUpdates } from '@/lib/flightUpdate';
import './Routes.css';

/**
 * Departure times from the connection's origin airport for the next
 * operating date, resolved through the CU-07 temporal rules: services
 * updated by the agent show their new schedule, while historical
 * occurrences keep their original times.
 */
function departuresLabel(
  routeId: string,
  originIata: string,
  flightUpdates: FlightUpdates | undefined,
  fromDateISO?: string,
): string {
  const times = SCHEDULED_SERVICES.filter(
    (service) =>
      service.routeId === routeId && service.origin.iata === originIata,
  )
    .map(
      (service) =>
        serviceForNextOperatingDate(service, flightUpdates, fromDateISO)
          .service.departureLocal,
    )
    .sort();
  return times.length > 0 ? `Salidas ${times.join(' y ')}` : 'Horario por confirmar';
}

export interface RoutesProps {
  /**
   * Catalog entries to show. Defaults to the approved connections; an empty
   * array renders the CU-01 alternate flow ("información no disponible").
   */
  catalog?: FlightConnection[];
}

export function Routes({ catalog = FLIGHT_CONNECTIONS }: RoutesProps = {}) {
  const { flightUpdates, connectionUpdates } = useBooking();
  const connections = catalog.map((connection) => {
    // D-6: the public catalog shows the destination in effect for the next
    // operating departure, so it never advertises a route that was changed.
    const firstOutbound = SCHEDULED_SERVICES.find(
      (service) =>
        service.routeId === connection.id &&
        service.origin.iata === connection.origin.iata,
    );
    const referenceDate = firstOutbound
      ? serviceForNextOperatingDate(firstOutbound, flightUpdates).date
      : todayISO();
    const effective = effectiveConnectionForDate(
      connection,
      connectionUpdates,
      referenceDate,
      flightUpdates,
    );
    const destinationImage = FLIGHT_CONNECTIONS.find(
      (candidate) =>
        candidate.destination.iata === effective.destination.iata,
    )?.image;
    return {
      ...effective,
      id: connection.id,
      image: destinationImage ?? connection.image,
      scheduleLabel: departuresLabel(
        connection.id,
        connection.origin.iata,
        flightUpdates,
      ),
      badge: 'Vuelo directo',
    };
  });

  return (
    <section className="routes" id="routes">
      <div className="container">
        <div className="routes__header">
          <span className="routes__label">Nuestras rutas</span>
          <h2 className="heading-lg routes__title">Conexiones directas</h2>
          {connections.length > 0 && (
            <p className="text-lg routes__subtitle">
              {connections.length} conexiones aprobadas. Tarifas con impuestos
              incluidos.
            </p>
          )}
        </div>

        <div className="routes__days">
          <span className="routes__days-label">Días de operación de las rutas aprobadas:</span>
          {DAYS_OF_OPERATION.map((day) => (
            <span key={day} className="routes__day-badge">{day}</span>
          ))}
        </div>

        {connections.length === 0 ? (
          <div className="routes__empty" role="status">
            <p className="routes__empty-title">
              No hay información de vuelos disponible en este momento.
            </p>
            <p className="routes__empty-text">
              El catálogo público no tiene conexiones para mostrar. Intenta
              nuevamente más tarde.
            </p>
          </div>
        ) : (
          <div className="routes__grid">
            {connections.map((conn) => (
              <article className="route-card" key={conn.id} id={`route-${conn.id}`}>
                <div className="route-card__image">
                  <img
                    src={conn.image}
                    alt={`Vista de ${conn.destination.city}`}
                    loading="lazy"
                  />
                  <span className="route-card__badge">
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

            {/* Decorative promo card: fills the 6th grid cell without
                inventing a route. It closes the 3×2 layout on wide screens. */}
            <aside
              className="route-ticket"
              aria-label="Promoción para reservar vuelos"
            >
              <img
                className="route-ticket__image"
                src="/azafata_modelo.webp"
                alt="Azafata de SkyNova Airlines en la terminal del aeropuerto"
                loading="lazy"
              />
              <div className="route-ticket__shade" aria-hidden="true" />
              <div className="route-ticket__brand">
                <span className="route-ticket__brand-accent">SkyNova</span>{' '}
                Airlines
              </div>
              <div className="route-ticket__body">
                <span className="route-ticket__eyebrow">
                  {connections.length} conexiones directas
                </span>
                <h3 className="route-ticket__title">¿A dónde volamos hoy?</h3>
                <div className="route-ticket__perforation" aria-hidden="true">
                  <span className="route-ticket__line" />
                  <span className="route-ticket__plane">✈</span>
                  <span className="route-ticket__line" />
                </div>
                <div className="route-ticket__footer">
                  <Link to="/buscar" className="route-ticket__link">
                    Buscar vuelos <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}

        <p className="routes__note">
          Tarifas de demostración por trayecto, con impuestos incluidos. Mismo
          precio en ambas direcciones y para todas las categorías de pasajero.
        </p>
      </div>
    </section>
  );
}
