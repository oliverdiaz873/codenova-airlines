/**
 * Approved fictitious distances per connection, in miles per leg.
 * Source: PLAN_CODENOVA.md — section 4.7.2 (decision D-2, 09/11/2026)
 *
 * Round trip uses the same distance in both directions. Used only for the
 * miles accrual rule (5.2); not commercial data.
 */

export const ROUTE_DISTANCES_MILES: Record<string, number> = {
  'sdq-sju': 250,
  'sdq-aua': 450,
  'sdq-mia': 850,
  'sdq-bog': 1000,
  'jbq-hav': 850,
};

/** Returns the one-way distance in miles, or null for unknown routes. */
export function distanceMilesForRoute(routeId: string): number | null {
  return ROUTE_DISTANCES_MILES[routeId] ?? null;
}
