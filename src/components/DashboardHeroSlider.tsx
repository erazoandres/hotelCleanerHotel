import { useState, useEffect, useCallback, useRef } from "react";

export interface BannerSlideData {
  id: string;
  themeClass: string;
  badge: string;
  sparkle?: string;
  titlePart1: string;
  titleHighlight: string;
  description: string;
  illustration: string;
  caption: React.ReactNode;
  statChipIcon: string;
  statChipText: string;
  shortTitle: string;
}

interface DashboardHeroSliderProps {
  userEmail?: string;
  customSlides?: BannerSlideData[];
  autoplayIntervalMs?: number;
}

export function DashboardHeroSlider({
  userEmail = "Administrador",
  customSlides,
  autoplayIntervalMs = 5000,
}: DashboardHeroSliderProps) {
  const defaultSlides: BannerSlideData[] = [
    {
      id: "operations",
      themeClass: "hero-theme-violet",
      badge: "Centro de Operaciones",
      sparkle: "✦",
      titlePart1: "Todo en orden,",
      titleHighlight: "a primera vista.",
      description: "Monitoreo integral y sincronización en vivo para que cada estancia fluya a la perfección.",
      illustration: "holiday_village",
      caption: (
        <>
          Hospitalidad,<br />con cada detalle.
        </>
      ),
      statChipIcon: "verified",
      statChipText: "Operación en tiempo real",
      shortTitle: "Operaciones",
    },
    {
      id: "housekeeping",
      themeClass: "hero-theme-teal",
      badge: "Gobernanza & Limpieza",
      sparkle: "✦",
      titlePart1: "Habitaciones listas,",
      titleHighlight: "estancias impecables.",
      description: "Supervisión continua del ciclo de limpieza, desinfección y alistamiento sin tiempos muertos.",
      illustration: "cleaning_services",
      caption: (
        <>
          Rotación ágil,<br />máxima pulcritud.
        </>
      ),
      statChipIcon: "bolt",
      statChipText: "Alistamiento prioritario",
      shortTitle: "Housekeeping",
    },
    {
      id: "occupancy",
      themeClass: "hero-theme-sunset",
      badge: "Ocupación & Huéspedes",
      sparkle: "✦",
      titlePart1: "Hospitalidad total,",
      titleHighlight: "decisiones al instante.",
      description: "Optimiza la disponibilidad por pisos, anticipa check-outs y brinda una llegada de lujo.",
      illustration: "hotel",
      caption: (
        <>
          Experiencia 5 estrellas,<br />en cada estancia.
        </>
      ),
      statChipIcon: "hotel_class",
      statChipText: "Máxima disponibilidad",
      shortTitle: "Rendimiento",
    },
  ];

  const slides = customSlides && customSlides.length > 0 ? customSlides : defaultSlides;
  const totalSlides = slides.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setProgressKey((k) => k + 1);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgressKey((k) => k + 1);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setProgressKey((k) => k + 1);
  };

  // Continuous auto-sliding
  useEffect(() => {
    if (totalSlides <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
      setProgressKey((k) => k + 1);
    }, autoplayIntervalMs);

    return () => clearInterval(interval);
  }, [totalSlides, autoplayIntervalMs, progressKey]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartXRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevSlide();
    } else if (e.key === "ArrowRight") {
      nextSlide();
    }
  };

  return (
    <div
      className="dashboard-hero-slider"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Banners destacados del hotel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background ambient light flare */}
      <div className="slider-ambient-flare" aria-hidden="true" />

      {/* Slider Track */}
      <div
        className="dashboard-hero-track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`dashboard-hero-slide ${idx === currentIndex ? "is-active" : ""}`}
            aria-hidden={idx !== currentIndex}
          >
            <section className={`dashboard-hero ${slide.themeClass}`}>
              <div className="dashboard-hero-content">
                <div className="hero-eyebrow-badge">
                  <span className="hero-eyebrow-pulse" aria-hidden="true" />
                  <p className="eyebrow">
                    {slide.badge}
                    {slide.sparkle && (
                      <span className="eyebrow-sparkle" aria-hidden="true">
                        {slide.sparkle}
                      </span>
                    )}
                  </p>
                </div>

                <h1>
                  {slide.titlePart1}
                  <br />
                  <span className="hero-title-highlight">{slide.titleHighlight}</span>
                </h1>

                <p>{slide.description}</p>
              </div>

              <div className="dashboard-hero-aside">
                {/* Rotating decorative orbits */}
                <span className="hero-orbit hero-orbit-one hero-orbit-animated" aria-hidden="true" />
                <span className="hero-orbit hero-orbit-two hero-orbit-animated-reverse" aria-hidden="true" />
                <div className="hero-illustration-glow" aria-hidden="true" />

                <span className="hero-illustration material-symbol" aria-hidden="true">
                  {slide.illustration}
                </span>

                <span className="hero-caption">{slide.caption}</span>

                {/* Stat Chip & Session */}
                <div className="hero-stat-chip">
                  <span className="material-symbol" aria-hidden="true">
                    {slide.statChipIcon}
                  </span>
                  <span>{slide.statChipText}</span>
                </div>

                <span className="hero-session">Conectado como {userEmail}</span>
              </div>
            </section>
          </div>
        ))}
      </div>

      {/* Editorial Timeline Tabs with Live Moving Progress Line */}
      <div className="dashboard-hero-timeline-bar">
        <div
          className="dashboard-hero-timeline"
          role="tablist"
          aria-label="Diapositivas del centro de operaciones"
        >
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir al banner ${idx + 1}: ${slide.badge}`}
                className={`hero-timeline-tab ${isActive ? "active" : ""}`}
                onClick={() => goToSlide(idx)}
              >
                <div className="hero-tab-meta">
                  <span className="hero-tab-index">0{idx + 1}</span>
                  <span className="hero-tab-label">{slide.shortTitle}</span>
                </div>
                <div className="hero-tab-track">
                  <div
                    key={isActive ? `active-${progressKey}` : `idle-${idx}`}
                    className={`hero-tab-fill ${isActive ? "is-animating" : ""}`}
                    style={
                      isActive
                        ? { animationDuration: `${autoplayIntervalMs}ms` }
                        : undefined
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
