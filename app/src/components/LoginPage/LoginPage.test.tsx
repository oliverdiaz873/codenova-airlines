import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { initialCustomers } from '@/data/customers';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { LoginPage } from '@/components/LoginPage/LoginPage';

function renderRegister(overrides: Partial<Parameters<typeof LoginPage>[0]> = {}) {
  const props = {
    activeCustomer: null,
    customers: initialCustomers,
    onLogin: vi.fn(),
    onRegister: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(
    <BookingProvider>
      <MemoryRouter initialEntries={['/ingresar?mode=register']}>
        <LoginPage {...props} />
      </MemoryRouter>
    </BookingProvider>,
  );
  return props;
}

describe('LoginPage — CU-02 registration', () => {
  it('requires every academic field before creating an account', async () => {
    const user = userEvent.setup();
    const props = renderRegister();

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        'Completa los datos que faltan: Nombre completo, Dirección, Teléfono, Correo electrónico.',
      ),
    ).toBeVisible();
    expect(props.onRegister).not.toHaveBeenCalled();
  });

  it('requires a company for corporate customers and registers the data', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    const props = renderRegister();

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Dirección'), 'Av. 27 de Febrero 10');
    await user.type(screen.getByLabelText('Teléfono'), '+1 809-555-0111');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'ana@empresa.demo',
    );
    await user.selectOptions(
      screen.getByLabelText('Tipo de cliente'),
      'Corporativo',
    );

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText(
        'Completa los datos que faltan: Nombre de la compañía.',
      ),
    ).toBeVisible();
    expect(props.onRegister).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText('Nombre de la compañía'),
      'Empresa Demo SRL',
    );
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(props.onRegister).toHaveBeenCalledTimes(1));
    expect(props.onRegister).toHaveBeenCalledWith({
      email: 'ana@empresa.demo',
      type: 'Corporativo',
      miles: 0,
      name: 'Ana Pérez',
      address: 'Av. 27 de Febrero 10',
      phone: '+1 809-555-0111',
      company: 'Empresa Demo SRL',
    });
  });

  it('rejects an invalid phone and accepts +, spaces and hyphens', async () => {
    const user = userEvent.setup();
    const props = renderRegister();

    await user.type(screen.getByLabelText('Nombre completo'), 'Luis Gómez');
    await user.type(screen.getByLabelText('Dirección'), 'Calle 1');
    await user.type(screen.getByLabelText('Teléfono'), 'abc');
    await user.type(screen.getByLabelText('Correo electrónico'), 'luis@demo.test');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText(/al menos 10 dígitos/i),
    ).toBeVisible();
    expect(props.onRegister).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Teléfono'));
    await user.type(screen.getByLabelText('Teléfono'), '+1 809-555-0199');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(props.onRegister).toHaveBeenCalledTimes(1));
  });

  it('rejects an email that already belongs to another customer', async () => {
    const user = userEvent.setup();
    const props = renderRegister();

    await user.type(screen.getByLabelText('Nombre completo'), 'Otra Persona');
    await user.type(screen.getByLabelText('Dirección'), 'Calle 2');
    await user.type(screen.getByLabelText('Teléfono'), '8095550100');
    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'minorista@codenova.demo',
    );
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(/Ya existe una cuenta con ese correo/i),
    ).toBeVisible();
    expect(props.onRegister).not.toHaveBeenCalled();
  });
});

describe('LoginPage — login flow', () => {
  it('shows a controlled error for an unknown email', async () => {
    const user = userEvent.setup();
    const props = {
      activeCustomer: null,
      customers: initialCustomers,
      onLogin: vi.fn(),
      onRegister: vi.fn(),
      onLogout: vi.fn(),
    };
    render(
      <BookingProvider>
        <MemoryRouter initialEntries={['/ingresar']}>
          <LoginPage {...props} />
        </MemoryRouter>
      </BookingProvider>,
    );

    await user.type(
      screen.getByLabelText('Correo electrónico'),
      'nadie@demo.test',
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText(/No encontramos una cuenta con ese correo/),
    ).toBeVisible();
    expect(props.onLogin).not.toHaveBeenCalled();
  });
});
