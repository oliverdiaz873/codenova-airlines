import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { initialCustomers, type DemoCustomer } from '@/data/customers';
import { applyDueAccrual } from '@/lib/accrual';
import {
  applyPurchaseConfirmation,
  type ConfirmPurchaseInput,
  type ConfirmPurchaseResult,
} from '@/lib/confirmPurchase';
import type { Purchase } from '@/lib/booking';
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
    syncAccrual,
  };

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}
