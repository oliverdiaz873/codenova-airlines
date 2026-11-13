import { describe, expect, it } from 'vitest';
import { SCHEDULED_SERVICES } from '@/data/scheduledServices';
import { localDateTimeToUtc } from '@/lib/dates';
import {
  createFlightUpdateOps,
  type FlightUpdates,
} from '@/lib/flightUpdate';

const SDQ_TZ = 'America/Santo_Domingo';
const CN101 = SCHEDULED_SERVICES.find((s) => s.flightNumber === 'CN101')!;
const DATE = '2026-11-09';

function departureMs(date: string, departureLocal = '08:00'): number {
  return localDateTimeToUtc(date, departureLocal, SDQ_TZ).getTime();
}

/**
 * Minimal stand-in for the provider's storeRef + commit pair: `state`
 * plays the role of storeRef.current (synchronous source of truth) and
 * `store.commits` records every commit call, mirroring the provider contract
 * where one ok transition produces exactly one commit.
 */
function makeStore(nowValues: number[] = []) {
  let state: FlightUpdates = {};
  const commits: FlightUpdates[] = [];
  let clock = 0;
  const ops = createFlightUpdateOps(
    () => state,
    (next) => {
      state = next;
      commits.push(next);
    },
    () => nowValues[clock++] ?? Date.now(),
  );
  return {
    ops,
    commits,
    get state() {
      return state;
    },
  };
}

describe('createFlightUpdateOps', () => {
  it('starts with no overrides and resolves the base service', () => {
    const store = makeStore();
    expect(store.state).toEqual({});
    const resolved = store.ops.resolveService('CN101', DATE);
    expect(resolved?.departureLocal).toBe('08:00');
    expect(resolved?.durationMinutes).toBe(75);
  });

  it('store.commits exactly once on a valid update', () => {
    const store = makeStore([1_000]);
    const result = store.ops.updateFlightService('CN101', {
      departureLocal: '09:30',
      durationMinutes: 80,
    });
    expect(result.ok).toBe(true);
    expect(store.commits).toHaveLength(1);
    expect(store.state.CN101).toHaveLength(1);
    expect(store.state.CN101![0]).toMatchObject({
      departureLocal: '09:30',
      durationMinutes: 80,
      effectiveAtMs: 1_000,
    });
  });

  it('supports a partial update', () => {
    const store = makeStore([1_000]);
    const result = store.ops.updateFlightService('CN101', {
      durationMinutes: 95,
    });
    expect(result.ok).toBe(true);
    expect(store.state.CN101![0].departureLocal).toBe('08:00');
    expect(store.state.CN101![0].durationMinutes).toBe(95);
  });

  it('resolveService reflects the committed update for a future occurrence', () => {
    const dep = departureMs(DATE);
    const store = makeStore([dep - 60_000]);
    store.ops.updateFlightService('CN101', { departureLocal: '09:30' });
    expect(store.ops.resolveService('CN101', DATE)?.departureLocal).toBe('09:30');
    // An occurrence that already departed keeps the base schedule.
    const past = store.ops.resolveService('CN101', '2026-11-06');
    expect(past?.departureLocal).toBe('08:00');
  });

  it('keeps the version history across successive updates', () => {
    const dep = departureMs(DATE);
    const store = makeStore([dep - 7_200_000, dep - 3_600_000]);
    store.ops.updateFlightService('CN101', { departureLocal: '09:00' });
    store.ops.updateFlightService('CN101', { departureLocal: '10:00', durationMinutes: 90 });
    expect(store.state.CN101).toHaveLength(2);
    expect(store.state.CN101!.map((u) => u.departureLocal)).toEqual(['09:00', '10:00']);
    expect(store.ops.resolveService('CN101', DATE)?.departureLocal).toBe('10:00');
  });

  it('keeps effectiveAtMs non-decreasing when the clock regresses', () => {
    const store = makeStore([5_000, 1_000, 9_000]);
    store.ops.updateFlightService('CN101', { departureLocal: '09:00' });
    store.ops.updateFlightService('CN101', { departureLocal: '10:00' });
    store.ops.updateFlightService('CN101', { durationMinutes: 90 });
    expect(store.state.CN101!.map((u) => u.effectiveAtMs)).toEqual([5_000, 5_000, 9_000]);
  });

  it('does not commit on a no-op update', () => {
    const store = makeStore([1_000]);
    const result = store.ops.updateFlightService('CN101', {
      departureLocal: '08:00',
      durationMinutes: 75,
    });
    expect(result.ok).toBe(false);
    expect(store.commits).toHaveLength(0);
  });

  it('does not commit for an unknown flight', () => {
    const store = makeStore([1_000]);
    const result = store.ops.updateFlightService('CN999', { departureLocal: '09:00' });
    expect(result.ok).toBe(false);
    expect(store.commits).toHaveLength(0);
  });

  it('does not commit for invalid data', () => {
    const store = makeStore([1_000]);
    expect(store.ops.updateFlightService('CN101', { departureLocal: '99:99' }).ok).toBe(false);
    expect(store.ops.updateFlightService('CN101', { durationMinutes: 0 }).ok).toBe(false);
    expect(store.commits).toHaveLength(0);
    expect(store.state).toEqual({});
  });

  it('does not commit on a simulated failure', () => {
    const store = makeStore([1_000]);
    const result = store.ops.updateFlightService(
      'CN101',
      { departureLocal: '09:30' },
      { simulateFailure: true },
    );
    expect(result.ok).toBe(false);
    expect(store.commits).toHaveLength(0);
    expect(store.state).toEqual({});
  });

  it('preserves the previous state object on every commit', () => {
    const store = makeStore([1_000, 2_000]);
    const first = store.ops.updateFlightService('CN101', { departureLocal: '09:00' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstMap = first.flightUpdates;
    const second = store.ops.updateFlightService('CN102', { departureLocal: '12:00' });
    expect(second.ok).toBe(true);
    // The first committed map is untouched by the second update.
    expect(firstMap.CN101).toHaveLength(1);
    expect(firstMap.CN102).toBeUndefined();
    expect(store.state.CN101).toBe(firstMap.CN101);
  });

  it('keeps independent histories per flight number', () => {
    const store = makeStore([1_000, 1_000]);
    store.ops.updateFlightService('CN101', { departureLocal: '09:00' });
    store.ops.updateFlightService('CN102', { durationMinutes: 80 });
    expect(store.state.CN101![0].departureLocal).toBe('09:00');
    expect(store.state.CN102![0].durationMinutes).toBe(80);
    expect(store.state.CN102![0].departureLocal).toBe('10:30'); // CN102 base
  });

  it('a fresh store starts empty (reload semantics)', () => {
    const first = makeStore([1_000]);
    first.ops.updateFlightService('CN101', { departureLocal: '09:00' });
    const second = makeStore([2_000]);
    expect(second.state).toEqual({});
    expect(second.ops.resolveService('CN101', DATE)?.departureLocal).toBe('08:00');
    void CN101;
  });
});
