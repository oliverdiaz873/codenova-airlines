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
 * Landing section built as a close visual replica of Tesla's
 * "Full Self-Driving (Supervised)" card: a light rounded card with the
 * headline, description, statistics and CTAs on the left and a cinematic
 * 16:9 video on the right (60% of the card). Below 1200px the card stacks
 * header / video / statistics, and below 600px the video turns into a
 * full-bleed 3:4 portrait crop.
 *
 * Video asset: `public/videos/nueva-seccion.mp4`.
 */
export function ExperienceSection() {
  const [departuresRef, departuresValue] = useCountUp(WEEKLY_DEPARTURES);

  return (
    <section className="experience-section" aria-labelledby="experience-title">
      <div className="experience-section__card">
        <div className="experience-section__content">
          <header className="experience-section__header">
            <span className="experience-section__eyebrow">
              Sky Nova Airlines
            </span>
            <h2 id="experience-title" className="experience-section__title">
              <span>Descubre una nueva forma de viajar.</span>
            </h2>
            <p className="experience-section__desc">
              Conectamos destinos para que tu próximo viaje comience con una
              experiencia sencilla y cómoda.
            </p>
          </header>

          <div className="experience-section__footer">
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
                  Salidas programadas semanales
                </span>
              </div>
            </div>

            <div className="experience-section__actions">
              <a href="#routes" className="experience-section__cta">
                Explorar vuelos
              </a>
              <Link
                to="/ingresar?mode=register"
                className="experience-section__cta experience-section__cta--secondary"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>

        <div className="experience-section__media" aria-hidden="true">
          <video autoPlay muted loop playsInline preload="metadata">
            <source src="/videos/nueva-seccion.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
