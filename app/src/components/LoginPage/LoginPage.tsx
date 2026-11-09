import { useState, type FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { type DemoCustomer } from '@/data/customers';
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
  const [error, setError] = useState('');

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

    if (customers.some((customer) => customer.email === normalizedEmail)) {
      setError('Ya existe una cuenta con ese correo. Inicia sesión o usa otra dirección.');
      return;
    }

    const newCustomer: DemoCustomer = {
      email: normalizedEmail,
      type: customerType,
      miles: 0,
      name: name.trim(),
      ...(customerType === 'Corporativo' ? { company: company.trim() } : {}),
    };

    setError('');
    onRegister(newCustomer);
    navigate(postLoginTarget, { replace: true });
  };

  const changeMode = (nextMode: 'login' | 'register') => {
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

              <form onSubmit={handleRegister}>
                <label className="login-form__label" htmlFor="register-name">Nombre completo</label>
                <input
                  autoComplete="name"
                  className="login-form__input"
                  id="register-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />

                <label className="login-form__label" htmlFor="register-email">Correo electrónico</label>
                <input
                  autoComplete="email"
                  className={`login-form__input${error ? ' login-form__input--error' : ''}`}
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError('');
                  }}
                  aria-describedby={error ? 'register-error' : undefined}
                  aria-invalid={Boolean(error)}
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
                      className="login-form__input"
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
