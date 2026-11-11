import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchRemoteState,
  subscribeRealtime,
} from "../services/hotelRepository";
import type { RemoteHotelState } from "../types/hotel";

const emptyState: RemoteHotelState = {
  warnings: [],
  rooms: {},
  guests: {},
  servicePlans: {},
  cleaningDetails: {},
  scheduledCleaningDates: {},
  assignedCleanings: {},
  roomAssignments: [],
  cleaningWork: [],
  attendance: [],
  novelties: [],
  staff: [],
  events: [],
  floors: {},
  spaceTypes: {},
  roomTypes: {},
  doubleNumbers: {},
};

interface HotelDataContextValue {
  state: RemoteHotelState;
  loading: boolean;
  error: string | null;
  connection: string;
  refresh: () => Promise<boolean>;
}

const HotelDataContext = createContext<HotelDataContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido al cargar datos.";
}

export function HotelDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState("Conectando");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextState = await fetchRemoteState();
      setState(nextState);
      const warning = nextState.warnings.length
        ? `Las habitaciones se cargaron, pero hay datos que no pudieron leerse:\n${nextState.warnings.join("\n")}`
        : null;
      setError(warning);
      setConnection(warning ? "Conectado parcialmente" : "Conectado");
      return true;
    } catch (loadError: unknown) {
      const message = errorMessage(loadError);
      setError(message);
      setConnection("Sin conexión");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof subscribeRealtime> | null = null;
    void refresh();
    try {
      channel = subscribeRealtime(
        () => {
          if (active) void refresh();
        },
        (status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setConnection("Conectado");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnection("Sin conexión");
            setError("Se perdió la conexión en tiempo real con Supabase.");
          }
        },
      );
    } catch (subscribeError: unknown) {
      setError(errorMessage(subscribeError));
      setConnection("Sin conexión");
    }

    return () => {
      active = false;
      if (channel) void channel.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ state, loading, error, connection, refresh }),
    [state, loading, error, connection, refresh],
  );

  return (
    <HotelDataContext.Provider value={value}>
      {children}
    </HotelDataContext.Provider>
  );
}
export function useHotelData() {
  const context = useContext(HotelDataContext);
  if (!context) {
    throw new Error("useHotelData debe usarse dentro de HotelDataProvider.");
  }
  return context;
}

export function HotelDataStatus({ showStatus = true }: { showStatus?: boolean }) {
  const { connection, error, loading, refresh } = useHotelData();
  if (showStatus && loading && connection === "Conectando") {
    return <p className="status-badge">Conectando con Supabase…</p>;
  }
  return (
    <div className="status-stack">
      <div className="status-row">
        {showStatus && (
          <p className={error ? "status-badge status-error" : "status-badge"}>
            {connection}
          </p>
        )}
        <button className="button button-small" onClick={() => void refresh()}>
          Actualizar
        </button>
      </div>
      {error && (
        <details className="data-warning">
          <summary>Ver problemas de lectura</summary>
          <pre>{error}</pre>
        </details>
      )}
    </div>
  );
}
