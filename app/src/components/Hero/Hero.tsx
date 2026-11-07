import './Hero.css';

export function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__frame">
        <div className="hero__bg" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero-airplane.png"
            tabIndex={-1}
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero__content">
          <div className="hero__copy">
            <h1 className="hero__title">SkyNova Airlines</h1>
            <p className="hero__subtitle">
              Vuelos directos desde Santo Domingo al Caribe y las Américas.
            </p>
            <div className="hero__actions">
              <a
                href="#routes"
                className="hero__button hero__button--primary"
                id="hero-cta-flights"
              >
                Ver vuelos
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
