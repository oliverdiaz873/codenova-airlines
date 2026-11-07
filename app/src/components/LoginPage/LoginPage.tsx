import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { type DemoCustomer } from '@/data/customers';
import './LoginPage.css';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<DemoCustomer['type']>('Minorista');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');

  const handleLogout = () => {
    setEmail('');
    setError('');
    setMode('login');
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
  };

  const changeMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
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
                El panel de cliente todavía no está disponible. Esta sesión solo se conserva en memoria
                y se reiniciará al recargar.
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

              <details className="login-form__demo">
                <summary>Cuentas de demostración</summary>
                <p>minorista@codenova.demo</p>
                <p>corporativo@codenova.demo</p>
              </details>

              <p className="login-form__notice">
                Esta es una demostración. No se usa contraseña y los datos se reinician al recargar.
              </p>
              <p className="login-form__switch">
                ¿Aún no tienes cuenta?{' '}
                <button type="button" onClick={() => changeMode('register')}>Crear cuenta</button>
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
