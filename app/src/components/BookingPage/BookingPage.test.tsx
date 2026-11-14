import { useEffect, useRef, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { initialCustomers } from '@/data/customers';
import {
  addDaysISO,
  nextOperatingDateOnOrAfter,
  todayISO,
} from '@/lib/dates';
import {
  buildSearchSelection,
  searchFlights,
  type SearchCriteria,
} from '@/lib/flightSearch';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { useBooking } from '@/components/BookingProvider/useBooking';
import { BookingPage } from '@/components/BookingPage/BookingPage';

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

function MarkUnavailable({ flightNumber }: { flightNumber: string }) {
  const { updateFlightService } = useBooking();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    updateFlightService(flightNumber, { available: false });
  }, [flightNumber, updateFlightService]);
  return null;
}

const today = todayISO();
const criteria: SearchCriteria = {
  routeId: 'sdq-sju',
  departureDate: nextOperatingDateOnOrAfter(addDaysISO(today, 1)),
  returnDate: nextOperatingDateOnOrAfter(addDaysISO(today, 4)),
  adults: 1,
  children: 0,
  infants: 0,
};

function validSelection() {
  const results = searchFlights(criteria, today);
  const selection = buildSearchSelection(
    criteria,
    results.outbound[0],
    results.returnOptions[0],
  );
  if (!selection) throw new Error('Expected a valid selection');
  return selection;
}

function renderBooking(state: unknown, harness?: ReactNode) {
  render(
    <BookingProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/reservar', state }]}
      >
        <LoginAs email="minorista@codenova.demo" />
        {harness}
        <Routes>
          <Route path="/reservar" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>
    </BookingProvider>,
  );
}

describe('BookingPage — CU-04 guards', () => {
  it('shows the account gate when there is no session (C-1.5)', async () => {
    render(
      <BookingProvider>
        <MemoryRouter initialEntries={[{ pathname: '/reservar' }]}>
          <Routes>
            <Route path="/reservar" element={<BookingPage />} />
          </Routes>
        </MemoryRouter>
      </BookingProvider>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Para reservar necesitas una cuenta',
      }),
    ).toBeVisible();
  });

  it('stops before the seat map when the outbound flight is unavailable', async () => {
    const selection = validSelection();
    renderBooking(selection, <MarkUnavailable flightNumber="CN101" />);

    expect(
      await screen.findByText(/no está disponible para reservar/),
    ).toBeVisible();
    expect(
      screen.getByText(/Vuelve a buscar y elige otro vuelo/),
    ).toBeVisible();
  });

  it('rejects a tampered selection instead of trusting location.state', async () => {
    const selection = validSelection();
    const tampered = { ...selection, totalPrice: 1 };
    renderBooking(tampered);

    expect(
      await screen.findByText(/No hay una búsqueda seleccionada/),
    ).toBeVisible();
  });
});
