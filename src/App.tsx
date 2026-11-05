import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  AdminSignIn,
  HotelAuthProvider,
  useHotelAuth,
} from "./components/HotelAuth";
import { HotelDataProvider } from "./components/HotelData";
import {
  CleanerPortal,
  CleaningPage,
  DashboardPage,
  HistoryPage,
  RoomsPage,
  StaffPage,
} from "./pages/HotelPages";
import { isSupabaseConfigured } from "./lib/supabase";
import HotelAssistant from "./components/HotelAssistant";
import { FreshlyMark } from "./components/FreshlyBrand";
import { ModernAvatar3D } from "./components/ModernAvatar3D";

const sections = [
  { path: "/app/inicio", label: "Inicio", icon: "space_dashboard" },
  { path: "/app/habitaciones", label: "Habitaciones", icon: "bed" },
  { path: "/app/limpiezas", label: "Limpiezas", icon: "cleaning_services" },
  { path: "/app/historial", label: "Historial", icon: "history" },
  { path: "/app/personal", label: "Personal", icon: "groups" },
  { path: "/app/aseo", label: "Portal de aseo", icon: "cleaning_services" },
];

function ConfigurationRequired() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Configuración requerida</p>
        <h1>Conecta Supabase</h1>
        <p className="muted">
          No se encontró configuración de Supabase. Revisa las credenciales
          existentes en supabase-config.js o define VITE_SUPABASE_URL y
          VITE_SUPABASE_ANON_KEY. No se iniciará una sesión local simulada ni se
          guardarán datos sin conexión.
        </p>
      </section>
    </main>
  );
}

function UnauthorizedPage() {
  const { error, signOut } = useHotelAuth();
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Acceso restringido</p>
        <h1>Cuenta no autorizada</h1>
        <p className="muted">
          El inicio de sesión funcionó, pero esta cuenta todavía no tiene
          permisos de administrador. El propietario del proyecto debe
          asignarle el rol hotel_admin desde un entorno confiable.
        </p>
        <p className="muted">
          En el repositorio, sigue la guía “Asignar acceso administrativo” del
          README. Después, cierra sesión y vuelve a entrar para actualizar los
          permisos.
        </p>
        <Link className="text-link" to="/app/aseo">
          Ir al acceso de aseo
        </Link>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

function AdminApplication() {
  const { session, loading, signOut } = useHotelAuth();
  const location = useLocation();
  const activeSection = sections.find((section) => section.path === location.pathname);

  if (location.pathname === "/app/aseo") return <CleanerPortal />;
  if (loading) {
    return <main className="auth-page"><p className="muted">Verificando sesión…</p></main>;
  }
  if (!session) return <AdminSignIn />;
  if (session.user.app_metadata.role !== "hotel_admin") return <UnauthorizedPage />;

  return (
    <HotelDataProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <Link className="brand" to="/app/inicio" aria-label="Freshly, inicio">
            <FreshlyMark />
            <span className="brand-copy">
              <strong>Freshly</strong>
              <span>Gestión hotelera</span>
            </span>
          </Link>
          <p className="navigation-label">Espacios de trabajo</p>
          <nav className="navigation" aria-label="Navegación principal">
            {sections.map((section) => (
              <NavLink
                key={section.path}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
                to={section.path}
              >
                <span className="material-symbol" aria-hidden="true">{section.icon}</span>
                <span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-account">
            <ModernAvatar3D
              name={session.user.email ?? "Admin"}
              className="account-avatar"
              alt={session.user.email ?? "Usuario"}
            />
            <span className="account-copy">
              <small>Sesión activa</small>
              <strong title={session.user.email}>{session.user.email}</strong>
            </span>
            <button
              className="topbar-logout"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={() => void signOut()}
            >
              <span className="material-symbol" aria-hidden="true">logout</span>
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="workspace-header">
            <div className="workspace-context">
              <span className="workspace-live"><span aria-hidden="true" /> Operación en vivo</span>
              <span className="workspace-divider" aria-hidden="true">/</span>
              <span>{activeSection?.label ?? "Inicio"}</span>
            </div>
            <span className="workspace-date">
              <span className="material-symbol" aria-hidden="true">calendar_today</span>
              {new Intl.DateTimeFormat("es", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </span>
          </header>
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/app/inicio" replace />} />
              <Route path="/app/inicio" element={<DashboardPage />} />
              <Route path="/app/habitaciones" element={<RoomsPage />} />
              <Route path="/app/limpiezas" element={<CleaningPage />} />
              <Route path="/app/historial" element={<HistoryPage />} />
              <Route path="/app/personal" element={<StaffPage />} />
              <Route path="*" element={<Navigate to="/app/inicio" replace />} />
            </Routes>
          </main>
        </div>
        <HotelAssistant />
      </div>
    </HotelDataProvider>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  return (
    <HotelAuthProvider>
      <AdminApplication />
    </HotelAuthProvider>
  );
}
