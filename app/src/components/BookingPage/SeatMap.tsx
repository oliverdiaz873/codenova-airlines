import { SEAT_COLUMNS, SEAT_ROWS } from '@/data/seatMap';

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

/**
 * Presentational 10x3 seat map (4.4.1): columns A-B | C with an aisle
 * between B and C. Occupied seats and seats assigned to other passengers
 * are disabled; the current passenger's seat toggles off on click.
 * No business logic lives here.
 */
export function SeatMap({
  occupiedSeats,
  assignments,
  currentPassenger,
  onToggle,
}: SeatMapProps) {
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

  const renderSeat = (row: number, column: string) => {
    const seat = `${row}${column}`;
    const state = stateOf(seat);
    const owner = ownerOf(seat);
    const disabled = state === 'occupied' || state === 'taken';
    return (
      <button
        key={seat}
        type="button"
        className={`seat-map__seat seat-map__seat--${state}`}
        disabled={disabled}
        aria-pressed={state === 'current'}
        aria-label={
          state === 'occupied'
            ? `Asiento ${seat}, ocupado`
            : state === 'taken'
              ? `Asiento ${seat}, asignado al pasajero ${(owner ?? 0) + 1}`
              : `Asiento ${seat}, disponible`
        }
        title={
          state === 'occupied'
            ? 'Ocupado'
            : state === 'taken'
              ? `Pasajero ${(owner ?? 0) + 1}`
              : 'Disponible'
        }
        onClick={() => onToggle(seat)}
      >
        <span className="seat-map__seat-id">{seat}</span>
        {(state === 'current' || state === 'taken') && owner !== null && (
          <span className="seat-map__seat-pax">P{owner + 1}</span>
        )}
      </button>
    );
  };

  return (
    <div className="seat-map" role="group" aria-label="Mapa de asientos">
      {Array.from({ length: SEAT_ROWS }, (_, rowIndex) => {
        const row = rowIndex + 1;
        return (
          <div className="seat-map__row" key={row}>
            <span className="seat-map__row-label">{row}</span>
            {SEAT_COLUMNS.slice(0, 2).map((column) => renderSeat(row, column))}
            <span className="seat-map__aisle" aria-hidden="true" />
            {renderSeat(row, SEAT_COLUMNS[2])}
          </div>
        );
      })}
    </div>
  );
}
