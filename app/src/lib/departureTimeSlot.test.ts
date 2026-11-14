import { describe, expect, it } from 'vitest';
import {
  buildSearchSelection,
  isValidSearchSelection,
  matchesDepartureTimeSlot,
  searchFlights,
  suggestAlternativeDates,
  type SearchCriteria,
} from '@/lib/flightSearch';

// CU-03 (Paso 3.2 / Paso 5): búsqueda por destino y hora de partida.
const base: SearchCriteria = {
  routeId: 'sdq-sju',
  departureDate: '2026-11-09', // lunes, día de operación
  returnDate: '2026-11-11',
  adults: 1,
  children: 0,
  infants: 0,
};
const REF = '2026-11-02';

describe('matchesDepartureTimeSlot', () => {
  it('accepts every time when no range is chosen', () => {
    expect(matchesDepartureTimeSlot('03:00', undefined)).toBe(true);
    expect(matchesDepartureTimeSlot('23:59', 'any')).toBe(true);
  });

  it.each([
    ['05:00', 'morning', true],
    ['11:59', 'morning', true],
    ['12:00', 'morning', false],
    ['12:00', 'afternoon', true],
    ['17:59', 'afternoon', true],
    ['18:00', 'afternoon', false],
    ['18:00', 'evening', true],
    ['00:30', 'evening', true],
    ['04:59', 'evening', true],
    ['04:59', 'morning', false],
  ] as const)('%s in %s → %s', (time, slot, expected) => {
    expect(matchesDepartureTimeSlot(time, slot)).toBe(expected);
  });
});

describe('searchFlights with departureTimeSlot', () => {
  it('returns both outbound services without a time filter', () => {
    const results = searchFlights(base, REF);
    expect(results.outbound.map((o) => o.departureTime)).toEqual(['08:00', '17:00']);
  });

  it('keeps only morning departures for "morning"', () => {
    const results = searchFlights({ ...base, departureTimeSlot: 'morning' }, REF);
    expect(results.outbound.map((o) => o.service.flightNumber)).toEqual(['CN101']);
  });

  it('keeps only afternoon departures for "afternoon"', () => {
    const results = searchFlights({ ...base, departureTimeSlot: 'afternoon' }, REF);
    expect(results.outbound.map((o) => o.service.flightNumber)).toEqual(['CN103']);
  });

  it('returns no outbound flights when none match (escenario alternativo 1)', () => {
    const results = searchFlights({ ...base, departureTimeSlot: 'evening' }, REF);
    expect(results.outbound).toEqual([]);
    // The return leg is not filtered by the outbound departure time.
    expect(results.returnOptions.length).toBeGreaterThan(0);
  });

  it('does not suggest alternative dates for a range with no service', () => {
    expect(
      suggestAlternativeDates({ ...base, departureTimeSlot: 'evening' }, REF),
    ).toEqual([]);
  });

  it('a filtered selection is still accepted by CU-04', () => {
    const criteria: SearchCriteria = { ...base, departureTimeSlot: 'afternoon' };
    const results = searchFlights(criteria, REF);
    const selection = buildSearchSelection(
      criteria,
      results.outbound[0],
      results.returnOptions[0],
    );
    expect(isValidSearchSelection(selection)).toBe(true);
  });
});
