import { useEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { initialCustomers } from '@/data/customers';
import {
  buildAccrualDemoPurchases,
  buildDemoPurchases,
} from '@/lib/demoPurchases';
import {
  addDaysISO,
  nextOperatingDateOnOrAfter,
  todayISO,
} from '@/lib/dates';
import {
  buildSearchSelection,
  searchFlights,
  type SearchCriteria,
  type SearchSelection,
} from '@/lib/flightSearch';
import { availableSeatIds, userOccupiedSeats } from '@/lib/seatOccupancy';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { useBooking } from '@/components/BookingProvider/useBooking';
import { BookingConfirmation } from '@/components/BookingConfirmation/BookingConfirmation';

const today = todayISO();
const criteria: SearchCriteria = {
  routeId: 'sdq-sju',
  departureDate: nextOperatingDateOnOrAfter(addDaysISO(today, 1)),
  returnDate: nextOperatingDateOnOrAfter(addDaysISO(today, 4)),
  adults: 1,
  children: 0,
  infants: 0,
};

function validSelection(): SearchSelection {
  const results = searchFlights(criteria, today);
  const selection = buildSearchSelection(
    criteria,
    results.outbound[0],
    results.returnOptions[0],
  );
  if (!selection) throw new Error('Expected a valid selection');
  return selection;
}

/**
 * Logs in the deterministic email-failure account, confirms a real
 * purchase through the provider (same transition the UI uses) and
 * navigates to /confirmacion with the code and selection in router
 * state, exactly as BookingPage does after a successful confirmation.
 */
function ConfirmPurchaseAndNavigate({
  selection,
}: {
  selection: SearchSelection;
}) {
  const { login, confirmPurchase } = useBooking();
  const navigate = useNavigate();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const customer = initialCustomers.find(
      (entry) => entry.email === 'correo-fallido@codenova.demo',
    );
    if (!customer) return;
    login(customer);
    // The provider seeds demo + accrual purchases owned by the demo
    // accounts; replicate that occupancy to pick genuinely free seats.
    const occupancy = userOccupiedSeats([
      ...buildDemoPurchases(today),
      ...buildAccrualDemoPurchases(today),
    ]);
    const seats = {
      outbound: [
        availableSeatIds(
          selection.outbound.flightNumber,
          selection.departureDate,
          occupancy,
        )[0],
      ],
      return: [
        availableSeatIds(
          selection.returnFlight.flightNumber,
          selection.returnDate,
          occupancy,
        )[0],
      ],
    };
    const result = confirmPurchase({ selection, seats, milesUsed: 0 });
    if (result.ok) {
      navigate('/confirmacion', {
        state: { code: result.purchase.code, selection },
      });
    }
  }, [selection, login, confirmPurchase, navigate]);
  return null;
}

function renderConfirmation() {
  const selection = validSelection();
  render(
    <BookingProvider>
      <MemoryRouter initialEntries={['/']}>
        <ConfirmPurchaseAndNavigate selection={selection} />
        <Routes>
          <Route
            path="/confirmacion"
            element={<BookingConfirmation />}
          />
        </Routes>
      </MemoryRouter>
    </BookingProvider>,
  );
}

describe('BookingConfirmation — CU-05 alternate flow (Paso 3.3): send failure', () => {
  it('shows the FAILED warning and keeps the reservation confirmed', async () => {
    renderConfirmation();

    // The simulated delivery takes ~400 ms before resolving to FAILED
    // for the correo-fallido@codenova.demo account.
    const status = await screen.findByText(
      'No pudimos enviar tu confirmación por correo. Tu reserva sigue confirmada',
      {},
      { timeout: 3000 },
    );
    expect(status).toBeVisible();

    const title = await screen.findByText('El correo no pudo enviarse');
    const alert = title.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert).toHaveTextContent(
      'tu reserva está confirmada y no se ha perdido',
    );

    // A failed send is never presented as a successful delivery.
    expect(
      screen.queryByText('Confirmación enviada correctamente'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Preparando el envío/),
    ).not.toBeInTheDocument();
  });
});
