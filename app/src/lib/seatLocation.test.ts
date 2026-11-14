import { describe, expect, it } from 'vitest';
import {
  ALL_SEATS,
  cabinZone,
  describeSeat,
  isWindowSeat,
} from '@/data/seatMap';

describe('seat location helpers (seat map drawn as an aircraft)', () => {
  it('marks columns A and C as window seats and B as aisle', () => {
    expect(isWindowSeat('1A')).toBe(true);
    expect(isWindowSeat('1B')).toBe(false);
    expect(isWindowSeat('10C')).toBe(true);
  });

  it('has 20 window seats out of 30', () => {
    expect(ALL_SEATS.filter(isWindowSeat)).toHaveLength(20);
  });

  it('rejects invalid seat ids', () => {
    expect(isWindowSeat('11A')).toBe(false);
    expect(describeSeat('0D')).toBe('');
  });

  it('splits the cabin into front, over-the-wing and rear zones', () => {
    expect([1, 3].map(cabinZone)).toEqual(['front', 'front']);
    expect([4, 7].map(cabinZone)).toEqual(['wing', 'wing']);
    expect([8, 10].map(cabinZone)).toEqual(['rear', 'rear']);
  });

  it('describes where a seat is physically', () => {
    expect(describeSeat('2A')).toBe('Ventana · lado izquierdo · Parte delantera');
    expect(describeSeat('5B')).toBe('Pasillo · lado izquierdo · Centro, sobre el ala');
    expect(describeSeat('6C')).toBe(
      'Ventana, junto al pasillo (vista al ala) · lado derecho · Centro, sobre el ala',
    );
    expect(describeSeat('9A')).toBe('Ventana · lado izquierdo · Parte trasera');
  });
});
