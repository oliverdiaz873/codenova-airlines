import { useState } from 'react';
import {
  CABIN_ZONE_LABELS,
  SEAT_COLUMNS,
  SEAT_ROWS,
  WING_ROWS,
  describeSeat,
  isWindowSeat,
  type CabinZone,
} from '@/data/seatMap';

interface SeatMapProps {
  /** Seats already taken (demo + user purchases) for this occurrence. */
  occupiedSeats: ReadonlySet<string>;
  /** passengerIndex -> seatId assignments for this leg. */
  assignments: ReadonlyMap<number, string>;
  /** Passenger currently receiving seat clicks. */
  currentPassenger: number;
  onToggle: (seatId: string) => void;
}

type SeatState = 'free' | 'current' | 'taken' | 'occupied';

const ROWS = Array.from({ length: SEAT_ROWS }, (_, index) => index + 1);
const ZONES: { zone: CabinZone; rows: number[] }[] = [
  { zone: 'front', rows: ROWS.filter((row) => row < WING_ROWS.first) },
  {
    zone: 'wing',
    rows: ROWS.filter((row) => row >= WING_ROWS.first && row <= WING_ROWS.last),
  },
  { zone: 'rear', rows: ROWS.filter((row) => row > WING_ROWS.last) },
];

/**
 * Presentational 10x3 seat map (4.4.1) drawn as the aircraft seen from
 * above: nose at the top, wings over rows 4-7, tail at the bottom.
 * Columns A-B | aisle | C; A and C are window seats. Occupied seats and
 * seats assigned to other passengers are disabled; the current passenger's
 * seat toggles off on click. No business logic lives here.
 */
export function SeatMap({
  occupiedSeats,
  assignments,
  currentPassenger,
  onToggle,
}: SeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [highlightWindows, setHighlightWindows] = useState(false);

  const ownerOf = (seat: string): number | null => {
    for (const [passengerIndex, assigned] of assignments) {
      if (assigned === seat) return passengerIndex;
    }
    return null;
  };

  const stateOf = (seat: string): SeatState => {
    if (occupiedSeats.has(seat)) return 'occupied';
    const owner = ownerOf(seat);
    if (owner === null) return 'free';
    return owner === currentPassenger ? 'current' : 'taken';
  };

  const freeWindowSeats = ROWS.flatMap((row) =>
    SEAT_COLUMNS.map((column) => `${row}${column}`),
  ).filter((seat) => isWindowSeat(seat) && stateOf(seat) === 'free').length;

  const currentSeat = assignments.get(currentPassenger) ?? null;
  const infoSeat = hoveredSeat ?? currentSeat;

  const renderSeat = (row: number, column: string) => {
    const seat = `${row}${column}`;
    const state = stateOf(seat);
    const owner = ownerOf(seat);
    const disabled = state === 'occupied' || state === 'taken';
    const window = isWindowSeat(seat);
    const where = describeSeat(seat);
    const classes = [
      'seat-map__seat',
      `seat-map__seat--${state}`,
      window ? 'seat-map__seat--window' : '',
      highlightWindows && window && state === 'free'
        ? 'seat-map__seat--highlight'
        : '',
      highlightWindows && !window && state === 'free'
        ? 'seat-map__seat--dimmed'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        key={seat}
        type="button"
        className={classes}
        disabled={disabled}
        aria-pressed={state === 'current'}
        aria-label={
          state === 'occupied'
            ? `Asiento ${seat}, ${where}, ocupado`
            : state === 'taken'
              ? `Asiento ${seat}, ${where}, asignado al pasajero ${(owner ?? 0) + 1}`
              : `Asiento ${seat}, ${where}, disponible`
        }
        title={`${seat} · ${where}`}
        onClick={() => onToggle(seat)}
        onMouseEnter={() => setHoveredSeat(seat)}
        onMouseLeave={() => setHoveredSeat(null)}
        onFocus={() => setHoveredSeat(seat)}
        onBlur={() => setHoveredSeat(null)}
      >
        <span className="seat-map__seat-id">{seat}</span>
        {(state === 'current' || state === 'taken') && owner !== null && (
          <span className="seat-map__seat-pax">P{owner + 1}</span>
        )}
      </button>
    );
  };

  const renderRow = (row: number) => (
    <div className="seat-map__row" key={row}>
      <span className="seat-map__window" aria-hidden="true" />
      {renderSeat(row, SEAT_COLUMNS[0])}
      {renderSeat(row, SEAT_COLUMNS[1])}
      <span className="seat-map__aisle" aria-hidden="true">
        {row}
      </span>
      {renderSeat(row, SEAT_COLUMNS[2])}
      <span className="seat-map__window" aria-hidden="true" />
    </div>
  );

  return (
    <div className="seat-map">
      <div className="seat-map__toolbar">
        <p className="seat-map__window-count">
          <span className="seat-map__window-icon" aria-hidden="true" />
          {freeWindowSeats === 0
            ? 'No quedan asientos de ventana disponibles en este vuelo.'
            : `${freeWindowSeats} asiento${freeWindowSeats === 1 ? '' : 's'} de ventana disponible${freeWindowSeats === 1 ? '' : 's'}`}
        </p>
        <label className="seat-map__toggle">
          <input
            type="checkbox"
            checked={highlightWindows}
            onChange={(event) => setHighlightWindows(event.target.checked)}
          />
          Resaltar ventanas
        </label>
      </div>

      <div className="seat-map__plane-wrap">
        <div className="seat-map__plane" role="group" aria-label="Mapa de asientos del avión">
          <div className="seat-map__nose" aria-hidden="true">
            <span className="seat-map__cockpit" />
            <span className="seat-map__nose-label">Frente del avión</span>
          </div>

          <div className="seat-map__cabin">
            <div className="seat-map__exit" aria-hidden="true">
              <span>◂ Salida</span>
              <span>Salida ▸</span>
            </div>

            <div className="seat-map__columns" aria-hidden="true">
              <span className="seat-map__window" />
              <span className="seat-map__column-label">
                A<small>Ventana</small>
              </span>
              <span className="seat-map__column-label">
                B<small>Pasillo</small>
              </span>
              <span className="seat-map__aisle" />
              <span className="seat-map__column-label">
                C<small>Ventana</small>
              </span>
              <span className="seat-map__window" />
            </div>

            {ZONES.map(({ zone, rows }) => (
              <div
                key={zone}
                className={`seat-map__zone seat-map__zone--${zone}`}
              >
                <p className="seat-map__zone-label">{CABIN_ZONE_LABELS[zone]}</p>
                {rows.map(renderRow)}
              </div>
            ))}

            <div className="seat-map__exit" aria-hidden="true">
              <span>◂ Salida</span>
              <span>Salida ▸</span>
            </div>
          </div>

          <div className="seat-map__tail" aria-hidden="true" />
        </div>
      </div>

      <p className="seat-map__info" aria-live="polite">
        {infoSeat ? (
          <>
            <strong>Asiento {infoSeat}</strong>
            <span>{describeSeat(infoSeat)}</span>
          </>
        ) : (
          <span>
            Pasa el cursor sobre un asiento para ver dónde queda dentro del
            avión.
          </span>
        )}
      </p>
    </div>
  );
}
