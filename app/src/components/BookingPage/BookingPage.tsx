import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { formatCurrency } from '@/data/flights';
import { todayISO } from '@/lib/dates';
import {
  PASSENGER_KIND_LABELS,
  passengerKinds,
  validatePurchase,
  type LegSeatSelection,
} from '@/lib/booking';
import {
  formatDateLong,
  formatDurationMinutes,
  isValidSearchSelection,
  type SearchSelection,
} from '@/lib/flightSearch';
import {
  maxRedeemableMiles,
  milesToDiscount,
  validateRedemptionMiles,
} from '@/lib/miles';
import {
  availableSeatCount,
  demoOccupiedSeats,
  occupiedSeatIds,
  userOccupiedSeats,
  validateSeatAvailability,
  type SeatRequest,
} from '@/lib/seatOccupancy';
import {
  useAccrualSync,
  useBooking,
} from '@/components/BookingProvider/useBooking';
import { SeatMap } from './SeatMap';
import './BookingPage.css';

type Leg = 'ida' | 'vuelta';
type Step = 'select' | 'review';

const LEG_LABELS: Record<Leg, string> = { ida: 'Ida', vuelta: 'Regreso' };

interface LegRowProps {
  label: string;
  leg: SearchSelection['outbound'];
}

function LegRow({ label, leg }: LegRowProps) {
  return (
    <li className="booking__leg">
      <span className="booking__leg-label">{label}</span>
      <span className="booking__leg-flight">
        {leg.flightNumber} · {leg.originLabel} → {leg.destinationLabel}
      </span>
      <span className="booking__leg-time">
        {formatDateLong(leg.date)} · {leg.departureTime} – {leg.arrivalTime}
        {leg.arrivalNextDay && ' (+1 día)'} ·{' '}
        {formatDurationMinutes(leg.durationMinutes)}
      </span>
    </li>
  );
}

/**
 * CU-04 — Booking flow (seat selection + atomic purchase confirmation).
 * Seat picks and miles redemption are local UI state; the final button
 * delegates to BookingProvider.confirmPurchase, which validates and
 * commits the purchase atomically. A successful confirmation navigates to
 * /confirmacion with the reservation code and the selection.
 */
export function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const rawSelection: unknown = location.state;
  const {
    purchases,
    confirmPurchase,
    syncAccrual,
    activeCustomer,
    flightUpdates,
  } = useBooking();
  const selection: SearchSelection | null = isValidSearchSelection(
    rawSelection,
    flightUpdates,
  )
    ? rawSelection
    : null;
  const customer = activeCustomer;
  useAccrualSync();

  const [step, setStep] = useState<Step>('select');
  const [leg, setLeg] = useState<Leg>('ida');
  const [assignments, setAssignments] = useState<
    Record<Leg, Map<number, string>>
  >({ ida: new Map(), vuelta: new Map() });
  const [currentPax, setCurrentPax] = useState<Record<Leg, number>>({
    ida: 0,
    vuelta: 0,
  });
  const [milesInput, setMilesInput] = useState('');
  const [error, setError] = useState('');
  // Synchronous guard against double submission before React re-renders.
  const confirmingRef = useRef(false);

  const kinds = useMemo(
    () => (selection ? passengerKinds(selection.passengers) : []),
    [selection],
  );
  const total = selection?.totalPassengers ?? 0;

  const demoOccupancy = useMemo(() => demoOccupiedSeats(todayISO()), []);
  const userOccupancy = useMemo(() => userOccupiedSeats(purchases), [purchases]);

  const legInfo = useMemo(() => {
    if (!selection) return null;
    return {
      ida: {
        flightNumber: selection.outbound.flightNumber,
        date: selection.departureDate,
      },
      vuelta: {
        flightNumber: selection.returnFlight.flightNumber,
        date: selection.returnDate,
      },
    } as const;
  }, [selection]);

  const occupiedByLeg = useMemo(() => {
    if (!legInfo) return null;
    return {
      ida: occupiedSeatIds(
        legInfo.ida.flightNumber,
        legInfo.ida.date,
        demoOccupancy,
        userOccupancy,
      ),
      vuelta: occupiedSeatIds(
        legInfo.vuelta.flightNumber,
        legInfo.vuelta.date,
        demoOccupancy,
        userOccupancy,
      ),
    };
  }, [legInfo, demoOccupancy, userOccupancy]);

  const capacityOk = useMemo(() => {
    if (!legInfo) return false;
    return (['ida', 'vuelta'] as const).every(
      (l) =>
        availableSeatCount(
          legInfo[l].flightNumber,
          legInfo[l].date,
          demoOccupancy,
          userOccupancy,
        ) >= total,
    );
  }, [legInfo, demoOccupancy, userOccupancy, total]);

  // C-1.5: a visitor without a session sees the account gate on /reservar
  // itself — "Crear cuenta" (register) and "Ya soy cliente" (login), both
  // returning to /reservar. No purchase can be created or confirmed here.
  if (!customer) {
    return (
      <main className="booking">
        <section className="booking__card">
          <span className="booking__eyebrow">Reserva de vuelos</span>
          <h1 className="booking__title">
            Para reservar necesitas una cuenta
          </h1>
          <p className="booking__text">
            Crea una cuenta o inicia sesión para continuar con tu reserva.
          </p>
          <div className="booking__actions">
            <Link
              to="/ingresar?mode=register&from=/reservar"
              className="btn btn-primary"
            >
              Crear cuenta
            </Link>
            <Link
              to="/ingresar?from=/reservar"
              className="booking__secondary"
            >
              Ya soy cliente
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!selection || !legInfo || !occupiedByLeg) {
    return (
      <main className="booking">
        <section className="booking__card">
          <h1 className="booking__title">Reserva de vuelos</h1>
          <p className="booking__text">
            No hay una búsqueda seleccionada o la selección no es válida.
            Realiza una búsqueda de vuelos para continuar.
          </p>
          <Link to="/buscar" className="btn btn-primary">
            Buscar vuelos
          </Link>
        </section>
      </main>
    );
  }

  const toggleSeat = (seatId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev[leg]);
      if (next.get(currentPax[leg]) === seatId) {
        next.delete(currentPax[leg]);
      } else {
        if ([...next.values()].includes(seatId)) return prev;
        next.set(currentPax[leg], seatId);
      }
      return { ...prev, [leg]: next };
    });
    setError('');
  };

  const legSeatIds = (l: Leg): string[] =>
    Array.from({ length: total }, (_, index) => assignments[l].get(index) ?? '');

  const assignedCount = (l: Leg): number => {
    let count = 0;
    for (let index = 0; index < total; index += 1) {
      if (assignments[l].get(index)) count += 1;
    }
    return count;
  };

  const seatsComplete = assignedCount('ida') === total && assignedCount('vuelta') === total;

  const buildRequests = (): SeatRequest[] => {
    const requests: SeatRequest[] = [];
    (['ida', 'vuelta'] as const).forEach((l) => {
      legSeatIds(l).forEach((seatId) => {
        if (seatId) {
          requests.push({
            flightNumber: legInfo[l].flightNumber,
            date: legInfo[l].date,
            seatId,
          });
        }
      });
    });
    return requests;
  };

  const handleContinueToReview = () => {
    const availabilityError = validateSeatAvailability(
      buildRequests(),
      demoOccupancy,
      userOccupancy,
    );
    if (availabilityError) {
      setError(availabilityError);
      return;
    }
    syncAccrual();
    setError('');
    setStep('review');
  };

  // --- Miles (corporate only; local state, nothing is deducted yet) ---
  const isCorporate = customer.type === 'Corporativo';
  const parsedMiles = milesInput.trim() === '' ? 0 : Number(milesInput);
  const milesValidShape = Number.isInteger(parsedMiles) && parsedMiles >= 0;
  const maxMiles = isCorporate
    ? maxRedeemableMiles(customer.miles, selection.totalPrice)
    : 0;
  const milesError = !isCorporate
    ? null
    : !milesValidShape
      ? 'La cantidad de millas debe ser un número entero no negativo.'
      : parsedMiles > 0
        ? validateRedemptionMiles(customer.miles, parsedMiles) ??
          (milesToDiscount(parsedMiles) > selection.totalPrice
            ? 'El descuento por millas no puede superar el importe de la compra.'
            : null)
        : null;
  const milesUsed = milesError ? 0 : parsedMiles;
  const discount = milesToDiscount(milesUsed);
  const netTotal = selection.totalPrice - discount;

  const handleFinal = () => {
    if (confirmingRef.current) return;
    if (isCorporate && milesError) {
      setError(milesError);
      return;
    }
    const seatSelection: LegSeatSelection = {
      outbound: legSeatIds('ida'),
      return: legSeatIds('vuelta'),
    };
    const availabilityError = validateSeatAvailability(
      buildRequests(),
      demoOccupancy,
      userOccupancy,
    );
    if (availabilityError) {
      setError(availabilityError);
      setStep('select');
      return;
    }
    const purchaseError = validatePurchase(
      selection,
      seatSelection,
      milesUsed,
      customer,
      flightUpdates,
    );
    if (purchaseError) {
      setError(purchaseError);
      return;
    }
    confirmingRef.current = true;
    const result = confirmPurchase({
      selection,
      seats: seatSelection,
      milesUsed,
    });
    if (!result.ok) {
      confirmingRef.current = false;
      setError(result.error);
      return;
    }
    navigate('/confirmacion', {
      state: { code: result.purchase.code, selection },
    });
  };

  const passengerSummary = [
    selection.passengers.adults > 0 &&
      `${selection.passengers.adults} adulto${selection.passengers.adults === 1 ? '' : 's'}`,
    selection.passengers.children > 0 &&
      `${selection.passengers.children} niño${selection.passengers.children === 1 ? '' : 's'}`,
    selection.passengers.infants > 0 &&
      `${selection.passengers.infants} infante${selection.passengers.infants === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (!capacityOk) {
    return (
      <main className="booking">
        <section className="booking__card">
          <h1 className="booking__title">Reserva de vuelos</h1>
          <p className="booking__text" role="alert">
            La disponibilidad de alguno de los vuelos cambió desde la
            búsqueda: ya no quedan plazas suficientes para todo el grupo.
            Vuelve a buscar y selecciona otros vuelos.
          </p>
          <Link to="/buscar" className="btn btn-primary">
            Nueva búsqueda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="booking">
      <div className="container">
        <header className="booking__header">
          <span className="booking__eyebrow">Reserva de vuelos</span>
          <h1 className="booking__title">
            {selection.originLabel} → {selection.destinationLabel}
          </h1>
        </header>

        <section className="booking__card" aria-label="Resumen de la búsqueda">
          <ul className="booking__legs">
            <LegRow label="Ida" leg={selection.outbound} />
            <LegRow label="Regreso" leg={selection.returnFlight} />
          </ul>
          <dl className="booking__details">
            <div className="booking__row">
              <dt>Pasajeros</dt>
              <dd>
                {passengerSummary} ({total} en total)
              </dd>
            </div>
            <div className="booking__row">
              <dt>Tarifa ida y vuelta</dt>
              <dd>{formatCurrency(selection.totalPrice)}</dd>
            </div>
          </dl>
        </section>

        {step === 'select' ? (
          <section className="booking__card" aria-label="Selección de asientos">
            <div
              className="booking__leg-tabs"
              role="tablist"
              aria-label="Trayecto"
            >
              {(['ida', 'vuelta'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={leg === l}
                  className={`booking__leg-tab${leg === l ? ' booking__leg-tab--active' : ''}`}
                  onClick={() => setLeg(l)}
                >
                  {LEG_LABELS[l]} · {legInfo[l].flightNumber} ·{' '}
                  {formatDateLong(legInfo[l].date)}
                </button>
              ))}
            </div>

            <div
              className="booking__pax-selector"
              role="group"
              aria-label="Pasajero"
            >
              {kinds.map((kind, index) => {
                const assigned = assignments[leg].get(index);
                return (
                  <button
                    key={index}
                    type="button"
                    className={`booking__pax-chip${currentPax[leg] === index ? ' booking__pax-chip--active' : ''}`}
                    aria-pressed={currentPax[leg] === index}
                    onClick={() => setCurrentPax((prev) => ({ ...prev, [leg]: index }))}
                  >
                    Pasajero {index + 1} · {PASSENGER_KIND_LABELS[kind]}
                    <small>{assigned ?? 'Sin asiento'}</small>
                  </button>
                );
              })}
            </div>

            <p className="booking__seat-hint">
              Asientos asignados: {assignedCount(leg)}/{total} en este
              trayecto. Selecciona un asiento para el pasajero activo; vuelve
              a pulsarlo para quitarlo.
            </p>

            <SeatMap
              occupiedSeats={occupiedByLeg[leg]}
              assignments={assignments[leg]}
              currentPassenger={currentPax[leg]}
              onToggle={toggleSeat}
            />

            <div className="booking__legend" aria-hidden="true">
              <span>
                <i className="booking__legend-dot booking__legend-dot--free" />
                Disponible
              </span>
              <span>
                <i className="booking__legend-dot booking__legend-dot--current" />
                Seleccionado
              </span>
              <span>
                <i className="booking__legend-dot booking__legend-dot--taken" />
                Asignado a otro pasajero
              </span>
              <span>
                <i className="booking__legend-dot booking__legend-dot--occupied" />
                Ocupado
              </span>
            </div>

            {error && (
              <p className="booking__error" role="alert">
                {error}
              </p>
            )}

            <div className="booking__actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!seatsComplete}
                onClick={handleContinueToReview}
              >
                Continuar
              </button>
              {!seatsComplete && (
                <span className="booking__hint">
                  Falta asignar asientos: ida {assignedCount('ida')}/{total} ·
                  regreso {assignedCount('vuelta')}/{total}
                </span>
              )}
            </div>
          </section>
        ) : (
          <section className="booking__card" aria-label="Resumen de la compra">
            <h2 className="booking__section-title">Resumen de la compra</h2>

            <div className="booking__seats-summary">
              {(['ida', 'vuelta'] as const).map((l) => (
                <div key={l} className="booking__seats-leg">
                  <h3>
                    {LEG_LABELS[l]} · {legInfo[l].flightNumber}
                  </h3>
                  <ul>
                    {kinds.map((kind, index) => (
                      <li key={index}>
                        Pasajero {index + 1} ({PASSENGER_KIND_LABELS[kind]}):{' '}
                        <strong>{assignments[l].get(index)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {isCorporate && (
              <fieldset className="booking__miles">
                <legend className="booking__section-title">
                  Canje de millas (opcional)
                </legend>
                <p className="booking__miles-balance">
                  Saldo disponible:{' '}
                  <strong>{customer.miles.toLocaleString('es-DO')}</strong>{' '}
                  millas
                </p>
                <p className="booking__miles-rules">
                  10 millas = RD$1 · mínimo y pasos de 1,000 millas · máximo
                  canjeable:{' '}
                  {maxMiles.toLocaleString('es-DO')} millas
                </p>
                <div className="booking__miles-controls">
                  <label className="booking__miles-label" htmlFor="miles-input">
                    Millas a canjear
                  </label>
                  <input
                    id="miles-input"
                    className="booking__input"
                    type="number"
                    min={0}
                    max={maxMiles}
                    step={1000}
                    inputMode="numeric"
                    value={milesInput}
                    onChange={(event) => {
                      setMilesInput(event.target.value);
                      setError('');
                    }}
                  />
                  <button
                    type="button"
                    className="booking__secondary"
                    onClick={() => setMilesInput(String(maxMiles))}
                    disabled={maxMiles === 0}
                  >
                    Usar máximo
                  </button>
                </div>
                {milesError && (
                  <p className="booking__error" role="alert">
                    {milesError}
                  </p>
                )}
              </fieldset>
            )}

            <dl className="booking__totals">
              <div className="booking__row">
                <dt>Precio bruto</dt>
                <dd>{formatCurrency(selection.totalPrice)}</dd>
              </div>
              {discount > 0 && (
                <div className="booking__row">
                  <dt>Descuento por millas ({milesUsed.toLocaleString('es-DO')})</dt>
                  <dd>−{formatCurrency(discount)}</dd>
                </div>
              )}
              <div className="booking__row booking__row--total">
                <dt>Total neto</dt>
                <dd>{formatCurrency(netTotal)}</dd>
              </div>
            </dl>

            {error && (
              <p className="booking__error" role="alert">
                {error}
              </p>
            )}

            <div className="booking__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinal}
              >
                Confirmar reserva
              </button>
              <button
                type="button"
                className="booking__secondary"
                onClick={() => {
                  setStep('select');
                  setError('');
                }}
              >
                Volver a los asientos
              </button>
            </div>
            <p className="booking__note">
              Al confirmar se validará la disponibilidad de los asientos y el
              importe final de forma atómica; si algo falla no se creará
              ninguna reserva ni se descontarán millas.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
