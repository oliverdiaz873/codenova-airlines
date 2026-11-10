import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import './ExperienceSection.css';

const WEEKLY_DEPARTURES = 60;

/**
 * Animated stat value: counts from 0 to `target` once when the element
 * enters the viewport, with an ease-out curve. Runs a single time per page
 * view and respects prefers-reduced-motion by showing the final value.
 */
function useCountUp(target: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? target
      : 0,
  );
  const doneRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || doneRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || doneRef.current) return;
        doneRef.current = true;
        observer.disconnect();

        const duration = 1600;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * target));
          if (progress < 1) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [target]);

  return [ref, value] as const;
}

/**
 * Landing section inspired by Tesla's Full Self-Driving block: split layout
 * with content on the left and a cinematic video panel on the right,
 * eyebrow/title/description, large statistics and a primary CTA with a
 * secondary text link. Stacks vertically on mobile.
 *
 * Video asset: `public/videos/nueva-seccion.mp4`.
 */
export function ExperienceSection() {
  const [departuresRef, departuresValue] = useCountUp(WEEKLY_DEPARTURES);

  return (
    <section className="experience-section">
      <div className="experience-section__content">
        <span className="experience-section__label">Sky Nova Airlines</span>
        <h2 className="heading-lg experience-section__title">
          Descubre una nueva forma de viajar.
        </h2>
        <p className="experience-section__desc">
          Conectamos destinos para que tu próximo viaje comience con una
          experiencia sencilla y cómoda.
        </p>

        <div className="experience-section__stats">
          <div className="experience-section__stat">
            <span className="experience-section__stat-value">5</span>
            <span className="experience-section__stat-label">
              Conexiones directas
            </span>
          </div>
          <div className="experience-section__stat">
            <span
              className="experience-section__stat-value"
              ref={departuresRef}
            >
              {departuresValue}
            </span>
            <span className="experience-section__stat-label">
              Salidas programadas por semana
            </span>
          </div>
        </div>

        <div className="experience-section__actions">
          <a href="#routes" className="experience-section__cta">
            Explorar vuelos
          </a>
          <Link
            to="/ingresar?mode=register"
            className="experience-section__link"
          >
            Crear cuenta
          </Link>
        </div>
      </div>

      <div className="experience-section__media" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/nueva-seccion.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
