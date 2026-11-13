import { Link } from 'react-router';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <a href="/" className="footer__brand-link" aria-label="SkyNova Airlines — Inicio">
              <img
                className="footer__logo"
                src="/skynova-logo.png"
                alt="Logo de SkyNova Airlines"
                loading="lazy"
              />
              <span className="footer__brand-text">SkyNova Airlines</span>
            </a>
            <p className="footer__tagline">
              Conectamos Santo Domingo con el Caribe y las Américas.
            </p>
          </div>

          <nav className="footer__nav" aria-label="Explora">
            <h2 className="footer__heading">Explora</h2>
            <a href="/" className="footer__link">Inicio</a>
            <a href="#destinations" className="footer__link">Destinos</a>
            <a href="#routes" className="footer__link">Vuelos</a>
            <Link to="/agente" className="footer__link footer__link--agent">
              Área del agente
            </Link>
          </nav>
        </div>

        <div className="footer__bottom">
          <p className="footer__demo-notice">
            Esta es una demostración. Los datos se reinician al recargar la página.
          </p>
          <p className="footer__copyright">
            © 2026 SkyNova Airlines · Prototipo académico INF-3290
          </p>
        </div>
      </div>
    </footer>
  );
}
