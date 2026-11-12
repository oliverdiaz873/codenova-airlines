import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { initialCustomers, type DemoCustomer } from '@/data/customers';
import { applyDueAccrual } from '@/lib/accrual';
import {
  applyPurchaseConfirmation,
  type ConfirmPurchaseInput,
  type ConfirmPurchaseResult,
} from '@/lib/confirmPurchase';
import type { Purchase } from '@/lib/booking';
import {
  EMAIL_SEND_DELAY_MS,
  finishEmailSend,
  shouldForceEmailFailure,
  startEmailSend,
} from '@/lib/confirmationEmail';
import {
  applyPurchaseCancellation,
  type CancelPurchaseResult,
} from '@/lib/cancelPurchase';
import { BookingContext, type BookingContextValue } from './useBooking';

interface BookingState {
  customers: DemoCustomer[];
  /** Email of the simulated session; the customer is derived, never copied. */
  activeEmail: string | null;
  purchases: Purchase[];
}

/**
 * Application-level store for CU-04 (P-1, D-7).
 *
 * `storeRef.current` is the synchronous source of truth; React state is a
 * render mirror. Every mutation goes through `commit`, which updates the
 * ref first and then React — so consecutive calls always see the freshest
 * state and synchronous transitions (confirmPurchase) can return results
 * immediately. Data resets on reload.
 */
export function BookingProvider({ children }: { children: ReactNode }) {
  const initialState: BookingState = {
    customers: initialCustomers,
    activeEmail: null,
    purchases: [],
  };
  const [state, setState] = useState<BookingState>(initialState);
  const storeRef = useRef<BookingState>(initialState);

  const commit = useCallback((next: BookingState) => {
    storeRef.current = next;
    setState(next);
  }, []);

  // Lazy mileage accrual (D-1/H-2.1): evaluated after each render in which
  // purchases changed, plus on demand via syncAccrual. Idempotent; a no-op
  // transition commits nothing, so there is no render loop.
  const syncAccrual = useCallback(() => {
    const transition = applyDueAccrual(
      storeRef.current.purchases,
      storeRef.current.customers,
      Date.now(),
    );
    if (transition.changed) {
      commit({
        ...storeRef.current,
        purchases: transition.purchases,
        customers: transition.customers,
      });
    }
  }, [commit]);

  useEffect(() => {
    syncAccrual();
  }, [state.purchases, syncAccrual]);

  const login = (customer: DemoCustomer) =>
    commit({ ...storeRef.current, activeEmail: customer.email });

  const register = (customer: DemoCustomer) =>
    commit({
      ...storeRef.current,
      customers: [...storeRef.current.customers, customer],
      activeEmail: customer.email,
    });

  const logout = () =>
    commit({ ...storeRef.current, activeEmail: null });

  /**
   * Atomic confirmation (C-3): the pure transition validates everything
   * against the freshest state — accrual first, then seats, balance and
   * amount — and only then commits purchase + miles deduction together.
   * Returns the result synchronously.
   */
  const confirmPurchase = (
    input: ConfirmPurchaseInput,
  ): ConfirmPurchaseResult => {
    const result = applyPurchaseConfirmation(
      storeRef.current.purchases,
      storeRef.current.customers,
      storeRef.current.activeEmail,
      input,
      Date.now(),
    );
    if (!result.ok) return result;
    commit({
      ...storeRef.current,
      customers: result.customers,
      purchases: result.purchases,
    });
    return result;
  };

  /**
   * CU-05: simulated confirmation email. The PENDING transition commits
   * synchronously so repeated calls (StrictMode, remounts, repeated
   * navigation) see an already-processed purchase and no-op; the delayed
   * completion also goes through the store, so the result is recorded even
   * if the view unmounted meanwhile. A FAILED result never touches the
   * purchase — it only sets confirmationEmailStatus.
   */
  const sendConfirmationEmail = useCallback(
    (code: string) => {
      const purchase = storeRef.current.purchases.find(
        (candidate) => candidate.code === code,
      );
      if (!purchase || purchase.status !== 'confirmada') return;
      const pending = startEmailSend(purchase);
      if (pending === purchase) return;
      commit({
        ...storeRef.current,
        purchases: storeRef.current.purchases.map((candidate) =>
          candidate.code === code ? pending : candidate,
        ),
      });
      window.setTimeout(() => {
        const current = storeRef.current.purchases.find(
          (candidate) => candidate.code === code,
        );
        if (!current) return;
        // The purchase owner decides the simulated result: the demo
        // failure account forces FAILED; a missing owner keeps SENT.
        const finished = finishEmailSend(
          current,
          shouldForceEmailFailure(current, storeRef.current.customers),
        );
        if (finished === current) return;
        commit({
          ...storeRef.current,
          purchases: storeRef.current.purchases.map((candidate) =>
            candidate.code === code ? finished : candidate,
          ),
        });
      }, EMAIL_SEND_DELAY_MS);
    },
    [commit],
  );

  /**
   * CU-06: atomic purchase cancellation. The pure transition validates
   * ownership, status and the 168-hour deadline against the freshest
   * state; only an ok result commits — a failure changes nothing, so the
   * purchase and its seats stay untouched. Seats are freed implicitly
   * because occupancy derives from confirmed purchases only.
   */
  const cancelPurchase = useCallback(
    (code: string): CancelPurchaseResult => {
      const result = applyPurchaseCancellation(
        storeRef.current.purchases,
        storeRef.current.activeEmail,
        code,
        Date.now(),
      );
      if (!result.ok) return result;
      commit({
        ...storeRef.current,
        purchases: result.purchases,
      });
      return result;
    },
    [commit],
  );

  const activeCustomer =
    state.customers.find((customer) => customer.email === state.activeEmail) ??
    null;

  const value: BookingContextValue = {
    customers: state.customers,
    activeCustomer,
    purchases: state.purchases,
    login,
    register,
    logout,
    confirmPurchase,
    sendConfirmationEmail,
    cancelPurchase,
    syncAccrual,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}
