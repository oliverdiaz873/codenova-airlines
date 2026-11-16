import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { FLIGHT_CONNECTIONS } from '@/data/flights';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { Routes as CatalogRoutes } from '@/components/Routes/Routes';

function renderCatalog(catalog?: typeof FLIGHT_CONNECTIONS) {
  return render(
    <MemoryRouter>
      <BookingProvider>
        <CatalogRoutes catalog={catalog} />
      </BookingProvider>
    </MemoryRouter>,
  );
}

describe('Routes — CU-01 public catalog', () => {
  it('renders every approved connection with fare and schedule', () => {
    renderCatalog();
    expect(screen.getAllByRole('article')).toHaveLength(
      FLIGHT_CONNECTIONS.length,
    );
    expect(
      screen.getByText(
        new RegExp(`${FLIGHT_CONNECTIONS.length} conexiones aprobadas`),
      ),
    ).toBeVisible();
    expect(screen.getAllByText('Santo Domingo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('San Juan').length).toBeGreaterThan(0);
  });

  it('renders the empty-catalog alternate flow without inventing routes', () => {
    renderCatalog([]);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'No hay información de vuelos disponible en este momento.',
    );
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(
      screen.queryByText(/conexiones aprobadas/),
    ).not.toBeInTheDocument();
  });
});
