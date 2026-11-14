import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FLIGHT_CONNECTIONS, formatCurrency } from '@/data/flights';
import { addDaysISO, todayISO } from '@/lib/dates';
import { effectiveConnectionForDate } from '@/lib/connectionUpdate';
import {
  buildSearchSelection,
  canContinueSearch,
  DEPARTURE_TIME_SLOTS,
  departureTimeSlotLabel,
  formatDateLong,
  formatDurationMinutes,
  searchFlights,
  suggestAlternativeDates,
  totalPassengers,
  validateSearchCriteria,
  SEARCH_HORIZON_DAYS,
  type DepartureTimeSlot,
  type FlightOccurrence,
  type FlightSearchResults,
  type SearchCriteria,
} from '@/lib/flightSearch';
import { useBooking } from '@/components/BookingProvider/useBooking';
import './SearchPage.css';

const today = todayISO();
const horizonEnd = addDaysISO(today, SEARCH_HORIZON_DAYS);

const passengerFields = [
  { key: 'adults', label: 'Adultos', min: 0 },
  { key: 'children', label: 'Niños', min: 0 },
  { key: 'infants', label: 'Infantes', min: 0 },
] as const;

interface LegGroupProps {
  title: string;
  emptyMessage: string;
  options: FlightOccurrence[];
  selected: FlightOccurrence | null;
  onSelect: (occurrence: FlightOccurrence) => void;
  requiredSeats: number;
}

function LegGroup({
  title,
  emptyMessage,
  options,
  selected,
  onSelect,
  requiredSeats,
}: LegGroupProps) {
  return (
    <section className="search-results__group" aria-label={title}>
      <h2 className="search-results__title">{title}</h2>
      {options.length === 0 ? (
        <p className="search-results__empty">{emptyMessage}</p>
      ) : (
        <ul className="flight-list">
          {options.map((occurrence) => {
            const unavailable = !occurrence.available;
            const insufficient = occurrence.availableSeats < requiredSeats;
            const blocked = unavailable || insufficient;
            const isSelected = selected?.key === occurrence.key;
            return (
              <li key={occurrence.key}>
                <article
                  className={`flight-option${isSelected ? ' flight-option--selected' : ''}${
                    unavailable ? ' flight-option--unavailable' : ''
                  }`}
                >
                  <div className="flight-option__main">
                    <span className="flight-option__number">
                      {occurrence.service.flightNumber}
                    </span>
                    <span className="flight-option__route">
                      {occurrence.service.origin.iata} →{' '}
                      {occurrence.service.destination.iata}
                    </span>
                    <span className="flight-option__times">
                      {occurrence.departureTime} – {occurrence.arrivalTime}
                      {occurrence.arrivalNextDay && (
                        <em className="flight-option__next-day"> (+1 día)</em>
                      )}
                    </span>
                    <span className="flight-option__meta">
                      {formatDurationMinutes(occurrence.durationMinutes)} ·{' '}
                      {formatDateLong(occurrence.date)}
                    </span>
                    {unavailable && (
                      <span className="flight-option__badge">
                        Vuelo no disponible
                      </span>
                    )}
                  </div>
                  <div className="flight-option__side">
                    <span className="flight-option__fare">
                      {formatCurrency(occurrence.farePerPassenger)}
                      <small>por pasajero</small>
                    </span>
                    <span
                      className={`flight-option__seats${
                        blocked ? ' flight-option__seats--low' : ''
                      }`}
                    >
                      {unavailable
                        ? 'El agente marcó este vuelo como no disponible'
                        : insufficient
                          ? `Sin plazas suficientes (quedan ${occurrence.availableSeats})`
                          : `Quedan ${occurrence.availableSeats} plazas`}
                    </span>
                    <button
                      type="button"
                      className="flight-option__select"
                      disabled={blocked}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(occurrence)}
                    >
                      {unavailable
                        ? 'No disponible'
                        : isSelected
                          ? 'Seleccionado'
                          : 'Seleccionar'}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * CU-03 — Flight search (round trip on the same connection).
 * Requires an active Client session (enforced by RequireCustomer).
 * Selecting flights never reserves seats; availability is read-only here.
 */
export function SearchPage() {
  const navigate = useNavigate();
  const { flightUpdates, connectionUpdates, purchases } = useBooking();

  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [departureTimeSlot, setDepartureTimeSlot] =
    useState<DepartureTimeSlot>('any');
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [infants, setInfants] = useState(0);
  const [originIata, setOriginIata] = useState(
    FLIGHT_CONNECTIONS[0]?.origin.iata ?? '',
  );
  const [destinationIata, setDestinationIata] = useState(
    FLIGHT_CONNECTIONS[0]?.destination.iata ?? '',
  );

  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [results, setResults] = useState<FlightSearchResults | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedOutbound, setSelectedOutbound] =
    useState<FlightOccurrence | null>(null);
  const [selectedReturn, setSelectedReturn] =
    useState<FlightOccurrence | null>(null);
  const [error, setError] = useState('');

  // D-6: the pair shown in the catalog is the effective connection for the
  // selected departure date (today while the date is still empty). Duplicate
  // pairs collapse deterministically: the first base connection wins.
  const routeOptions = useMemo(() => {
    const referenceDate = departureDate || today;
    const seen = new Set<string>();
    const options: {
      routeId: string;
      origin: { city: string; iata: string };
      destination: { city: string; iata: string };
    }[] = [];
    for (const connection of FLIGHT_CONNECTIONS) {
      const effective = effectiveConnectionForDate(
        connection,
        connectionUpdates,
        referenceDate,
        flightUpdates,
      );
      const key = `${effective.origin.iata}|${effective.destination.iata}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        routeId: connection.id,
        origin: effective.origin,
        destination: effective.destination,
      });
    }
    return options;
  }, [connectionUpdates, flightUpdates, departureDate]);

  const originOptions = useMemo(() => {
    const seen = new Set<string>();
    return routeOptions.filter((option) => {
      if (seen.has(option.origin.iata)) return false;
      seen.add(option.origin.iata);
      return true;
    });
  }, [routeOptions]);

  const destinationOptions = useMemo(
    () => routeOptions.filter((option) => option.origin.iata === originIata),
    [routeOptions, originIata],
  );

  // If an update removed the current pair (or the date moved across a
  // version boundary), fall back to the first valid destination so the
  // select never shows a value that resolves to no route.
  const activeDestinationIata = destinationOptions.some(
    (option) => option.destination.iata === destinationIata,
  )
    ? destinationIata
    : (destinationOptions[0]?.destination.iata ?? '');

  const routeId =
    routeOptions.find(
      (option) =>
        option.origin.iata === originIata &&
        option.destination.iata === activeDestinationIata,
    )?.routeId ?? '';

  const passengerCounts = { adults, children: childrenCount, infants };
  const groupSize = totalPassengers(passengerCounts);

  const handleOriginChange = (iata: string) => {
    setOriginIata(iata);
    const first = routeOptions.find((option) => option.origin.iata === iata);
    setDestinationIata(first?.destination.iata ?? '');
    setResults(null);
    setSuggestions([]);
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setError('');
  };

  const handleDestinationChange = (iata: string) => {
    setDestinationIata(iata);
    setResults(null);
    setSuggestions([]);
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setError('');
  };

  const handleSearch = () => {
    const nextCriteria: SearchCriteria = {
      routeId,
      departureDate,
      returnDate,
      departureTimeSlot,
      ...passengerCounts,
    };
    const validationError = validateSearchCriteria(nextCriteria);
    if (validationError) {
      setError(validationError);
      setResults(null);
      setSuggestions([]);
      return;
    }
    setError('');
    setCriteria(nextCriteria);
    const searchResults = searchFlights(
      nextCriteria,
      todayISO(),
      flightUpdates,
      connectionUpdates,
      purchases,
    );
    setResults(searchResults);
    setSelectedOutbound(null);
    setSelectedReturn(null);
    setSuggestions(
      searchResults.outbound.length === 0 ||
        searchResults.returnOptions.length === 0
        ? suggestAlternativeDates(
            nextCriteria,
            todayISO(),
            3,
            flightUpdates,
            connectionUpdates,
            purchases,
          )
        : [],
    );
  };

  const toggleOutbound = (occurrence: FlightOccurrence) => {
    setSelectedOutbound((current) =>
      current?.key === occurrence.key ? null : occurrence,
    );
  };

  const toggleReturn = (occurrence: FlightOccurrence) => {
    setSelectedReturn((current) =>
      current?.key === occurrence.key ? null : occurrence,
    );
  };

  const canContinue =
    criteria !== null &&
    canContinueSearch(criteria, selectedOutbound, selectedReturn);

  const handleContinue = () => {
    if (!criteria || !selectedOutbound || !selectedReturn) return;
    const selection = buildSearchSelection(
      criteria,
      selectedOutbound,
      selectedReturn,
    );
    if (selection) {
      navigate('/reservar', { state: selection });
    }
  };

  const passengerSummary = [
    adults > 0 && `${adults} adulto${adults === 1 ? '' : 's'}`,
    childrenCount > 0 &&
      `${childrenCount} niño${childrenCount === 1 ? '' : 's'}`,
    infants > 0 && `${infants} infante${infants === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="search-page">
      <div className="container">
        <header className="search-page__header">
          <span className="search-page__eyebrow">Búsqueda de vuelos</span>
          <h1 className="search-page__title">Busca tu próximo viaje</h1>
          <p className="search-page__subtitle">
            Ida y vuelta por la misma conexión. Solo clientes con sesión
            activa.
          </p>
        </header>

        <section className="search-form" aria-label="Criterios de búsqueda">
          <div className="search-form__grid">
            <label className="search-form__field">
              <span className="search-form__label">Origen</span>
              <select
                className="search-form__input"
                value={originIata}
                onChange={(event) => handleOriginChange(event.target.value)}
              >
                {originOptions.map((option) => (
                  <option
                    key={option.origin.iata}
                    value={option.origin.iata}
                  >
                    {option.origin.city} ({option.origin.iata})
                  </option>
                ))}
              </select>
            </label>

            <label className="search-form__field">
              <span className="search-form__label">Destino</span>
              <select
                className="search-form__input"
                value={activeDestinationIata}
                onChange={(event) =>
                  handleDestinationChange(event.target.value)
                }
              >
                {destinationOptions.map((option) => (
                  <option
                    key={`${option.routeId}|${option.destination.iata}`}
                    value={option.destination.iata}
                  >
                    {option.destination.city} (
                    {option.destination.iata})
                  </option>
                ))}
              </select>
            </label>

            <label className="search-form__field">
              <span className="search-form__label">Fecha de ida</span>
              <input
                className="search-form__input"
                type="date"
                min={today}
                max={horizonEnd}
                value={departureDate}
                onChange={(event) => setDepartureDate(event.target.value)}
                required
              />
            </label>

            <label className="search-form__field">
              <span className="search-form__label">Fecha de regreso</span>
              <input
                className="search-form__input"
                type="date"
                min={departureDate || today}
                max={horizonEnd}
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
                required
              />
            </label>

            <label className="search-form__field">
              <span className="search-form__label">Hora de partida (ida)</span>
              <select
                className="search-form__input"
                aria-label="Hora de partida (ida)"
                value={departureTimeSlot}
                onChange={(event) => {
                  setDepartureTimeSlot(event.target.value as DepartureTimeSlot);
                  setResults(null);
                  setSuggestions([]);
                  setSelectedOutbound(null);
                  setSelectedReturn(null);
                }}
              >
                {DEPARTURE_TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="search-form__hint">
            La hora de partida filtra solo el vuelo de ida. Elige «Cualquier
            hora» para ver todas las salidas del día.
          </p>

          <fieldset className="search-form__passengers">
            <legend className="search-form__label">Pasajeros</legend>
            <div className="search-form__passenger-row">
              {passengerFields.map(({ key, label }) => (
                <label
                  key={key}
                  className="search-form__passenger"
                  htmlFor={`pax-${key}`}
                >
                  <span>{label}</span>
                  <input
                    id={`pax-${key}`}
                    className="search-form__input search-form__input--pax"
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={
                      key === 'adults'
                        ? adults
                        : key === 'children'
                          ? childrenCount
                          : infants
                    }
                    onChange={(event) => {
                      const value = Math.max(
                        0,
                        Math.min(30, Number(event.target.value) || 0),
                      );
                      if (key === 'adults') setAdults(value);
                      else if (key === 'children') setChildrenCount(value);
                      else setInfants(value);
                    }}
                  />
                </label>
              ))}
              <span className="search-form__total">
                Total: {groupSize} pasajero{groupSize === 1 ? '' : 's'}
              </span>
            </div>
            <p className="search-form__hint">
              Máximo 30 pasajeros por búsqueda, incluidos los infantes. Los
              vuelos operan lunes, miércoles y viernes.
            </p>
          </fieldset>

          {error && (
            <p className="search-form__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary search-form__submit"
            onClick={handleSearch}
          >
            Buscar vuelos
          </button>
        </section>

        {results && criteria && (
          <div className="search-results">
            <LegGroup
              title={`Vuelo de ida — ${formatDateLong(criteria.departureDate)}`}
              emptyMessage={
                criteria.departureTimeSlot && criteria.departureTimeSlot !== 'any'
                  ? `No existen vuelos de ida que coincidan con la hora de partida elegida (${departureTimeSlotLabel(criteria.departureTimeSlot)}). Cambia la franja o la fecha y vuelve a buscar.`
                  : 'No hay vuelos directos en esta fecha. Prueba con una fecha de operación cercana.'
              }
              options={results.outbound}
              selected={selectedOutbound}
              onSelect={toggleOutbound}
              requiredSeats={groupSize}
            />
            <LegGroup
              title={`Vuelo de regreso — ${formatDateLong(criteria.returnDate)}`}
              emptyMessage="No hay vuelos de regreso en esta fecha para la misma conexión."
              options={results.returnOptions}
              selected={selectedReturn}
              onSelect={toggleReturn}
              requiredSeats={groupSize}
            />

            {suggestions.length > 0 && (
              <div className="search-results__suggestions">
                <p>Próximas fechas con disponibilidad para la ida:</p>
                <div className="search-results__suggestion-list">
                  {suggestions.map((date) => (
                    <button
                      key={date}
                      type="button"
                      className="search-results__suggestion"
                      onClick={() => {
                        setDepartureDate(date);
                        setResults(null);
                        setSuggestions([]);
                      }}
                    >
                      {formatDateLong(date)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedOutbound || selectedReturn) && (
              <section
                className="search-summary"
                aria-label="Resumen de la selección"
              >
                <h2 className="search-summary__title">Tu selección</h2>
                <ul className="search-summary__legs">
                  {selectedOutbound && (
                    <li>
                      <strong>Ida:</strong>{' '}
                      {selectedOutbound.service.flightNumber} ·{' '}
                      {selectedOutbound.service.origin.iata} →{' '}
                      {selectedOutbound.service.destination.iata} ·{' '}
                      {selectedOutbound.departureTime} –{' '}
                      {selectedOutbound.arrivalTime}
                    </li>
                  )}
                  {selectedReturn && (
                    <li>
                      <strong>Regreso:</strong>{' '}
                      {selectedReturn.service.flightNumber} ·{' '}
                      {selectedReturn.service.origin.iata} →{' '}
                      {selectedReturn.service.destination.iata} ·{' '}
                      {selectedReturn.departureTime} –{' '}
                      {selectedReturn.arrivalTime}
                    </li>
                  )}
                </ul>
                <p className="search-summary__passengers">
                  {passengerSummary} ({groupSize} en total)
                </p>
                {!canContinue && (
                  <p className="search-summary__warning" role="status">
                    Selecciona el vuelo de ida y el de regreso con plazas
                    suficientes para todo el grupo.
                  </p>
                )}
                <div className="search-summary__actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canContinue}
                    onClick={handleContinue}
                  >
                    Continuar
                  </button>
                </div>
                <p className="search-summary__note">
                  La disponibilidad mostrada es informativa; no se retienen
                  plazas. Horarios y tarifas son datos ficticios del
                  prototipo.
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
