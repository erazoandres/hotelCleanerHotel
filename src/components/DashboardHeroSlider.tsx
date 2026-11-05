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
  captionTitle: string;
  captionSubtitle: string;
  statChipText: string;
  shortTitle: string;
}

interface DashboardHeroSliderProps {
  customSlides?: BannerSlideData[];
  autoplayIntervalMs?: number;
}

export function DashboardHeroSlider({
  customSlides,
  autoplayIntervalMs = 5000,
}: DashboardHeroSliderProps) {
  const defaultSlides: BannerSlideData[] = [
    {
      id: "operations",
      themeClass: "hero-theme-violet",
      badge: "Control de Habitaciones",
      sparkle: "✦",
      titlePart1: "Estado de limpieza,",
      titleHighlight: "en tiempo real.",
      description: "Monitorea al instante qué cuartos están limpios, en proceso de aseo o pendientes de cambio de sábanas.",
      illustration: "checklist",
      captionTitle: "Tablero de Cuartos",
      captionSubtitle: "Seguimiento y control piso por piso",
      statChipText: "Monitoreo en vivo",
      shortTitle: "Habitaciones",
    },
    {
      id: "housekeeping",
      themeClass: "hero-theme-lilac",
      badge: "Aseo & Desinfección",
      sparkle: "✦",
      titlePart1: "Limpieza profunda,",
      titleHighlight: "rutinas al día.",
      description: "Supervisa tiempos de aseo, asignaciones de camareras y cumplimiento riguroso de protocolos de higiene.",
      illustration: "cleaning_services",
      captionTitle: "Equipo de Limpieza",
      captionSubtitle: "Control de tiempos y camareras",
      statChipText: "Camareras en ruta",
      shortTitle: "Limpieza",
    },
    {
      id: "occupancy",
      themeClass: "hero-theme-sunset",
      badge: "Inspección & Calidad",
      sparkle: "✦",
      titlePart1: "Cuartos verificados,",
      titleHighlight: "listos para entrega.",
      description: "Audita los puntos clave de limpieza, aprueba la inspección final y libera las habitaciones sin demoras.",
      illustration: "task_alt",
      captionTitle: "Control de Calidad",
      captionSubtitle: "Aprobación y entrega ágil",
      statChipText: "Inspección aprobada",
      shortTitle: "Inspección",
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

  // Continuous auto-sliding without pause
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
      aria-label="Banners informativos del hotel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
                  <span className="hero-eyebrow-sparkle" aria-hidden="true">✦</span>
                  <span className="eyebrow">{slide.badge}</span>
                </div>

                <h1>
                  {slide.titlePart1}
                  <br />
                  <span className="hero-title-highlight">{slide.titleHighlight}</span>
                </h1>

                <p>{slide.description}</p>
              </div>

              <div className="dashboard-hero-aside">
                <div className="hero-emblem-card">
                  <div className="hero-emblem-icon-wrap">
                    <span className="hero-illustration material-symbol" aria-hidden="true">
                      {slide.illustration}
                    </span>
                  </div>
                  <div className="hero-emblem-text">
                    <strong className="hero-caption-title">{slide.captionTitle}</strong>
                    <span className="hero-caption-subtitle">{slide.captionSubtitle}</span>
                  </div>
                  <div className="hero-emblem-status">
                    <span className="hero-status-dot" aria-hidden="true" />
                    <span>{slide.statChipText}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ))}
      </div>

      {/* Editorial Timeline Tabs with Smooth Progress Fill */}
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
