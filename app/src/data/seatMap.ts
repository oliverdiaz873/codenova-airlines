/**
 * Seat map for SkyNova Airlines.
 * Source: PLAN_CODENOVA.md — section 4.4.1 (approved)
 *
 * 10 rows x 3 seats per row (2-1 layout): seats 1A-10C, 30 total.
 * Column A and B are on one side of the aisle, C on the other.
 * Internal prototype data; no commercial classes.
 */

export const SEAT_ROWS = 10;
export const SEAT_COLUMNS = ['A', 'B', 'C'] as const;
export type SeatColumn = (typeof SEAT_COLUMNS)[number];

/** All seat identifiers in row-major order: 1A, 1B, 1C, 2A, ... */
export const ALL_SEATS: string[] = Array.from({ length: SEAT_ROWS }, (_, i) =>
  SEAT_COLUMNS.map((column) => `${i + 1}${column}`),
).flat();

export function seatId(row: number, column: SeatColumn): string {
  return `${row}${column}`;
}

const SEAT_ID_PATTERN = /^([1-9]|10)[ABC]$/;

export function isValidSeatId(id: string): boolean {
  return SEAT_ID_PATTERN.test(id);
}

/*
 * Physical location of each seat inside the cabin (presentation only).
 * Layout 2-1 seen from the front of the aircraft: A (window, left),
 * B (aisle, left) | aisle | C (window, right — also next to the aisle).
 */

export type SeatPosition = 'window' | 'aisle';

export const SEAT_POSITION: Record<SeatColumn, SeatPosition> = {
  A: 'window',
  B: 'aisle',
  C: 'window',
};

export const SEAT_SIDE: Record<SeatColumn, 'izquierdo' | 'derecho'> = {
  A: 'izquierdo',
  B: 'izquierdo',
  C: 'derecho',
};

/** Rows located over the wings (window seats there look onto the wing). */
export const WING_ROWS = { first: 4, last: 7 } as const;

export type CabinZone = 'front' | 'wing' | 'rear';

export const CABIN_ZONE_LABELS: Record<CabinZone, string> = {
  front: 'Parte delantera',
  wing: 'Centro, sobre el ala',
  rear: 'Parte trasera',
};

export function cabinZone(row: number): CabinZone {
  if (row < WING_ROWS.first) return 'front';
  if (row <= WING_ROWS.last) return 'wing';
  return 'rear';
}

export function isWindowSeat(id: string): boolean {
  if (!isValidSeatId(id)) return false;
  return SEAT_POSITION[id.slice(-1) as SeatColumn] === 'window';
}

/**
 * Human description of where a seat is, e.g.
 * "Ventana · lado izquierdo · Parte delantera".
 */
export function describeSeat(id: string): string {
  if (!isValidSeatId(id)) return '';
  const row = Number(id.slice(0, -1));
  const column = id.slice(-1) as SeatColumn;
  const zone = cabinZone(row);
  const position =
    column === 'C'
      ? 'Ventana, junto al pasillo'
      : SEAT_POSITION[column] === 'window'
        ? 'Ventana'
        : 'Pasillo';
  const view =
    SEAT_POSITION[column] === 'window' && zone === 'wing' ? ' (vista al ala)' : '';
  return `${position}${view} · lado ${SEAT_SIDE[column]} · ${CABIN_ZONE_LABELS[zone]}`;
}
