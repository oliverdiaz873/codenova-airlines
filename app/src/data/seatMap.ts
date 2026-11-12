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
