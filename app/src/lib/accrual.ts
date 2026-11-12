/**
 * Lazy mileage accrual transition (D-1, D-4, D-5; v2.10).
 * Source: PLAN_CODENOVA.md — section 5.2.
 *
 * Pure state transition: given the purchases and customers of the session,
 * credits the pending miles of every completed, uncredited, non-cancelled
 * purchase to the account that owns it. Returns new arrays only when
 * something changed; the caller can apply it inside a single setState so
 * purchases and balances never diverge. Idempotent through milesCredited.
 */

import type { DemoCustomer } from '@/data/customers';
import { accrualDueMiles, type Purchase } from '@/lib/booking';

export interface AccrualTransition {
  purchases: Purchase[];
  customers: DemoCustomer[];
  /** True when at least one purchase was credited; false = no-op. */
  changed: boolean;
}

export function applyDueAccrual(
  purchases: Purchase[],
  customers: DemoCustomer[],
  nowMs: number,
): AccrualTransition {
  const knownEmails = new Set(customers.map((customer) => customer.email));

  const due: Array<{ purchase: Purchase; miles: number }> = [];
  for (const purchase of purchases) {
    const miles = accrualDueMiles(purchase, nowMs);
    if (miles > 0 && knownEmails.has(purchase.customerEmail)) {
      due.push({ purchase, miles });
    }
  }
  if (due.length === 0) {
    return { purchases, customers, changed: false };
  }

  const creditedCodes = new Set(due.map(({ purchase }) => purchase.code));
  const earnedByEmail = new Map<string, number>();
  for (const { purchase, miles } of due) {
    earnedByEmail.set(
      purchase.customerEmail,
      (earnedByEmail.get(purchase.customerEmail) ?? 0) + miles,
    );
  }

  return {
    purchases: purchases.map((purchase) =>
      creditedCodes.has(purchase.code)
        ? { ...purchase, milesCredited: true }
        : purchase,
    ),
    customers: customers.map((customer) => {
      const earned = earnedByEmail.get(customer.email);
      return earned ? { ...customer, miles: customer.miles + earned } : customer;
    }),
    changed: true,
  };
}
