import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "amber";
export type SwitcherStyle = "segmented" | "cards" | "minimal";

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  tagline: string;
  helpTitle: string;
  helpDescription: string;
  badge: string;
  icon: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

export const THEME_CONFIGS: Record<ThemeMode, ThemeConfig> = {
  light: {
    id: "light",
    name: "Luz Editorial",
    tagline: "Lino nórdico & nitidez diurna",
    helpTitle: "Ideal para el Turno Diurno",
    helpDescription:
      "Claridad y contraste impecable bajo luz solar directa o recepción iluminada. Facilita lecturas rápidas sin reflejos.",
    badge: "Turno Diurno",
    icon: "wb_sunny",
    previewColors: {
      bg: "#f8f7f4",
      card: "#ffffff",
      accent: "#2f6b52",
      text: "#1b221e",
    },
  },
  dark: {
    id: "dark",
    name: "Obsidian Noir",
    tagline: "Slate espacial & descanso visual",
    helpTitle: "Ideal para el Turno Nocturno",
    helpDescription:
      "Reduce 85% la emisión de luz azul en auditorías nocturnas y cuartos de control. Previene la fatiga ocular tras horas de trabajo.",
    badge: "Turno Nocturno",
    icon: "dark_mode",
    previewColors: {
      bg: "#0c0e14",
      card: "#161a26",
      accent: "#818cf8",
      text: "#f8fafc",
    },
  },
  amber: {
    id: "amber",
    name: "Champagne Cálido",
    tagline: "Arena tostada & filtro relajante",
    helpTitle: "Ideal para Confort & Gestión",
    helpDescription:
      "Tonalidad cálida inspirada en hoteles boutique de 5 estrellas. Suaviza la pantalla durante largas jornadas administrativas.",
    badge: "Confort Visual",
    icon: "wb_twilight",
    previewColors: {
      bg: "#f4eee3",
      card: "#fdfbf7",
      accent: "#c27803",
      text: "#2c231c",
    },
  },
};

export interface SwitcherStyleConfig {
  id: SwitcherStyle;
  name: string;
  description: string;
  icon: string;
}

export const SWITCHER_STYLES: SwitcherStyleConfig[] = [
  {
    id: "segmented",
    name: "Píldora Segmentada",
    description: "Tres micro-botones integrados en un control directo y compacto.",
    icon: "view_week",
  },
  {
    id: "cards",
    name: "Cápsula con Menú y Tarjetas",
    description: "Botón sutil con menú desplegable y tarjetas informativas de cada modo.",
    icon: "dashboard_customize",
  },
  {
    id: "minimal",
    name: "Micro-Interruptor Discreto",
    description: "Botón ultra minimalista de 1 clic para alternar temas secuencialmente.",
    icon: "toggle_on",
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  switcherStyle: SwitcherStyle;
  setSwitcherStyle: (style: SwitcherStyle) => void;
  cycleTheme: () => void;
  activeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "freshly_theme_mode";
const SWITCHER_STORAGE_KEY = "freshly_switcher_style";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved && (saved === "light" || saved === "dark" || saved === "amber")) {
        return saved;
      }
    } catch {}
    return "light";
  });

  const [switcherStyle, setSwitcherStyleState] = useState<SwitcherStyle>(() => {
    try {
      const saved = localStorage.getItem(SWITCHER_STORAGE_KEY) as SwitcherStyle | null;
      if (saved && (saved === "segmented" || saved === "cards" || saved === "minimal")) {
        return saved;
      }
    } catch {}
    return "segmented";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    // Update meta theme-color for browser tab / mobile UI
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color =
        theme === "dark" ? "#0c0e14" : theme === "amber" ? "#f4eee3" : "#f8f7f4";
      metaThemeColor.setAttribute("content", color);
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setSwitcherStyle = (style: SwitcherStyle) => {
    setSwitcherStyleState(style);
    try {
      localStorage.setItem(SWITCHER_STORAGE_KEY, style);
    } catch {}
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "amber";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        switcherStyle,
        setSwitcherStyle,
        cycleTheme,
        activeConfig: THEME_CONFIGS[theme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
