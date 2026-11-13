import { createContext, useContext, useEffect } from 'react';
import type { DemoCustomer } from '@/data/customers';
import type { Purchase } from '@/lib/booking';
import type {
  ConfirmPurchaseInput,
  ConfirmPurchaseResult,
} from '@/lib/confirmPurchase';
import type { CancelPurchaseResult } from '@/lib/cancelPurchase';
import type { ScheduledService } from '@/data/scheduledServices';
import type {
  ApplyFlightUpdateResult,
  FlightUpdateChanges,
  FlightUpdates,
} from '@/lib/flightUpdate';

export interface BookingContextValue {
  customers: DemoCustomer[];
  activeCustomer: DemoCustomer | null;
  purchases: Purchase[];
  /** CU-07: schedule update history keyed by flightNumber (memory only). */
  flightUpdates: FlightUpdates;
  login: (customer: DemoCustomer) => void;
  register: (customer: DemoCustomer) => void;
  logout: () => void;
  confirmPurchase: (input: ConfirmPurchaseInput) => ConfirmPurchaseResult;
  sendConfirmationEmail: (code: string) => void;
  cancelPurchase: (code: string) => CancelPurchaseResult;
  syncAccrual: () => void;
  updateFlightService: (
    flightNumber: string,
    changes: FlightUpdateChanges,
  ) => ApplyFlightUpdateResult;
  resolveService: (
    flightNumber: string,
    date: string,
  ) => ScheduledService | undefined;
}

export const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used inside <BookingProvider>');
  }
  return context;
}

/**
 * Visual freshness for the miles balance (H-2.1): runs the idempotent
 * lazy accrual once when a balance-displaying screen mounts. Route changes
 * remount the screen, so returning to it re-syncs. No timers; the
 * authoritative accrual always happens inside confirmPurchase anyway.
 */
export function useAccrualSync(): void {
  const { syncAccrual } = useBooking();
  useEffect(() => {
    syncAccrual();
  }, [syncAccrual]);
}
