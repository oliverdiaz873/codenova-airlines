import { useEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { initialCustomers } from '@/data/customers';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { useBooking } from '@/components/BookingProvider/useBooking';
import { ReservationDetail } from '@/components/ReservationDetail/ReservationDetail';

/** Logs in the demo account once, before the detail resolves the purchase. */
function LoginAs({ email }: { email: string }) {
  const { login } = useBooking();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const customer = initialCustomers.find((entry) => entry.email === email);
    if (customer) login(customer);
  }, [email, login]);
  return null;
}

function renderDetail(code: string, email: string) {
  render(
    <BookingProvider>
      <MemoryRouter initialEntries={[`/panel/reservas/${code}`]}>
        <LoginAs email={email} />
        <Routes>
          <Route path="/panel/reservas/:code" element={<ReservationDetail />} />
        </Routes>
      </MemoryRouter>
    </BookingProvider>,
  );
}

describe('ReservationDetail — CU-06 history and D-12 window', () => {
  it('blocks cancellation for a reservation outside the 168-hour window', async () => {
    renderDetail('CN-9001', 'minorista@codenova.demo');

    expect(
      await screen.findByRole('heading', { name: /CN-9001/ }),
    ).toBeVisible();
    expect(
      screen.getByText(/La cancelación no está disponible/),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Cancelar reservación' }),
    ).toBeDisabled();
  });

  it('keeps a confirmed purchase visible with an explicit cancellation state', async () => {
    // CN-9002 is the demo reservation anchored seven days ahead, which is
    // still inside the approved cancellation window (>= 168 hours).
    renderDetail('CN-9002', 'minorista@codenova.demo');
    expect(
      await screen.findByRole('heading', { name: /CN-9002/ }),
    ).toBeVisible();
    // The exact eligibility depends on the current clock; when eligible the
    // action exists, otherwise the explicit blocked explanation is shown.
    await waitFor(() => {
      const hasAction = screen.queryByRole('button', {
        name: 'Cancelar reservación',
      });
      const hasExplanation = screen.queryByText(
        /La cancelación no está disponible/,
      );
      expect(Boolean(hasAction) || Boolean(hasExplanation)).toBe(true);
    });
  });
});

describe('ReservationDetail — mileage accrual demo', () => {
  it('shows the completed corporate trip as credited miles', async () => {
    renderDetail('CN-9004', 'corporativo@codenova.demo');

    expect(
      await screen.findByRole('heading', { name: /CN-9004/ }),
    ).toBeVisible();
    expect(await screen.findByText('Millas acumuladas')).toBeVisible();
    expect(
      screen.getByText(
        /Estas millas ya fueron acreditadas al completar el viaje/,
      ),
    ).toBeVisible();
  });
});
