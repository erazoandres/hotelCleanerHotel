import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";

interface HotelAuthContextValue {
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const HotelAuthContext = createContext<HotelAuthContextValue | null>(null);

export function HotelAuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setError(null);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }
      })
      .catch((sessionError: unknown) => {
        if (active) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "No se pudo consultar la sesión.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        setSession(data.session);
      } catch (signInError: unknown) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "No se pudo iniciar sesión.",
        );
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      setSession(null);
    } catch (signOutError: unknown) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "No se pudo cerrar sesión.",
      );
    }
  }, [supabase]);

  const value = useMemo(
    () => ({ session, loading, error, signIn, signOut }),
    [session, loading, error, signIn, signOut],
  );

  return (
    <HotelAuthContext.Provider value={value}>
      {children}
    </HotelAuthContext.Provider>
  );
}

export function useHotelAuth() {
  const context = useContext(HotelAuthContext);
  if (!context) {
    throw new Error("useHotelAuth debe usarse dentro de HotelAuthProvider.");
  }
  return context;
}

export function AdminSignIn() {
  const { signIn, error } = useHotelAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    await signIn(email, password);
    setSubmitting(false);
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Acceso administrativo</p>
        <h1>Iniciar sesión</h1>
        <p className="muted">
          Usa una cuenta Supabase autorizada como administrador del hotel.
        </p>
        <label>
          Correo electrónico
          <input
            autoComplete="username"
            autoFocus
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={submitting}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
        <Link className="text-link" to="/app/aseo">
          Acceso para personal de aseo
        </Link>
      </form>
    </main>
  );
}
