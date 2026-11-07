import './Experience.css';

const features = [
  { icon: '✈', title: 'Vuelos directos', desc: '5 destinos sin escalas' },
  { icon: '🎫', title: 'Tarifa final', desc: 'Impuestos incluidos' },
  { icon: '💺', title: 'Confort premium', desc: 'Cabina moderna' },
  { icon: '🌟', title: 'Programa de millas', desc: 'Clientes corporativos' },
];

export function Experience() {
  return (
    <section className="experience" id="experience">
      <div className="experience__bg">
        <img
          src="/cabin-interior.png"
          alt="Interior de cabina premium de CodeNova Airlines"
          loading="lazy"
        />
      </div>
      <div className="experience__overlay" />

      <div className="container">
        <div className="experience__content">
          <span className="experience__label">Experiencia de vuelo</span>
          <h2 className="heading-lg experience__title">
            Diseñada para tu confort
          </h2>
          <p className="experience__desc">
            Cada vuelo de CodeNova Airlines combina una cabina moderna con un
            servicio atento. Disfruta de tarifas transparentes y vuelos directos
            a tus destinos favoritos.
          </p>

          <div className="experience__features">
            {features.map((f) => (
              <div className="experience__feature" key={f.title}>
                <span className="experience__feature-icon">{f.icon}</span>
                <div className="experience__feature-text">
                  <span className="experience__feature-title">{f.title}</span>
                  <span className="experience__feature-desc">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <a href="#routes" className="btn btn-primary" id="experience-cta">
            Ver vuelos
          </a>
        </div>
      </div>
    </section>
  );
}
