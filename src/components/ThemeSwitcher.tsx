import { useState, useRef, useEffect } from "react";
import {
  useTheme,
  THEME_CONFIGS,
  SWITCHER_STYLES,
} from "../context/ThemeContext";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "header" | "compact" | "floating" | "sidebar";
}

export function ThemeSwitcher({ className = "", variant = "header" }: ThemeSwitcherProps) {
  const {
    theme,
    setTheme,
    switcherStyle,
    setSwitcherStyle,
    cycleTheme,
    activeConfig,
  } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setShowConfigModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const themeList = Object.values(THEME_CONFIGS);

  return (
    <div
      ref={containerRef}
      className={`theme-switcher-wrapper ${className} variant-${variant} style-${switcherStyle}`}
      role="region"
      aria-label="Cambiador de tema visual"
    >
      {/* =========================================================================
          DISEÑO 1: PÍLDORA SEGMENTADA MINIMALISTA (Segmented Pill)
          ========================================================================= */}
      {switcherStyle === "segmented" && (
        <div className="theme-segmented-pill">
          {themeList.map((cfg) => {
            const isActive = theme === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                className={`theme-segment-btn ${isActive ? "is-active" : ""}`}
                onClick={() => setTheme(cfg.id)}
                title={`${cfg.name}: ${cfg.helpDescription}`}
                aria-pressed={isActive}
                aria-label={`Activar tema ${cfg.name} (${cfg.badge})`}
              >
                <span className="material-symbol" aria-hidden="true">
                  {cfg.icon}
                </span>
                <span className="segment-label">{cfg.name.split(" ")[0]}</span>
                {isActive && <span className="segment-indicator" />}
              </button>
            );
          })}

          <button
            type="button"
            className="theme-options-trigger-btn"
            onClick={() => setShowConfigModal(true)}
            title="Ver los 3 modos de estilo y personalizar selector"
            aria-label="Configuración de temas y estilos"
          >
            <span className="material-symbol" aria-hidden="true">
              tune
            </span>
          </button>
        </div>
      )}

      {/* =========================================================================
          DISEÑO 2: CÁPSULA EDITORIAL CON MENÚ Y TARJETAS (Interactive Cards Popover)
          ========================================================================= */}
      {switcherStyle === "cards" && (
        <div className="theme-cards-capsule">
          <button
            type="button"
            className={`theme-capsule-btn ${isMenuOpen ? "is-open" : ""}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            title="Seleccionar tema visual de la interfaz"
          >
            <span className="material-symbol theme-icon-lead" aria-hidden="true">
              {activeConfig.icon}
            </span>
            <span className="theme-capsule-text">
              <span className="theme-capsule-name">{activeConfig.name}</span>
              <span className="theme-capsule-badge">{activeConfig.badge}</span>
            </span>
            <span className="material-symbol chevron-indicator" aria-hidden="true">
              {isMenuOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {isMenuOpen && (
            <div className="theme-popover-menu" role="menu">
              <div className="popover-header">
                <div>
                  <h4 className="popover-title">Modos de Estilo Hotelero</h4>
                  <p className="popover-subtitle">
                    3 diseños optimizados para cada necesidad operativa
                  </p>
                </div>
                <button
                  type="button"
                  className="popover-close-btn"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Cerrar menú"
                >
                  <span className="material-symbol" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              <div className="theme-cards-grid">
                {themeList.map((cfg) => {
                  const isSelected = theme === cfg.id;
                  return (
                    <button
                      key={cfg.id}
                      type="button"
                      className={`theme-choice-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setTheme(cfg.id);
                        setIsMenuOpen(false);
                      }}
                      role="menuitem"
                      aria-checked={isSelected}
                    >
                      <div className="choice-card-top">
                        <div className="choice-icon-wrap">
                          <span className="material-symbol" aria-hidden="true">
                            {cfg.icon}
                          </span>
                        </div>
                        <div className="choice-info">
                          <strong className="choice-name">{cfg.name}</strong>
                          <span className="choice-badge">{cfg.badge}</span>
                        </div>
                        {isSelected && (
                          <span className="material-symbol check-icon" aria-hidden="true">
                            check_circle
                          </span>
                        )}
                      </div>

                      <p className="choice-desc">{cfg.helpDescription}</p>

                      <div className="choice-palette-row">
                        <span
                          className="palette-swatch"
                          style={{ backgroundColor: cfg.previewColors.bg }}
                          title="Fondo de interfaz"
                        />
                        <span
                          className="palette-swatch"
                          style={{ backgroundColor: cfg.previewColors.card }}
                          title="Superficie de tarjetas"
                        />
                        <span
                          className="palette-swatch"
                          style={{ backgroundColor: cfg.previewColors.accent }}
                          title="Color de acento primario"
                        />
                        <span
                          className="palette-swatch"
                          style={{ backgroundColor: cfg.previewColors.text }}
                          title="Tinta de lectura"
                        />
                        <span className="palette-tagline">{cfg.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="popover-footer">
                <button
                  type="button"
                  className="switch-control-style-link"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowConfigModal(true);
                  }}
                >
                  <span className="material-symbol" aria-hidden="true">
                    settings_suggest
                  </span>
                  <span>Cambiar diseño del control de tema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DISEÑO 3: MICRO-INTERRUPTOR DISCRETO (Minimal Quick Dial)
          ========================================================================= */}
      {switcherStyle === "minimal" && (
        <div className="theme-minimal-dial">
          <button
            type="button"
            className="theme-dial-btn"
            onClick={cycleTheme}
            title={`${activeConfig.name} (${activeConfig.badge}) — Clic para alternar tema`}
            aria-label={`Tema actual: ${activeConfig.name}. Clic para cambiar al siguiente.`}
          >
            <span className="material-symbol dial-icon rotating" aria-hidden="true">
              {activeConfig.icon}
            </span>
            <span className="dial-tooltip">{activeConfig.badge}</span>
          </button>

          <button
            type="button"
            className="theme-dial-more-btn"
            onClick={() => setShowConfigModal(true)}
            title="Abrir detalles de los 3 estilos"
            aria-label="Ver detalles de temas"
          >
            <span className="material-symbol" aria-hidden="true">
              more_vert
            </span>
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL COMPLETO DE MODOS DE ESTILO & SELECTOR DE CONTROL
          ========================================================================= */}
      {showConfigModal && (
        <div
          className="theme-modal-backdrop"
          onClick={() => setShowConfigModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-modal-title"
        >
          <div
            className="theme-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="theme-modal-header">
              <div className="modal-title-group">
                <span className="modal-eyebrow">Personalización de Interfaz</span>
                <h3 id="theme-modal-title">3 Modos de Estilo Hotelero</h3>
                <p className="modal-subtitle">
                  Configura el aspecto visual que mejor asiste a tu equipo en cada momento de la jornada.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowConfigModal(false)}
                aria-label="Cerrar ventana"
              >
                <span className="material-symbol" aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <div className="theme-modal-body">
              {/* Sección 1: Los 3 Diseños de Tema */}
              <div className="modal-section">
                <h4 className="modal-section-title">
                  <span className="material-symbol" aria-hidden="true">
                    palette
                  </span>
                  Selecciona tu Estilo Visual
                </h4>

                <div className="theme-modal-cards-grid">
                  {themeList.map((cfg) => {
                    const isSelected = theme === cfg.id;
                    return (
                      <div
                        key={cfg.id}
                        className={`modal-theme-card theme-preview-${cfg.id} ${
                          isSelected ? "is-active" : ""
                        }`}
                        onClick={() => setTheme(cfg.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setTheme(cfg.id);
                          }
                        }}
                      >
                        <div className="modal-card-badge-row">
                          <span className="card-usage-badge">{cfg.badge}</span>
                          {isSelected && (
                            <span className="card-active-pill">
                              <span className="material-symbol" aria-hidden="true">
                                check
                              </span>
                              Activo
                            </span>
                          )}
                        </div>

                        <div className="modal-card-hero">
                          <div
                            className="preview-mini-browser"
                            style={{ backgroundColor: cfg.previewColors.bg }}
                          >
                            <div
                              className="mini-browser-sidebar"
                              style={{
                                backgroundColor:
                                  cfg.id === "dark"
                                    ? "#090a10"
                                    : cfg.id === "amber"
                                    ? "#2b2018"
                                    : "#1c2e26",
                              }}
                            />
                            <div className="mini-browser-main">
                              <div
                                className="mini-card mini-card-1"
                                style={{
                                  backgroundColor: cfg.previewColors.card,
                                  borderColor: cfg.previewColors.accent,
                                }}
                              >
                                <span
                                  className="mini-accent-bar"
                                  style={{ backgroundColor: cfg.previewColors.accent }}
                                />
                              </div>
                              <div
                                className="mini-card mini-card-2"
                                style={{ backgroundColor: cfg.previewColors.card }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="modal-card-details">
                          <div className="details-header">
                            <span className="material-symbol card-lead-icon" aria-hidden="true">
                              {cfg.icon}
                            </span>
                            <div>
                              <strong className="details-name">{cfg.name}</strong>
                              <span className="details-tagline">{cfg.tagline}</span>
                            </div>
                          </div>

                          <div className="help-box">
                            <strong>{cfg.helpTitle}:</strong>
                            <p>{cfg.helpDescription}</p>
                          </div>

                          <div className="palette-preview-bar">
                            <span
                              className="swatch-circle"
                              style={{ backgroundColor: cfg.previewColors.bg }}
                              title="Fondo"
                            />
                            <span
                              className="swatch-circle"
                              style={{ backgroundColor: cfg.previewColors.card }}
                              title="Tarjetas"
                            />
                            <span
                              className="swatch-circle"
                              style={{ backgroundColor: cfg.previewColors.accent }}
                              title="Acento"
                            />
                            <span
                              className="swatch-circle"
                              style={{ backgroundColor: cfg.previewColors.text }}
                              title="Texto"
                            />
                          </div>

                          <button
                            type="button"
                            className={`button modal-card-action-btn ${
                              isSelected ? "button-primary" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTheme(cfg.id);
                            }}
                          >
                            {isSelected ? "Tema en Uso" : "Aplicar este Estilo"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección 2: Los 3 Diseños del Elemento Cambiador */}
              <div className="modal-section modal-switcher-style-section">
                <h4 className="modal-section-title">
                  <span className="material-symbol" aria-hidden="true">
                    touch_app
                  </span>
                  Diseño del Elemento Cambiador en la Barra
                </h4>
                <p className="modal-section-desc">
                  Elige cómo deseas que se muestre el control de tema en tu barra de herramientas superior:
                </p>

                <div className="switcher-styles-selector-grid">
                  {SWITCHER_STYLES.map((st) => {
                    const isCurrent = switcherStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        className={`switcher-style-option-btn ${
                          isCurrent ? "is-current" : ""
                        }`}
                        onClick={() => setSwitcherStyle(st.id)}
                        aria-pressed={isCurrent}
                      >
                        <div className="option-btn-icon">
                          <span className="material-symbol" aria-hidden="true">
                            {st.icon}
                          </span>
                        </div>
                        <div className="option-btn-content">
                          <strong className="option-title">{st.name}</strong>
                          <span className="option-desc">{st.description}</span>
                        </div>
                        {isCurrent && (
                          <span className="material-symbol option-check" aria-hidden="true">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="theme-modal-footer">
              <span className="footer-status-text">
                Tema activo: <strong>{activeConfig.name}</strong> • Control:{" "}
                <strong>
                  {SWITCHER_STYLES.find((s) => s.id === switcherStyle)?.name}
                </strong>
              </span>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setShowConfigModal(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
