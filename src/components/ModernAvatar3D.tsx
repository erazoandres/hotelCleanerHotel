import React, { useState, useEffect } from "react";

export type Avatar3DStyle =
  | "adventurer"
  | "bottts-neutral"
  | "lorelei"
  | "fun-emoji"
  | "notionists";

export interface AvatarStyleOption {
  id: Avatar3DStyle;
  label: string;
  icon: string;
  description: string;
}

export const AVATAR_3D_STYLES: AvatarStyleOption[] = [
  {
    id: "adventurer",
    label: "Personajes 3D",
    icon: "face",
    description: "Avatares 3D modernos y expresivos",
  },
  {
    id: "bottts-neutral",
    label: "Robots 3D",
    icon: "smart_toy",
    description: "Avatares 3D de robots futuristas",
  },
  {
    id: "lorelei",
    label: "Editorial 3D",
    icon: "palette",
    description: "Retratos artísticos con sombreado 3D",
  },
  {
    id: "fun-emoji",
    label: "Emojis 3D",
    icon: "sentiment_satisfied",
    description: "Caritas 3D esféricas y brillantes",
  },
  {
    id: "notionists",
    label: "Notion 3D",
    icon: "brush",
    description: "Diseño minimalista moderno",
  },
];

const STORAGE_KEY = "freshly_3d_avatar_style";
const STYLE_EVENT = "freshly-avatar-style-changed";

export function getActiveAvatarStyle(): Avatar3DStyle {
  if (typeof window === "undefined") return "adventurer";
  const saved = localStorage.getItem(STORAGE_KEY) as Avatar3DStyle | null;
  if (saved && AVATAR_3D_STYLES.some((s) => s.id === saved)) {
    return saved;
  }
  return "adventurer";
}

export function setActiveAvatarStyle(style: Avatar3DStyle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, style);
  window.dispatchEvent(new CustomEvent(STYLE_EVENT, { detail: style }));
}

/**
 * Builds a DiceBear 9.x URL for modern 3D avatars.
 */
export function get3DAvatarUrl(
  seed: string,
  styleOverride?: Avatar3DStyle,
): string {
  const style = styleOverride || getActiveAvatarStyle();
  const cleanSeed = encodeURIComponent(seed.trim().toLowerCase() || "staff");
  
  // High quality SVG with pastel background palette for modern depth
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

interface ModernAvatar3DProps {
  name: string;
  size?: number;
  className?: string;
  styleVariant?: Avatar3DStyle;
  alt?: string;
}

export const ModernAvatar3D: React.FC<ModernAvatar3DProps> = ({
  name,
  size,
  className = "",
  styleVariant,
  alt,
}) => {
  const [currentStyle, setCurrentStyle] = useState<Avatar3DStyle>(
    styleVariant || getActiveAvatarStyle(),
  );
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (styleVariant) {
      setCurrentStyle(styleVariant);
      return;
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Avatar3DStyle>;
      if (customEvent.detail) {
        setCurrentStyle(customEvent.detail);
        setHasError(false);
        setIsLoaded(false);
      }
    };

    window.addEventListener(STYLE_EVENT, handler);
    return () => window.removeEventListener(STYLE_EVENT, handler);
  }, [styleVariant]);

  const initial = (name.trim().charAt(0) || "U").toLocaleUpperCase("es");
  const avatarUrl = get3DAvatarUrl(name, currentStyle);

  const dimensionStyles = size
    ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px` }
    : undefined;

  return (
    <span
      className={`modern-3d-avatar-box ${className}`}
      style={dimensionStyles}
      aria-hidden="true"
      title={name}
    >
      {!hasError ? (
        <img
          src={avatarUrl}
          alt={alt || name}
          className={`modern-3d-avatar-img ${isLoaded ? "loaded" : "loading"}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      ) : null}

      {(!isLoaded || hasError) && (
        <span className="modern-3d-avatar-fallback">
          {initial}
        </span>
      )}
    </span>
  );
};

/**
 * Visual control for toggling between 3D avatar styles.
 */
export const Avatar3DStylePicker: React.FC<{
  variant?: "compact" | "aside" | "panel";
  compact?: boolean;
}> = ({ variant, compact = false }) => {
  const [current, setCurrent] = useState<Avatar3DStyle>(getActiveAvatarStyle());

  const handleSelect = (style: Avatar3DStyle) => {
    setCurrent(style);
    setActiveAvatarStyle(style);
  };

  const mode = variant || (compact ? "compact" : "aside");

  if (mode === "aside") {
    const activeStyleObj =
      AVATAR_3D_STYLES.find((s) => s.id === current) || AVATAR_3D_STYLES[0];
    const previewUrl = get3DAvatarUrl("DemoStaff", current);

    return (
      <section
        className="staff-avatar-settings-panel"
        aria-label="Ajuste de avatares 3D"
      >
        <div className="staff-avatar-settings-header">
          <div>
            <p className="eyebrow">Ajuste de vista</p>
            <h3>Avatares 3D</h3>
          </div>
          <span
            className="material-symbol staff-avatar-settings-icon"
            aria-hidden="true"
          >
            view_in_ar
          </span>
        </div>

        <div className="staff-avatar-settings-preview">
          <div className="staff-avatar-preview-img-box">
            <img src={previewUrl} alt="Vista previa 3D" key={current} />
          </div>
          <div className="staff-avatar-preview-text">
            <strong>{activeStyleObj.label}</strong>
            <small>{activeStyleObj.description}</small>
          </div>
        </div>

        <div
          className="staff-avatar-settings-list"
          role="radiogroup"
          aria-label="Seleccionar estilo 3D"
        >
          {AVATAR_3D_STYLES.map((st) => {
            const isSelected = current === st.id;
            return (
              <button
                key={st.id}
                type="button"
                className={`staff-avatar-setting-btn ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(st.id)}
                role="radio"
                aria-checked={isSelected}
              >
                <span className="material-symbol" aria-hidden="true">
                  {st.icon}
                </span>
                <span className="staff-avatar-setting-label">{st.label}</span>
                {isSelected && (
                  <span
                    className="material-symbol staff-avatar-setting-check"
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (mode === "compact") {
    return (
      <div className="avatar-3d-picker-compact">
        <span className="avatar-3d-picker-label">
          <span className="material-symbol" aria-hidden="true">view_in_ar</span>
          <span>Estilo 3D:</span>
        </span>
        <div className="avatar-3d-picker-options">
          {AVATAR_3D_STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              className={`avatar-3d-pill-btn ${current === st.id ? "active" : ""}`}
              onClick={() => handleSelect(st.id)}
              title={st.description}
            >
              <span className="material-symbol" aria-hidden="true">{st.icon}</span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-3d-picker-panel">
      <div className="avatar-3d-picker-header">
        <div className="avatar-3d-picker-title">
          <span className="material-symbol" aria-hidden="true">view_in_ar</span>
          <h4>Colección de Avatares 3D</h4>
        </div>
        <p>Personaliza la apariencia 3D de todo el equipo del hotel.</p>
      </div>

      <div className="avatar-3d-picker-grid">
        {AVATAR_3D_STYLES.map((st) => {
          const isSelected = current === st.id;
          const previewUrl = get3DAvatarUrl("DemoStaff", st.id);
          return (
            <button
              key={st.id}
              type="button"
              className={`avatar-3d-style-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelect(st.id)}
            >
              <div className="avatar-3d-preview-thumb">
                <img src={previewUrl} alt={st.label} />
              </div>
              <div className="avatar-3d-style-info">
                <strong>{st.label}</strong>
                <small>{st.description}</small>
              </div>
              {isSelected && (
                <span className="material-symbol avatar-3d-check" aria-hidden="true">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
