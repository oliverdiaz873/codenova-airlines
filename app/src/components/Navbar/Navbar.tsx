import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import './Navbar.css';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  return (
    <header
      className={`navbar ${isScrolled ? 'navbar--solid' : 'navbar--transparent'}`}
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
          <a href="/" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
            Inicio
          </a>
          <a href="#destinations" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
            Destinos
          </a>
          <a href="#routes" className="navbar__link" onClick={() => setIsMobileOpen(false)}>
            Vuelos
          </a>
        </nav>

        <div className="navbar__account-actions">
          <Link to="/ingresar" className="navbar__cta navbar__cta--login">
            Iniciar sesión
          </Link>
          <Link to="/ingresar?mode=register" className="btn btn-primary navbar__cta navbar__cta--register">
            Crear cuenta
          </Link>
        </div>

        <Link to="/ingresar" className="navbar__mobile-login">
          Iniciar sesión
        </Link>

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
