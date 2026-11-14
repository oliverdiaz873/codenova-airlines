import { useEffect, useRef, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  addDaysISO,
  nextOperatingDateOnOrAfter,
  todayISO,
} from '@/lib/dates';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { useBooking } from '@/components/BookingProvider/useBooking';
import { SearchPage } from '@/components/SearchPage/SearchPage';

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
const departureDate = nextOperatingDateOnOrAfter(addDaysISO(today, 1));
const returnDate = nextOperatingDateOnOrAfter(addDaysISO(departureDate, 2));

function renderSearch(children?: ReactNode) {
  render(
    <BookingProvider>
      <MemoryRouter>
        {children}
        <SearchPage />
      </MemoryRouter>
    </BookingProvider>,
  );
}

async function fillDatesAndSearch() {
  fireEvent.change(screen.getByLabelText('Fecha de ida'), {
    target: { value: departureDate },
  });
  fireEvent.change(screen.getByLabelText('Fecha de regreso'), {
    target: { value: returnDate },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Buscar vuelos' }));
}

function outboundGroup() {
  return within(screen.getByRole('region', { name: /Vuelo de ida/ }));
}

describe('SearchPage — CU-03 departure time slot', () => {
  it('filters only the outbound leg using the effective schedule', async () => {
    renderSearch();
    await userEvent.selectOptions(
      screen.getByLabelText('Hora de partida (ida)'),
      'Tarde (12:00 – 17:59)',
    );
    await fillDatesAndSearch();

    const outbound = outboundGroup();
    expect(await outbound.findByText('CN103')).toBeVisible();
    expect(outbound.queryByText('CN101')).not.toBeInTheDocument();
    // The return leg is not filtered by the outbound window (D-2).
    const returning = within(screen.getByRole('region', { name: /Vuelo de regreso/ }));
    expect(await returning.findByText('CN102')).toBeVisible();
  });
});

describe('SearchPage — CU-07 availability (D-8)', () => {
  it('shows an unavailable flight disabled with an explanation', async () => {
    renderSearch(<MarkUnavailable flightNumber="CN101" />);
    await fillDatesAndSearch();

    const outbound = outboundGroup();
    expect(await outbound.findByText('Vuelo no disponible')).toBeVisible();
    expect(
      outbound.getByText('El agente marcó este vuelo como no disponible'),
    ).toBeVisible();
    const disabled = outbound
      .getAllByRole('button', { name: 'No disponible' })
      .find((button) => (button as HTMLButtonElement).disabled);
    expect(disabled).toBeDefined();

    // The other outbound service of the same day stays bookable.
    await waitFor(() =>
      expect(outbound.getByText('CN103')).toBeVisible(),
    );
    expect(
      outbound
        .getAllByRole('button', { name: 'Seleccionar' })
        .every((button) => !(button as HTMLButtonElement).disabled),
    ).toBe(true);
  });
});

describe('SearchPage — CU-03 alternate flow (Paso 3.3): no matching flights', () => {
  it('shows the empty-state message and keeps Continuar disabled', async () => {
    renderSearch();
    // The sdq-sju outbound services depart at 08:00 and 17:00, so the
    // evening slot never matches an outbound departure on any date.
    await userEvent.selectOptions(
      screen.getByLabelText('Hora de partida (ida)'),
      'Noche (18:00 – 04:59)',
    );
    await fillDatesAndSearch();

    const outbound = outboundGroup();
    expect(
      await outbound.findByText(
        /No existen vuelos de ida que coincidan con la hora de partida elegida/,
      ),
    ).toBeVisible();

    // The summary (and its Continuar button) only renders once some leg is
    // selected; picking a return flight still cannot enable it.
    const returning = within(
      screen.getByRole('region', { name: /Vuelo de regreso/ }),
    );
    await userEvent.click(
      (await returning.findAllByRole('button', { name: 'Seleccionar' }))[0],
    );
    expect(
      await screen.findByText(/Selecciona el vuelo de ida y el de regreso/),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Continuar' }),
    ).toBeDisabled();
  });
});
