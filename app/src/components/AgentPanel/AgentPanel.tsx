import { useState } from 'react';
import { Link } from 'react-router';
import { FLIGHT_CONNECTIONS, formatCurrency } from '@/data/flights';
import { DAYS_OF_OPERATION } from '@/data/flights';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { MAX_SEATS_PER_OCCURRENCE } from '@/lib/flightSearch';
import {
  currentScheduleFieldsForService,
  type FlightUpdateChanges,
} from '@/lib/flightUpdate';
import {
  allowedDestinations,
  baseConnection,
  currentDestinationIata,
  fareForRoute,
} from '@/lib/connectionUpdate';
import { useBooking } from '@/components/BookingProvider/useBooking';
import './AgentPanel.css';

interface AgentMessage {
  type: 'success' | 'error';
  text: string;
}

/**
 * CU-07 — Agent panel (/agente).
 * Simulated ticket-agent area: no real authentication. The agent picks a
 * recurring scheduled service by flight number, reviews its current
 * information and edits only the approved fields (departureLocal,
 * durationMinutes, available). All updates go through BookingProvider's
 * atomic updateFlightService; nothing here manipulates flightUpdates directly.
 */
export function AgentPanel() {
  const {
    flightUpdates,
    updateFlightService,
    connectionUpdates,
    updateConnectionDestination,
  } =
    useBooking();
  const [selectedFlight, setSelectedFlight] = useState('');
  const [departureInput, setDepartureInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [availableInput, setAvailableInput] = useState(true);
  const [destinationInput, setDestinationInput] = useState('');
  const [message, setMessage] = useState<AgentMessage | null>(null);

  const service = SCHEDULED_SERVICES.find(
    (candidate) => candidate.flightNumber === selectedFlight,
  );
  const connection = service
    ? (baseConnection(service.routeId) ??
      FLIGHT_CONNECTIONS.find((c) => c.id === service.routeId))
    : undefined;
  const current = service
    ? currentScheduleFieldsForService(service, flightUpdates[service.flightNumber])
    : null;
  const currentDestination = connection
    ? currentDestinationIata(connection, connectionUpdates)
    : '';
  const destinationOptions = connection
    ? allowedDestinations(connection.origin.iata)
    : [];
  const destinationAirport =
    destinationOptions.find((airport) => airport.iata === currentDestination) ??
    null;
  const isOutbound = Boolean(
    service && connection && service.origin.iata === connection.origin.iata,
  );
  const effectiveOrigin =
    connection && destinationAirport
      ? isOutbound
        ? connection.origin
        : destinationAirport
      : service?.origin;
  const effectiveDestination =
    connection && destinationAirport
      ? isOutbound
        ? destinationAirport
        : connection.origin
      : service?.destination;
  const effectiveFare = connection
    ? (fareForRoute(connection.origin.iata, currentDestination) ??
      connection.farePerPassenger)
    : null;

  const selectFlight = (flightNumber: string) => {
    setSelectedFlight(flightNumber);
    setMessage(null);
    const target = SCHEDULED_SERVICES.find(
      (candidate) => candidate.flightNumber === flightNumber,
    );
    if (target) {
      const fields = currentScheduleFieldsForService(
        target,
        flightUpdates[target.flightNumber],
      );
      setDepartureInput(fields.departureLocal);
      setDurationInput(String(fields.durationMinutes));
      setAvailableInput(fields.available);
      const targetConnection = baseConnection(target.routeId);
      setDestinationInput(
        targetConnection
          ? currentDestinationIata(targetConnection, connectionUpdates)
          : '',
      );
    }
  };

  const handleSave = () => {
    if (!service) return;
    const changes: FlightUpdateChanges = {};
    if (departureInput !== (current?.departureLocal ?? '')) {
      changes.departureLocal = departureInput;
    }
    const parsedDuration = durationInput === '' ? Number.NaN : Number(durationInput);
    if (parsedDuration !== (current?.durationMinutes ?? Number.NaN)) {
      changes.durationMinutes = parsedDuration;
    }
    if (availableInput !== (current?.available ?? true)) {
      changes.available = availableInput;
    }
    const result = updateFlightService(service.flightNumber, changes);
    if (result.ok) {
      setMessage({
        type: 'success',
        text: `Información de ${service.flightNumber} actualizada correctamente.`,
      });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  const handleSaveDestination = () => {
    if (!connection) return;
    const result = updateConnectionDestination(
      connection.id,
      destinationInput,
    );
    if (result.ok) {
      setMessage({
        type: 'success',
        text: `Destino de la conexión ${connection.origin.iata} actualizado correctamente para las salidas futuras.`,
      });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  return (
    <main className="agent">
      <div className="container">
        <header className="agent__header">
          <span className="agent__eyebrow">Área del agente</span>
          <h1 className="agent__title">Actualizar información de vuelo</h1>
          <p className="agent__subtitle">
            Agente de boletos · Demostración sin autenticación. Los cambios se
            aplican a las salidas futuras del servicio; los vuelos que ya
            salieron conservan su horario.
          </p>
          <Link to="/" className="agent__exit">
            ← Volver a la experiencia de visitante
          </Link>
        </header>

        <section className="agent__card">
          <h2 className="agent__section-title">Identificar vuelo</h2>
          <label className="agent__field">
            <span className="agent__field-label">Número de vuelo</span>
            <select
              className="agent__select"
              value={selectedFlight}
              onChange={(event) => selectFlight(event.target.value)}
            >
              <option value="">Selecciona un vuelo…</option>
              {SCHEDULED_SERVICES.map((candidate) => (
                <option
                  key={candidate.flightNumber}
                  value={candidate.flightNumber}
                >
                  {candidate.flightNumber} ·{' '}
                  {candidate.origin.iata} → {candidate.destination.iata}
                </option>
              ))}
            </select>
          </label>

          {!service && (
            <p className="agent__hint">
              Selecciona un número de vuelo para consultar y actualizar su
              información.
            </p>
          )}

          {service && current && (
            <>
              <h2 className="agent__section-title">Información actual</h2>
              <dl className="agent__info">
                <div className="agent__info-row">
                  <dt>Vuelo</dt>
                  <dd>{service.flightNumber}</dd>
                </div>
                <div className="agent__info-row">
                  <dt>Ruta</dt>
                  <dd>
                    {effectiveOrigin
                      ? `${effectiveOrigin.city} (${effectiveOrigin.iata})`
                      : service.origin.iata}{' '}
                    →{' '}
                    {effectiveDestination
                      ? `${effectiveDestination.city} (${effectiveDestination.iata})`
                      : service.destination.iata}
                  </dd>
                </div>
                <div className="agent__info-row">
                  <dt>Salida</dt>
                  <dd>{current.departureLocal}</dd>
                </div>
                <div className="agent__info-row">
                  <dt>Duración</dt>
                  <dd>{current.durationMinutes} min</dd>
                </div>
                <div className="agent__info-row">
                  <dt>Disponibilidad</dt>
                  <dd>{current.available ? 'Disponible' : 'No disponible'}</dd>
                </div>
                <div className="agent__info-row">
                  <dt>Días de operación</dt>
                  <dd>{DAYS_OF_OPERATION.join(' · ')}</dd>
                </div>
                {connection && effectiveFare !== null && (
                  <div className="agent__info-row">
                    <dt>Tarifa por pasajero</dt>
                    <dd>{formatCurrency(effectiveFare)}</dd>
                  </div>
                )}
                <div className="agent__info-row">
                  <dt>Capacidad</dt>
                  <dd>{MAX_SEATS_PER_OCCURRENCE} asientos</dd>
                </div>
              </dl>

              <h2 className="agent__section-title">Actualizar</h2>
              <div className="agent__form">
                <label className="agent__field">
                  <span className="agent__field-label">Hora de salida</span>
                  <input
                    type="time"
                    className="agent__input"
                    value={departureInput}
                    onChange={(event) => setDepartureInput(event.target.value)}
                  />
                </label>
                <label className="agent__field">
                  <span className="agent__field-label">
                    Duración (minutos)
                  </span>
                  <input
                    type="number"
                    className="agent__input"
                    min={1}
                    step={1}
                    value={durationInput}
                    onChange={(event) => setDurationInput(event.target.value)}
                  />
                </label>
                <label className="agent__field agent__field--checkbox">
                  <input
                    type="checkbox"
                    checked={availableInput}
                    onChange={(event) =>
                      setAvailableInput(event.target.checked)
                    }
                  />
                  <span className="agent__field-label">
                    Vuelo disponible para reservar
                  </span>
                </label>
              </div>

              <h2 className="agent__section-title">
                Actualizar destino de la conexión
              </h2>
              <p className="agent__hint">
                El destino se actualiza para toda la conexión (ida y regreso).
                Solo se ofrecen destinos con tarifa aprobada desde el mismo
                origen. Las salidas que ya ocurrieron conservan su ruta.
              </p>
              <div className="agent__form">
                <label className="agent__field">
                  <span className="agent__field-label">Destino</span>
                  <select
                    className="agent__select"
                    value={destinationInput}
                    onChange={(event) =>
                      setDestinationInput(event.target.value)
                    }
                  >
                    {destinationOptions.map((airport) => (
                      <option key={airport.iata} value={airport.iata}>
                        {airport.city} ({airport.iata})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="btn btn-primary agent__save"
                disabled={
                  !connection || destinationInput === currentDestination
                }
                onClick={handleSaveDestination}
              >
                Actualizar destino
              </button>

              <button
                type="button"
                className="btn btn-primary agent__save"
                onClick={handleSave}
              >
                Guardar cambios
              </button>

              {message && (
                <p
                  className={`agent__message agent__message--${message.type}`}
                  role={message.type === 'error' ? 'alert' : 'status'}
                >
                  {message.text}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
