import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import type { DemoCustomer } from '@/data/customers';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { ClientPanel } from '@/components/ClientPanel/ClientPanel';

function Layout({ customer }: { customer: DemoCustomer }) {
  return <Outlet context={customer} />;
}

function renderPanel(customer: DemoCustomer) {
  render(
    <BookingProvider>
      <MemoryRouter initialEntries={['/panel']}>
        <Routes>
          <Route element={<Layout customer={customer} />}>
            <Route
              path="/panel"
              element={<ClientPanel onLogout={vi.fn()} />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </BookingProvider>,
  );
}

describe('ClientPanel — CU-02 data display (D-5)', () => {
  it('shows the registered address and phone of the customer', async () => {
    renderPanel({
      email: 'cliente@demo.test',
      type: 'Minorista',
      miles: 0,
      name: 'Cliente Demo',
      address: 'Calle Duarte 45, Santo Domingo',
      phone: '+1 809-555-0142',
    });

    expect(await screen.findByText('Calle Duarte 45, Santo Domingo')).toBeVisible();
    expect(screen.getByText('+1 809-555-0142')).toBeVisible();
  });

  it('shows the company of a corporate customer', async () => {
    renderPanel({
      email: 'empresa@demo.test',
      type: 'Corporativo',
      miles: 1_000,
      company: 'Empresa Demo SRL',
      address: 'Av. Winston Churchill 1099',
      phone: '809-555-0100',
    });

    expect(await screen.findByText('Empresa Demo SRL')).toBeVisible();
    expect(screen.getByText('1,000')).toBeVisible();
  });
});
