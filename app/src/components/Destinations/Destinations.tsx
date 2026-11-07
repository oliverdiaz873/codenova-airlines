import './Destinations.css';

export function Destinations() {
  return (
    <section className="destinations" id="destinations">
      <div className="destinations__bg">
        <video autoPlay muted loop playsInline preload="metadata" poster="/hero-night.png" tabIndex={-1}>
          <source src="/videos/destinos-video.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="destinations__overlay" />

      <div className="destinations__content">
        <span className="destinations__label">Descubre</span>
        <h2 className="heading-lg destinations__title">
          Santo Domingo, rumbo a nuevos horizontes
        </h2>
        <p className="destinations__desc">
          Conexiones directas desde SDQ y JBQ hacia cinco destinos. Consulta
          las tarifas y los días de operación.
        </p>

        <div className="destinations__stats">
          <div className="destinations__stat">
            <div className="destinations__stat-value">5</div>
            <div className="destinations__stat-label">Conexiones directas</div>
          </div>
          <div className="destinations__stat">
            <div className="destinations__stat-value">2</div>
            <div className="destinations__stat-label">Orígenes en Santo Domingo</div>
          </div>
          <div className="destinations__stat">
            <div className="destinations__stat-value">3</div>
            <div className="destinations__stat-label">Días de operación</div>
          </div>
        </div>

        <a href="#routes" className="destinations__button" id="destinations-cta">
          Ver vuelos
        </a>
      </div>
    </section>
  );
}
