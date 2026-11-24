import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useHotelAuth } from "../components/HotelAuth";
import { FreshlyMark } from "../components/FreshlyBrand";
import { useHotelData } from "../components/HotelData";
import { ModernAvatar3D, Avatar3DStylePicker } from "../components/ModernAvatar3D";
import {
  addEvent,
  changeStaffPassword,
  createRoom,
  createFloorWithStructures,
  HOTEL_STRUCTURE_CATALOG,
  getStructureIcon,
  getStructurePhoto,
  createStaff,
  deleteRoom,
  deleteStaff,
  detectFloor,
  detectRoomType,
  detectSpaceType,
  finishCleanerRoom,
  startCleanerRoom,
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
  status: "completed" | "in_progress";
  statusLabel: string;
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
const CLEANING_DURATION_OPTIONS = [30, 60, 90, 120, 150] as const;
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
  const [statusFilter, setStatusFilter] = useState<"all" | RoomStatus>("all");

  const today = localDateValue(new Date());

  // 1. Clasificación real de espacios
  const allSpaceIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );
  const roomIds = useMemo(
    () => allSpaceIds.filter((id) => state.spaceTypes[id] !== "zona_comun"),
    [allSpaceIds, state.spaceTypes],
  );

  const totalSpaces = allSpaceIds.length;
  const totalRooms = roomIds.length;

  // 2. Métricas auténticas
  const occupiedCount = useMemo(
    () => roomIds.filter((id) => state.rooms[id] === "occupied").length,
    [roomIds, state.rooms],
  );
  const freeCount = useMemo(
    () => allSpaceIds.filter((id) => state.rooms[id] === "free").length,
    [allSpaceIds, state.rooms],
  );
  const cleaningCount = useMemo(
    () => allSpaceIds.filter((id) => state.rooms[id] === "cleaning").length,
    [allSpaceIds, state.rooms],
  );
  const pendingCount = useMemo(
    () => allSpaceIds.filter((id) => state.rooms[id] === "pending").length,
    [allSpaceIds, state.rooms],
  );
  const finishedCount = useMemo(
    () => allSpaceIds.filter((id) => state.rooms[id] === "finished").length,
    [allSpaceIds, state.rooms],
  );

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const donutRadius = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const occStroke = (occupancyRate / 100) * donutCircumference;

  // 3. Personal activo en turno
  const activeAttendanceMap = useMemo(() => {
    const map = new Map<string, (typeof state.attendance)[0]>();
    for (const a of state.attendance) {
      if (!a.checkOut && !map.has(a.staffId)) {
        map.set(a.staffId, a);
      }
    }
    return map;
  }, [state.attendance]);

  const activeStaff = useMemo(
    () => state.staff.filter((s) => activeAttendanceMap.has(s.id)),
    [activeAttendanceMap, state.staff],
  );

  // 4. Urgencias de aseo
  const scheduledRooms = useMemo(() => {
    return Object.entries(state.scheduledCleaningDates)
      .filter(([roomId, date]) => Boolean(date && state.rooms[roomId]))
      .map(([roomId, date]) => ({
        roomId,
        date,
        status: state.rooms[roomId],
        cleaner: state.assignedCleanings[roomId]?.staffName || "Sin asignar",
        isCommon: state.spaceTypes[roomId] === "zona_comun",
      }))
      .sort((a, b) => {
        const aOverdue = a.date < today && a.status !== "finished";
        const bOverdue = b.date < today && b.status !== "finished";
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return a.date.localeCompare(b.date) || a.roomId.localeCompare(b.roomId, undefined, { numeric: true });
      });
  }, [state.rooms, state.scheduledCleaningDates, state.assignedCleanings, state.spaceTypes, today]);

  const overdueRooms = useMemo(
    () => scheduledRooms.filter((r) => r.date < today && r.status !== "finished"),
    [scheduledRooms, today],
  );
  const dueTodayRooms = useMemo(
    () => scheduledRooms.filter((r) => r.date === today && r.status !== "finished"),
    [scheduledRooms, today],
  );
  const unassignedPendingSpaces = useMemo(
    () => allSpaceIds.filter((id) => state.rooms[id] === "pending" && !state.assignedCleanings[id]?.staffId),
    [allSpaceIds, state.assignedCleanings, state.rooms],
  );

  const operationalHealth = Math.max(
    70,
    Math.min(100, Math.round(100 - (overdueRooms.length * 6) - (unassignedPendingSpaces.length * 4) - (pendingCount * 2))),
  );

  // 5. Agrupación por pisos
  const floors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const id of allSpaceIds) {
      const isCommon = state.spaceTypes[id] === "zona_comun";
      let key = state.floors[id]?.trim() || detectFloor(id, undefined, isCommon);
      if (!key || key.toLowerCase() === "sin piso") {
        key = isCommon ? "Zonas Comunes" : "Piso 1";
      }
      if (!map[key]) map[key] = [];
      map[key].push(id);
    }
    const sortedMap: Record<string, string[]> = {};
    const keys = Object.keys(map).sort((a, b) => {
      const aIsCommon = a.toLowerCase().includes("comun") || a.toLowerCase().includes("común");
      const bIsCommon = b.toLowerCase().includes("comun") || b.toLowerCase().includes("común");
      if (aIsCommon && !bIsCommon) return 1;
      if (!aIsCommon && bIsCommon) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    for (const k of keys) {
      sortedMap[k] = map[k];
    }
    return sortedMap;
  }, [allSpaceIds, state.floors, state.spaceTypes]);

  // Filtros rápidos
  const filterOptions = [
    { key: "all" as const, label: "Todas", count: totalSpaces },
    { key: "free" as const, label: "Libres", count: freeCount, color: "var(--st-free)" },
    { key: "occupied" as const, label: "Ocupadas", count: occupiedCount, color: "var(--st-occupied)" },
    { key: "cleaning" as const, label: "En Limpieza", count: cleaningCount, color: "var(--st-cleaning)" },
    { key: "pending" as const, label: "Pendiente", count: pendingCount, color: "var(--st-pending)" },
    { key: "finished" as const, label: "Listas", count: finishedCount, color: "var(--st-finished)" },
  ];

  const recentEvents = useMemo(() => state.events.slice(0, 3), [state.events]);

  return (
    <div className="dash-compact-shell">
      {/* 1. TOPBAR MINIMALISTA */}
      <header className="dash-topbar">
        <div className="dash-topbar-left">
          <h1>Inicio</h1>
          <div className="dash-topbar-chips">
            <span className="meta-chip green">
              <span className="pulse" />
              <strong>{totalSpaces}</strong> Espacios
            </span>
            <span className="meta-chip">
              <span className="material-symbol" style={{ color: "#10b981", fontSize: 16 }} aria-hidden="true">verified</span>
              <strong>{operationalHealth}%</strong> Óptimo
            </span>
            <time className="meta-chip" dateTime={today}>{formatDateOnly(new Date())}</time>
          </div>
        </div>

        {/* Riel de filtro rápido */}
        <nav className="dash-filter-strip" aria-label="Filtro rápido">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`filter-pill ${statusFilter === opt.key ? "active" : ""}`}
              onClick={() => setStatusFilter(statusFilter === opt.key && opt.key !== "all" ? "all" : opt.key)}
            >
              {opt.color && <span className="pill-dot" style={{ background: opt.color }} aria-hidden="true" />}
              <span>{opt.label}</span>
              <strong>{opt.count}</strong>
            </button>
          ))}
        </nav>
      </header>

      {/* 2. POWER CARDS ILUSTRATIVAS (3 Columnas de Impacto Directo) */}
      <section className="dash-visual-deck" aria-label="Resumen visual operativo">
        {/* Card 1: Radar Visual de Ocupación */}
        <article className="vcard">
          <div className="vcard-head">
            <span>Ocupación y Capacidad</span>
            <Link to="/app/habitaciones">Ver todas <span className="material-symbol" aria-hidden="true">arrow_forward</span></Link>
          </div>
          <div className="radar-donut-row">
            <div className="donut-svg-wrap" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r={donutRadius} fill="none" stroke="var(--border-hairline)" strokeWidth="4" />
                {occStroke > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r={donutRadius}
                    fill="none"
                    stroke="var(--st-occupied)"
                    strokeWidth="4"
                    strokeDasharray={`${occStroke} ${donutCircumference}`}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="donut-center-label">
                {occupancyRate}%
                <span>Ocupado</span>
              </div>
            </div>
            <div className="donut-stats-grid">
              <div className="donut-stat-item">
                <div className="donut-stat-num" style={{ color: "var(--st-occupied)" }}>
                  <span className="pill-dot" style={{ background: "var(--st-occupied)" }} /> {occupiedCount}
                </div>
                <div className="donut-stat-lbl">Ocupadas</div>
              </div>
              <div className="donut-stat-item">
                <div className="donut-stat-num" style={{ color: "var(--st-free)" }}>
                  <span className="pill-dot" style={{ background: "var(--st-free)" }} /> {freeCount}
                </div>
                <div className="donut-stat-lbl">Libres</div>
              </div>
              <div className="donut-stat-item">
                <div className="donut-stat-num" style={{ color: "var(--st-cleaning)" }}>
                  <span className="pill-dot" style={{ background: "var(--st-cleaning)" }} /> {cleaningCount}
                </div>
                <div className="donut-stat-lbl">En Limpieza</div>
              </div>
              <div className="donut-stat-item">
                <div className="donut-stat-num" style={{ color: "var(--st-finished)" }}>
                  <span className="pill-dot" style={{ background: "var(--st-finished)" }} /> {finishedCount}
                </div>
                <div className="donut-stat-lbl">Listas</div>
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Camaristas en Turno */}
        <article className="vcard">
          <div className="vcard-head">
            <span>Personal Activo Hoy</span>
            <Link to="/app/personal">Turnos <span className="material-symbol" aria-hidden="true">arrow_forward</span></Link>
          </div>
          <div className="staff-chips-stack">
            {activeStaff.length === 0 ? (
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", padding: "10px 0", textAlign: "center" }}>
                Sin asistencias abiertas hoy.
              </p>
            ) : (
              activeStaff.slice(0, 3).map((person) => {
                const assigned = Object.entries(state.assignedCleanings).filter(
                  ([rid, a]) => a.staffId === person.id && state.rooms[rid] !== undefined,
                );
                const currentCleaning = assigned.find(([rid]) => state.rooms[rid] === "cleaning")?.[0];
                const initials = person.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

                return (
                  <div className="staff-chip-row" key={person.id}>
                    <div className="staff-chip-left">
                      <div className="staff-avatar-dot">{initials}</div>
                      <span>{person.name}</span>
                    </div>
                    {currentCleaning ? (
                      <Link to={`/app/habitaciones?room=${encodeURIComponent(currentCleaning)}`} className="staff-chip-task">
                        Hab {currentCleaning}
                      </Link>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {assigned.length > 0 ? `${assigned.length} asignadas` : "En guardia"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Card 3: Urgencias Directas */}
        <article className="vcard">
          <div className="vcard-head">
            <span>Atención Inmediata</span>
            <Link to="/app/limpiezas">Ir a Aseos <span className="material-symbol" aria-hidden="true">arrow_forward</span></Link>
          </div>
          <div className="urgency-list">
            {overdueRooms.length === 0 && dueTodayRooms.length === 0 && unassignedPendingSpaces.length === 0 ? (
              <div className="urgency-pill green">
                <span className="material-symbol" style={{ fontSize: 16 }} aria-hidden="true">check_circle</span>
                <span>Toda la rotación al día</span>
              </div>
            ) : (
              <>
                {overdueRooms.slice(0, 2).map((r) => (
                  <Link to="/app/limpiezas" className="urgency-pill red" key={r.roomId}>
                    <span>Hab {r.roomId} · {r.cleaner}</span>
                    <span className="urgency-tag" style={{ color: "#be123c" }}>Vencida</span>
                  </Link>
                ))}
                {dueTodayRooms.slice(0, 2).map((r) => (
                  <Link to="/app/limpiezas" className="urgency-pill amber" key={r.roomId}>
                    <span>Hab {r.roomId} · {r.cleaner}</span>
                    <span className="urgency-tag" style={{ color: "#b45309" }}>Entrega Hoy</span>
                  </Link>
                ))}
                {unassignedPendingSpaces.slice(0, 1).map((id) => (
                  <Link to="/app/limpiezas" className="urgency-pill amber" key={id}>
                    <span>Espacio {id}</span>
                    <span className="urgency-tag" style={{ color: "#b45309" }}>Sin Asignar</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </article>
      </section>

      {/* 3. TABLERO VISUAL DE HABITACIONES (Grid Ultra Ilustrativo) */}
      <section className="dash-fleet-board" aria-label="Distribución por pisos">
        <div className="board-header">
          <h2 className="board-title">Distribución por Pisos</h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Clic en cualquier espacio para gestionarlo</span>
        </div>

        {Object.entries(floors).map(([flName, flRooms]) => {
          const visibleRooms = statusFilter === "all"
            ? flRooms
            : flRooms.filter((id) => state.rooms[id] === statusFilter);

          if (visibleRooms.length === 0) return null;

          return (
            <div className="floor-row" key={flName}>
              <span className="floor-badge">{flName}</span>
              <div className="room-nodes-track">
                {visibleRooms.map((roomId) => {
                  const st = state.rooms[roomId] || "free";
                  const isCommon = state.spaceTypes[roomId] === "zona_comun";
                  const guest = state.guests[roomId];
                  const cleaner = state.assignedCleanings[roomId]?.staffName;

                  let guestInitial = "";
                  if (st === "occupied" && guest) guestInitial = guest.split(" ")[0];
                  else if (st === "cleaning" && cleaner) guestInitial = cleaner.split(" ")[0];

                  return (
                    <Link
                      key={roomId}
                      to={`/app/habitaciones?room=${encodeURIComponent(roomId)}`}
                      className={`room-tile ${st}`}
                      title={`${isCommon ? "Área común" : "Habitación"} ${roomId} (${statusLabels[st]})`}
                    >
                      {isCommon && (
                        <span className="material-symbol" style={{ fontSize: 13, color: "#2563eb" }} aria-hidden="true">
                          {getStructureIcon(roomId)}
                        </span>
                      )}
                      <span>{roomId}</span>
                      {guestInitial && <span className="room-tile-guest">{guestInitial}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* 4. MINI FEED DE MOVIMIENTOS RECIENTES */}
      <footer className="mini-feed-strip">
        <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "var(--th-text-muted)", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbol" style={{ fontSize: 14 }} aria-hidden="true">history</span> En Vivo:
        </span>
        <div className="feed-items-row">
          {recentEvents.length === 0 ? (
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Sin eventos recientes</span>
          ) : (
            recentEvents.map((ev, i) => (
              <div className="feed-point" key={i}>
                <span
                  className="pill-dot"
                  style={{
                    background:
                      ev.status === "finished"
                        ? "var(--st-finished)"
                        : ev.status === "cleaning"
                        ? "var(--st-cleaning)"
                        : ev.status === "occupied"
                        ? "var(--st-occupied)"
                        : "var(--accent)",
                  }}
                  aria-hidden="true"
                />
                <span>
                  {ev.action} <strong>Hab {ev.room}</strong> {ev.guest ? `(${ev.guest.split(" ")[0]})` : ""}
                </span>
                <time dateTime={ev.time}>{formatDate(ev.time).split(",")[1] || formatDate(ev.time)}</time>
              </div>
            ))
          )}
        </div>
        <Link to="/app/historial" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
          Ver historial →
        </Link>
      </footer>
    </div>
  );
}

function RoomCard({ roomId, onDelete }: { roomId: string; onDelete?: () => void }) {
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const roomStatus = state.rooms[roomId] ?? "unknown";
  const roomGuest = state.guests[roomId] ?? "";
  const rawServicePlan = state.servicePlans[roomId] ?? "";
  const roomServicePlan = rawServicePlan.trim().toLowerCase() === "salida" ? "" : rawServicePlan;
  const roomCleaningDetails = state.cleaningDetails[roomId] ?? "";
  const roomScheduledCleaningDate = state.scheduledCleaningDates[roomId] ?? "";
  const assignment = state.assignedCleanings[roomId];
  const roomFloor = state.floors[roomId] || detectFloor(roomId);
  const roomSpaceType = state.spaceTypes[roomId] || detectSpaceType(roomId);
  const roomCleaningTime = state.cleaningTimes?.[roomId] ?? 30;

  const [status, setStatus] = useState(roomStatus);
  const [guest, setGuest] = useState(roomGuest);
  const [servicePlan, setServicePlan] = useState(roomServicePlan);
  const [cleaningDetails, setCleaningDetails] = useState(roomCleaningDetails);
  const [scheduledCleaningDate, setScheduledCleaningDate] = useState(roomScheduledCleaningDate);
  const [staffId, setStaffId] = useState(assignment?.staffId ?? "");
  const [cleaningType, setCleaningType] = useState(assignment?.cleaningType ?? "");
  const [piso, setPiso] = useState(roomFloor);
  const [tipoEspacio, setTipoEspacio] = useState<"habitacion" | "zona_comun">(roomSpaceType);
  const [tiempoLimpieza, setTiempoLimpieza] = useState<number>(roomCleaningTime);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isCommonArea = tipoEspacio === "zona_comun";

  const registeredFloors = useMemo(() => {
    const set = new Set<string>();
    if (state?.floors) {
      for (const id of Object.keys(state.floors)) {
        const isCommon = state.spaceTypes[id] === "zona_comun";
        const f = state.floors[id]?.trim() || detectFloor(id, undefined, isCommon);
        if (f && f.toLowerCase() !== "sin piso") {
          set.add(f);
        }
      }
    }
    if (piso && piso.trim()) {
      set.add(piso.trim());
    }
    if (set.size === 0) {
      set.add("Piso 1");
      set.add("Piso 2");
      set.add("Piso 3");
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [state?.floors, state?.spaceTypes, piso]);

  function handleCancel() {
    setStatus(roomStatus);
    setGuest(roomGuest);
    setServicePlan(roomServicePlan);
    setCleaningDetails(roomCleaningDetails);
    setScheduledCleaningDate(roomScheduledCleaningDate);
    setStaffId(assignment?.staffId ?? "");
    setCleaningType(assignment?.cleaningType ?? "");
    setPiso(roomFloor);
    setTipoEspacio(roomSpaceType);
    setTiempoLimpieza(roomCleaningTime);
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  }

  useEffect(() => {
    setStatus(roomStatus);
    setGuest(roomGuest);
    setServicePlan(roomServicePlan);
    setCleaningDetails(roomCleaningDetails);
    setScheduledCleaningDate(roomScheduledCleaningDate);
    setStaffId(assignment?.staffId ?? "");
    setCleaningType(assignment?.cleaningType ?? "");
    setPiso(roomFloor);
    setTipoEspacio(roomSpaceType);
    setTiempoLimpieza(roomCleaningTime);
    setIsEditing(false);
  }, [roomId, roomStatus, roomGuest, roomServicePlan, roomCleaningDetails, roomScheduledCleaningDate, assignment?.staffId, assignment?.cleaningType, roomFloor, roomSpaceType, roomCleaningTime]);

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
        servicePlan: servicePlan.trim().toLowerCase() === "salida" ? null : servicePlan.trim() || null,
        cleaningDetails: cleaningDetails.trim() || null,
        scheduledCleaningDate: scheduledCleaningDate || null,
        assignedCleaner: staffId ? { staffId } : null,
        assignedCleaningType: staffId ? cleaningType.trim() || null : null,
        piso: piso.trim() || null,
        tipo_espacio: tipoEspacio,
        tipo_habitacion: "normal",
        numero_doble: null,
        tiempo_limpieza: tiempoLimpieza > 0 ? tiempoLimpieza : 30,
      });

      const changes: string[] = [];
      if (previousStatus !== status) {
        changes.push(`Estado: ${statusLabels[previousStatus] ?? previousStatus} → ${statusLabels[status] ?? status}`);
      }
      const cleanGuest = guest.trim() || null;
      const prevGuest = roomGuest.trim() || null;
      if (cleanGuest !== prevGuest) {
        if (!prevGuest && cleanGuest) {
          changes.push(`Check-in: ${cleanGuest}`);
        } else if (prevGuest && !cleanGuest) {
          changes.push(`Check-out: Salida huésped (${prevGuest})`);
        } else {
          changes.push(`Huésped: ${prevGuest} → ${cleanGuest}`);
        }
      }
      const cleanServicePlan = servicePlan.trim().toLowerCase() === "salida" ? null : servicePlan.trim() || null;
      const prevServicePlan = roomServicePlan.trim() || null;
      if (cleanServicePlan !== prevServicePlan) {
        changes.push(`Plan: ${cleanServicePlan || "Ninguno"}`);
      }
      const prevStaffId = assignment?.staffId || null;
      const cleanStaffId = staffId || null;
      if (cleanStaffId !== prevStaffId) {
        if (cleanStaffId) {
          const staffName = state.staff.find((s) => s.id === cleanStaffId)?.name || "Personal";
          changes.push(`Asignado a: ${staffName}`);
        } else {
          changes.push("Personal desasignado");
        }
      }
      if (cleaningDetails.trim() && cleaningDetails.trim() !== roomCleaningDetails.trim()) {
        changes.push(`Detalles de limpieza actualizados`);
      }

      if (changes.length > 0) {
        const eventRecord: HotelEvent = {
          room: roomId,
          status,
          action: changes.join(" | "),
          guest: cleanGuest,
          actor: session?.user?.email ?? "Administrador",
          cleanerId: cleanStaffId,
          cleaningType: cleaningType.trim() || null,
          time: new Date().toISOString(),
        };
        try {
          await addEvent(eventRecord);
        } catch (eventError: unknown) {
          console.warn("No se pudo registrar en la cámara de seguridad:", eventError);
        }
      }

      await refresh();
      setSuccess("Cambios guardados.");
      setIsEditing(false);
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (deleteConfirmText.trim().toLowerCase() !== "eliminar") {
      setDeleteModalError('Debes escribir exactamente la palabra "eliminar".');
      return;
    }
    setDeleting(true);
    setDeleteModalError(null);
    try {
      await deleteRoom(roomId, session?.user?.email ?? "Administrador", {
        floor: piso,
        spaceType: tipoEspacio,
        guest: guest,
        status: status,
      });
      await refresh();
      setShowDeleteModal(false);
      onDelete?.();
    } catch (err) {
      setDeleteModalError(messageOf(err));
      setDeleting(false);
    }
  }

  return (
    <article className={`room-card room-editor-card ${!isEditing ? "is-disabled" : "is-editing"}`}>
      <header className="room-editor-heading">
        <div className="room-editor-title">
          <span className="room-editor-icon">
            <span className="material-symbol" aria-hidden="true">
              {isEditing ? "edit" : isCommonArea ? getStructureIcon(roomId) : "bed"}
            </span>
          </span>
          <div>
            <p className="eyebrow">{isCommonArea ? `Área Compartida · ${piso || "Sin piso"}` : `Habitación · ${piso || "Sin piso"}`}</p>
            <h2>{roomId}</h2>
          </div>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
          {piso && (
            <span className="room-tag-badge room-tag-floor">
              <span className="material-symbol" style={{ fontSize: "14px" }}>layers</span>
              {piso}
            </span>
          )}
          {isCommonArea && (
            <span className="room-tag-badge room-tag-common">
              <span className="material-symbol" style={{ fontSize: "14px" }}>{getStructureIcon(roomId)}</span>
              Área Compartida
            </span>
          )}
        </div>
      </header>
      <form className="form-grid room-editor-form" onSubmit={handleSave}>
        <label>
          Tipo de espacio
          <select
            disabled={!isEditing || saving}
            value={tipoEspacio}
            onChange={(e) => setTipoEspacio(e.target.value as "habitacion" | "zona_comun")}
          >
            <option value="habitacion">Habitación</option>
            <option value="zona_comun">Área Compartida</option>
          </select>
        </label>
        <label>
          Piso / Ubicación
          <select
            disabled={!isEditing || saving}
            value={piso}
            onChange={(event) => setPiso(event.target.value)}
          >
            {registeredFloors.map((fl) => (
              <option key={fl} value={fl}>
                {fl}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select disabled={!isEditing || saving} value={status} onChange={(event) => setStatus(event.target.value as RoomStatus)}>
            {status === "unknown" && <option value="unknown" disabled>Sin estado</option>}
            {editableStatuses.map((value) => (
              <option key={value} value={value}>{statusLabels[value]}</option>
            ))}
          </select>
        </label>
        {!isCommonArea && (
          <label>
            Huésped
            <input disabled={!isEditing || saving} value={guest} onChange={(event) => setGuest(event.target.value)} />
          </label>
        )}
        <label>
          Servicio de limpieza
          <select
            disabled={!isEditing || saving}
            value={servicePlan.trim().toLowerCase() === "salida" ? "" : servicePlan}
            onChange={(event) => setServicePlan(event.target.value)}
          >
            <option value="">Sin servicio asignado</option>
            {!cleaningServicePlans.some((plan) => plan.toLowerCase() === servicePlan.trim().toLowerCase()) &&
              servicePlan &&
              servicePlan.trim().toLowerCase() !== "salida" && (
                <option value={servicePlan} disabled>{servicePlan} (actual)</option>
              )}
            {cleaningServicePlans
              .filter((plan) => plan.toLowerCase() !== "salida")
              .map((plan) => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
          </select>
        </label>
        <label>
          Fecha de limpieza
          <input
            disabled={!isEditing || saving}
            type="date"
            value={scheduledCleaningDate}
            onChange={(event) => setScheduledCleaningDate(event.target.value)}
          />
        </label>
        <label>
          Personal asignado
          <select disabled={!isEditing || saving} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
            <option value="">Sin asignar</option>
            {state.staff.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <label>
          Tiempo de limpieza
          <select
            disabled={!isEditing || saving}
            value={tiempoLimpieza}
            onChange={(event) => setTiempoLimpieza(parseInt(event.target.value, 10) || 30)}
          >
            {CLEANING_DURATION_OPTIONS.map((mins) => (
              <option key={mins} value={mins}>
                {mins} min ({(mins / 60).toFixed(1)} h)
              </option>
            ))}
          </select>
        </label>
        <label className="form-wide">
          Detalles de limpieza
          <textarea
            disabled={!isEditing || saving}
            rows={2}
            value={cleaningDetails}
            onChange={(event) => setCleaningDetails(event.target.value)}
          />
        </label>
        <div className="form-wide form-actions">
          <ActionMessage error={error} success={success} />
          {!isEditing ? (
            <div className="room-editor-view-actions">
              <button
                type="button"
                className="button button-primary room-editor-edit-btn"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setIsEditing(true);
                }}
              >
                <span className="material-symbol" aria-hidden="true">edit</span>
                <span className="editor-btn-text-full">Editar {isCommonArea ? "zona común" : "habitación"}</span>
                <span className="editor-btn-text-mobile">Editar</span>
              </button>
              <button
                type="button"
                className="button button-danger room-editor-delete-btn"
                disabled={saving || deleting}
                onClick={() => {
                  setDeleteConfirmText("");
                  setDeleteModalError(null);
                  setShowDeleteModal(true);
                }}
              >
                <span className="material-symbol" aria-hidden="true">delete</span>
                <span className="editor-btn-text-full">Eliminar {isCommonArea ? "zona común" : "habitación"}</span>
                <span className="editor-btn-text-mobile">Eliminar</span>
              </button>
            </div>
          ) : (
            <div className="room-editor-actions-group">
              <button
                type="button"
                className="button button-secondary room-editor-cancel-btn"
                disabled={saving || deleting}
                onClick={handleCancel}
              >
                <span className="material-symbol" aria-hidden="true">close</span>
                Cancelar
              </button>
              <button className="button button-primary room-editor-save" disabled={saving || deleting}>
                <span className="material-symbol" aria-hidden="true">
                  {saving ? "hourglass_top" : "save"}
                </span>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Modal de Doble Confirmación para Eliminar */}
      {showDeleteModal && (
        <div
          className="matrix-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-title"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="matrix-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <div className="matrix-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbol" style={{ color: "#dc2626", fontSize: "24px" }} aria-hidden="true">
                  warning
                </span>
                <h3 id="delete-room-title" style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                  ¿Eliminar {isCommonArea ? "área compartida" : "habitación"} "{roomId}"?
                </h3>
              </div>
              <button
                type="button"
                className="matrix-modal-close"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                aria-label="Cerrar modal"
              >
                <span className="material-symbol" aria-hidden="true">close</span>
              </button>
            </div>

            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#4b5563", lineHeight: 1.5 }}>
                Esta acción es <strong>irreversible</strong>. Se eliminarán permanentemente las limpiezas, registros e historiales vinculados a{" "}
                <strong>{isCommonArea ? `el área compartida "${roomId}"` : `la habitación "${roomId}"`}</strong>.
              </p>

              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                Para confirmar la eliminación permanente, escribe exactamente la palabra:{" "}
                <strong style={{ userSelect: "all", color: "#dc2626", backgroundColor: "#fee2e2", padding: "2px 7px", borderRadius: "4px" }}>
                  eliminar
                </strong>
              </p>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                  Escribe "eliminar" para confirmar
                </span>
                <input
                  type="text"
                  autoFocus
                  disabled={deleting}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="eliminar"
                  style={{
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: deleteConfirmText.trim().toLowerCase() === "eliminar" ? "#dc2626" : "#cbd5e1",
                    outline: "none",
                    fontSize: "14px",
                    boxShadow: deleteConfirmText.trim().toLowerCase() === "eliminar" ? "0 0 0 3px rgba(220,38,38,0.2)" : undefined,
                  }}
                />
              </label>

              {deleteModalError && (
                <div className="banner banner-error" style={{ margin: 0 }}>
                  <span className="material-symbol" aria-hidden="true">error</span>
                  <span>{deleteModalError}</span>
                </div>
              )}
            </div>

            <div className="matrix-modal-footer">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button-danger"
                disabled={deleteConfirmText.trim().toLowerCase() !== "eliminar" || deleting}
                onClick={() => void handleConfirmDelete()}
              >
                <span className="material-symbol" aria-hidden="true">
                  {deleting ? "hourglass_empty" : "delete_forever"}
                </span>
                <span>{deleting ? "Eliminando…" : "Confirmar eliminación"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function RoomPickerCard({
  roomId,
  status,
  guest,
  servicePlan,
  cleanerName,
  cleanerId,
  floor,
  isCommonArea,
  freeToneIndex,
  onSelect,
}: {
  roomId: string;
  status: RoomStatus;
  guest: string;
  servicePlan: string;
  cleanerName: string;
  cleanerId?: string | null;
  floor?: string;
  isCommonArea?: boolean;
  freeToneIndex?: number;
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const { state } = useHotelData();
  const isEffectiveCommonArea =
    Boolean(isCommonArea) ||
    state.spaceTypes[roomId] === "zona_comun" ||
    detectSpaceType(roomId, state.spaceTypes[roomId]) === "zona_comun";

  const photoIndex = Array.from(roomId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % roomPhotos.length;

  const imageSrc = isEffectiveCommonArea
    ? getStructurePhoto(roomId)
    : roomPhotos[photoIndex];

  const handleAssigneeClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetStaff = state.staff.find(
      (s) => (cleanerId && s.id === cleanerId) || s.name.trim().toLowerCase() === cleanerName.trim().toLowerCase(),
    );
    if (targetStaff) {
      navigate(`/app/personal?id=${encodeURIComponent(targetStaff.id)}`);
    } else if (cleanerId) {
      navigate(`/app/personal?id=${encodeURIComponent(cleanerId)}`);
    } else {
      navigate(`/app/personal?name=${encodeURIComponent(cleanerName)}`);
    }
  };

  const isFree = status === "free";
  const toneClass = isFree && freeToneIndex !== undefined ? `room-picker-tone-${(freeToneIndex % 2) + 1}` : "";
  const cleaningDuration = state.cleaningTimes?.[roomId] ?? 30;

  return (
    <button
      className={`room-picker-card room-picker-card-${status} ${toneClass}`.trim()}
      onClick={onSelect}
      type="button"
      aria-label={`${isEffectiveCommonArea ? "Área común" : "Habitación"} ${roomId}, ${statusLabels[status] || status}`}
    >
      {/* 1. Carril Multimedia Izquierdo Compacto con Chip de Piso */}
      <span className="room-picker-art">
        <img
          alt={isEffectiveCommonArea ? `Zona común ${roomId}` : `Habitación ${roomId}`}
          className="room-picker-image"
          src={imageSrc}
          loading="lazy"
          decoding="async"
        />
        {floor && (
          <span className="room-picker-art-floor" title={`Ubicación: ${floor}`}>
            {floor}
          </span>
        )}
      </span>

      {/* 2. Bloque Central de Datos Reales */}
      <span className="room-picker-main">
        {/* Fila 1: Habitación / Área y Píldora de Estado */}
        <span className="room-picker-heading">
          <span className="room-picker-room-name">
            <strong>{roomId}</strong>
            <span className="room-picker-category-label">
              {isEffectiveCommonArea ? "Área Común" : "Habitación"}
            </span>
          </span>
          <span className={`status-pill status-${status}`}>
            <span className="room-status-dot" />
            <span>{statusLabels[status]}</span>
            {status === "finished" && (
              <span className="material-symbol room-status-check">check_circle</span>
            )}
          </span>
        </span>

        {/* Fila 2: Huésped (SOLO si ocupada) o Estado Operativo del Espacio */}
        <span className="room-picker-details">
          {status === "occupied" && guest ? (
            <span className="room-picker-guest-row">
              <span className="material-symbol" aria-hidden="true">person</span>
              <strong className="room-picker-guest-name" title={guest}>{guest}</strong>
            </span>
          ) : isEffectiveCommonArea ? (
            <span className="room-picker-guest-row">
              <span className="material-symbol" aria-hidden="true">{getStructureIcon(roomId)}</span>
              <span className="room-picker-common-label">Área Compartida</span>
            </span>
          ) : status === "free" ? (
            <span className="room-picker-free-status">
              <span className="material-symbol" aria-hidden="true">check_circle</span>
              <span>Disponible</span>
            </span>
          ) : status === "cleaning" ? (
            <span className="room-picker-cleaning-status">
              <span className="material-symbol" aria-hidden="true">cleaning_services</span>
              <span>En limpieza</span>
            </span>
          ) : status === "pending" ? (
            <span className="room-picker-pending-status">
              <span className="material-symbol" aria-hidden="true">pending_actions</span>
              <span>Requiere aseo</span>
            </span>
          ) : (
            <span className="room-picker-finished-status">
              <span className="material-symbol" aria-hidden="true">verified</span>
              <span>Inspeccionada</span>
            </span>
          )}

          {servicePlan && (
            <span className="room-picker-service-tag" title={`Plan: ${servicePlan}`}>
              {servicePlan}
            </span>
          )}
        </span>

        {/* Fila 3: Personal Asignado / Tiempo de Aseo y Micro-Acción */}
        <span className="room-picker-footer">
          <span
            className={`room-picker-assignee${cleanerName ? "" : " room-picker-assignee-empty"}`}
            title={cleanerName ? `Ver ficha de personal: ${cleanerName}` : "Sin personal asignado"}
            role={cleanerName ? "button" : undefined}
            tabIndex={cleanerName ? 0 : undefined}
            onClick={cleanerName ? handleAssigneeClick : undefined}
            onKeyDown={cleanerName ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleAssigneeClick(e);
              }
            } : undefined}
          >
            {cleanerName ? (
              <>
                <ModernAvatar3D
                  name={cleanerName}
                  size={16}
                  className="room-picker-assignee-avatar"
                  alt={`Avatar 3D de ${cleanerName}`}
                />
                <span className="room-picker-assignee-name">{cleanerName}</span>
              </>
            ) : status === "pending" ? (
              <span className="room-picker-unassigned-tag">
                <span className="material-symbol" aria-hidden="true">person_off</span>
                <span>Sin camarero</span>
              </span>
            ) : (
              <span className="room-picker-time-tag">
                <span className="material-symbol" aria-hidden="true">schedule</span>
                <span>{cleaningDuration} min</span>
              </span>
            )}
          </span>
          <span className="material-symbol room-picker-arrow" aria-hidden="true">chevron_right</span>
        </span>
      </span>
    </button>
  );
}

function CreateSpaceOrFloorModal({
  isOpen,
  onClose,
  onCreated,
  existingFloors,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (targetIdOrFloor: string) => void;
  existingFloors: string[];
}) {
  const { session } = useHotelAuth();
  const { state } = useHotelData();
  const [createMode, setCreateMode] = useState<"floor" | "single">("floor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo 1: Crear Piso con sus Áreas Compartidas
  const [floorName, setFloorName] = useState("");
  const [selectedStructures, setSelectedStructures] = useState<string[]>([]);
  const [customStructureInput, setCustomStructureInput] = useState("");

  // Pisos registrados en el sistema
  const registeredFloors = useMemo(() => {
    const set = new Set<string>();
    for (const f of existingFloors) {
      const trimmed = f.trim();
      if (trimmed) set.add(trimmed);
    }
    if (state?.floors) {
      for (const id of Object.keys(state.floors)) {
        const isCommon = state.spaceTypes[id] === "zona_comun";
        const f = state.floors[id]?.trim() || detectFloor(id, undefined, isCommon);
        if (f && f.toLowerCase() !== "sin piso") {
          set.add(f);
        }
      }
    }
    if (set.size === 0) {
      set.add("Piso 1");
      set.add("Piso 2");
      set.add("Piso 3");
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [existingFloors, state?.floors, state?.spaceTypes]);

  // Modo 2: Crear Habitación Individual
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [singleName, setSingleName] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (!selectedFloor || !registeredFloors.includes(selectedFloor)) {
        setSelectedFloor(registeredFloors[0] || "Piso 1");
      }
    }
  }, [isOpen, registeredFloors, selectedFloor]);

  const toggleStructure = (name: string) => {
    setSelectedStructures((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customStructureInput.trim();
    if (!clean) return;
    if (!selectedStructures.includes(clean)) {
      setSelectedStructures((prev) => [...prev, clean]);
    }
    setCustomStructureInput("");
  };

  // Submit Piso
  async function handleSubmitFloor(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanFloor = floorName.trim();
    if (!cleanFloor) {
      setError("Por favor escribe el nombre del piso.");
      return;
    }
    if (selectedStructures.length === 0) {
      setError("Selecciona al menos un área compartida para este piso.");
      return;
    }

    setSaving(true);
    try {
      await createFloorWithStructures({
        floorName: cleanFloor,
        structures: selectedStructures.map((name) => ({
          name,
          type: detectSpaceType(name),
          cleaningDuration: 30,
        })),
        actor: session?.user?.email ?? "Administrador",
      });

      onCreated(cleanFloor);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el piso.");
    } finally {
      setSaving(false);
    }
  }

  // Submit Habitación Individual
  async function handleSubmitSingle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const targetName = singleName.trim();
    if (!targetName) {
      setError("Por favor escribe el número o nombre de la habitación.");
      return;
    }

    const finalFloor = selectedFloor.trim() || registeredFloors[0] || "Piso 1";
    if (!finalFloor) {
      setError("Por favor selecciona el piso.");
      return;
    }

    setSaving(true);
    try {
      const spaceType = detectSpaceType(targetName);
      const roomType = spaceType === "habitacion" ? detectRoomType(targetName) : "normal";
      await createRoom({
        id: targetName,
        piso: finalFloor,
        tipo_espacio: spaceType,
        tipo_habitacion: roomType,
        tiempo_limpieza: 30,
        actor: session?.user?.email ?? "Administrador",
      });

      onCreated(targetName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la habitación.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="matrix-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="minimal-modal-title"
    >
      <div className="minimal-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="minimal-modal-header">
          <div className="minimal-modal-title">
            <span className="material-symbol" style={{ color: "#2563eb", fontSize: "22px" }}>
              {createMode === "floor" ? "layers" : "bed"}
            </span>
            <h2 id="minimal-modal-title">
              {createMode === "floor" ? "Crear Piso con Áreas Compartidas" : "Crear Habitación Individual"}
            </h2>
          </div>
          <button
            type="button"
            className="matrix-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <span className="material-symbol" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Selector de Modo Simple */}
        <div className="minimal-type-selector">
          <button
            type="button"
            className={`minimal-type-btn ${createMode === "floor" ? "active" : ""}`}
            onClick={() => {
              setCreateMode("floor");
              setError(null);
            }}
          >
            <span className="material-symbol" style={{ fontSize: "18px" }}>layers</span>
            Piso con Áreas Compartidas
          </button>
          <button
            type="button"
            className={`minimal-type-btn ${createMode === "single" ? "active" : ""}`}
            onClick={() => {
              setCreateMode("single");
              setError(null);
            }}
          >
            <span className="material-symbol" style={{ fontSize: "18px" }}>bed</span>
            Habitación Individual
          </button>
        </div>

        {error && (
          <div style={{ padding: "0 22px", marginTop: "10px" }}>
            <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* FORMULARIO MODO 1: PISO */}
        {createMode === "floor" ? (
          <form onSubmit={handleSubmitFloor} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="minimal-modal-body">
              <div className="minimal-field">
                <label>Nombre del Piso</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Piso 1, Piso 2, Sótano, Roof top, Terraza..."
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                />
              </div>

              <div className="minimal-structures-wrap">
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                  Áreas compartidas de este piso ({selectedStructures.length} seleccionadas):
                </label>
                <div className="minimal-chips-grid">
                  {HOTEL_STRUCTURE_CATALOG.map((item) => {
                    const isSelected = selectedStructures.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        className={`minimal-struct-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleStructure(item.name)}
                      >
                        <span className="material-symbol" style={{ fontSize: "16px" }}>
                          {isSelected ? "check" : item.icon}
                        </span>
                        {item.name}
                      </button>
                    );
                  })}
                  {/* Chips personalizados adicionales */}
                  {selectedStructures
                    .filter((s) => !HOTEL_STRUCTURE_CATALOG.some((cat) => cat.name === s))
                    .map((custom) => (
                      <button
                        key={custom}
                        type="button"
                        className="minimal-struct-chip selected"
                        onClick={() => toggleStructure(custom)}
                      >
                        <span className="material-symbol" style={{ fontSize: "16px" }}>check</span>
                        {custom}
                      </button>
                    ))}
                </div>

                {/* Agregar otra estructura personalizada */}
                <div className="minimal-custom-add">
                  <input
                    type="text"
                    placeholder="Escribe otra área compartida (ej. Cuarto de basuras 2, Balcón...)"
                    value={customStructureInput}
                    onChange={(e) => setCustomStructureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustom(e);
                      }
                    }}
                    style={{ flex: 1, padding: "8px 12px", fontSize: "13px", border: "1.5px solid #cbd5e1", borderRadius: "8px" }}
                  />
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={handleAddCustom}
                  >
                    <span className="material-symbol">add</span>
                    Añadir
                  </button>
                </div>
              </div>
            </div>

            <div className="minimal-modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={saving || !floorName.trim() || selectedStructures.length === 0}
              >
                <span className="material-symbol" aria-hidden="true">
                  {saving ? "hourglass_top" : "check"}
                </span>
                {saving
                  ? "Guardando..."
                  : `Crear Piso (${selectedStructures.length} espacios)`}
              </button>
            </div>
          </form>
        ) : (
          /* FORMULARIO MODO 2: ESPACIO INDIVIDUAL */
          <form onSubmit={handleSubmitSingle} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="minimal-modal-body">
              <div className="minimal-field">
                <label htmlFor="minimal-floor-select">Piso o Ubicación</label>
                <select
                  id="minimal-floor-select"
                  required
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                >
                  {registeredFloors.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="minimal-field">
                <label>Número o Nombre de la Habitación</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. 101, 102, 204..."
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </div>
            </div>

            <div className="minimal-modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={saving || !singleName.trim()}
              >
                <span className="material-symbol" aria-hidden="true">
                  {saving ? "hourglass_top" : "check"}
                </span>
                {saving ? "Guardando..." : "Crear Habitación"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function RoomsPage() {
  const { state, loading, error, refresh } = useHotelData();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get("room") || searchParams.get("id");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(roomParam);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [spaceCategoryFilter, setSpaceCategoryFilter] = useState<"all" | "habitacion" | "zona_comun">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (roomParam) {
      setSelectedRoom(roomParam);
    }
  }, [roomParam]);

  const handleSelectRoom = (roomId: string | null) => {
    setSelectedRoom(roomId);
    if (roomId) {
      setSearchParams({ room: roomId });
    } else {
      const next = new URLSearchParams(searchParams);
      next.delete("room");
      next.delete("id");
      setSearchParams(next);
    }
  };

  const roomIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );

  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    for (const id of roomIds) {
      const isCommon = state.spaceTypes[id] === "zona_comun";
      const f = state.floors[id]?.trim() || detectFloor(id, undefined, isCommon);
      if (f && f.toLowerCase() !== "zonas comunes" && f.toLowerCase() !== "áreas comunes") {
        set.add(f);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [roomIds, state.floors, state.spaceTypes]);

  const commonAreasCount = useMemo(() => {
    return roomIds.filter((id) => state.spaceTypes[id] === "zona_comun").length;
  }, [roomIds, state.spaceTypes]);

  const roomsCount = useMemo(() => {
    return roomIds.filter((id) => state.spaceTypes[id] !== "zona_comun").length;
  }, [roomIds, state.spaceTypes]);

  const visibleRoomIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return roomIds.filter((roomId) => {
      const isCommonArea = state.spaceTypes[roomId] === "zona_comun";
      const roomFloor = state.floors[roomId] || detectFloor(roomId, undefined, isCommonArea);

      if (selectedFilter === "zonas_comunes" && !isCommonArea) {
        return false;
      }
      if (selectedFilter !== "all" && selectedFilter !== "zonas_comunes") {
        if (roomFloor !== selectedFilter) {
          return false;
        }
      }

      // Filtro de categoría de espacio: Todas / Habitaciones / Estructuras y Comunes
      if (spaceCategoryFilter === "habitacion" && isCommonArea) {
        return false;
      }
      if (spaceCategoryFilter === "zona_comun" && !isCommonArea) {
        return false;
      }

      return !query || [
        roomId,
        state.guests[roomId] ?? "",
        state.servicePlans[roomId] ?? "",
        state.assignedCleanings[roomId]?.staffName ?? "",
        roomFloor,
        isCommonArea ? "zona comun común estructura" : "habitacion estándar normal",
      ].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [roomIds, search, selectedFilter, spaceCategoryFilter, state.assignedCleanings, state.floors, state.guests, state.servicePlans, state.spaceTypes]);

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

  const isViewingRoom = Boolean(selectedRoom && (loading || roomIds.includes(selectedRoom)));

  return (
    <div className="page-stack rooms-page">
      <div className="rooms-compact-header">
        <div className="rooms-compact-title-wrap">
          <h1 className="rooms-compact-title">
            <span className="rooms-title-full">Habitaciones y Espacios</span>
            <span className="rooms-title-mobile">Habitaciones</span>
          </h1>
          <span className="rooms-compact-badge">
            <span className="rooms-badge-count">{roomIds.length}</span>
            <span className="rooms-badge-suffix"> registrados</span>
          </span>
        </div>
        {!isViewingRoom && (
          <div className="room-heading-actions">
            <button
              type="button"
              className="button button-primary rooms-create-btn"
              onClick={() => setIsCreateModalOpen(true)}
              title="Crear un nuevo espacio, habitación o piso completo con sus áreas compartidas"
            >
              <span className="material-symbol" aria-hidden="true">add_circle</span>
              <span className="rooms-create-text-full">Nuevo Espacio / Piso</span>
              <span className="rooms-create-text-mobile">Nuevo</span>
            </button>
          </div>
        )}
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
            onClick={() => handleSelectRoom(null)}
            type="button"
          >
            <span className="material-symbol" aria-hidden="true">arrow_back</span>
            Todos los espacios
          </button>
          <RoomCard key={selectedRoom} roomId={selectedRoom} onDelete={() => handleSelectRoom(null)} />
        </section>
      ) : (
        <section className="room-selection">
          {/* Barra de Control Unificada y Ultra Compacta */}
          <div className="rooms-unified-toolbar">
            <div className="rooms-toolbar-main-row">
              {/* Buscador Rápido */}
              <div className="rooms-compact-search">
                <span className="material-symbol" aria-hidden="true">search</span>
                <input
                  aria-label="Buscar habitación o espacio"
                  autoComplete="off"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="rooms-search-clear"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearch("")}
                  >
                    <span className="material-symbol" aria-hidden="true">close</span>
                  </button>
                )}
              </div>

              {/* Categoría de Espacio (Segmented control) */}
              <div className="rooms-category-segmented" role="group" aria-label="Filtrar por categoría">
                <button
                  type="button"
                  className={`rooms-segmented-item ${spaceCategoryFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setSpaceCategoryFilter("all")}
                >
                  Todos <span className="segmented-count">{roomIds.length}</span>
                </button>
                <button
                  type="button"
                  className={`rooms-segmented-item ${spaceCategoryFilter === "habitacion" ? "is-active" : ""}`}
                  onClick={() => setSpaceCategoryFilter("habitacion")}
                >
                  <span className="material-symbol" aria-hidden="true">bedroom_parent</span>
                  <span className="cat-label-full">Habitaciones</span>
                  <span className="cat-label-mobile">Cuartos</span>
                  <span className="segmented-count">{roomsCount}</span>
                </button>
                <button
                  type="button"
                  className={`rooms-segmented-item ${spaceCategoryFilter === "zona_comun" ? "is-active" : ""}`}
                  onClick={() => setSpaceCategoryFilter("zona_comun")}
                >
                  <span className="material-symbol" aria-hidden="true">apartment</span>
                  <span className="cat-label-full">Áreas Compartidas</span>
                  <span className="cat-label-mobile">Comunes</span>
                  <span className="segmented-count">{commonAreasCount}</span>
                </button>
              </div>

              {/* Contador de resultados */}
              <div className="rooms-compact-count">
                {visibleRoomIds.length} {visibleRoomIds.length === 1 ? "espacio" : "espacios"}
              </div>
            </div>

            {/* Fila de Pisos Compacta */}
            {availableFloors.length > 0 && (
              <div className="rooms-floors-compact-row" role="tablist" aria-label="Filtrar por piso">
                <span className="rooms-floors-hint">Piso:</span>
                <div className="rooms-floors-chips-scroll">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedFilter === "all"}
                    className={`rooms-floor-chip ${selectedFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setSelectedFilter("all")}
                  >
                    Todos
                  </button>
                  {availableFloors.map((floor) => {
                    const count = roomIds.filter(
                      (id) => (state.floors[id] || detectFloor(id, undefined, state.spaceTypes[id] === "zona_comun")) === floor,
                    ).length;
                    return (
                      <button
                        key={floor}
                        type="button"
                        role="tab"
                        aria-selected={selectedFilter === floor}
                        className={`rooms-floor-chip ${selectedFilter === floor ? "is-active" : ""}`}
                        onClick={() => setSelectedFilter(floor)}
                      >
                        <span className="material-symbol" aria-hidden="true">layers</span>
                        <span>{floor}</span>
                        <span className="floor-count-bubble">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {visibleRoomIds.length === 0 ? (
            <p className="empty-state">No hay espacios que coincidan con la búsqueda o filtro seleccionado.</p>
          ) : (
            <div className="room-picker-grid">
              {(() => {
                let freeCardCounter = 0;
                return visibleRoomIds.map((roomId) => {
                  const roomStatus = state.rooms[roomId] ?? "unknown";
                  const isFree = roomStatus === "free";
                  const freeToneIndex = isFree ? freeCardCounter++ : undefined;

                  return (
                    <RoomPickerCard
                      key={roomId}
                      roomId={roomId}
                      status={roomStatus}
                      guest={state.guests[roomId] ?? ""}
                      servicePlan={state.servicePlans[roomId] ?? ""}
                      cleanerName={state.assignedCleanings[roomId]?.staffName ?? ""}
                      cleanerId={state.assignedCleanings[roomId]?.staffId ?? null}
                      floor={state.floors[roomId] || detectFloor(roomId, undefined, state.spaceTypes[roomId] === "zona_comun")}
                      isCommonArea={state.spaceTypes[roomId] === "zona_comun"}
                      freeToneIndex={freeToneIndex}
                      onSelect={() => handleSelectRoom(roomId)}
                    />
                  );
                });
              })()}
            </div>
          )}
        </section>
      )}

      <CreateSpaceOrFloorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(targetIdOrFloor) => {
          refresh().then(() => {
            if (availableFloors.includes(targetIdOrFloor)) {
              setSelectedFilter(targetIdOrFloor);
            } else {
              handleSelectRoom(targetIdOrFloor);
            }
          });
        }}
        existingFloors={availableFloors}
      />
    </div>
  );
}

export function CleaningPage() {
  const navigate = useNavigate();
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const [error, setError] = useState<string | null>(null);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "cleaning" | "unassigned" | "finished">("all");

  const allCleaningRooms = Object.keys(state.rooms)
    .filter((room) =>
      ["pending", "cleaning", "finished"].includes(state.rooms[room]) ||
      Boolean(state.assignedCleanings[room]?.staffId) ||
      Boolean(state.scheduledCleaningDates[room])
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const pendingCount = allCleaningRooms.filter((room) => {
    const s = state.rooms[room];
    return s === "pending" || (!["cleaning", "finished"].includes(s) && (Boolean(state.assignedCleanings[room]?.staffId) || Boolean(state.scheduledCleaningDates[room])));
  }).length;
  const activeCount = allCleaningRooms.filter((room) => state.rooms[room] === "cleaning").length;
  const finishedCount = allCleaningRooms.filter((room) => state.rooms[room] === "finished").length;
  const unassignedCount = allCleaningRooms.filter(
    (roomId) => !["finished"].includes(state.rooms[roomId]) && !state.assignedCleanings[roomId]?.staffId,
  ).length;

  const filteredByStatus = allCleaningRooms.filter((roomId) => {
    const s = state.rooms[roomId];
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") {
      return s === "pending" || (!["cleaning", "finished"].includes(s) && (Boolean(state.assignedCleanings[roomId]?.staffId) || Boolean(state.scheduledCleaningDates[roomId])));
    }
    if (statusFilter === "cleaning") return s === "cleaning";
    if (statusFilter === "finished") return s === "finished";
    if (statusFilter === "unassigned") return !["finished"].includes(s) && !state.assignedCleanings[roomId]?.staffId;
    return true;
  });

  const query = search.trim().toLocaleLowerCase("es");
  const visibleRooms = filteredByStatus.filter((roomId) => !query || [
    roomId,
    state.guests[roomId] ?? "",
    state.servicePlans[roomId] ?? "",
    state.assignedCleanings[roomId]?.staffName ?? "",
  ].some((value) => value.toLocaleLowerCase("es").includes(query)));

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

  async function finishCleaning(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    let statusUpdated = false;
    try {
      await updateRoom(roomId, { status: "finished" });
      statusUpdated = true;
      await addEvent({
        room: roomId,
        status: "finished",
        action: "Limpieza finalizada",
        guest: state.guests[roomId] ?? null,
        actor: session?.user.email ?? "Administrador",
        cleanerId: state.assignedCleanings[roomId]?.staffId ?? null,
        cleaningType: state.assignedCleanings[roomId]?.cleaningType ?? null,
        time: new Date().toISOString(),
      });
      await refresh();
    } catch (finishError: unknown) {
      if (statusUpdated) await refresh();
      setError(messageOf(finishError));
    } finally {
      setBusyRoom(null);
    }
  }

  const getFilterLabel = () => {
    switch (statusFilter) {
      case "pending": return "Pendientes";
      case "cleaning": return "En Curso";
      case "unassigned": return "Sin Asignar";
      case "finished": return "Finalizadas";
      default: return "Todas";
    }
  };

  return (
    <div className="page-stack cleaning-page">
      <header className="cleaning-header">
        <div className="cleaning-title">
          <p className="eyebrow">Operación diaria</p>
          <h1>Limpiezas</h1>
          <p className="page-description">Filtra y supervisa en tiempo real las habitaciones pendientes, en curso o finalizadas.</p>
        </div>
      </header>

      {/* Functional Cleaning Statuses Filter */}
      <section className="cleaning-overview" aria-label="Filtro de estados de limpieza" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "all"}
          className={`cleaning-filter-card filter-all ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
          title="Ver todas las habitaciones en flujo de limpieza"
        >
          <div className="cleaning-filter-top">
            <span className="cleaning-filter-icon material-symbol" aria-hidden="true">apps</span>
            <strong className="cleaning-filter-count">{allCleaningRooms.length}</strong>
          </div>
          <div className="cleaning-filter-bottom">
            <span className="cleaning-filter-label">Todas</span>
            <span className="cleaning-filter-indicator" aria-hidden="true" />
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "pending"}
          className={`cleaning-filter-card filter-pending ${statusFilter === "pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("pending")}
          title="Ver habitaciones pendientes por limpiar"
        >
          <div className="cleaning-filter-top">
            <span className="cleaning-filter-icon material-symbol" aria-hidden="true">pending_actions</span>
            <strong className="cleaning-filter-count">{pendingCount}</strong>
          </div>
          <div className="cleaning-filter-bottom">
            <span className="cleaning-filter-label">Pendientes</span>
            <span className="cleaning-filter-indicator" aria-hidden="true" />
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "cleaning"}
          className={`cleaning-filter-card filter-cleaning ${statusFilter === "cleaning" ? "active" : ""}`}
          onClick={() => setStatusFilter("cleaning")}
          title="Ver habitaciones actualmente en limpieza"
        >
          <div className="cleaning-filter-top">
            <span className="cleaning-filter-icon material-symbol" aria-hidden="true">autorenew</span>
            <strong className="cleaning-filter-count">{activeCount}</strong>
          </div>
          <div className="cleaning-filter-bottom">
            <span className="cleaning-filter-label">En Curso</span>
            <span className="cleaning-filter-indicator" aria-hidden="true" />
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "unassigned"}
          className={`cleaning-filter-card filter-unassigned ${statusFilter === "unassigned" ? "active" : ""}`}
          onClick={() => setStatusFilter("unassigned")}
          title="Ver habitaciones sin personal asignado"
        >
          <div className="cleaning-filter-top">
            <span className="cleaning-filter-icon material-symbol" aria-hidden="true">person_off</span>
            <strong className="cleaning-filter-count">{unassignedCount}</strong>
          </div>
          <div className="cleaning-filter-bottom">
            <span className="cleaning-filter-label">Sin Asignar</span>
            <span className="cleaning-filter-indicator" aria-hidden="true" />
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "finished"}
          className={`cleaning-filter-card filter-finished ${statusFilter === "finished" ? "active" : ""}`}
          onClick={() => setStatusFilter("finished")}
          title="Ver habitaciones con limpieza finalizada"
        >
          <div className="cleaning-filter-top">
            <span className="cleaning-filter-icon material-symbol" aria-hidden="true">task_alt</span>
            <strong className="cleaning-filter-count">{finishedCount}</strong>
          </div>
          <div className="cleaning-filter-bottom">
            <span className="cleaning-filter-label">Finalizadas</span>
            <span className="cleaning-filter-indicator" aria-hidden="true" />
          </div>
        </button>
      </section>

      <ActionMessage error={error} success={null} />

      {allCleaningRooms.length === 0 ? (
        <p className="empty-state">No hay limpiezas pendientes o en curso en este momento.</p>
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
              {statusFilter !== "all" && <span className="filter-active-tag"> • Filtro: {getFilterLabel()}</span>}
            </p>
          </div>

          {visibleRooms.length === 0 ? (
            <div className="empty-filter-state">
              <span className="material-symbol" aria-hidden="true">filter_alt_off</span>
              <p>No hay habitaciones para el filtro <strong>"{getFilterLabel()}"</strong>{search ? ` y búsqueda "${search}"` : ""}.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => { setStatusFilter("all"); setSearch(""); }}
              >
                Ver todas las limpiezas
              </button>
            </div>
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
                      <div
                        role="button"
                        tabIndex={0}
                        className="room-card-heading-title"
                        onClick={() => navigate(`/app/habitaciones?room=${encodeURIComponent(roomId)}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/app/habitaciones?room=${encodeURIComponent(roomId)}`);
                          }
                        }}
                        title={`Ir a habitación ${roomId}`}
                      >
                        <p className="eyebrow">Habitación</p>
                        <h2>
                          {roomId}
                          <span className="material-symbol room-title-hover-icon" aria-hidden="true">open_in_new</span>
                        </h2>
                      </div>
                      <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
                    </div>
                    <dl className="details-list cleaning-details">
                      <div>
                        <dt>Aseador/a</dt>
                        <dd>
                          {assignment?.staffName ? (
                            <button
                              type="button"
                              className="staff-inline-link"
                              onClick={() => {
                                if (assignment.staffId) {
                                  navigate(`/app/personal?id=${encodeURIComponent(assignment.staffId)}`);
                                } else {
                                  navigate(`/app/personal?name=${encodeURIComponent(assignment.staffName)}`);
                                }
                              }}
                              title={`Ver ficha del personal: ${assignment.staffName}`}
                            >
                              <ModernAvatar3D
                                name={assignment.staffName}
                                size={16}
                                alt={`Avatar 3D de ${assignment.staffName}`}
                              />
                              <span>{assignment.staffName}</span>
                            </button>
                          ) : (
                            "Sin asignar"
                          )}
                        </dd>
                      </div>
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
                    <div className="cleaning-card-actions">
                      {status !== "cleaning" && status !== "finished" && (
                        <button
                          className="button button-primary"
                          disabled={busyRoom === roomId}
                          onClick={() => void startCleaning(roomId)}
                        >
                          <span className="material-symbol" aria-hidden="true">play_arrow</span>
                          {busyRoom === roomId ? "Actualizando…" : "Iniciar limpieza"}
                        </button>
                      )}
                      {status === "cleaning" && (
                        <button
                          className="button button-primary cleaning-finish-btn"
                          disabled={busyRoom === roomId}
                          onClick={() => void finishCleaning(roomId)}
                        >
                          <span className="material-symbol" aria-hidden="true">check_circle</span>
                          {busyRoom === roomId ? "Guardando…" : "Finalizar limpieza"}
                        </button>
                      )}
                      {status === "finished" && (
                        <div className="cleaning-completed-tag">
                          <span className="material-symbol" aria-hidden="true">verified</span>
                          <span>Limpieza completada</span>
                        </div>
                      )}
                    </div>
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
  const { state, loading, error } = useHotelData();
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "lifecycle" | "novelty" | "status" | "cleaning">("all");

  const allRecords = useMemo(() => {
    type HistoryCategory = "all" | "lifecycle" | "novelty" | "status" | "cleaning";
    interface UnifiedHistoryRecord {
      id: string;
      time: string;
      room: string;
      category: HistoryCategory;
      kind: "created" | "deleted" | "novelty" | "status" | "cleaning" | "other";
      statusPillClass: string;
      statusLabel: string;
      action: string;
      actor: string;
      guest?: string | null;
    }

    const unifiedFromEvents: UnifiedHistoryRecord[] = (state.events || []).map((ev, index) => {
      const actionLower = (ev.action || "").toLowerCase();
      let category: HistoryCategory = "status";
      let kind: UnifiedHistoryRecord["kind"] = "status";
      let statusPillClass = `status-${ev.status || "free"}`;
      let statusLabel = statusLabels[ev.status] || "Registrado";

      if (actionLower.includes("cread")) {
        category = "lifecycle";
        kind = "created";
        statusPillClass = "status-created";
        statusLabel = "Creación";
      } else if (actionLower.includes("eliminad")) {
        category = "lifecycle";
        kind = "deleted";
        statusPillClass = "status-deleted";
        statusLabel = "Baja / Eliminada";
      } else if (actionLower.includes("novedad")) {
        category = "novelty";
        kind = "novelty";
        statusPillClass = "status-novelty";
        statusLabel = "Novedad";
      } else if (actionLower.includes("limpie") || actionLower.includes("aseo")) {
        category = "cleaning";
        kind = "cleaning";
        statusPillClass = `status-${ev.status || "cleaning"}`;
        statusLabel = statusLabels[ev.status] || "Limpieza";
      }

      return {
        id: `ev-${ev.room}-${ev.time}-${index}`,
        time: ev.time || new Date().toISOString(),
        room: ev.room,
        category,
        kind,
        statusPillClass,
        statusLabel,
        action: ev.action,
        actor: ev.actor || "Sistema",
        guest: ev.guest || null,
      };
    });

    const unifiedFromNovelties: UnifiedHistoryRecord[] = (state.novelties || [])
      .filter((nov) => {
        return !state.events.some(
          (ev) =>
            ev.action?.includes(nov.label || nov.type) &&
            (ev.actor === nov.staffName || ev.time?.slice(0, 10) === nov.date),
        );
      })
      .map((nov, index) => {
        const notePart = nov.notes ? ` - ${nov.notes}` : "";
        const extraMin = nov.extraMinutes ? ` (${nov.extraMinutes} min)` : "";
        return {
          id: `nov-${nov.id || index}`,
          time: nov.createdAt || `${nov.date}T12:00:00.000Z`,
          room: "Personal / Novedad",
          category: "novelty" as HistoryCategory,
          kind: "novelty" as const,
          statusPillClass: "status-novelty",
          statusLabel: nov.label || "Novedad",
          action: `Novedad [${nov.label || nov.type}]: ${nov.staffName || "Personal"}${notePart}${extraMin}`,
          actor: nov.staffName || "Personal",
          guest: null,
        };
      });

    return [...unifiedFromEvents, ...unifiedFromNovelties].sort((a, b) => {
      const timeA = new Date(a.time).getTime() || 0;
      const timeB = new Date(b.time).getTime() || 0;
      return timeB - timeA;
    });
  }, [state.events, state.novelties]);

  const counts = useMemo(() => {
    return {
      all: allRecords.length,
      lifecycle: allRecords.filter((r) => r.category === "lifecycle").length,
      novelty: allRecords.filter((r) => r.category === "novelty").length,
      status: allRecords.filter((r) => r.category === "status").length,
      cleaning: allRecords.filter((r) => r.category === "cleaning").length,
    };
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return allRecords.filter((rec) => {
      if (categoryFilter !== "all" && rec.category !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      return [
        rec.room,
        rec.action,
        rec.actor,
        rec.guest ?? "",
        rec.statusLabel,
      ].some((val) => val.toLocaleLowerCase().includes(query));
    });
  }, [allRecords, categoryFilter, filter]);

  return (
    <div className="page-stack history-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="material-symbol" style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "4px" }}>
              videocam
            </span>
            Caja Negra &amp; Auditoría del Hotel
          </p>
          <h1>Historial Operativo</h1>
          <p className="page-description">
            Cámara de seguridad de la app: registro inmutable de creaciones, bajas de habitaciones, novedades de personal y cambios de estado.
          </p>
        </div>
      </div>

      <div className="history-category-tabs">
        <button
          type="button"
          className={`history-cat-btn ${categoryFilter === "all" ? "active" : ""}`}
          onClick={() => setCategoryFilter("all")}
        >
          <span className="material-symbol" aria-hidden="true">visibility</span>
          Todos
          <span className="history-badge-count">{counts.all}</span>
        </button>
        <button
          type="button"
          className={`history-cat-btn ${categoryFilter === "lifecycle" ? "active" : ""}`}
          onClick={() => setCategoryFilter("lifecycle")}
        >
          <span className="material-symbol" aria-hidden="true">domain</span>
          Altas y Bajas
          <span className="history-badge-count">{counts.lifecycle}</span>
        </button>
        <button
          type="button"
          className={`history-cat-btn ${categoryFilter === "novelty" ? "active" : ""}`}
          onClick={() => setCategoryFilter("novelty")}
        >
          <span className="material-symbol" aria-hidden="true">warning</span>
          Novedades
          <span className="history-badge-count">{counts.novelty}</span>
        </button>
        <button
          type="button"
          className={`history-cat-btn ${categoryFilter === "status" ? "active" : ""}`}
          onClick={() => setCategoryFilter("status")}
        >
          <span className="material-symbol" aria-hidden="true">swap_horiz</span>
          Estados &amp; Huéspedes
          <span className="history-badge-count">{counts.status}</span>
        </button>
        <button
          type="button"
          className={`history-cat-btn ${categoryFilter === "cleaning" ? "active" : ""}`}
          onClick={() => setCategoryFilter("cleaning")}
        >
          <span className="material-symbol" aria-hidden="true">cleaning_services</span>
          Limpiezas
          <span className="history-badge-count">{counts.cleaning}</span>
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
                placeholder="Introduce habitación, personal, acción, huésped o fecha"
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
          {filteredRecords.length} {filteredRecords.length === 1 ? "registro" : "registros"}
        </p>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && state.events.length === 0 ? (
        <p className="empty-state">Cargando historial…</p>
      ) : filteredRecords.length === 0 ? (
        <p className="empty-state">No hay movimientos que coincidan con los filtros aplicados.</p>
      ) : (
        <section className="page-card table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: "160px" }}>Fecha y Hora</th>
                <th style={{ width: "170px" }}>Espacio / Origen</th>
                <th style={{ width: "140px" }}>Evento / Tipo</th>
                <th>Detalle de Acción / Novedad</th>
                <th style={{ width: "180px" }}>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="history-time-stamp">{formatDate(item.time)}</span>
                  </td>
                  <td>
                    {item.kind === "deleted" ? (
                      <span className="history-room-tag is-deleted">
                        <span className="material-symbol" aria-hidden="true">delete_forever</span>
                        {item.room}
                      </span>
                    ) : item.kind === "created" ? (
                      <span className="history-room-tag is-created">
                        <span className="material-symbol" aria-hidden="true">add_circle</span>
                        {item.room}
                      </span>
                    ) : item.kind === "novelty" ? (
                      <span className="history-room-tag is-novelty">
                        <span className="material-symbol" aria-hidden="true">badge</span>
                        {item.room}
                      </span>
                    ) : (
                      <strong>Hab. {item.room}</strong>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${item.statusPillClass}`}>
                      {item.statusLabel}
                    </span>
                  </td>
                  <td>
                    <div className="history-action-cell">
                      <span>{item.action}</span>
                      {item.guest && (
                        <small className="history-guest-note">
                          <span className="material-symbol" aria-hidden="true">person</span>
                          {item.guest}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="history-actor-name">
                      <span className="material-symbol" aria-hidden="true">account_circle</span>
                      {item.actor}
                    </span>
                  </td>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const staffParamId = searchParams.get("id") || searchParams.get("staff");
  const staffParamName = searchParams.get("name");

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [passwordModalStaff, setPasswordModalStaff] = useState<StaffMember | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminPasswordSaving, setAdminPasswordSaving] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "on_shift" | "off_shift" | "has_account">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const selectedStaffId = useMemo(() => {
    if (staffParamId) {
      const match = state.staff.find((person) => person.id === staffParamId);
      if (match) return match.id;
    }
    if (staffParamName) {
      const match = state.staff.find((person) => person.name.trim().toLowerCase() === staffParamName.trim().toLowerCase());
      if (match) return match.id;
    }
    return null;
  }, [staffParamId, staffParamName, state.staff]);
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
  const [reportFilter, setReportFilter] = useState<"all" | "finished" | "in_progress" | "shifts" | "assignments">("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      const isOngoing = !attendance.checkOut;
      rows.push({
        timestamp: new Date(start).toISOString(),
        category: "Jornada",
        status: isOngoing ? "in_progress" : "completed",
        statusLabel: isOngoing ? "En curso" : "Completada",
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
      const durationMinutes = state.cleaningTimes?.[work.room] ?? 30;
      const durationHours = durationMinutes / 60;
      rows.push({
        timestamp: work.time,
        category: "Habitación terminada",
        status: "completed",
        statusLabel: "Terminada",
        room: work.room,
        detail: `${work.cleaningType || "Limpieza"} (${durationMinutes} min)`,
        hours: durationHours,
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
      const isCurrent = !assignment.unassignedAt;
      rows.push({
        timestamp: new Date(start).toISOString(),
        category: "Asignación",
        status: isCurrent ? "in_progress" : "completed",
        statusLabel: isCurrent ? "Activa" : "Finalizada",
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
    state.cleaningTimes,
  ]);

  const finishedCount = useMemo(() => reportRows.filter((r) => r.category === "Habitación terminada").length, [reportRows]);
  const inProgressCount = useMemo(() => reportRows.filter((r) => r.status === "in_progress").length, [reportRows]);
  const shiftsCount = useMemo(() => reportRows.filter((r) => r.category === "Jornada").length, [reportRows]);
  const assignmentsCount = useMemo(() => reportRows.filter((r) => r.category === "Asignación").length, [reportRows]);

  const filteredReportRows = useMemo(() => {
    if (reportFilter === "all") return reportRows;
    if (reportFilter === "finished") return reportRows.filter((r) => r.category === "Habitación terminada");
    if (reportFilter === "in_progress") return reportRows.filter((r) => r.status === "in_progress");
    if (reportFilter === "shifts") return reportRows.filter((r) => r.category === "Jornada");
    if (reportFilter === "assignments") return reportRows.filter((r) => r.category === "Asignación");
    return reportRows;
  }, [reportRows, reportFilter]);

  const reportHours = reportRows.reduce((total, row) => total + (row.hours ?? 0), 0);
  const cleaningHours = useMemo(
    () => reportRows.filter((r) => r.category === "Habitación terminada").reduce((total, row) => total + (row.hours ?? 0), 0),
    [reportRows]
  );
  const shiftHours = useMemo(
    () => reportRows.filter((r) => r.category === "Jornada").reduce((total, row) => total + (row.hours ?? 0), 0),
    [reportRows]
  );
  const staffOnShiftCount = state.staff.filter((person) =>
    state.attendance.some((record) => record.staffId === person.id && !record.checkOut),
  ).length;
  const staffOffShiftCount = state.staff.length - staffOnShiftCount;
  const staffWithAccountCount = state.staff.filter((person) => person.hasAccount).length;

  const visibleStaff = state.staff.filter((person) => {
    const isOnShift = state.attendance.some((record) => record.staffId === person.id && !record.checkOut);
    if (statusFilter === "on_shift" && !isOnShift) return false;
    if (statusFilter === "off_shift" && isOnShift) return false;
    if (statusFilter === "has_account" && !person.hasAccount) return false;

    const query = staffFilter.trim().toLocaleLowerCase("es");
    return !query || [person.name, person.contact, person.email ?? ""]
      .some((value) => value.toLocaleLowerCase("es").includes(query));
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCustom = customPassword.trim();
    if (trimmedCustom && trimmedCustom.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const password = await createStaff(
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          contact: contact.trim(),
          email: email.trim().toLowerCase(),
          hasAccount: false,
        },
        trimmedCustom || undefined,
      );
      setNewPassword(password);
      setCredentialUsername(email.trim().toLowerCase());
      setCredentialName(`${name.trim()} (${email.trim().toLowerCase()})`);
      setName("");
      setContact("");
      setEmail("");
      setCustomPassword("");
      setShowCreateForm(false);
      setSuccess(
        trimmedCustom
          ? "Personal registrado y cuenta creada con la contraseña establecida."
          : "Registro creado. Copia la clave temporal; solo se mostrará una vez.",
      );
      await refresh();
    } catch (createError: unknown) {
      setError(messageOf(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordModalStaff) return;
    setAdminPasswordError(null);
    const trimmed = adminNewPassword.trim();
    if (trimmed.length < 6) {
      setAdminPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (trimmed !== adminConfirmPassword.trim()) {
      setAdminPasswordError("Las contraseñas no coinciden.");
      return;
    }
    setAdminPasswordSaving(true);
    try {
      await changeStaffPassword(passwordModalStaff.id, trimmed);
      setCredentialUsername(passwordModalStaff.email ?? "");
      setCredentialName(`${passwordModalStaff.name} (${passwordModalStaff.email ?? ""})`);
      setNewPassword(trimmed);
      setSuccess(`Contraseña de ${passwordModalStaff.name} actualizada correctamente.`);
      setPasswordModalStaff(null);
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (err: unknown) {
      setAdminPasswordError(messageOf(err));
    } finally {
      setAdminPasswordSaving(false);
    }
  }

  async function handleAdminGenerateRandom(person: StaffMember) {
    setAdminPasswordSaving(true);
    setAdminPasswordError(null);
    try {
      const password = await resetCleanerPassword(person.id);
      setCredentialUsername(person.email ?? "");
      setCredentialName(`${person.name} (${person.email ?? ""})`);
      setNewPassword(password);
      setSuccess(`Nueva contraseña provisional generada para ${person.name}.`);
      setPasswordModalStaff(null);
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (err: unknown) {
      setAdminPasswordError(messageOf(err));
    } finally {
      setAdminPasswordSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!staffToDelete) return;
    if (deleteConfirmName.trim() !== staffToDelete.name.trim()) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteStaff(staffToDelete.id);
      const deletedName = staffToDelete.name;
      if (selectedStaffId === staffToDelete.id) {
        setSearchParams({}, { replace: true });
      }
      setStaffToDelete(null);
      setDeleteConfirmName("");
      setSuccess(`El empleado "${deletedName}" ha sido eliminado exitosamente.`);
      await refresh();
    } catch (err: unknown) {
      setDeleteError(messageOf(err));
    } finally {
      setDeleting(false);
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
    const headers = ["Personal", "Desde", "Hasta", "Actividad", "Estado", "Fecha", "Habitación", "Detalle", "Horas trabajadas"];
    const exportRows = filteredReportRows;
    const csvRows = exportRows.map((row) => [
      person.name,
      reportStart,
      reportEnd,
      row.category,
      row.statusLabel,
      row.timestamp,
      row.room,
      row.detail,
      row.hours === null ? "" : row.hours.toFixed(2),
    ]);
    const filteredHours = exportRows.reduce((acc, row) => acc + (row.hours ?? 0), 0);
    const csv = [
      headers,
      ...csvRows,
      ["", "", "", "Total", "", "", "", "", filteredHours.toFixed(2)],
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
        <div className="staff-header-actions">
          {!selectedStaff && (
            <button
              className="button button-primary"
              onClick={() => setShowCreateForm(true)}
              type="button"
            >
              <span className="material-symbol" aria-hidden="true">add</span>
              Agregar personal
            </button>
          )}
        </div>
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
          <div className="staff-detail-hub">
            {/* 1. Barra de Navegación y Breadcrumb */}
            <div className="detail-nav-bar">
              <button
                className="back-btn"
                onClick={() => {
                  setSearchParams({}, { replace: true });
                  setEditingStaffId(null);
                  setError(null);
                  setSuccess(null);
                }}
                type="button"
                title="Volver al listado general de personal"
              >
                <span className="material-symbol" aria-hidden="true">arrow_back</span>
                <span>Volver al personal</span>
              </button>
              <div className="breadcrumb-trail">
                <span>OPERACIÓN EN VIVO</span>
                <span>/</span>
                <span>Personal</span>
                <span>/</span>
                <strong>Ficha de {selectedStaff.name}</strong>
              </div>
            </div>

            {/* 2. Bento Hero Profile Card */}
            <section className="staff-hero-bento">
              <div className="hero-identity-group">
                <div className="hero-avatar-box">
                  <ModernAvatar3D
                    name={selectedStaff.name}
                    size={56}
                    className="hero-avatar-img"
                    alt={`Avatar 3D de ${selectedStaff.name}`}
                  />
                  <span
                    className={`hero-shift-beacon ${selectedAttendance ? "is-on-shift" : "is-off-shift"}`}
                    title={selectedAttendance ? "En turno activo ahora" : "Fuera de turno"}
                    aria-hidden="true"
                  />
                </div>

                <div className="hero-info-texts">
                  <div className="hero-title-row">
                    <h2 className="hero-staff-name">{selectedStaff.name}</h2>
                    <span className="role-badge">
                      {selectedStaff.name.toLowerCase().includes("supervis") ? "Supervisora" : selectedStaff.name.toLowerCase().includes("admin") ? "Administrador" : "Equipo"}
                    </span>
                    <span className={`shift-badge-active ${selectedAttendance ? "is-on" : "is-off"}`}>
                      <span className={`pulse-dot ${selectedAttendance ? "active" : ""}`} aria-hidden="true" />
                      <span>{selectedAttendance ? `En Turno (Desde ${formatDate(selectedAttendance.checkIn)})` : "Fuera de Turno"}</span>
                    </span>
                  </div>

                  <div className="hero-quick-strip">
                    <a href={`tel:${selectedStaff.contact}`} className="hero-quick-item" title="Llamar directamente">
                      <span className="material-symbol" aria-hidden="true">call</span>
                      <span>{selectedStaff.contact}</span>
                    </a>
                    <span className="strip-dot" aria-hidden="true">•</span>
                    <a href={`mailto:${selectedStaff.email || ""}`} className="hero-quick-item" title="Enviar correo">
                      <span className="material-symbol" aria-hidden="true">mail</span>
                      <span>{selectedStaff.email || "Sin correo"}</span>
                    </a>
                    <span className="strip-dot" aria-hidden="true">•</span>
                    <span className="hero-quick-item hero-access-item">
                      <span className="material-symbol" aria-hidden="true">
                        {selectedStaff.hasAccount ? "verified_user" : "no_accounts"}
                      </span>
                      <span>{selectedStaff.hasAccount ? "Acceso Activo" : "Sin Acceso"}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="hero-actions-group">
                <button
                  className={`btn-action-primary ${editingStaffId === selectedStaff.id ? "is-active" : ""}`}
                  onClick={() => editingStaffId === selectedStaff.id
                    ? setEditingStaffId(null)
                    : startEditingStaff(selectedStaff)}
                  type="button"
                >
                  <span className="material-symbol" aria-hidden="true">
                    {editingStaffId === selectedStaff.id ? "close" : "edit"}
                  </span>
                  <span>{editingStaffId === selectedStaff.id ? "Cancelar edición" : "Editar Ficha"}</span>
                </button>
                {selectedStaff.hasAccount && (
                  <button
                    className="btn-action-secondary"
                    onClick={() => {
                      setPasswordModalStaff(selectedStaff);
                      setAdminNewPassword("");
                      setAdminConfirmPassword("");
                      setAdminPasswordError(null);
                    }}
                    type="button"
                    title="Cambiar contraseña del empleado"
                  >
                    <span className="material-symbol" aria-hidden="true">lock_reset</span>
                    <span>Cambiar Contraseña</span>
                  </button>
                )}
                <button
                  className="btn-action-danger"
                  onClick={() => {
                    setStaffToDelete(selectedStaff);
                    setDeleteConfirmName("");
                    setDeleteError(null);
                  }}
                  type="button"
                  title={`Eliminar a ${selectedStaff.name}`}
                  aria-label={`Eliminar a ${selectedStaff.name}`}
                >
                  <span className="material-symbol" aria-hidden="true">delete</span>
                </button>
              </div>
            </section>

            {/* Inline compact edit form */}
            {editingStaffId === selectedStaff.id && (
              <form className="staff-edit-form-compact" onSubmit={(event) => void handleUpdateStaff(event, selectedStaff)}>
                <div className="staff-edit-grid">
                  <label>
                    <span>Nombre completo</span>
                    <input required maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </label>
                  <label>
                    <span>Teléfono</span>
                    <input required maxLength={30} type="tel" value={editContact} onChange={(event) => setEditContact(event.target.value)} />
                  </label>
                  <label>
                    <span>Correo / usuario</span>
                    <input required={selectedStaff.hasAccount} autoComplete="email" maxLength={254} type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
                  </label>
                </div>
                <div className="staff-edit-actions">
                  <button className="button button-small button-primary" disabled={saving}>
                    <span className="material-symbol" aria-hidden="true">save</span>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    className="button button-small button-ghost"
                    onClick={() => setEditingStaffId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* 3. Bento Telemetry Metric Cards (3 Columnas) */}
            <div className="staff-bento-grid">
              <article className="bento-metric-card">
                <div className="bento-top-row">
                  <div className="bento-title-group">
                    <div className="bento-icon-box icon-blue">
                      <span className="material-symbol" aria-hidden="true">timelapse</span>
                    </div>
                    <span>Horas en Periodo</span>
                  </div>
                  <span className="bento-pill-tag tag-indigo">
                    {cleaningHours > 0 ? `${finishedCount} limpiezas` : "Registrado"}
                  </span>
                </div>
                <div className="bento-main-value">{reportHours.toFixed(2)} h</div>
                <div className="bento-sub-text">
                  {cleaningHours > 0 ? `🧹 ${cleaningHours.toFixed(2)} h en limpiezas (${finishedCount} habs)` : "Sin limpiezas registradas"}
                  {shiftHours > 0 ? ` · ⏱️ ${shiftHours.toFixed(2)} h en jornadas` : ""}
                </div>
              </article>

              <article className="bento-metric-card">
                <div className="bento-top-row">
                  <div className="bento-title-group">
                    <div className="bento-icon-box icon-emerald">
                      <span className="material-symbol" aria-hidden="true">hotel</span>
                    </div>
                    <span>Habitaciones Atendidas</span>
                  </div>
                  <span className="bento-pill-tag tag-emerald">
                    {finishedCount > 0 ? "98% Calidad" : "Al día"}
                  </span>
                </div>
                <div className="bento-main-value">{finishedCount} Habs</div>
                <div className="bento-sub-text">
                  {finishedCount > 0
                    ? `Promedio aprox. ${cleaningHours > 0 ? Math.round((cleaningHours * 60) / finishedCount) : 28} min por habitación`
                    : "0 habitaciones registradas en este rango de fechas"}
                </div>
              </article>

              <article className="bento-metric-card">
                <div className="bento-top-row">
                  <div className="bento-title-group">
                    <div className="bento-icon-box icon-amber">
                      <span className="material-symbol" aria-hidden="true">event_available</span>
                    </div>
                    <span>Jornadas & Turnos</span>
                  </div>
                  <span className={`bento-pill-tag ${selectedAttendance ? "tag-emerald" : "tag-indigo"}`}>
                    {selectedAttendance ? "En turno activo" : "Al día"}
                  </span>
                </div>
                <div className="bento-main-value">
                  {selectedAttendance ? "Activo" : `${shiftsCount} Jornadas`}
                </div>
                <div className="bento-sub-text">
                  {selectedAttendance
                    ? `Turno iniciado a las ${formatDate(selectedAttendance.checkIn)}`
                    : `${shiftsCount} jornadas completadas en el periodo seleccionado`}
                </div>
              </article>
            </div>

            {/* 4. Historial Operativo y Registro de Actividad */}
            <section className="staff-activity-card" aria-label={`Historial de trabajo de ${selectedStaff.name}`}>
              <div className="activity-card-header">
                <div className="activity-header-title">
                  <h3>Historial Operativo y Registro de Actividad</h3>
                  <p>Consolidado detallado de turnos de asistencia, habitaciones atendidas y horas calculadas.</p>
                </div>

                <div className="activity-header-toolbar">
                  <div className="date-range-box" title="Filtrar por rango de fechas">
                    <span className="material-symbol" aria-hidden="true">calendar_today</span>
                    <input
                      type="date"
                      aria-label="Fecha inicial"
                      value={reportStart}
                      onChange={(event) => setReportStart(event.target.value)}
                    />
                    <span>→</span>
                    <input
                      type="date"
                      aria-label="Fecha final"
                      value={reportEnd}
                      onChange={(event) => setReportEnd(event.target.value)}
                    />
                  </div>

                  <button
                    className="btn-export-csv"
                    disabled={!reportPeriod}
                    onClick={() => handleExportStaffReport(selectedStaff)}
                    type="button"
                    title="Exportar registros a archivo CSV"
                  >
                    <span className="material-symbol" aria-hidden="true">download</span>
                    CSV
                  </button>
                </div>
              </div>

              {/* Filtros por Estado */}
              <div className="activity-filter-bar" role="tablist" aria-label="Filtrar actividad por estado">
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportFilter === "all"}
                  className={`filter-chip-btn ${reportFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setReportFilter("all")}
                >
                  <span>Todos</span>
                  <span className="filter-chip-badge">{reportRows.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportFilter === "finished"}
                  className={`filter-chip-btn ${reportFilter === "finished" ? "is-active" : ""}`}
                  onClick={() => setReportFilter("finished")}
                >
                  <span className="filter-dot dot-emerald" aria-hidden="true">●</span>
                  <span>Terminadas</span>
                  <span className="filter-chip-badge">{finishedCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportFilter === "in_progress"}
                  className={`filter-chip-btn ${reportFilter === "in_progress" ? "is-active" : ""}`}
                  onClick={() => setReportFilter("in_progress")}
                >
                  <span className="filter-dot dot-amber" aria-hidden="true">●</span>
                  <span>En curso</span>
                  <span className="filter-chip-badge">{inProgressCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportFilter === "shifts"}
                  className={`filter-chip-btn ${reportFilter === "shifts" ? "is-active" : ""}`}
                  onClick={() => setReportFilter("shifts")}
                >
                  <span className="filter-dot dot-blue" aria-hidden="true">●</span>
                  <span>Jornadas</span>
                  <span className="filter-chip-badge">{shiftsCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportFilter === "assignments"}
                  className={`filter-chip-btn ${reportFilter === "assignments" ? "is-active" : ""}`}
                  onClick={() => setReportFilter("assignments")}
                >
                  <span className="filter-dot dot-purple" aria-hidden="true">●</span>
                  <span>Asignaciones</span>
                  <span className="filter-chip-badge">{assignmentsCount}</span>
                </button>
              </div>

              {!reportPeriod ? (
                <p className="form-error" role="alert">Selecciona un periodo válido: la fecha inicial debe ser anterior a la final.</p>
              ) : filteredReportRows.length === 0 ? (
                <div className="staff-report-empty-compact">
                  <span className="material-symbol" aria-hidden="true">filter_list_off</span>
                  <p>
                    {reportRows.length === 0
                      ? `No hay actividad registrada en este periodo para ${selectedStaff.name}.`
                      : "No hay registros con el estado seleccionado en este periodo."}
                  </p>
                  {reportRows.length > 0 && reportFilter !== "all" && (
                    <button
                      type="button"
                      className="button button-small button-ghost"
                      onClick={() => setReportFilter("all")}
                    >
                      Ver todos ({reportRows.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="activity-table-wrapper">
                  <table className="activity-table">
                    <thead>
                      <tr>
                        <th>Fecha y Hora</th>
                        <th>Actividad</th>
                        <th>Habitación / Espacio</th>
                        <th>Detalle Operativo</th>
                        <th>Estado</th>
                        <th style={{ textAlign: "right" }}>Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReportRows.map((row, index) => (
                        <tr key={`${row.category}-${row.timestamp}-${row.room}-${index}`}>
                          <td className="cell-date">{formatDate(row.timestamp)}</td>
                          <td>
                            <span className={`cat-tag cat-${row.category.toLowerCase().replace(/\s+/g, '-')}`}>
                              {row.category}
                            </span>
                          </td>
                          <td>
                            {row.room !== "—" ? (
                              <>
                                <span className="room-badge">{row.room}</span>
                                <span className="room-sub">Habitación</span>
                              </>
                            ) : (
                              <span style={{ color: "var(--th-text-muted)" }}>General</span>
                            )}
                          </td>
                          <td className="cell-detail">{row.detail}</td>
                          <td>
                            <span className={`status-badge ${row.status === "in_progress" ? "in-progress" : "finished"}`}>
                              <span className={`status-dot ${row.status === "in_progress" ? "pulse" : ""}`} aria-hidden="true" />
                              <span>{row.statusLabel}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--th-text-main)" }}>
                            {row.hours === null ? "—" : `${row.hours.toFixed(2)} h`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="staff-compact-hub">
            {/* Barra de Controles y Filtros */}
            <div className="staff-controls-bar">
              <div className="staff-filter-tabs" role="tablist" aria-label="Filtrar personal">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "all"}
                  className={`staff-filter-tab ${statusFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  <span>Todos</span>
                  <span className="staff-tab-count">{state.staff.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "on_shift"}
                  className={`staff-filter-tab on-shift-tab ${statusFilter === "on_shift" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("on_shift")}
                >
                  <span className="staff-tab-dot-shift" aria-hidden="true" />
                  <span>En turno</span>
                  <span className="staff-tab-count">{staffOnShiftCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "off_shift"}
                  className={`staff-filter-tab ${statusFilter === "off_shift" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("off_shift")}
                >
                  <span>Fuera de turno</span>
                  <span className="staff-tab-count">{staffOffShiftCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "has_account"}
                  className={`staff-filter-tab ${statusFilter === "has_account" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("has_account")}
                >
                  <span>Con acceso activo</span>
                  <span className="staff-tab-count">{staffWithAccountCount}</span>
                </button>
              </div>

              <div className="staff-right-tools">
                <Avatar3DStylePicker variant="dropdown" />
                <label className="staff-search-box">
                  <span className="material-symbol search-icon" aria-hidden="true">search</span>
                  <span className="sr-only">Buscar personal</span>
                  <input
                    type="search"
                    value={staffFilter}
                    onChange={(event) => setStaffFilter(event.target.value)}
                    placeholder="Buscar por nombre, teléfono o correo..."
                  />
                  {staffFilter && (
                    <button
                      type="button"
                      className="search-clear-button"
                      onClick={() => setStaffFilter("")}
                      aria-label="Limpiar búsqueda"
                    >
                      <span className="material-symbol" aria-hidden="true">close</span>
                    </button>
                  )}
                </label>
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
              <p className="staff-search-empty">No encontramos personal con “{staffFilter}”. Prueba con otro dato.</p>
            ) : (
              <div className="staff-table-wrap">
                <table className="staff-table-compact">
                  <thead>
                    <tr>
                      <th>Personal</th>
                      <th>Teléfono</th>
                      <th>Correo de Acceso</th>
                      <th>Estado de Turno</th>
                      <th>Cuenta</th>
                      <th style={{ textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStaff.map((person) => {
                      const onShift = state.attendance.some(
                        (record) => record.staffId === person.id && !record.checkOut,
                      );
                      return (
                        <tr
                          key={person.id}
                          onClick={() => {
                            setSearchParams({ id: person.id });
                            setEditingStaffId(null);
                            setError(null);
                            setSuccess(null);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <div className="table-avatar-cell">
                              <ModernAvatar3D
                                name={person.name}
                                size={28}
                                className="table-avatar-img"
                                alt=""
                              />
                              <strong className="table-name">{person.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="compact-meta-item">
                              <span className="material-symbol" aria-hidden="true">call</span>
                              {person.contact}
                            </span>
                          </td>
                          <td>{person.email || "Sin correo"}</td>
                          <td>
                            <span className={`compact-badge ${onShift ? "active" : "inactive"}`}>
                              <span className="compact-badge-dot" aria-hidden="true" />
                              {onShift ? "En turno" : "Fuera de turno"}
                            </span>
                          </td>
                          <td>
                            {person.hasAccount ? (
                              <span className="compact-access-tag">
                                <span className="material-symbol" aria-hidden="true">check_circle</span>
                                Activo
                              </span>
                            ) : (
                              <span className="compact-no-access-tag">Sin cuenta</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="compact-arrow-btn" aria-hidden="true">
                              <span className="material-symbol">arrow_forward</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {showCreateForm && (
        <div
          className="matrix-modal-backdrop"
          onClick={() => setShowCreateForm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-staff-modal-title"
        >
          <div
            className="matrix-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="matrix-modal-header">
              <div className="matrix-modal-title-group">
                <div className="matrix-modal-icon-badge status-cleaning">
                  <span className="material-symbol" aria-hidden="true">person_add</span>
                </div>
                <div>
                  <h3 id="create-staff-modal-title">Agregar nuevo personal</h3>
                  <span className="page-description" style={{ fontSize: "12px", color: "#64748b" }}>
                    Registra al empleado y crea sus credenciales de acceso al sistema.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="matrix-modal-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Cerrar modal"
              >
                <span className="material-symbol" aria-hidden="true">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gap: "12px", margin: "16px 0" }}>
                <label style={{ display: "grid", gap: "5px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--th-text-secondary)" }}>Nombre completo</span>
                  <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Carlos Mendoza" />
                </label>
                <label style={{ display: "grid", gap: "5px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--th-text-secondary)" }}>Teléfono de contacto</span>
                  <input required maxLength={30} type="tel" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Ej. 311 000 0000" />
                </label>
                <label style={{ display: "grid", gap: "5px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--th-text-secondary)" }}>Correo de acceso</span>
                  <input required autoComplete="email" maxLength={254} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="empleado@hotel.com" />
                </label>
                <label style={{ display: "grid", gap: "5px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--th-text-secondary)" }}>
                    Contraseña (opcional, mín. 6 caracteres. Si se deja vacía se genera automáticamente)
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    value={customPassword}
                    onChange={(event) => setCustomPassword(event.target.value)}
                    placeholder="Dejar vacía para generar automáticamente"
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  className="button button-subtle"
                  onClick={() => setShowCreateForm(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Crear ficha y cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalStaff && (
        <div
          className="matrix-modal-backdrop"
          onClick={() => setPasswordModalStaff(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-pwd-modal-title"
        >
          <div
            className="matrix-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="matrix-modal-header">
              <div className="matrix-modal-title-group">
                <div className="matrix-modal-icon-badge status-cleaning">
                  <span className="material-symbol" aria-hidden="true">lock_reset</span>
                </div>
                <div>
                  <h3 id="admin-pwd-modal-title">Cambiar contraseña</h3>
                  <span className="page-description" style={{ fontSize: "12px", color: "#64748b" }}>
                    {passwordModalStaff.name} {passwordModalStaff.email ? `• ${passwordModalStaff.email}` : ""}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="matrix-modal-close"
                onClick={() => setPasswordModalStaff(null)}
                aria-label="Cerrar modal"
              >
                <span className="material-symbol" aria-hidden="true">close</span>
              </button>
            </div>

            <form onSubmit={handleAdminPasswordSubmit}>
              <div style={{ display: "grid", gap: "14px", margin: "16px 0" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Nueva contraseña personalizada</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres (ej. hotel2025)"
                  />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Confirmar nueva contraseña</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                  />
                </label>
                {adminPasswordError && (
                  <p className="form-error" role="alert" style={{ margin: 0 }}>{adminPasswordError}</p>
                )}
              </div>
              <div className="matrix-modal-footer">
                <button
                  type="button"
                  className="button button-ghost button-small"
                  disabled={adminPasswordSaving}
                  onClick={() => void handleAdminGenerateRandom(passwordModalStaff)}
                  title="Generar una contraseña aleatoria y asignarla"
                >
                  <span className="material-symbol" aria-hidden="true">autorenew</span>
                  Generar clave aleatoria
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => setPasswordModalStaff(null)}
                    disabled={adminPasswordSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="button button-primary button-small"
                    disabled={adminPasswordSaving}
                  >
                    <span className="material-symbol" aria-hidden="true">save</span>
                    {adminPasswordSaving ? "Guardando…" : "Guardar contraseña"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {staffToDelete && (
        <div className="matrix-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-staff-title">
          <div className="matrix-modal-dialog delete-staff-dialog">
            <div className="matrix-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbol" style={{ color: "#dc2626", fontSize: "28px" }} aria-hidden="true">
                  warning
                </span>
                <div>
                  <h3 id="delete-staff-title" style={{ margin: 0, fontSize: "16px", color: "#991b1b" }}>
                    ¿Eliminar a {staffToDelete.name}?
                  </h3>
                  <span className="page-description" style={{ fontSize: "12px", color: "#64748b" }}>
                    Esta acción no se puede deshacer. Se desvincularán sus asignaciones y turnos.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="matrix-modal-close"
                onClick={() => {
                  if (!deleting) {
                    setStaffToDelete(null);
                    setDeleteConfirmName("");
                    setDeleteError(null);
                  }
                }}
                aria-label="Cerrar modal"
                disabled={deleting}
              >
                <span className="material-symbol" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="delete-staff-body" style={{ margin: "16px 0", display: "grid", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                Para confirmar la eliminación permanente de este empleado, escribe exactamente su nombre:{" "}
                <strong style={{ userSelect: "all", color: "#111827", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                  {staffToDelete.name}
                </strong>
              </p>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                  Escribe el nombre del empleado para confirmar
                </span>
                <input
                  type="text"
                  autoFocus
                  disabled={deleting}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={staffToDelete.name}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: deleteConfirmName.trim() === staffToDelete.name.trim() ? "#dc2626" : "#cbd5e1",
                    outline: "none",
                    boxShadow: deleteConfirmName.trim() === staffToDelete.name.trim() ? "0 0 0 2px rgba(220,38,38,0.2)" : undefined
                  }}
                />
              </label>

              {deleteError && (
                <div className="banner banner-error" style={{ margin: 0 }}>
                  <span className="material-symbol" aria-hidden="true">error</span>
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="matrix-modal-footer">
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => {
                  setStaffToDelete(null);
                  setDeleteConfirmName("");
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button-small button-danger-solid"
                disabled={deleteConfirmName.trim() !== staffToDelete.name.trim() || deleting}
                onClick={() => void handleConfirmDelete()}
              >
                <span className="material-symbol" aria-hidden="true">
                  {deleting ? "hourglass_empty" : "delete_forever"}
                </span>
                {deleting ? "Eliminando…" : "Entiendo las consecuencias, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CleanerTab = "jornada" | "nomina" | "perfil";

export function CleanerPortal() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [rooms, setRooms] = useState<CleanerRoom[]>([]);
  const [history, setHistory] = useState<CleanerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  // Tabs: Jornada, Nómina, Mi Perfil
  const [activeTab, setActiveTab] = useState<CleanerTab>("jornada");
  const [roomFilter, setRoomFilter] = useState<"all" | "cleaning" | "pending" | "finished">("all");
  const [payrollView, setPayrollView] = useState<"rooms" | "shifts">("rooms");

  const [startedRooms, setStartedRooms] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem("cleaner_started_rooms");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [roomStartTimes, setRoomStartTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = sessionStorage.getItem("cleaner_room_start_times");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [shiftStart] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem("cleaner_shift_start");
      if (saved) return Number(saved);
      const now = Date.now();
      sessionStorage.setItem("cleaner_shift_start", String(now));
      return now;
    } catch {
      return Date.now();
    }
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function formatTimer(ms: number) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatPlanName(plan: string | null | undefined): string {
    if (!plan) return "Servicio de Limpieza";
    const clean = plan.trim();
    const lower = clean.toLowerCase();
    if (lower === "profunda" || lower === "limpieza profunda") {
      return "Servicio de Limpieza";
    }
    if (lower.startsWith("servicio")) return clean;
    return `Servicio de Limpieza (${clean})`;
  }

  function markRoomStarted(roomId: string) {
    const currentTime = Date.now();
    setStartedRooms((prev) => {
      const next = new Set(prev);
      next.add(roomId);
      try {
        sessionStorage.setItem("cleaner_started_rooms", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    setRoomStartTimes((prev) => {
      const next = { ...prev, [roomId]: currentTime };
      try {
        sessionStorage.setItem("cleaner_room_start_times", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function markRoomFinished(roomId: string) {
    setStartedRooms((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      try {
        sessionStorage.setItem("cleaner_started_rooms", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    setRoomStartTimes((prev) => {
      const next = { ...prev };
      delete next[roomId];
      try {
        sessionStorage.setItem("cleaner_room_start_times", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

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

  async function handleStart(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    try {
      await startCleanerRoom(roomId);
      markRoomStarted(roomId);
      setRooms((prev) =>
        prev.map((r) =>
          r.id_habitacion === roomId
            ? { ...r, estado: "limpieza" }
            : r
        )
      );
      await loadCleanerData();
    } catch (startError: unknown) {
      setError(messageOf(startError));
    } finally {
      setBusyRoom(null);
    }
  }

  async function handleFinish(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    try {
      await finishCleanerRoom(roomId);
      markRoomFinished(roomId);
      setRooms((prev) =>
        prev.map((r) =>
          r.id_habitacion === roomId
            ? { ...r, estado: "finalizado" }
            : r
        )
      );
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
    try {
      sessionStorage.removeItem("cleaner_started_rooms");
      sessionStorage.removeItem("cleaner_room_start_times");
      sessionStorage.removeItem("cleaner_shift_start");
    } catch {}
    setStartedRooms(new Set());
    setRoomStartTimes({});
    setProfile(null);
    setRooms([]);
    setHistory([]);
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  }

  // Room status derivations
  const finishedRooms = useMemo(
    () => rooms.filter((r) => r.estado === "finalizado" || statusFromDb(r.estado) === "finished"),
    [rooms]
  );
  const activeRooms = useMemo(
    () => rooms.filter((r) => !finishedRooms.includes(r) && startedRooms.has(r.id_habitacion)),
    [rooms, finishedRooms, startedRooms]
  );
  const pendingRooms = useMemo(
    () => rooms.filter((r) => !finishedRooms.includes(r) && !startedRooms.has(r.id_habitacion)),
    [rooms, finishedRooms, startedRooms]
  );

  const progressPercent = rooms.length > 0 ? Math.round((finishedRooms.length / rooms.length) * 100) : 0;

  const filteredRooms = useMemo(() => {
    if (roomFilter === "cleaning") return activeRooms;
    if (roomFilter === "pending") return pendingRooms;
    if (roomFilter === "finished") return finishedRooms;
    return rooms;
  }, [rooms, roomFilter, activeRooms, pendingRooms, finishedRooms]);

  // Financial / Payroll derivations
  const RATE_PER_ROOM = 18000; // COP
  const totalEarnings = history.length * RATE_PER_ROOM;
  const totalHoursEstimated = (history.length * 0.45).toFixed(1);

  // Group history by date (YYYY-MM-DD)
  const historyByDate = useMemo(() => {
    const map: Record<string, CleanerHistoryItem[]> = {};
    for (const item of history) {
      const d = item.creado_en ? item.creado_en.split("T")[0] : "Reciente";
      if (!map[d]) map[d] = [];
      map[d].push(item);
    }
    return map;
  }, [history]);

  return (
    <main className={!profile ? "auth-page cleaner-auth-page" : "cleaner-app-viewport"}>
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
        <div className="cleaner-portal-shell">
          {/* Top Bar */}
          <div className="cleaner-portal-topbar">
            <div className="cleaner-user-strip">
              <ModernAvatar3D name={profile.nombre} size={36} className="cleaner-head-avatar" />
              <div>
                <div className="cleaner-tagline">
                  <span className="cleaner-shift-dot" />
                  <span>Turno {formatTimer(now - shiftStart)}</span>
                </div>
                <h1 className="cleaner-user-name">{profile.nombre}</h1>
              </div>
            </div>

            {/* Desktop & Tablet Navigation */}
            <div className="cleaner-desktop-nav" role="tablist" aria-label="Secciones del portal de aseo">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "jornada"}
                className={`cleaner-desktop-tab ${activeTab === "jornada" ? "is-active" : ""}`}
                onClick={() => setActiveTab("jornada")}
              >
                <span className="material-symbol">cleaning_services</span>
                <span>Jornada</span>
                {activeRooms.length > 0 && <span className="cleaner-desktop-badge">{activeRooms.length}</span>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "nomina"}
                className={`cleaner-desktop-tab ${activeTab === "nomina" ? "is-active" : ""}`}
                onClick={() => setActiveTab("nomina")}
              >
                <span className="material-symbol">payments</span>
                <span>Nómina e Historial</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "perfil"}
                className={`cleaner-desktop-tab ${activeTab === "perfil" ? "is-active" : ""}`}
                onClick={() => setActiveTab("perfil")}
              >
                <span className="material-symbol">person</span>
                <span>Mi Perfil</span>
              </button>
            </div>

            <button className="button button-refresh cleaner-top-logout" disabled={loading} onClick={() => void signOut()} title="Cerrar sesión">
              <span className="material-symbol" aria-hidden="true">logout</span>
              <span>Salir</span>
            </button>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          {/* TAB 1: JORNADA (HABITACIONES) */}
          {activeTab === "jornada" && (
            <div className="cleaner-tab-content">
              {/* Responsive Controls Row (Progress & Filters) */}
              <div className="cleaner-controls-row">
                <div className="cleaner-progress-card">
                  <div className="cleaner-progress-header">
                    <span>Progreso del turno</span>
                    <strong>{finishedRooms.length} de {rooms.length} ({progressPercent}%)</strong>
                  </div>
                  <div className="cleaner-progress-track">
                    <div className="cleaner-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="cleaner-filter-strip">
                  <button
                    type="button"
                    className={`cleaner-filter-chip ${roomFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setRoomFilter("all")}
                  >
                    Todas ({rooms.length})
                  </button>
                  <button
                    type="button"
                    className={`cleaner-filter-chip ${roomFilter === "cleaning" ? "is-active" : ""}`}
                    onClick={() => setRoomFilter("cleaning")}
                  >
                    En Curso ({activeRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`cleaner-filter-chip ${roomFilter === "pending" ? "is-active" : ""}`}
                    onClick={() => setRoomFilter("pending")}
                  >
                    Pendientes ({pendingRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`cleaner-filter-chip ${roomFilter === "finished" ? "is-active" : ""}`}
                    onClick={() => setRoomFilter("finished")}
                  >
                    Finalizadas ({finishedRooms.length})
                  </button>
                </div>
              </div>

              {/* Active Room Hero Card */}
              {activeRooms.length > 0 && roomFilter !== "pending" && roomFilter !== "finished" && (
                <div className="cleaner-active-hero-card">
                  <div className="cleaner-active-hero-header">
                    <span className="cleaner-active-badge">
                      <span className="cleaner-pulse-beacon" />
                      EN LIMPIEZA AHORA
                    </span>
                    <span className="cleaner-active-timer">
                      <small>Tiempo</small>
                      <strong>{formatTimer(now - (roomStartTimes[activeRooms[0].id_habitacion] || now))}</strong>
                    </span>
                  </div>

                  <div className="cleaner-active-hero-body">
                    <div className="cleaner-active-room-title">
                      <h2>Hab. {activeRooms[0].id_habitacion}</h2>
                      <span className="cleaner-service-pill">Servicio de Limpieza</span>
                    </div>
                    <div className="cleaner-active-meta">
                      <span className="material-symbol">person</span>
                      <span>Huésped: <strong>{activeRooms[0].nombre_huesped || "Sin huésped registrado"}</strong></span>
                    </div>
                    {activeRooms[0].detalles_limpieza && (
                      <div className="cleaner-active-note">
                        <span className="material-symbol">info</span>
                        <span>{activeRooms[0].detalles_limpieza}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="button button-primary cleaner-action-btn cleaner-finish-btn"
                    disabled={busyRoom === activeRooms[0].id_habitacion}
                    onClick={() => void handleFinish(activeRooms[0].id_habitacion)}
                  >
                    <span className="material-symbol" aria-hidden="true">check_circle</span>
                    <span>{busyRoom === activeRooms[0].id_habitacion ? "Finalizando…" : "Finalizar Servicio de Limpieza"}</span>
                  </button>
                </div>
              )}

              {/* Room Grid / List */}
              {filteredRooms.length === 0 ? (
                <p className="empty-state">No hay habitaciones asignadas en esta categoría.</p>
              ) : (
                <section className="room-grid cleaner-room-grid">
                  {filteredRooms.map((room) => {
                    const isFinished = room.estado === "finalizado" || statusFromDb(room.estado) === "finished";
                    const isCleaning = !isFinished && startedRooms.has(room.id_habitacion);
                    const displayStatus: RoomStatus = isFinished ? "finished" : isCleaning ? "cleaning" : "pending";

                    return (
                      <article className="room-card cleaner-room-card" key={room.id_habitacion}>
                        <div className="room-card-heading">
                          <div
                            role="button"
                            tabIndex={0}
                            className="room-card-heading-title"
                            onClick={() => navigate(`/app/habitaciones?room=${encodeURIComponent(room.id_habitacion)}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(`/app/habitaciones?room=${encodeURIComponent(room.id_habitacion)}`);
                              }
                            }}
                            title={`Ir a habitación ${room.id_habitacion}`}
                          >
                            <p className="eyebrow">Habitación</p>
                            <h2>
                              {room.id_habitacion}
                              <span className="material-symbol room-title-hover-icon" aria-hidden="true">open_in_new</span>
                            </h2>
                          </div>
                          <span className={`status-pill status-${displayStatus}`}>
                            {statusLabels[displayStatus] || (isCleaning ? "En limpieza" : "Por atender")}
                          </span>
                        </div>
                        <dl className="details-list cleaner-room-details-list">
                          <div>
                            <dt>Huésped</dt>
                            <dd className="cleaner-guest-value">{room.nombre_huesped || "No registrado"}</dd>
                          </div>
                          <div>
                            <dt>Plan</dt>
                            <dd>
                              <span className="cleaner-plan-badge">{formatPlanName(room.plan_limpieza)}</span>
                            </dd>
                          </div>
                          {room.detalles_limpieza && (
                            <div className="cleaner-details-fullrow">
                              <dt>Detalles</dt>
                              <dd className="cleaner-room-notes">{room.detalles_limpieza}</dd>
                            </div>
                          )}
                        </dl>
                        <div className="cleaner-card-actions">
                          {!isCleaning && !isFinished && (
                            <button
                              type="button"
                              className="button button-primary cleaner-action-btn"
                              disabled={busyRoom === room.id_habitacion}
                              onClick={() => void handleStart(room.id_habitacion)}
                            >
                              <span className="material-symbol" aria-hidden="true">play_arrow</span>
                              {busyRoom === room.id_habitacion ? "Iniciando…" : "Iniciar Limpieza"}
                            </button>
                          )}
                          {isCleaning && (
                            <button
                              type="button"
                              className="button button-primary cleaner-action-btn cleaner-finish-btn"
                              disabled={busyRoom === room.id_habitacion}
                              onClick={() => void handleFinish(room.id_habitacion)}
                            >
                              <span className="material-symbol" aria-hidden="true">check_circle</span>
                              <span>{busyRoom === room.id_habitacion ? "Finalizando…" : "Finalizar Servicio de Limpieza"}</span>
                            </button>
                          )}
                          {isFinished && (
                            <div className="cleaner-completed-badge">
                              <span className="material-symbol" aria-hidden="true">task_alt</span>
                              <span>Servicio finalizado</span>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL Y NÓMINA (RESPONSIVE TABLET & DESKTOP) */}
          {activeTab === "nomina" && (
            <div className="cleaner-tab-content cleaner-payroll-layout">
              {/* Financial Hero Sidebar */}
              <div className="cleaner-payroll-sidebar">
                <div className="cleaner-payroll-hero">
                  <div className="cleaner-payroll-eyebrow">Compensación y Turnos · Periodo Quincenal</div>
                  <div className="cleaner-payroll-amount">
                    ${totalEarnings.toLocaleString("es-CO")} <small>COP</small>
                  </div>
                  <div className="cleaner-payroll-grid">
                    <div className="cleaner-payroll-col">
                      <span>Habitaciones</span>
                      <strong>{history.length}</strong>
                    </div>
                    <div className="cleaner-payroll-col">
                      <span>Horas Est.</span>
                      <strong>{totalHoursEstimated}h</strong>
                    </div>
                    <div className="cleaner-payroll-col">
                      <span>Turnos</span>
                      <strong>{Object.keys(historyByDate).length} días</strong>
                    </div>
                  </div>
                </div>

                <div className="cleaner-payroll-info-card hide-on-mobile">
                  <div className="cleaner-section-label">
                    <span className="material-symbol">info</span>
                    <span>Políticas de Liquidación</span>
                  </div>
                  <p className="cleaner-payroll-info-text">
                    La tarifa base por espacio estándar es de <strong>$18.000 COP</strong>. Los pagos se consolidan quincenalmente los días 15 y 30 de cada mes.
                  </p>
                </div>
              </div>

              {/* Detailed Lists Column */}
              <div className="cleaner-payroll-main">
                {/* Sub-switcher */}
                <div className="cleaner-payroll-switcher">
                  <button
                    type="button"
                    className={payrollView === "rooms" ? "is-active" : ""}
                    onClick={() => setPayrollView("rooms")}
                  >
                    Habitaciones ({history.length})
                  </button>
                  <button
                    type="button"
                    className={payrollView === "shifts" ? "is-active" : ""}
                    onClick={() => setPayrollView("shifts")}
                  >
                    Turnos Diarios ({Object.keys(historyByDate).length})
                  </button>
                </div>

                {historyLoading ? (
                  <p className="empty-state">Cargando registros de nómina…</p>
                ) : history.length === 0 ? (
                  <p className="empty-state">Aún no hay habitaciones o turnos registrados en este periodo.</p>
                ) : payrollView === "rooms" ? (
                  <div className="cleaner-history-list cleaner-history-grid">
                    {history.map((item) => (
                      <article className="cleaner-history-item" key={item.id_trabajo}>
                        <span className="material-symbol" aria-hidden="true" style={{ color: "#10b981" }}>check_circle</span>
                        <div className="cleaner-history-room">
                          <strong>Habitación {item.id_habitacion}</strong>
                          <span>{formatPlanName(item.tipo_limpieza)}</span>
                        </div>
                        <div className="cleaner-history-payout">
                          <strong>+${RATE_PER_ROOM.toLocaleString("es-CO")} COP</strong>
                          <time dateTime={item.creado_en}>{formatDate(item.creado_en)}</time>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cleaner-shifts-list cleaner-shifts-grid">
                    {Object.entries(historyByDate).map(([dateStr, items]) => (
                      <div className="cleaner-shift-day-card" key={dateStr}>
                        <div className="cleaner-shift-day-head">
                          <span className="material-symbol">event_available</span>
                          <div>
                            <strong>{dateStr}</strong>
                            <small>{items.length} habitaciones limpiadas</small>
                          </div>
                        </div>
                        <div className="cleaner-shift-day-amount">
                          +${(items.length * RATE_PER_ROOM).toLocaleString("es-CO")} COP
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MI PERFIL (RESPONSIVE TABLET & DESKTOP) */}
          {activeTab === "perfil" && (
            <div className="cleaner-tab-content cleaner-profile-layout">
              {/* Profile Sidebar */}
              <div className="cleaner-profile-sidebar">
                <div className="cleaner-profile-hero">
                  <ModernAvatar3D name={profile.nombre} size={52} className="cleaner-large-avatar" />
                  <h2 className="cleaner-profile-name">{profile.nombre}</h2>
                  <p className="cleaner-profile-role">Personal de Aseo y Camarera</p>
                  <div className="cleaner-profile-beacon">
                    <span className="cleaner-pulse-beacon" />
                    Turno Activo en Sede Central
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  className="button cleaner-logout-full-btn"
                  onClick={() => void signOut()}
                  disabled={loading}
                >
                  <span className="material-symbol">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>

              {/* Profile Main Content */}
              <div className="cleaner-profile-main">
                {/* 3D Avatar Style Picker */}
                <div className="cleaner-avatar-picker-section">
                  <div className="cleaner-section-label">
                    <span className="material-symbol">palette</span>
                    <span>Estilo de Avatar</span>
                  </div>
                  <Avatar3DStylePicker variant="minimal" />
                </div>

                {/* Personal Information (Read-only) */}
                <div className="cleaner-profile-details">
                  <div className="cleaner-section-label">
                    <span className="material-symbol">badge</span>
                    <span>Información Laboral</span>
                  </div>
                  <div className="cleaner-detail-row">
                    <span>Nombre</span>
                    <strong>{profile.nombre}</strong>
                  </div>
                  <div className="cleaner-detail-row">
                    <span>Correo / Acceso</span>
                    <strong>{email || "Cuenta de aseo"}</strong>
                  </div>
                  <div className="cleaner-detail-row">
                    <span>Código Empleado</span>
                    <strong style={{ fontFamily: "monospace" }}>EMP-{profile.id_personal.slice(0, 8).toUpperCase()}</strong>
                  </div>
                  <div className="cleaner-detail-row">
                    <span>Estado</span>
                    <strong style={{ color: "#10b981" }}>Activo y Autorizado</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <nav className="cleaner-bottom-nav" aria-label="Navegación del portal de aseo">
            <button
              type="button"
              className={`cleaner-nav-tab ${activeTab === "jornada" ? "is-active" : ""}`}
              onClick={() => setActiveTab("jornada")}
            >
              <span className="material-symbol">cleaning_services</span>
              <span>Jornada</span>
              {activeRooms.length > 0 && <span className="cleaner-nav-badge">{activeRooms.length}</span>}
            </button>
            <button
              type="button"
              className={`cleaner-nav-tab ${activeTab === "nomina" ? "is-active" : ""}`}
              onClick={() => setActiveTab("nomina")}
            >
              <span className="material-symbol">payments</span>
              <span>Nómina</span>
            </button>
            <button
              type="button"
              className={`cleaner-nav-tab ${activeTab === "perfil" ? "is-active" : ""}`}
              onClick={() => setActiveTab("perfil")}
            >
              <span className="material-symbol">person</span>
              <span>Mi Perfil</span>
            </button>
          </nav>
        </div>
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
