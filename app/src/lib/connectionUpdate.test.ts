import { describe, expect, it } from 'vitest';
import { FLIGHT_CONNECTIONS } from '@/data/flights';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { localDateTimeToUtc } from '@/lib/dates';
import {
  allowedDestinations,
  applyConnectionUpdate,
  baseConnection,
  currentDestinationIata,
  effectiveConnection,
  effectiveConnectionAt,
  effectiveConnectionForDate,
  fareForRoute,
  serviceForConnection,
  type ConnectionUpdates,
} from '@/lib/connectionUpdate';

const SDQ_TZ = 'America/Santo_Domingo';
const SJU_CONNECTION = FLIGHT_CONNECTIONS.find((c) => c.id === 'sdq-sju')!;
const CN101 = SCHEDULED_SERVICES.find((s) => s.flightNumber === 'CN101')!;
const CN102 = SCHEDULED_SERVICES.find((s) => s.flightNumber === 'CN102')!;

/** UTC ms of the connection's earliest outbound departure (CN101 08:00). */
function departureMs(date: string, time = '08:00'): number {
  return localDateTimeToUtc(date, time, SDQ_TZ).getTime();
}

function updatesAt(
  destinationIata: string,
  effectiveAtMs: number,
): ConnectionUpdates {
  return { 'sdq-sju': [{ destinationIata, effectiveAtMs }] };
}

describe('approved destinations and fares', () => {
  it('offers only airports with an approved fare from the same origin', () => {
    expect(allowedDestinations('SDQ').map((airport) => airport.iata)).toEqual([
      'SJU',
      'AUA',
      'MIA',
      'BOG',
    ]);
    expect(allowedDestinations('JBQ').map((airport) => airport.iata)).toEqual([
      'HAV',
    ]);
    expect(allowedDestinations('SJU')).toEqual([]);
  });

  it('resolves the approved fare for a pair and rejects unknown pairs', () => {
    expect(fareForRoute('SDQ', 'SJU')).toBe(7_900);
    expect(fareForRoute('SDQ', 'MIA')).toBe(9_900);
    expect(fareForRoute('JBQ', 'HAV')).toBe(19_500);
    expect(fareForRoute('SDQ', 'HAV')).toBeNull();
    expect(fareForRoute('JBQ', 'SJU')).toBeNull();
  });

  it('builds an effective connection with the new destination fare', () => {
    const effective = effectiveConnection(SJU_CONNECTION, 'MIA');
    expect(effective?.destination).toMatchObject({
      city: 'Miami',
      iata: 'MIA',
    });
    expect(effective?.farePerPassenger).toBe(9_900);
    expect(effective?.origin.iata).toBe('SDQ');
    expect(effective?.id).toBe('sdq-sju');
    expect(effectiveConnection(SJU_CONNECTION, 'HAV')).toBeNull();
    expect(effectiveConnection(SJU_CONNECTION, 'XXX')).toBeNull();
  });
});

describe('currentDestinationIata', () => {
  it('defaults to the base destination', () => {
    expect(currentDestinationIata(SJU_CONNECTION, undefined)).toBe('SJU');
    expect(currentDestinationIata(SJU_CONNECTION, {})).toBe('SJU');
  });

  it('returns the latest recorded destination', () => {
    const updates = updatesAt('MIA', 100);
    expect(currentDestinationIata(SJU_CONNECTION, updates)).toBe('MIA');
  });
});

describe('applyConnectionUpdate', () => {
  it('rejects an unknown connection', () => {
    const result = applyConnectionUpdate({}, 'nope', 'MIA', 1_000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('No encontramos esa conexión.');
  });

  it('rejects a destination without an approved fare from the origin', () => {
    const result = applyConnectionUpdate({}, 'sdq-sju', 'HAV', 1_000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      'El destino seleccionado no está disponible para esa conexión.',
    );
  });

  it('rejects an unknown airport', () => {
    const result = applyConnectionUpdate({}, 'sdq-sju', 'ZZZ', 1_000);
    expect(result).toEqual({
      ok: false,
      error: 'El destino seleccionado no está disponible para esa conexión.',
    });
  });

  it('rejects a no-op against the base destination', () => {
    const result = applyConnectionUpdate({}, 'sdq-sju', 'SJU', 1_000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('No hay cambios que guardar.');
  });

  it('rejects a no-op against the latest version', () => {
    const result = applyConnectionUpdate(
      updatesAt('MIA', 1_000),
      'sdq-sju',
      'MIA',
      2_000,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('No hay cambios que guardar.');
  });

  it('appends a version without mutating the input map', () => {
    const before = updatesAt('MIA', 1_000);
    const snapshot = JSON.parse(JSON.stringify(before));
    const result = applyConnectionUpdate(before, 'sdq-sju', 'BOG', 5_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.connectionUpdates['sdq-sju']).toEqual([
      { destinationIata: 'MIA', effectiveAtMs: 1_000 },
      { destinationIata: 'BOG', effectiveAtMs: 5_000 },
    ]);
    expect(before).toEqual(snapshot);
    expect(result.update).toEqual({
      destinationIata: 'BOG',
      effectiveAtMs: 5_000,
    });
  });

  it('keeps effectiveAtMs non-decreasing with a regressing clock', () => {
    const result = applyConnectionUpdate(
      updatesAt('MIA', 5_000),
      'sdq-sju',
      'BOG',
      1_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.update.effectiveAtMs).toBe(5_000);
  });
});

describe('effectiveConnectionAt', () => {
  it('returns the base connection when no version was recorded', () => {
    expect(effectiveConnectionAt(SJU_CONNECTION, undefined, 10)).toBe(
      SJU_CONNECTION,
    );
  });

  it('applies only versions recorded strictly before the instant', () => {
    const updates = updatesAt('MIA', 1_000);
    expect(effectiveConnectionAt(SJU_CONNECTION, updates, 999).destination.iata).toBe(
      'SJU',
    );
    expect(
      effectiveConnectionAt(SJU_CONNECTION, updates, 1_000).destination.iata,
    ).toBe('SJU');
    expect(
      effectiveConnectionAt(SJU_CONNECTION, updates, 1_001).destination.iata,
    ).toBe('MIA');
  });
});

describe('effectiveConnectionForDate', () => {
  const DATE = '2026-11-09';

  it('keeps the base route when no version applies', () => {
    const updates = updatesAt('MIA', departureMs(DATE) + 1_000);
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, DATE).destination.iata,
    ).toBe('SJU');
  });

  it('applies a version recorded before the earliest outbound departure', () => {
    const updates = updatesAt('MIA', departureMs(DATE) - 1_000);
    const effective = effectiveConnectionForDate(
      SJU_CONNECTION,
      updates,
      DATE,
    );
    expect(effective.destination.iata).toBe('MIA');
    expect(effective.farePerPassenger).toBe(9_900);
  });

  it('uses the earliest outbound departure on the date as the boundary', () => {
    // CN103 departs at 17:00; a version between 08:00 and 17:00 must not
    // apply, because the first outbound already left.
    const updates = updatesAt('MIA', departureMs(DATE, '12:00'));
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, DATE).destination.iata,
    ).toBe('SJU');
    // A later operating date starts after the version, so it applies.
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, '2026-11-11')
        .destination.iata,
    ).toBe('MIA');
  });

  it('keeps past departures historical', () => {
    const updates = updatesAt('BOG', departureMs(DATE) - 1_000);
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, '2026-11-06')
        .destination.iata,
    ).toBe('SJU');
  });

  it('applies the latest applicable version in order', () => {
    const updates: ConnectionUpdates = {
      'sdq-sju': [
        { destinationIata: 'MIA', effectiveAtMs: departureMs(DATE) - 3_000 },
        { destinationIata: 'BOG', effectiveAtMs: departureMs(DATE) - 1_000 },
      ],
    };
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, DATE).destination.iata,
    ).toBe('BOG');
  });

  it('shifts the boundary when CU-07 moves the first departure', () => {
    const updates = updatesAt('MIA', departureMs(DATE, '09:00'));
    const flightUpdates = {
      CN101: [
        {
          departureLocal: '10:00',
          durationMinutes: 75,
          effectiveAtMs: departureMs(DATE, '07:00'),
        },
      ],
    };
    // Base departure (08:00) is before the version; the moved one (10:00)
    // is after it, so the destination applies to this date.
    expect(
      effectiveConnectionForDate(SJU_CONNECTION, updates, DATE).destination.iata,
    ).toBe('SJU');
    expect(
      effectiveConnectionForDate(
        SJU_CONNECTION,
        updates,
        DATE,
        flightUpdates,
      ).destination.iata,
    ).toBe('MIA');
  });
});

describe('serviceForConnection', () => {
  const updated = effectiveConnection(SJU_CONNECTION, 'MIA')!;

  it('moves the outbound destination', () => {
    const service = serviceForConnection(CN101, SJU_CONNECTION, 'MIA');
    expect(service.origin.iata).toBe('SDQ');
    expect(service.destination.iata).toBe('MIA');
    expect(service.flightNumber).toBe('CN101');
    expect(service.departureLocal).toBe('08:00');
  });

  it('moves the return origin, keeping both directions coherent', () => {
    const service = serviceForConnection(CN102, SJU_CONNECTION, 'MIA');
    expect(service.origin.iata).toBe('MIA');
    expect(service.destination.iata).toBe('SDQ');
    expect(updated.destination.iata).toBe('MIA');
  });

  it('returns the service unchanged for an unknown airport', () => {
    expect(serviceForConnection(CN101, SJU_CONNECTION, 'ZZZ')).toBe(CN101);
  });
});

describe('baseConnection', () => {
  it('finds the approved connection or undefined', () => {
    expect(baseConnection('sdq-sju')).toBe(SJU_CONNECTION);
    expect(baseConnection('unknown')).toBeUndefined();
  });
});
