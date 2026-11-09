import { Navigate, Outlet, useLocation } from 'react-router';
import type { DemoCustomer } from '@/data/customers';

interface RequireCustomerProps {
  customer: DemoCustomer | null;
}

/**
 * Route guard for Client-only areas (panel, CU-03 search, CU-04 stub).
 * Without an active simulated session, redirects to /ingresar keeping the
 * intended destination in location.state.from for contextual return (C-1).
 */
export function RequireCustomer({ customer }: RequireCustomerProps) {
  const location = useLocation();

  if (!customer) {
    return (
      <Navigate
        to="/ingresar"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <Outlet context={customer} />;
}
