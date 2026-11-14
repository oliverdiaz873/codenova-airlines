import { useEffect, useRef, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { initialCustomers } from '@/data/customers';
import { formatCurrency } from '@/data/flights';
import { distanceMilesForRoute } from '@/data/routeDistances';
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

function renderCorporateBooking(state: unknown) {
  render(
    <BookingProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/reservar', state }]}
      >
        <LoginAs email="corporativo@codenova.demo" />
        <Routes>
          <Route path="/reservar" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>
    </BookingProvider>,
  );
}

async function reachReviewStep() {
  const seatMap = await screen.findByRole('group', {
    name: 'Mapa de asientos del avión',
  });
  const pickFirstAvailable = async () => {
    const free = within(seatMap)
      .getAllByRole('button', { name: /disponible$/ })[0];
    await userEvent.click(free);
  };
  await pickFirstAvailable();
  await userEvent.click(screen.getByRole('tab', { name: /Regreso/ }));
  await pickFirstAvailable();
  await userEvent.click(
    screen.getByRole('button', { name: 'Continuar' }),
  );
}

describe('BookingPage — CU-04 alternate flow (Paso 3.3): miles redemption', () => {
  it('shows the corporate balance, validates the amount and previews the discount', async () => {
    const selection = validSelection();
    renderCorporateBooking(selection);
    await reachReviewStep();

    // The corporate balance includes the lazily credited accrual demo miles
    // (CN-9004): 10,000 base + route distance x 2 legs x 1 passenger.
    const expectedBalance = (
      10000 + (distanceMilesForRoute('sdq-sju') ?? 0) * 2
    ).toLocaleString('es-DO');
    const balanceText = await screen.findByText(/Saldo disponible:/);
    expect(balanceText).toHaveTextContent(expectedBalance);
    expect(balanceText).toHaveTextContent('millas');

    const milesInput = screen.getByLabelText('Millas a canjear');

    fireEvent.change(milesInput, { target: { value: '500' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /El canje mínimo es .* millas\./,
    );

    fireEvent.change(milesInput, { target: { value: '2500' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /El canje debe ser en pasos de .* millas\./,
    );

    fireEvent.change(milesInput, { target: { value: '2000' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Descuento por millas/),
    ).toBeInTheDocument();
    expect(screen.getByText('−RD$200')).toBeInTheDocument();

    const totalRow = screen.getByText('Total neto').closest('.booking__row');
    expect(totalRow).toHaveTextContent(
      formatCurrency(selection.totalPrice - 200),
    );
  });
});
