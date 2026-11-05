import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useHotelAuth } from "../components/HotelAuth";
import { FreshlyMark } from "../components/FreshlyBrand";
import { HotelDataStatus, useHotelData } from "../components/HotelData";
import {
  addEvent,
  createStaff,
  finishCleanerRoom,
  getCleanerHistory,
  getCleanerProfile,
  getCleanerRooms,
  loginCleaner,
  logoutCleaner,
  resetCleanerPassword,
  updateStaff,
  updateRoom,
} from "../services/hotelRepository";
import type {
  CleanerHistoryItem,
  CleanerProfile,
  CleanerRoom,
  HotelEvent,
  RemoteHotelState,
  RoomStatus,
  StaffMember,
} from "../types/hotel";

interface StaffReportRow {
  timestamp: string;
  category: "Jornada" | "Habitación terminada" | "Asignación";
  room: string;
  detail: string;
  hours: number | null;
}

const statusLabels: Record<RoomStatus, string> = {
  free: "Libre",
  occupied: "Ocupada",
  pending: "Pendiente",
  cleaning: "En limpieza",
  finished: "Finalizada",
  unknown: "Sin estado",
};

const editableStatuses: RoomStatus[] = [
  "free",
  "occupied",
  "pending",
  "cleaning",
  "finished",
];

const cleaningServicePlans = ["Semanal", "Mensual", "Premium"] as const;
const roomPhotos = [
  "/images/rooms/bedroom-01.jpg",
  "/images/rooms/bedroom-02.jpg",
  "/images/rooms/bedroom-03.jpg",
] as const;

function ActionMessage({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (success) return <p className="form-success" role="status">{success}</p>;
  return null;
}

export function DashboardPage() {
  const { state } = useHotelData();
  const { session } = useHotelAuth();
  const roomStatuses = Object.values(state.rooms);
  const today = localDateValue(new Date());
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = localDateValue(nextWeekDate);
  const scheduledRooms = Object.entries(state.scheduledCleaningDates)
    .filter(([roomId, date]) => Boolean(date && state.rooms[roomId]))
    .map(([roomId, date]) => ({
      roomId,
      date,
      status: state.rooms[roomId],
      cleaner: state.assignedCleanings[roomId]?.staffName || "Sin asignar",
    }))
    .sort((a, b) => {
      const aOverdue = a.date < today && a.status !== "finished";
      const bOverdue = b.date < today && b.status !== "finished";
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return a.date.localeCompare(b.date)
        || a.roomId.localeCompare(b.roomId, undefined, { numeric: true });
    });
  const overdueCount = scheduledRooms.filter(
    (room) => room.date < today && room.status !== "finished",
  ).length;
  const upcomingCount = scheduledRooms.filter(
    (room) => room.date >= today && room.date <= nextWeek && room.status !== "finished",
  ).length;
  const counts = [
    { label: "Habitaciones", value: roomStatuses.length, icon: "bed", tone: "sand" },
    {
      label: "Ocupadas",
      value: roomStatuses.filter((status) => status === "occupied").length,
      icon: "hotel",
      tone: "rose",
    },
    {
      label: "Por atender",
      value: roomStatuses.filter((status) => status === "pending" || status === "cleaning").length,
      icon: "cleaning_services",
      tone: "gold",
    },
    {
      label: "Personal activo",
      value: state.staff.length,
      icon: "groups",
      tone: "sage",
    },
  ];

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Centro de operaciones <span className="eyebrow-sparkle" aria-hidden="true">✦</span></p>
          <h1>Todo en orden,<br />a primera vista.</h1>
          <p>Un resumen claro para que cada estancia fluya como debe.</p>
        </div>
        <div className="dashboard-hero-aside">
          <span className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <span className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <span className="hero-illustration material-symbol" aria-hidden="true">holiday_village</span>
          <span className="hero-caption">Hospitalidad,<br />con cada detalle.</span>
          <span className="hero-session">Conectado como {session?.user.email ?? "Administrador"}</span>
        </div>
      </section>
      <div className="dashboard-status"><HotelDataStatus showStatus={false} /></div>
      <section className="metric-grid" aria-label="Resumen">
        {counts.map((item) => (
          <article className={`metric-card metric-${item.tone}`} key={item.label}>
            <span className="metric-icon material-symbol" aria-hidden="true">{item.icon}</span>
            <span className="metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <span className="metric-note">en este momento</span>
          </article>
        ))}
      </section>
      <section className="page-card dashboard-schedule">
        <div className="section-heading dashboard-schedule-heading">
          <div>
            <p className="eyebrow">Planificación</p>
            <h2>Agenda de limpieza</h2>
            <p>Fechas próximas y tareas que requieren atención.</p>
          </div>
          <Link className="text-link" to="/app/habitaciones">
            Administrar fechas <span className="material-symbol" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
        <div className="dashboard-schedule-summary" aria-label="Resumen de agenda">
          <div className={overdueCount ? "is-overdue" : ""}>
            <strong>{overdueCount}</strong>
            <span>Vencidas</span>
          </div>
          <div>
            <strong>{upcomingCount}</strong>
            <span>Próximos 7 días</span>
          </div>
          <div>
            <strong>{scheduledRooms.length}</strong>
            <span>Con fecha asignada</span>
          </div>
        </div>
        {scheduledRooms.length === 0 ? (
          <p className="empty-state dashboard-schedule-empty">
            Aún no hay fechas programadas. Asigna una fecha desde Habitaciones para organizar la agenda.
          </p>
        ) : (
          <ul className="dashboard-schedule-list">
            {scheduledRooms.slice(0, 6).map((room) => {
              const isOverdue = room.date < today && room.status !== "finished";
              const date = new Date(`${room.date}T00:00:00`);
              return (
                <li key={room.roomId}>
                  <time dateTime={room.date} className={isOverdue ? "is-overdue" : ""}>
                    <span>
                      {room.status === "finished"
                        ? "Atendida"
                        : isOverdue
                          ? "Vencida"
                          : room.date === today
                            ? "Hoy"
                            : "Programada"}
                    </span>
                    <strong>{formatDateOnly(date)}</strong>
                  </time>
                  <div className="dashboard-schedule-room">
                    <strong>{room.roomId}</strong>
                    <span>{room.cleaner}</span>
                  </div>
                  <span className={`status-pill status-${room.status}`}>
                    {statusLabels[room.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function RoomCard({ roomId }: { roomId: string }) {
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const roomStatus = state.rooms[roomId] ?? "unknown";
  const roomGuest = state.guests[roomId] ?? "";
  const roomServicePlan = state.servicePlans[roomId] ?? "";
  const roomCleaningDetails = state.cleaningDetails[roomId] ?? "";
  const roomScheduledCleaningDate = state.scheduledCleaningDates[roomId] ?? "";
  const assignment = state.assignedCleanings[roomId];
  const [status, setStatus] = useState(roomStatus);
  const [guest, setGuest] = useState(roomGuest);
  const [servicePlan, setServicePlan] = useState(roomServicePlan);
  const [cleaningDetails, setCleaningDetails] = useState(roomCleaningDetails);
  const [scheduledCleaningDate, setScheduledCleaningDate] = useState(roomScheduledCleaningDate);
  const [staffId, setStaffId] = useState(assignment?.staffId ?? "");
  const [cleaningType, setCleaningType] = useState(
    assignment?.cleaningType ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(roomStatus);
    setGuest(roomGuest);
    setServicePlan(roomServicePlan);
    setCleaningDetails(roomCleaningDetails);
    setScheduledCleaningDate(roomScheduledCleaningDate);
    setStaffId(assignment?.staffId ?? "");
    setCleaningType(assignment?.cleaningType ?? "");
  }, [roomId, roomStatus, roomGuest, roomServicePlan, roomCleaningDetails, roomScheduledCleaningDate, assignment?.staffId, assignment?.cleaningType]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const previousStatus = roomStatus;
    try {
      await updateRoom(roomId, {
        status,
        guest: guest.trim() || null,
        servicePlan: servicePlan.trim() || null,
        cleaningDetails: cleaningDetails.trim() || null,
        scheduledCleaningDate: scheduledCleaningDate || null,
        assignedCleaner: staffId ? { staffId } : null,
        assignedCleaningType: staffId ? cleaningType.trim() || null : null,
      });

      if (previousStatus !== status) {
        const eventRecord: HotelEvent = {
          room: roomId,
          status,
          action: `Estado cambiado a ${statusLabels[status]}`,
          guest: guest.trim() || null,
          actor: session?.user.email ?? "Administrador",
          cleanerId: staffId || null,
          cleaningType: cleaningType.trim() || null,
          time: new Date().toISOString(),
        };
        try {
          await addEvent(eventRecord);
        } catch (eventError: unknown) {
          await refresh();
          throw new Error(
            `La habitación se guardó, pero el historial no: ${messageOf(eventError)}`,
          );
        }
      }

      await refresh();
      setSuccess("Cambios guardados.");
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="room-card room-editor-card">
      <header className="room-editor-heading">
        <div className="room-editor-title">
          <span className="room-editor-icon">
            <span className="material-symbol" aria-hidden="true">bed</span>
          </span>
          <div>
            <p className="eyebrow">Habitación</p>
            <h2>{roomId}</h2>
          </div>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
        </div>
      </header>
      <form className="form-grid room-editor-form" onSubmit={handleSave}>
        <label>
          Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as RoomStatus)}>
            {status === "unknown" && <option value="unknown" disabled>Sin estado</option>}
            {editableStatuses.map((value) => (
              <option key={value} value={value}>{statusLabels[value]}</option>
            ))}
          </select>
        </label>
        <label>
          Huésped
          <input value={guest} onChange={(event) => setGuest(event.target.value)} />
        </label>
        <label>
          Servicio de limpieza
          <select value={servicePlan} onChange={(event) => setServicePlan(event.target.value)}>
            <option value="">Sin servicio asignado</option>
            {!cleaningServicePlans.some((plan) => plan === servicePlan) && servicePlan && (
              <option value={servicePlan} disabled>{servicePlan} (actual)</option>
            )}
            {cleaningServicePlans.map((plan) => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha de limpieza
          <input
            type="date"
            value={scheduledCleaningDate}
            onChange={(event) => setScheduledCleaningDate(event.target.value)}
          />
        </label>
        <label>
          Personal asignado
          <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
            <option value="">Sin asignar</option>
            {state.staff.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <label className="form-wide">
          Detalles de limpieza
          <textarea
            rows={2}
            value={cleaningDetails}
            onChange={(event) => setCleaningDetails(event.target.value)}
          />
        </label>
        <div className="form-wide form-actions">
          <ActionMessage error={error} success={success} />
          <button className="button button-primary room-editor-save" disabled={saving}>
            <span className="material-symbol" aria-hidden="true">
              {saving ? "hourglass_top" : "save"}
            </span>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </article>
  );
}

function RoomPickerCard({
  roomId,
  status,
  guest,
  servicePlan,
  cleanerName,
  onSelect,
}: {
  roomId: string;
  status: RoomStatus;
  guest: string;
  servicePlan: string;
  cleanerName: string;
  onSelect: () => void;
}) {
  const photoIndex = Array.from(roomId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % roomPhotos.length;

  return (
    <button className={`room-picker-card room-picker-card-${status}`} onClick={onSelect} type="button">
      <span className="room-picker-art">
        <img
          alt={`Habitación ${roomId}`}
          className="room-picker-image"
          src={roomPhotos[photoIndex]}
          loading="lazy"
          decoding="async"
        />
        <span className={`status-pill status-${status}`}>
          <span className="room-status-dot" />
          {statusLabels[status]}
        </span>
      </span>
      <span className="room-picker-main">
        <span className="room-picker-heading">
          <span className="room-picker-room-name">
            <strong>{roomId}</strong>
          </span>
          <span className="material-symbol room-picker-arrow" aria-hidden="true">arrow_forward</span>
        </span>
        <span className="room-picker-details">
          <span className="room-picker-meta">
            <span className="material-symbol" aria-hidden="true">person</span>
            <span className="room-picker-meta-copy">
              <strong>{guest || "Sin huésped"}</strong>
            </span>
          </span>
          <span className="room-picker-secondary">
            <span className="room-picker-service">
              <span className="material-symbol" aria-hidden="true">cleaning_services</span>
              {servicePlan || "Sin servicio"}
            </span>
            {cleanerName && (
              <span className="room-picker-assignee" title={cleanerName}>
                <span className="room-picker-assignee-avatar">{cleanerName.trim().charAt(0).toLocaleUpperCase("es")}</span>
                <span>{cleanerName}</span>
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  );
}

export function RoomsPage() {
  const { state, loading, error, refresh } = useHotelData();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const roomIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );
  const visibleRoomIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return roomIds.filter((roomId) => {
      return !query || [
        roomId,
        state.guests[roomId] ?? "",
        state.servicePlans[roomId] ?? "",
        state.assignedCleanings[roomId]?.staffName ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [roomIds, search, state.assignedCleanings, state.guests, state.servicePlans]);
  const roomSummary = [
    { label: "Libres", icon: "door_open", includes: (status: RoomStatus) => status === "free" },
    { label: "Ocupadas", icon: "bed", includes: (status: RoomStatus) => status === "occupied" },
    {
      label: "Por atender",
      icon: "cleaning_services",
      includes: (status: RoomStatus) => status === "pending" || status === "cleaning",
    },
  ].map((item) => ({
    ...item,
    count: Object.values(state.rooms).filter(item.includes).length,
  }));
  const legacyRoomCount = useMemo(() => {
    try {
      const saved = localStorage.getItem("control-habitaciones-state-v3");
      if (!saved) return 0;
      const previousState: unknown = JSON.parse(saved);
      if (
        !previousState ||
        typeof previousState !== "object" ||
        !("rooms" in previousState) ||
        !previousState.rooms ||
        typeof previousState.rooms !== "object"
      ) {
        return 0;
      }
      return Object.keys(previousState.rooms).length;
    } catch (storageError: unknown) {
      console.warn("No se pudo comprobar el estado local de la versión anterior.", storageError);
      return 0;
    }
  }, []);

  return (
    <div className="page-stack rooms-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventario</p>
          <h1>Habitaciones</h1>
          <p className="page-description">Cada espacio, su estado y los detalles para atenderlo.</p>
        </div>
        <div className="room-heading-actions">
          <button className="button button-refresh" onClick={() => void refresh()}>
            <span className="material-symbol" aria-hidden="true">refresh</span> Actualizar
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && roomIds.length === 0 ? (
        <p className="empty-state">Cargando habitaciones…</p>
      ) : roomIds.length === 0 ? (
        <>
          <p className="empty-state">Supabase respondió sin errores, pero no devolvió habitaciones. Revisa si la tabla habitaciones tiene registros o si están protegidos por sus políticas RLS.</p>
          {legacyRoomCount > 0 && (
            <p className="legacy-warning" role="status">
              También hay {legacyRoomCount} habitaciones guardadas en el navegador
              por la versión anterior. Esos datos locales no se han importado ni
              mezclado con Supabase.
            </p>
          )}
        </>
      ) : selectedRoom && roomIds.includes(selectedRoom) ? (
        <section className="room-editor-view">
          <button
            className="button room-back-button"
            onClick={() => setSelectedRoom(null)}
            type="button"
          >
            <span className="material-symbol" aria-hidden="true">arrow_back</span>
            Todas las habitaciones
          </button>
          <RoomCard key={selectedRoom} roomId={selectedRoom} />
        </section>
      ) : (
        <section className="room-selection">
          <div className="room-selection-toolbar">
            <div className="room-selection-controls">
              <label className="search-field">
                <span className="search-input-wrap">
                  <span className="material-symbol" aria-hidden="true">search</span>
                  <input
                    aria-label="Buscar habitación"
                    autoComplete="off"
                    placeholder="Habitación, huésped o personal"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="search-clear-button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setSearch("")}
                    >
                      <span className="material-symbol" aria-hidden="true">close</span>
                    </button>
                  )}
                </span>
              </label>
            </div>
            <p className="room-results-count">
              {visibleRoomIds.length} {visibleRoomIds.length === 1 ? "habitación" : "habitaciones"}
            </p>
          </div>
          {visibleRoomIds.length === 0 ? (
            <p className="empty-state">No hay habitaciones que coincidan con la búsqueda.</p>
          ) : (
            <div className="room-picker-grid">
              {visibleRoomIds.map((roomId) => (
                <RoomPickerCard
                  key={roomId}
                  roomId={roomId}
                  status={state.rooms[roomId] ?? "unknown"}
                  guest={state.guests[roomId] ?? ""}
                  servicePlan={state.servicePlans[roomId] ?? ""}
                  cleanerName={state.assignedCleanings[roomId]?.staffName ?? ""}
                  onSelect={() => setSelectedRoom(roomId)}
                />
              ))}
            </div>
          )}
          <section className="room-summary room-selection-summary" aria-label="Estado de habitaciones">
            {roomSummary.map((item) => (
              <div className="room-summary-item" key={item.label}>
                <span className="material-symbol" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            <span className="room-summary-total">{roomIds.length} espacios</span>
          </section>
        </section>
      )}
    </div>
  );
}

export function CleaningPage() {
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const [error, setError] = useState<string | null>(null);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const rooms = Object.keys(state.rooms)
    .filter((room) => ["pending", "cleaning"].includes(state.rooms[room]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const query = search.trim().toLocaleLowerCase("es");
  const visibleRooms = rooms.filter((roomId) => !query || [
    roomId,
    state.guests[roomId] ?? "",
    state.servicePlans[roomId] ?? "",
    state.assignedCleanings[roomId]?.staffName ?? "",
  ].some((value) => value.toLocaleLowerCase("es").includes(query)));
  const pendingCount = rooms.filter((room) => state.rooms[room] === "pending").length;
  const activeCount = rooms.length - pendingCount;
  const unassignedCount = rooms.filter(
    (roomId) => !state.assignedCleanings[roomId]?.staffId,
  ).length;

  async function startCleaning(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    let statusUpdated = false;
    try {
      await updateRoom(roomId, { status: "cleaning" });
      statusUpdated = true;
      await addEvent({
        room: roomId,
        status: "cleaning",
        action: "Limpieza iniciada",
        guest: state.guests[roomId] ?? null,
        actor: session?.user.email ?? "Administrador",
        cleanerId: state.assignedCleanings[roomId]?.staffId ?? null,
        cleaningType: state.assignedCleanings[roomId]?.cleaningType ?? null,
        time: new Date().toISOString(),
      });
      await refresh();
    } catch (startError: unknown) {
      if (statusUpdated) await refresh();
      setError(messageOf(startError));
    } finally {
      setBusyRoom(null);
    }
  }

  return (
    <div className="page-stack cleaning-page">
      <header className="cleaning-header">
        <div className="cleaning-title">
          <p className="eyebrow">Operación diaria</p>
          <h1>Limpiezas</h1>
          <p className="page-description">Una vista clara de lo que está listo y lo que necesita atención.</p>
        </div>
        <div className="cleaning-connection"><HotelDataStatus showStatus={false} /></div>
      </header>
      <section className="cleaning-overview" aria-label="Resumen de limpiezas">
        <article className="cleaning-kpi cleaning-kpi-pending">
          <span className="cleaning-kpi-icon material-symbol" aria-hidden="true">pending_actions</span>
          <strong>{pendingCount}</strong>
          <span>Pendientes</span>
        </article>
        <article className="cleaning-kpi cleaning-kpi-active">
          <span className="cleaning-kpi-icon material-symbol" aria-hidden="true">autorenew</span>
          <strong>{activeCount}</strong>
          <span>En curso</span>
        </article>
        <article className="cleaning-kpi cleaning-kpi-unassigned">
          <span className="cleaning-kpi-icon material-symbol" aria-hidden="true">person_off</span>
          <strong>{unassignedCount}</strong>
          <span>Sin asignar</span>
        </article>
      </section>
      <ActionMessage error={error} success={null} />
      {rooms.length === 0 ? (
        <p className="empty-state">No hay limpiezas pendientes o en curso.</p>
      ) : (
        <>
          <div className="room-selection-toolbar">
            <div className="room-selection-controls">
              <label className="search-field">
                <span className="search-input-wrap">
                  <span className="material-symbol" aria-hidden="true">search</span>
                  <input
                    aria-label="Buscar habitación"
                    autoComplete="off"
                    placeholder="Habitación, huésped o personal"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="search-clear-button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setSearch("")}
                    >
                      <span className="material-symbol" aria-hidden="true">close</span>
                    </button>
                  )}
                </span>
              </label>
            </div>
            <p className="room-results-count">
              {visibleRooms.length} {visibleRooms.length === 1 ? "habitación" : "habitaciones"}
            </p>
          </div>
          {visibleRooms.length === 0 ? (
            <p className="empty-state">No hay habitaciones que coincidan con la búsqueda.</p>
          ) : (
            <section className="room-grid cleaning-room-grid" aria-label="Habitaciones por atender">
              {visibleRooms.map((roomId) => {
                const assignment = state.assignedCleanings[roomId];
                const status = state.rooms[roomId];
                const servicePlan = state.servicePlans[roomId] ?? "";
                const scheduledDate = state.scheduledCleaningDates[roomId];
                const latestCleaning = getLatestCleaningDate(roomId, state.cleaningWork, state.events);
                const scheduleStart = latestCleaning ?? getCurrentAssignmentDate(roomId, state.roomAssignments);
                const nextCleaningDate = getNextCleaningDate(servicePlan, scheduleStart);
                return (
                  <article className="room-card cleaning-room-card" key={roomId}>
                    <div className="room-card-heading">
                      <div><p className="eyebrow">Habitación</p><h2>{roomId}</h2></div>
                      <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
                    </div>
                    <dl className="details-list cleaning-details">
                      <div><dt>Aseador/a</dt><dd>{assignment?.staffName || "Sin asignar"}</dd></div>
                      <div><dt>Plan</dt><dd>{servicePlan || "No especificado"}</dd></div>
                      <div>
                        <dt>Fecha limpieza</dt>
                        <dd>
                          {scheduledDate
                            ? formatDateOnly(new Date(`${scheduledDate}T00:00:00`))
                            : servicePlan.trim().toLocaleLowerCase("es") === "premium"
                            ? "A solicitud"
                            : nextCleaningDate
                              ? formatDateOnly(nextCleaningDate)
                              : !servicePlan
                                ? "Sin plan"
                                : latestCleaning
                                  ? "Sin frecuencia definida"
                                  : "Sin historial de limpieza"}
                        </dd>
                      </div>
                      <div><dt>Huésped</dt><dd>{state.guests[roomId] || "No registrado"}</dd></div>
                    </dl>
                    {status === "pending" && (
                      <button
                        className="button button-primary"
                        disabled={busyRoom === roomId}
                        onClick={() => void startCleaning(roomId)}
                      >
                        <span className="material-symbol" aria-hidden="true">play_arrow</span>
                        {busyRoom === roomId ? "Actualizando…" : "Iniciar limpieza"}
                      </button>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function HistoryPage() {
  const { state, loading, error, refresh } = useHotelData();
  const [filter, setFilter] = useState("");
  const events = state.events.filter((event) => {
    const query = filter.trim().toLocaleLowerCase();
    return !query || [
      event.room,
      event.action,
      event.actor ?? "",
      event.guest ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(query));
  });

  return (
    <div className="page-stack history-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Registro de actividad</p>
          <h1>Historial</h1>
          <p className="page-description">Sigue los movimientos del hotel y encuentra cualquier registro.</p>
        </div>
        <button className="button button-refresh" onClick={() => void refresh()}>
          <span className="material-symbol" aria-hidden="true">refresh</span> Actualizar
        </button>
      </div>
      <div className="room-selection-toolbar">
        <div className="room-selection-controls">
          <label className="search-field">
            <span className="search-input-wrap">
              <span className="material-symbol" aria-hidden="true">search</span>
              <input
                aria-label="Buscar en historial"
                autoComplete="off"
                placeholder="Introduce nombre de personal, habitación o fecha (dd/mm/aa)"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
              {filter && (
                <button
                  type="button"
                  className="search-clear-button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setFilter("")}
                >
                  <span className="material-symbol" aria-hidden="true">close</span>
                </button>
              )}
            </span>
          </label>
        </div>
        <p className="room-results-count">
          {events.length} {events.length === 1 ? "registro" : "registros"}
        </p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && state.events.length === 0 ? (
        <p className="empty-state">Cargando historial…</p>
      ) : events.length === 0 ? (
        <p className="empty-state">No hay movimientos que coincidan.</p>
      ) : (
        <section className="page-card table-scroll">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Habitación</th><th>Estado</th><th>Acción</th><th>Responsable</th></tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.room}-${event.time}-${index}`}>
                  <td>{formatDate(event.time)}</td>
                  <td>{event.room}</td>
                  <td>{statusLabels[event.status]}</td>
                  <td>{event.action}</td>
                  <td>{event.actor || "No registrado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export function StaffPage() {
  const { state, refresh } = useHotelData();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [credentialUsername, setCredentialUsername] = useState("");
  const [credentialName, setCredentialName] = useState("");
  const [reportStart, setReportStart] = useState(() => {
    const now = new Date();
    return localDateValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [reportEnd, setReportEnd] = useState(() => localDateValue(new Date()));
  const [reportNow, setReportNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedStaffId && !state.staff.some((person) => person.id === selectedStaffId)) {
      setSelectedStaffId(null);
    }
  }, [selectedStaffId, state.staff]);

  useEffect(() => {
    const interval = window.setInterval(() => setReportNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const reportPeriod = useMemo(() => {
    const start = new Date(`${reportStart}T00:00:00`);
    const end = new Date(`${reportEnd}T00:00:00`);
    end.setDate(end.getDate() + 1);
    if (
      Number.isNaN(start.getTime())
      || Number.isNaN(end.getTime())
      || start >= end
    ) {
      return null;
    }
    return { start: start.getTime(), end: end.getTime() };
  }, [reportEnd, reportStart]);
  const selectedStaff = state.staff.find((person) => person.id === selectedStaffId) ?? null;
  const selectedAttendance = selectedStaff
    ? state.attendance.find((record) => record.staffId === selectedStaff.id && !record.checkOut)
    : null;
  const reportRows = useMemo(() => {
    if (!selectedStaffId || !reportPeriod) return [];
    const rows: StaffReportRow[] = [];

    for (const attendance of state.attendance) {
      if (attendance.staffId !== selectedStaffId) continue;
      const start = Math.max(new Date(attendance.checkIn).getTime(), reportPeriod.start);
      const end = Math.min(
        attendance.checkOut ? new Date(attendance.checkOut).getTime() : reportNow,
        reportPeriod.end,
      );
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      rows.push({
        timestamp: new Date(start).toISOString(),
        category: "Jornada",
        room: "—",
        detail: `Entrada ${formatDate(attendance.checkIn)} · salida ${attendance.checkOut ? formatDate(attendance.checkOut) : "en curso"}`,
        hours: (end - start) / 3_600_000,
      });
    }

    for (const work of state.cleaningWork) {
      if (work.staffId !== selectedStaffId) continue;
      const timestamp = new Date(work.time);
      if (
        Number.isNaN(timestamp.getTime())
        || timestamp.getTime() < reportPeriod.start
        || timestamp.getTime() >= reportPeriod.end
      ) continue;
      rows.push({
        timestamp: work.time,
        category: "Habitación terminada",
        room: work.room,
        detail: work.cleaningType || "Limpieza",
        hours: null,
      });
    }

    for (const assignment of state.roomAssignments) {
      if (assignment.staffId !== selectedStaffId) continue;
      const assignedAt = new Date(assignment.assignedAt).getTime();
      const releasedAt = assignment.unassignedAt
        ? new Date(assignment.unassignedAt).getTime()
        : reportNow;
      const start = Math.max(assignedAt, reportPeriod.start);
      const end = Math.min(releasedAt, reportPeriod.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      rows.push({
        timestamp: new Date(start).toISOString(),
        category: "Asignación",
        room: assignment.roomId,
        detail: `${assignment.cleaningType || "Sin tipo de limpieza"} · desde ${formatDate(assignment.assignedAt)} · hasta ${assignment.unassignedAt ? formatDate(assignment.unassignedAt) : "activa"}`,
        hours: null,
      });
    }

    return rows.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }, [
    selectedStaffId,
    reportPeriod,
    reportNow,
    state.attendance,
    state.cleaningWork,
    state.roomAssignments,
  ]);
  const reportHours = reportRows.reduce((total, row) => total + (row.hours ?? 0), 0);
  const visibleStaff = state.staff.filter((person) => {
    const query = staffFilter.trim().toLocaleLowerCase("es");
    return !query || [person.name, person.contact, person.email ?? ""]
      .some((value) => value.toLocaleLowerCase("es").includes(query));
  });
  const staffOnShift = state.staff.filter((person) =>
    state.attendance.some((record) => record.staffId === person.id && !record.checkOut),
  ).length;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const password = await createStaff({
        id: crypto.randomUUID(),
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim().toLowerCase(),
        hasAccount: false,
      });
      setNewPassword(password);
      setCredentialUsername(email.trim().toLowerCase());
      setCredentialName(`${name.trim()} (${email.trim().toLowerCase()})`);
      setName("");
      setContact("");
      setEmail("");
      setShowCreateForm(false);
      setSuccess("Registro creado. Copia la clave temporal; solo se mostrará una vez.");
      await refresh();
    } catch (createError: unknown) {
      setError(messageOf(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(personId: string, personName: string) {
    if (!window.confirm(`¿Generar una nueva contraseña temporal para ${personName}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const password = await resetCleanerPassword(personId);
      const person = state.staff.find((member) => member.id === personId);
      setCredentialUsername(person?.email ?? "");
      setCredentialName(personName);
      setNewPassword(password);
      setSuccess("Nueva contraseña temporal generada. La anterior ya no es válida.");
    } catch (resetError: unknown) {
      setError(messageOf(resetError));
    }
  }

  function startEditingStaff(person: StaffMember) {
    setEditingStaffId(person.id);
    setEditName(person.name);
    setEditContact(person.contact);
    setEditEmail(person.email ?? "");
  }

  async function handleUpdateStaff(event: FormEvent<HTMLFormElement>, person: StaffMember) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await updateStaff({
        id: person.id,
        name: editName,
        contact: editContact,
        email: editEmail,
        hasAccount: person.hasAccount,
      });
      setEditingStaffId(null);
      setSuccess("Información del personal actualizada.");
      await refresh();
    } catch (updateError: unknown) {
      setError(messageOf(updateError));
    } finally {
      setSaving(false);
    }
  }

  function handleExportStaffReport(person: StaffMember) {
    if (!reportPeriod) {
      setError("El periodo seleccionado no es válido.");
      return;
    }
    const headers = ["Personal", "Desde", "Hasta", "Actividad", "Fecha", "Habitación", "Detalle", "Horas trabajadas"];
    const csvRows = reportRows.map((row) => [
      person.name,
      reportStart,
      reportEnd,
      row.category,
      row.timestamp,
      row.room,
      row.detail,
      row.hours === null ? "" : row.hours.toFixed(2),
    ]);
    const csv = [
      headers,
      ...csvRows,
      ["", "", "", "Total del periodo", "", "", "", reportHours.toFixed(2)],
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `reporte-${person.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${reportStart}-${reportEnd}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <div className="page-stack staff-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{selectedStaff ? "Ficha del equipo" : "Equipo"}</p>
          <h1>Personal</h1>
          <p className="page-description">
            {selectedStaff
              ? `Perfil, jornada y actividad de ${selectedStaff.name}.`
              : "Administra turnos, accesos y novedades desde un solo lugar."}
          </p>
        </div>
        <HotelDataStatus showStatus={false} />
      </div>
      <ActionMessage error={error} success={success} />
      {newPassword && (
        <section className="credential-notice" aria-live="polite">
          <div className="credential-notice-heading">
            <strong>Acceso para {credentialName || "el personal"}</strong>
            <span>Comparte estos datos de forma segura.</span>
          </div>
          <div className="credential-value">
            <span>Usuario</span>
            <code>{credentialUsername || "No disponible"}</code>
          </div>
          <div className="credential-value">
            <span>Contraseña temporal</span>
            <code>{newPassword}</code>
          </div>
          <button
            className="button button-small"
            onClick={() => {
              setNewPassword(null);
              setCredentialUsername("");
            }}
          >
            Ocultar credenciales
          </button>
        </section>
      )}
      <section className={`staff-layout${selectedStaff ? " staff-layout-detail" : ""}`}>
        {selectedStaff ? (
          <section className="page-card staff-directory staff-detail-page">
            <button
              className="button staff-back-button"
              onClick={() => {
                setSelectedStaffId(null);
                setEditingStaffId(null);
                setError(null);
                setSuccess(null);
              }}
              type="button"
            >
              <span className="material-symbol" aria-hidden="true">arrow_back</span>
              Volver al personal
            </button>
            <div className="staff-profile-panel">
              <header className="staff-profile-heading">
                <div className="staff-profile-person">
                  <span className="staff-profile-avatar" aria-hidden="true">
                    {selectedStaff.name.trim().charAt(0).toLocaleUpperCase("es")}
                  </span>
                  <span className="staff-profile-title">
                    <p className="eyebrow">Ficha de personal</p>
                    <h3>{selectedStaff.name}</h3>
                  </span>
                </div>
                <span className={`staff-attendance-status${selectedAttendance ? " on-shift" : ""}`}>
                  {selectedAttendance ? "En turno" : "Fuera de turno"}
                </span>
              </header>
              <div className="staff-identity" aria-label="Datos de contacto">
                <div className="staff-identity-item">
                  <span className="staff-identity-icon material-symbol" aria-hidden="true">call</span>
                  <span className="staff-identity-copy">
                    <span className="staff-identity-label">Teléfono</span>
                    <strong>{selectedStaff.contact}</strong>
                  </span>
                </div>
                <div className="staff-identity-item">
                  <span className="staff-identity-icon material-symbol" aria-hidden="true">mail</span>
                  <span className="staff-identity-copy">
                    <span className="staff-identity-label">Correo</span>
                    <strong>{selectedStaff.email || "Sin correo asignado"}</strong>
                  </span>
                </div>
                {selectedAttendance && (
                  <div className="staff-identity-item">
                    <span className="staff-identity-icon material-symbol" aria-hidden="true">schedule</span>
                    <span className="staff-identity-copy">
                      <span className="staff-identity-label">Turno desde</span>
                      <strong>{formatDate(selectedAttendance.checkIn)}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="staff-profile-actions">
                <button
                  className="button button-small"
                  onClick={() => editingStaffId === selectedStaff.id
                    ? setEditingStaffId(null)
                    : startEditingStaff(selectedStaff)}
                  type="button"
                >
                  {editingStaffId === selectedStaff.id ? "Cancelar edición" : "Editar información"}
                </button>
                {selectedStaff.hasAccount && (
                  <button
                    className="button button-small"
                    onClick={() => void handleResetPassword(selectedStaff.id, selectedStaff.name)}
                    type="button"
                  >
                    Restablecer contraseña
                  </button>
                )}
              </div>
              {editingStaffId === selectedStaff.id && (
                <form className="staff-edit-form" onSubmit={(event) => void handleUpdateStaff(event, selectedStaff)}>
                  <label>
                    Nombre
                    <input required maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </label>
                  <label>
                    Teléfono
                    <input required maxLength={30} type="tel" value={editContact} onChange={(event) => setEditContact(event.target.value)} />
                  </label>
                  <label>
                    Correo / usuario
                    <input required={selectedStaff.hasAccount} autoComplete="email" maxLength={254} type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
                  </label>
                  <button className="button button-small button-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </form>
              )}
              <section className="staff-report" aria-label={`Historial de trabajo de ${selectedStaff.name}`}>
                <div className="staff-report-heading">
                  <div>
                    <h3>Actividad y horas</h3>
                    <strong>{reportHours.toFixed(2)} h</strong>
                  </div>
                  <button
                    className="button button-small"
                    disabled={!reportPeriod}
                    onClick={() => handleExportStaffReport(selectedStaff)}
                    type="button"
                  >
                    Exportar CSV
                  </button>
                </div>
                <p className="staff-report-note">Las horas se calculan con las asistencias; asignaciones y habitaciones terminadas se muestran aparte.</p>
                <div className="staff-report-filters">
                  <label>
                    Desde
                    <input type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} />
                  </label>
                  <label>
                    Hasta
                    <input type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} />
                  </label>
                </div>
                {!reportPeriod ? (
                  <p className="form-error" role="alert">Selecciona un periodo válido: la fecha inicial debe ser anterior a la final.</p>
                ) : reportRows.length === 0 ? (
                  <p className="staff-report-empty">No hay actividad registrada en este periodo.</p>
                ) : (
                  <div className="staff-report-table">
                    <table>
                      <thead>
                        <tr><th>Fecha</th><th>Actividad</th><th>Habitación</th><th>Detalle</th><th>Horas</th></tr>
                      </thead>
                      <tbody>
                        {reportRows.map((row, index) => (
                          <tr key={`${row.category}-${row.timestamp}-${row.room}-${index}`}>
                            <td>{formatDate(row.timestamp)}</td>
                            <td>{row.category}</td>
                            <td>{row.room}</td>
                            <td>{row.detail}</td>
                            <td>{row.hours === null ? "—" : row.hours.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </section>
        ) : (
          <div className="staff-hub">
            <div className="staff-hub-main">
            {showCreateForm && (
              <form className="page-card staff-create-form" onSubmit={handleCreate}>
                <div className="staff-create-heading">
                  <div>
                    <p className="eyebrow">Nuevo registro</p>
                    <h2>Agregar personal</h2>
                  </div>
                  <button
                    className="button staff-close-create"
                    onClick={() => setShowCreateForm(false)}
                    type="button"
                    aria-label="Cerrar formulario"
                  >
                    <span className="material-symbol" aria-hidden="true">close</span>
                  </button>
                </div>
                <div className="staff-create-fields">
                  <label>Nombre completo<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label>Teléfono<input required maxLength={30} type="tel" value={contact} onChange={(event) => setContact(event.target.value)} /></label>
                  <label>Correo de acceso<input required autoComplete="email" maxLength={254} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                  <button className="button button-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Crear ficha y cuenta"}
                  </button>
                </div>
              </form>
            )}

            <section className="page-card staff-directory staff-directory-main">
              <div className="staff-directory-toolbar">
                <div>
                  <p className="eyebrow">Directorio</p>
                  <h2>Tu equipo</h2>
                  <p className="staff-directory-subtitle">
                    {state.staff.length === 1 ? "1 persona registrada" : `${state.staff.length} personas registradas`}
                  </p>
                </div>
                <div className="staff-directory-tools">
                  <label className="staff-search">
                    <span className="material-symbol" aria-hidden="true">search</span>
                    <span className="sr-only">Buscar personal</span>
                    <input
                      type="search"
                      value={staffFilter}
                      onChange={(event) => setStaffFilter(event.target.value)}
                      placeholder="Buscar por nombre, teléfono o correo"
                    />
                  </label>
                  <button
                    className="button button-primary staff-add-button"
                    onClick={() => setShowCreateForm((open) => !open)}
                    type="button"
                    aria-expanded={showCreateForm}
                  >
                    <span className="material-symbol" aria-hidden="true">{showCreateForm ? "close" : "add"}</span>
                    {showCreateForm ? "Cerrar" : "Agregar personal"}
                  </button>
                </div>
              </div>
              {state.staff.length === 0 ? (
                <div className="staff-directory-empty">
                  <span className="material-symbol" aria-hidden="true">person_add</span>
                  <strong>Aún no hay personal registrado</strong>
                  <span>Agrega a tu equipo para empezar a gestionar sus turnos y actividad.</span>
                  <button className="button button-primary" onClick={() => setShowCreateForm(true)} type="button">
                    Agregar primera persona
                  </button>
                </div>
              ) : visibleStaff.length === 0 ? (
                <p className="staff-search-empty">No encontramos personas con “{staffFilter}”. Prueba con otro dato.</p>
              ) : (
                <nav className="staff-directory-list" aria-label="Seleccionar personal">
                  {visibleStaff.map((person) => {
                    const onShift = state.attendance.some(
                      (record) => record.staffId === person.id && !record.checkOut,
                    );
                    return (
                      <button
                        className="staff-directory-card"
                        key={person.id}
                        onClick={() => {
                          setSelectedStaffId(person.id);
                          setEditingStaffId(null);
                          setError(null);
                          setSuccess(null);
                        }}
                        type="button"
                      >
                        <span className="staff-card-avatar" aria-hidden="true">
                          {person.name.trim().charAt(0).toLocaleUpperCase("es")}
                        </span>
                        <span className="staff-card-details">
                          <strong>{person.name}</strong>
                          <span><span className="material-symbol" aria-hidden="true">call</span>{person.contact}</span>
                          <span><span className="material-symbol" aria-hidden="true">mail</span>{person.email || "Sin correo asignado"}</span>
                        </span>
                        <span className={`staff-card-status${onShift ? " on-shift" : ""}`}>
                          <span aria-hidden="true" />
                          {onShift ? "En turno" : "Fuera de turno"}
                        </span>
                        <span className="material-symbol staff-card-arrow" aria-hidden="true">arrow_forward</span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </section>
            </div>

            <aside className="staff-hub-aside">
              <section className="staff-overview" aria-label="Resumen del equipo">
                <div className="staff-overview-heading">
                  <p className="eyebrow">Resumen del equipo</p>
                  <span className="material-symbol" aria-hidden="true">insights</span>
                </div>
                <div className="staff-overview-item">
                  <span className="staff-overview-icon" aria-hidden="true">
                    <span className="material-symbol">groups</span>
                  </span>
                  <span><strong>{state.staff.length}</strong><small>Personas activas</small></span>
                </div>
                <div className="staff-overview-item">
                  <span className="staff-overview-icon staff-overview-icon-shift" aria-hidden="true">
                    <span className="material-symbol">schedule</span>
                  </span>
                  <span><strong>{staffOnShift}</strong><small>En turno ahora</small></span>
                </div>
                <div className="staff-overview-item">
                  <span className="staff-overview-icon staff-overview-icon-access" aria-hidden="true">
                    <span className="material-symbol">verified_user</span>
                  </span>
                  <span>
                    <strong>{state.staff.filter((person) => person.hasAccount).length}</strong>
                    <small>Con acceso activo</small>
                  </span>
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

export function CleanerPortal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [rooms, setRooms] = useState<CleanerRoom[]>([]);
  const [history, setHistory] = useState<CleanerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  async function loadCleanerData() {
    const [assignedRooms, completedRooms] = await Promise.all([
      getCleanerRooms(),
      getCleanerHistory(),
    ]);
    setRooms(assignedRooms);
    setHistory(completedRooms);
  }

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    void getCleanerProfile()
      .then(async (currentProfile) => {
        if (!active || !currentProfile) return;
        setProfile(currentProfile);
        const [assignedRooms, completedRooms] = await Promise.all([
          getCleanerRooms(),
          getCleanerHistory(),
        ]);
        if (active) {
          setRooms(assignedRooms);
          setHistory(completedRooms);
        }
      })
      .catch((profileError: unknown) => {
        if (active) setError(messageOf(profileError));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setHistoryLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authenticated = await loginCleaner(email.trim(), password);
      setProfile(authenticated);
      setHistoryLoading(true);
      await loadCleanerData();
    } catch (loginError: unknown) {
      setError(messageOf(loginError));
      setProfile(null);
      setRooms([]);
      setHistory([]);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }

  async function handleFinish(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    try {
      await finishCleanerRoom(roomId);
      await loadCleanerData();
    } catch (finishError: unknown) {
      setError(messageOf(finishError));
    } finally {
      setBusyRoom(null);
    }
  }

  async function signOut() {
    setLoading(true);
    try {
      await logoutCleaner();
    } catch (logoutError: unknown) {
      setError(messageOf(logoutError));
      setLoading(false);
      return;
    }
    setProfile(null);
    setRooms([]);
    setHistory([]);
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  }

  return (
    <main className="auth-page cleaner-auth-page">
      {!profile ? (
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-brand">
            <FreshlyMark />
            <span><strong>Freshly</strong><small>Gestión hotelera</small></span>
          </div>
          <p className="eyebrow">Acceso de aseo</p>
          <h1>Tu jornada, a tu ritmo.</h1>
          <p className="muted">Ingresa el correo y la contraseña de tu cuenta.</p>
          <label>Correo electrónico<input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Contraseña<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={loading}>{loading ? "Validando…" : "Ingresar"}</button>
        </form>
      ) : (
        <section className="cleaner-page page-stack">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Tu jornada</p>
              <h1>Hola, {profile.nombre}</h1>
              <p className="page-description">Estas son las habitaciones asignadas para hoy.</p>
            </div>
            <button className="button button-refresh" disabled={loading} onClick={() => void signOut()}>
              <span className="material-symbol" aria-hidden="true">logout</span> Cerrar sesión
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {rooms.length === 0 ? (
            <p className="empty-state">No tienes habitaciones asignadas actualmente.</p>
          ) : (
            <section className="room-grid">
              {rooms.map((room) => (
                <article className="room-card" key={room.id_habitacion}>
                  <div className="room-card-heading"><div><p className="eyebrow">Habitación</p><h2>{room.id_habitacion}</h2></div><span className={`status-pill status-${statusFromDb(room.estado)}`}>{statusLabels[statusFromDb(room.estado)]}</span></div>
                  <dl className="details-list">
                    <div><dt>Huésped</dt><dd>{room.nombre_huesped || "No registrado"}</dd></div>
                    <div><dt>Plan</dt><dd>{room.plan_limpieza || "No especificado"}</dd></div>
                    <div><dt>Detalles</dt><dd>{room.detalles_limpieza || "Sin indicaciones"}</dd></div>
                  </dl>
                  {room.estado !== "finalizado" && (
                    <button className="button button-primary" disabled={busyRoom === room.id_habitacion} onClick={() => void handleFinish(room.id_habitacion)}>
                      {busyRoom === room.id_habitacion ? "Guardando…" : "Finalizar habitación"}
                    </button>
                  )}
                </article>
              ))}
            </section>
          )}
          <section className="page-card cleaner-history" aria-labelledby="cleaner-history-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Actividad completada</p>
                <h2 id="cleaner-history-title">Historial de habitaciones</h2>
                <p className="muted">Habitaciones que has finalizado anteriormente.</p>
              </div>
            </div>
            {historyLoading ? (
              <p className="empty-state">Cargando historial…</p>
            ) : history.length === 0 ? (
              <p className="empty-state">Aún no tienes habitaciones finalizadas.</p>
            ) : (
              <div className="cleaner-history-list">
                {history.map((item) => (
                  <article
                    className="cleaner-history-item"
                    key={item.id_trabajo}
                  >
                    <span className="material-symbol" aria-hidden="true">check_circle</span>
                    <div className="cleaner-history-room">
                      <strong>Habitación {item.id_habitacion}</strong>
                      <span>{item.tipo_limpieza || "Tipo de limpieza no especificado"}</span>
                    </div>
                    <time dateTime={item.creado_en}>{formatDate(item.creado_en)}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

function statusFromDb(status: string): RoomStatus {
  const normalized: Record<string, RoomStatus> = {
    libre: "free",
    ocupada: "occupied",
    pendiente: "pending",
    limpieza: "cleaning",
    finalizado: "finished",
  };
  return normalized[status] ?? "unknown";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function getNextCleaningDate(plan: string, lastCleaning: string | null): Date | null {
  if (!lastCleaning) return null;
  const date = new Date(lastCleaning);
  if (Number.isNaN(date.getTime())) return null;

  const normalizedPlan = plan.trim().toLocaleLowerCase("es");
  if (normalizedPlan === "semanal") {
    date.setDate(date.getDate() + 7);
    return date;
  }
  if (normalizedPlan === "mensual") {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDayOfNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDayOfNextMonth));
    return date;
  }
  return null;
}

function getLatestCleaningDate(
  roomId: string,
  cleaningWork: RemoteHotelState["cleaningWork"],
  events: HotelEvent[],
): string | null {
  const completedWorkDates = cleaningWork
    .filter((work) => work.room === roomId)
    .map((work) => work.time);
  const completedEventDates = events
    .filter((event) => (
      event.room === roomId
      && event.action.toLocaleLowerCase("es").includes("limpieza finalizada")
    ))
    .map((event) => event.time);
  return [...completedWorkDates, ...completedEventDates]
    .filter((value) => Number.isFinite(new Date(value).getTime()))
    .reduce<string | null>((latest, value) => (
      !latest || new Date(value).getTime() > new Date(latest).getTime() ? value : latest
    ), null);
}

function getCurrentAssignmentDate(
  roomId: string,
  assignments: RemoteHotelState["roomAssignments"],
): string | null {
  return assignments
    .filter((assignment) => assignment.roomId === roomId && !assignment.unassignedAt)
    .reduce<string | null>((latest, assignment) => (
      !latest || new Date(assignment.assignedAt).getTime() > new Date(latest).getTime()
        ? assignment.assignedAt
        : latest
    ), null);
}

function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(value);
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
