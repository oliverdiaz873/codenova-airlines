import './CtaBanner.css';

export function CtaBanner() {
  return (
    <section className="cta-banner" id="cta-banner">
      <div className="container">
        <div className="cta-banner__content">
          <h2 className="heading-lg cta-banner__title">
            ¿Listo para volar?
          </h2>
          <p className="cta-banner__desc">
            Explora las conexiones y tarifas disponibles desde Santo Domingo.
          </p>
          <div className="cta-banner__actions">
            <a href="#routes" className="btn btn-primary" id="cta-banner-flights">
              Ver vuelos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
