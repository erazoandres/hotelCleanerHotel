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

const sections = [
  { path: "/app/inicio", label: "Inicio", icon: "space_dashboard" },
  { path: "/app/habitaciones", label: "Habitaciones", icon: "bed" },
  { path: "/app/limpiezas", label: "Limpiezas", icon: "cleaning_services" },
  { path: "/app/historial", label: "Historial", icon: "history" },
  { path: "/app/personal", label: "Personal", icon: "groups" },
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
          La cuenta debe tener el rol `hotel_admin` en app_metadata para
          administrar la operación.
        </p>
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

  if (location.pathname === "/app/aseo") return <CleanerPortal />;
  if (loading) {
    return <main className="auth-page"><p className="muted">Verificando sesión…</p></main>;
  }
  if (!session) return <AdminSignIn />;
  if (session.user.app_metadata.role !== "hotel_admin") return <UnauthorizedPage />;

  return (
    <HotelDataProvider>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">HC</span>
            <div>
              <strong>Control de Habitaciones</strong>
              <span>{session.user.email}</span>
            </div>
          </div>
          <button className="topbar-logout" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </header>
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
          <Link className="nav-link" to="/app/aseo">Acceso de aseo</Link>
        </nav>
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
