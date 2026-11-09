import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { type DemoCustomer } from '@/data/customers';
import './Navbar.css';

interface NavbarProps {
  customer?: DemoCustomer | null;
  onLogout?: () => void;
  /** Forces the solid variant on non-landing pages (fixed navbar over light backgrounds). */
  forceSolid?: boolean;
}

export function Navbar({ customer = null, onLogout, forceSolid = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLanding = location.pathname === '/';
  const isSolid = isScrolled || forceSolid;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const handleLogout = () => {
    setIsMobileOpen(false);
    onLogout?.();
    navigate('/', { replace: true });
  };

  return (
    <header
      className={`navbar ${isSolid ? 'navbar--solid' : 'navbar--transparent'}`}
      id="main-nav"
    >
      <div className="navbar__inner">
        <a href="/" className="navbar__brand" aria-label="SkyNova Airlines — Inicio">
          <img className="navbar__logo" src="/skynova-logo.png" alt="" aria-hidden="true" />
          <span className="navbar__brand-copy">
            <span className="navbar__wordmark">SkyNova</span>
            <span className="navbar__descriptor">AIRLINES</span>
          </span>
        </a>

        <nav
          className={`navbar__nav ${isMobileOpen ? 'navbar__nav--open' : ''}`}
          id="primary-navigation"
        >
          {isLanding ? (
            <>
              <a href="/" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
                Inicio
              </a>
              <a href="#destinations" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
                Destinos
              </a>
              <a href="#routes" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
                Vuelos
              </a>
            </>
          ) : customer ? (
            <>
              <Link to="/buscar" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
                Buscar vuelos
              </Link>
              <button type="button" className="navbar__link" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : null}
        </nav>

        <div className="navbar__account-actions">
          {customer ? (
            <>
              <Link to="/panel" className="navbar__cta navbar__cta--login">
                Mi panel
              </Link>
              <button
                type="button"
                className="navbar__cta navbar__cta--register"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/ingresar" className="navbar__cta navbar__cta--login">
                Iniciar sesión
              </Link>
              <Link to="/ingresar?mode=register" className="btn btn-primary navbar__cta navbar__cta--register">
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        {customer ? (
          <Link to="/panel" className="navbar__mobile-login">
            Mi panel
          </Link>
        ) : (
          <Link to="/ingresar" className="navbar__mobile-login">
            Iniciar sesión
          </Link>
        )}

        <button
          className={`navbar__toggle ${isMobileOpen ? 'navbar__toggle--open' : ''}`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMobileOpen}
          aria-controls="primary-navigation"
          id="navbar-toggle"
          type="button"
        >
          <span className="navbar__toggle-bar" />
          <span className="navbar__toggle-bar" />
          <span className="navbar__toggle-bar" />
        </button>
      </div>
    </header>
  );
}
