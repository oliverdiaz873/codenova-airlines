import { useState, type FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { type DemoCustomer } from '@/data/customers';
import { useAccrualSync } from '@/components/BookingProvider/useBooking';
import {
  isValidEmail,
  isValidPhone,
  registrationMissingFields,
} from '@/lib/registration';
import './LoginPage.css';

/** Internal destinations allowed for contextual return after login (C-1). */
const ALLOWED_FROM = ['/buscar', '/panel', '/reservar'] as const;

function isAllowedFrom(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (ALLOWED_FROM as readonly string[]).includes(value)
  );
}

interface LoginPageProps {
  activeCustomer: DemoCustomer | null;
  customers: DemoCustomer[];
  onLogin: (customer: DemoCustomer) => void;
  onRegister: (customer: DemoCustomer) => void;
  onLogout: () => void;
}

export function LoginPage({
  activeCustomer,
  customers,
  onLogin,
  onRegister,
  onLogout,
}: LoginPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const stateFrom = (location.state as { from?: unknown } | null)?.from;
  const paramFrom = searchParams.get('from');
  const from = isAllowedFrom(stateFrom)
    ? stateFrom
    : isAllowedFrom(paramFrom)
      ? paramFrom
      : null;
  const postLoginTarget = from ?? '/panel';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<DemoCustomer['type']>('Minorista');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  useAccrualSync();

  const handleLogout = () => {
    setEmail('');
    setError('');
    setSearchParams({}, { replace: true });
    onLogout();
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const customer = customers.find((existingCustomer) => existingCustomer.email === normalizedEmail);

    if (!customer) {
      setError('No encontramos una cuenta con ese correo. Verifica la dirección o crea una cuenta.');
      return;
    }

    setError('');
    onLogin(customer);
    navigate(postLoginTarget, { replace: true });
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    // CU-02, escenario alternativo 3 (Paso 5): datos incompletos. The system
    // points out which required data is missing and the registration does
    // not finish until it is complete.
    const missing = registrationMissingFields({
      name,
      address,
      phone,
      email,
      company,
      customerType,
    });
    if (missing.length > 0) {
      setMissingFields(missing);
      setError(`Completa los datos que faltan: ${missing.join(', ')}.`);
      return;
    }
    if (!isValidEmail(email)) {
      setMissingFields(['Correo electrónico']);
      setError('Escribe un correo electrónico válido (por ejemplo, nombre@ejemplo.com).');
      return;
    }
    if (!isValidPhone(phone)) {
      setMissingFields(['Teléfono']);
      setError('El teléfono debe tener al menos 10 dígitos (por ejemplo, 809-555-0123).');
      return;
    }

    if (customers.some((customer) => customer.email === normalizedEmail)) {
      setMissingFields([]);
      setError('Ya existe una cuenta con ese correo. Inicia sesión o usa otra dirección.');
      return;
    }

    const newCustomer: DemoCustomer = {
      email: normalizedEmail,
      type: customerType,
      miles: 0,
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      ...(customerType === 'Corporativo' ? { company: company.trim() } : {}),
    };

    setMissingFields([]);
    setError('');
    onRegister(newCustomer);
    navigate(postLoginTarget, { replace: true });
  };

  const isMissing = (label: string) => missingFields.includes(label);
  const registerInputClass = (label: string) =>
    `login-form__input${isMissing(label) ? ' login-form__input--error' : ''}`;

  const changeMode = (nextMode: 'login' | 'register') => {
    setMissingFields([]);
    const params: Record<string, string> =
      nextMode === 'register' ? { mode: 'register' } : {};
    if (from) params.from = from;
    setSearchParams(params, { replace: true });
    setError('');
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Ingreso a SkyNova Airlines">
        <div className="login-panel__visual">
          <Link to="/" className="login-panel__brand" aria-label="SkyNova Airlines — Inicio">
            <img src="/skynova-logo.png" alt="" aria-hidden="true" />
            <span>SkyNova Airlines</span>
          </Link>
          <div className="login-panel__message">
            <span className="login-panel__eyebrow">Tu próximo viaje comienza aquí</span>
            <h1>Vuelve a descubrir el placer de volar.</h1>
            <p>Conexiones desde Santo Domingo hacia el Caribe y las Américas.</p>
          </div>
          <span className="login-panel__image-credit">SkyNova Airlines · Prototipo académico</span>
        </div>

        <div className="login-panel__form-side">
          <Link to="/" className="login-panel__back">← Volver al inicio</Link>

          {activeCustomer ? (
            <div className="login-form login-form--success" role="status">
              <span className="login-form__eyebrow">Ingreso simulado</span>
              <h2>¡Hola! Tu cuenta está identificada.</h2>
              <p>
                Sesión de demostración iniciada como cliente {activeCustomer.type.toLowerCase()}.
              </p>
              <p className="login-form__account">
                {activeCustomer.email}
                <span>{activeCustomer.miles.toLocaleString('es-DO')} millas</span>
              </p>
              <p className="login-form__note">
                Tu sesión de demostración se mantiene en memoria y se
                reiniciará al recargar la página.
              </p>
              <button className="login-form__submit" type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          ) : mode === 'login' ? (
            <div className="login-form">
              <span className="login-form__eyebrow">Área de clientes</span>
              <h2>Iniciar sesión</h2>
              <p className="login-form__intro">
                Ingresa con el correo asociado a tu cuenta SkyNova.
              </p>

              <form onSubmit={handleLogin}>
                <label className="login-form__label" htmlFor="login-email">
                  Correo electrónico
                </label>
                <input
                  autoComplete="email"
                  className={`login-form__input${error ? ' login-form__input--error' : ''}`}
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError('');
                  }}
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={Boolean(error)}
                  required
                />
                {error && <p className="login-form__error" id="login-error">{error}</p>}

                <button className="login-form__submit" type="submit">
                  Continuar
                </button>
              </form>

              {from === '/buscar' && (
                <p className="login-form__register">
                  Para buscar vuelos necesitas una cuenta. Inicia sesión o{' '}
                  <Link
                    to={
                      from
                        ? `/ingresar?mode=register&from=${from}`
                        : '/ingresar?mode=register'
                    }
                  >
                    crea una cuenta
                  </Link>{' '}
                  para continuar.
                </p>
              )}

              <details className="login-form__demo">
                <summary>Cuentas de demostración</summary>
                <p>minorista@codenova.demo</p>
                <p>corporativo@codenova.demo</p>
                <p>correo-fallido@codenova.demo</p>
              </details>

              <p className="login-form__notice">
                Esta es una demostración. No se usa contraseña y los datos se reinician al recargar.
              </p>
              <p className="login-form__switch">
                ¿Todavía no tienes una cuenta?{' '}
                <Link
                  to={
                    from
                      ? `/ingresar?mode=register&from=${from}`
                      : '/ingresar?mode=register'
                  }
                >
                  Crear una cuenta
                </Link>
              </p>
            </div>
          ) : (
            <div className="login-form">
              <span className="login-form__eyebrow">Únete a SkyNova</span>
              <h2>Crear cuenta</h2>
              <p className="login-form__intro">
                Completa tus datos para registrarte. Las cuentas nuevas comienzan con 0 millas.
              </p>

              <form onSubmit={handleRegister} noValidate>
                <label className="login-form__label" htmlFor="register-name">Nombre completo</label>
                <input
                  autoComplete="name"
                  className={registerInputClass('Nombre completo')}
                  id="register-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={isMissing('Nombre completo')}
                  required
                />

                <label className="login-form__label" htmlFor="register-address">Dirección</label>
                <input
                  autoComplete="street-address"
                  className={registerInputClass('Dirección')}
                  id="register-address"
                  name="address"
                  type="text"
                  placeholder="Calle, número, sector y ciudad"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  aria-invalid={isMissing('Dirección')}
                  required
                />

                <label className="login-form__label" htmlFor="register-phone">Teléfono</label>
                <input
                  autoComplete="tel"
                  className={registerInputClass('Teléfono')}
                  id="register-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="809-555-0123"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-invalid={isMissing('Teléfono')}
                  required
                />

                <label className="login-form__label" htmlFor="register-email">Correo electrónico</label>
                <input
                  autoComplete="email"
                  className={`login-form__input${error && (missingFields.length === 0 || isMissing('Correo electrónico')) ? ' login-form__input--error' : ''}`}
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error && missingFields.length === 0) setError('');
                  }}
                  aria-describedby={error ? 'register-error' : undefined}
                  aria-invalid={Boolean(error) && (missingFields.length === 0 || isMissing('Correo electrónico'))}
                  required
                />

                <label className="login-form__label" htmlFor="register-type">Tipo de cliente</label>
                <select
                  className="login-form__input"
                  id="register-type"
                  name="customerType"
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value as DemoCustomer['type'])}
                >
                  <option value="Minorista">Minorista</option>
                  <option value="Corporativo">Corporativo</option>
                </select>

                {customerType === 'Corporativo' && (
                  <>
                    <label className="login-form__label" htmlFor="register-company">Nombre de la compañía</label>
                    <input
                      autoComplete="organization"
                      className={registerInputClass('Nombre de la compañía')}
                      aria-invalid={isMissing('Nombre de la compañía')}
                      id="register-company"
                      name="company"
                      type="text"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      required
                    />
                  </>
                )}

                {error && <p className="login-form__error" id="register-error" role="alert">{error}</p>}

                <button className="login-form__submit" type="submit">Crear cuenta</button>
              </form>

              <p className="login-form__notice">
                Prototipo académico: los datos se mantienen solo en memoria y se reinician al recargar.
              </p>
              <p className="login-form__switch">
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => changeMode('login')}>Iniciar sesión</button>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
