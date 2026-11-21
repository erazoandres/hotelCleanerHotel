import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useHotelAuth } from "../components/HotelAuth";
import { FreshlyMark } from "../components/FreshlyBrand";
import { HotelDataStatus, useHotelData } from "../components/HotelData";
import { ModernAvatar3D, Avatar3DStylePicker } from "../components/ModernAvatar3D";
import {
  addEvent,
  changeStaffPassword,
  createRoom,
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

function MinimalVectorIcon({ status, isVip = false, className = "" }: { status: RoomStatus; isVip?: boolean; className?: string }) {
  if (isVip) {
    return (
      <svg className={`min-icon min-icon-vip ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2z" />
      </svg>
    );
  }
  switch (status) {
    case "free":
      return (
        <svg className={`min-icon min-icon-free ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 4v16M2 11h20M22 4v16M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
        </svg>
      );
    case "occupied":
      return (
        <svg className={`min-icon min-icon-occupied ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 20a6 6 0 0 0-12 0" />
          <circle cx="12" cy="10" r="4" />
        </svg>
      );
    case "cleaning":
      return (
        <svg className={`min-icon min-icon-cleaning icon-spin-orbit ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M21 21v-5h-5" />
        </svg>
      );
    case "pending":
      return (
        <svg className={`min-icon min-icon-pending ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "finished":
      return (
        <svg className={`min-icon min-icon-finished ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    default:
      return (
        <svg className={`min-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="14" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
}

function MinimalArrowLink({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={`min-icon-arrow-link ${className}`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { state } = useHotelData();
  const [matrixFilter, setMatrixFilter] = useState<"all" | "free" | "occupied" | "pending" | "cleaning" | "finished">("all");
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const isVipRoom = (plan?: string) => {
    if (!plan) return false;
    const p = plan.toLowerCase();
    return p.includes("premium") || p.includes("vip") || p.includes("suite");
  };

  const roomIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );
  const totalRooms = roomIds.length;
  const occupiedCount = roomIds.filter((id) => state.rooms[id] === "occupied").length;
  const freeOnlyCount = roomIds.filter((id) => state.rooms[id] === "free").length;
  const finishedCount = roomIds.filter((id) => state.rooms[id] === "finished").length;
  const freeCount = freeOnlyCount + finishedCount;
  const pendingCount = roomIds.filter((id) => state.rooms[id] === "pending").length;
  const cleaningCount = roomIds.filter((id) => state.rooms[id] === "cleaning").length;
  const turnoverCount = pendingCount + cleaningCount;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const freeRate = totalRooms > 0 ? Math.round((freeCount / totalRooms) * 100) : 0;
  const turnoverRate = totalRooms > 0 ? Math.max(0, 100 - occupancyRate - freeRate) : 0;

  // Active staff on shift
  const activeStaffCount = state.attendance.filter((a) => !a.checkOut).length;
  const roomsPerActiveStaff = activeStaffCount > 0 ? (turnoverCount / activeStaffCount).toFixed(1) : String(turnoverCount);

  // Operational health calculation
  const today = localDateValue(new Date());
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = localDateValue(nextWeekDate);

  const scheduledRooms = useMemo(() => {
    return Object.entries(state.scheduledCleaningDates)
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
  }, [state.rooms, state.scheduledCleaningDates, state.assignedCleanings, today]);

  const overdueCount = scheduledRooms.filter(
    (room) => room.date < today && room.status !== "finished",
  ).length;
  const upcomingCount = scheduledRooms.filter(
    (room) => room.date >= today && room.date <= nextWeek && room.status !== "finished",
  ).length;

  const operationalHealth = Math.max(70, Math.min(100, Math.round(100 - (overdueCount * 6) - (pendingCount * 2))));

  // Group rooms by floors (extracts floor or detects, grouping common spaces into "Áreas Comunes")
  const floors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const id of roomIds) {
      const isCommon = state.spaceTypes[id] === "zona_comun";
      let key = "Áreas Comunes";
      if (!isCommon) {
        if (state.floors[id]) {
          key = state.floors[id];
        } else {
          const digitsMatch = id.match(/\d+/);
          if (digitsMatch) {
            const numStr = digitsMatch[0];
            const floorNum = numStr.length >= 3 ? numStr.slice(0, -2) : "1";
            key = `Piso ${parseInt(floorNum, 10) || 1}`;
          } else {
            key = "Piso 1";
          }
        }
      }
      if (!map[key]) map[key] = [];
      map[key].push(id);
    }
    // Sort Pisos first, then Áreas Comunes
    const sortedMap: Record<string, string[]> = {};
    const keys = Object.keys(map).sort((a, b) => {
      if (a === "Áreas Comunes") return 1;
      if (b === "Áreas Comunes") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    for (const k of keys) {
      sortedMap[k] = map[k];
    }
    return sortedMap;
  }, [roomIds, state.floors, state.spaceTypes]);

  // Hourly operational activity distribution from events
  const activityHours = useMemo(() => {
    const blocks = [
      { label: "07:00 - 11:00", name: "Apertura / Check-outs", count: 0 },
      { label: "11:00 - 15:00", name: "Pico de Limpieza", count: 0 },
      { label: "15:00 - 19:00", name: "Check-ins / Entregas", count: 0 },
      { label: "19:00 - 23:00", name: "Cierre de Jornada", count: 0 },
    ];
    for (const ev of state.events) {
      const d = new Date(ev.time);
      if (!Number.isNaN(d.getTime())) {
        const h = d.getHours();
        if (h >= 7 && h < 11) blocks[0].count++;
        else if (h >= 11 && h < 15) blocks[1].count++;
        else if (h >= 15 && h < 19) blocks[2].count++;
        else if (h >= 19 && h < 23) blocks[3].count++;
      }
    }
    const maxCount = Math.max(...blocks.map((b) => b.count), 1);
    return { blocks, maxCount };
  }, [state.events]);

  // Service plan distribution
  const serviceDistribution = useMemo(() => {
    let semanal = 0;
    let mensual = 0;
    let premium = 0;
    let other = 0;
    for (const id of roomIds) {
      const plan = (state.servicePlans[id] ?? "").toLowerCase();
      if (plan.includes("semanal")) semanal++;
      else if (plan.includes("mensual")) mensual++;
      else if (plan.includes("premium")) premium++;
      else other++;
    }
    const semPct = totalRooms > 0 ? Math.round((semanal / totalRooms) * 100) : 0;
    const menPct = totalRooms > 0 ? Math.round((mensual / totalRooms) * 100) : 0;
    const prePct = totalRooms > 0 ? Math.round((premium / totalRooms) * 100) : 0;
    const othPct = Math.max(0, 100 - semPct - menPct - prePct);
    return {
      semanal,
      mensual,
      premium,
      other,
      semPct,
      menPct,
      prePct,
      othPct,
    };
  }, [roomIds, state.servicePlans, totalRooms]);

  // Donut SVG circumference calculation
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const occStroke = (occupancyRate / 100) * donutCircumference;
  const freeStroke = (freeRate / 100) * donutCircumference;
  const turnStroke = (turnoverRate / 100) * donutCircumference;

  // Filtered rooms for floor matrix
  const matrixFilterFn = (id: string) => {
    const s = state.rooms[id] || "free";
    if (matrixFilter !== "all" && s !== matrixFilter) return false;
    return true;
  };

  return (
    <div className="page-stack dashboard-page dash-compact-page">
      {/* 1. Header con la misma tipografía Fraunces y estilo de las otras secciones */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operación general</p>
          <h1>Inicio</h1>
          <p className="page-description">
            Monitoreo en tiempo real de habitaciones, rotación de limpieza y ocupación general.
          </p>
        </div>
        <div className="dashboard-heading-badges">
          <span className="dash-live-chip">
            <span className="dashboard-pulse-dot" aria-hidden="true" />
            <strong>{totalRooms}</strong> Habitaciones
          </span>
          <span className="dash-health-pill">
            <span className="material-symbol" aria-hidden="true">verified</span>
            <span>{operationalHealth}% Óptimo</span>
          </span>
          <div className="dashboard-connection-pill">
            <HotelDataStatus showStatus={false} />
          </div>
        </div>
      </div>

      {/* 2. ROW OF 4 SMALL KPI CARDS */}
      <section className="dash-kpis-grid" aria-label="Métricas clave de operación">
        {/* KPI 1: Ocupación */}
        <article className="dash-small-card dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Ocupación</span>
            <span className="dash-kpi-icon-pill coral"><span className="material-symbol" aria-hidden="true">hotel</span></span>
          </div>
          <div className="dash-kpi-center">
            <div className="dash-kpi-number-wrap">
              <strong>{occupancyRate}%</strong>
              <span>{occupiedCount} de {totalRooms} habs</span>
            </div>
            <div className="dash-kpi-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36" className="kpi-ring-svg">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#fce4e8" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#f05d72"
                  strokeWidth="3.5"
                  strokeDasharray={`${(occupancyRate / 100) * 87.96} 87.96`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-trend">Capacidad: {occupiedCount}/{totalRooms} habs</span>
          </div>
        </article>

        {/* KPI 2: Disponibles */}
        <article className="dash-small-card dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Disponibles / Listas</span>
            <span className="dash-kpi-icon-pill mint"><span className="material-symbol" aria-hidden="true">door_open</span></span>
          </div>
          <div className="dash-kpi-center">
            <div className="dash-kpi-number-wrap">
              <strong>{freeCount}</strong>
              <span>{freeRate}% listas check-in</span>
            </div>
            <div className="dash-kpi-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36" className="kpi-ring-svg">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#d5ede7" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#26b7a6"
                  strokeWidth="3.5"
                  strokeDasharray={`${(freeRate / 100) * 87.96} 87.96`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-trend green">Entrega Inmediata</span>
          </div>
        </article>

        {/* KPI 3: Rotación / Aseo */}
        <article className="dash-small-card dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">En Rotación</span>
            <span className="dash-kpi-icon-pill purple"><span className="material-symbol" aria-hidden="true">cleaning_services</span></span>
          </div>
          <div className="dash-kpi-center">
            <div className="dash-kpi-number-wrap">
              <strong>{turnoverCount}</strong>
              <span>{pendingCount} por asear · {cleaningCount} en curso</span>
            </div>
            <div className="dash-kpi-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36" className="kpi-ring-svg">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#ede7fa" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#8d73ff"
                  strokeWidth="3.5"
                  strokeDasharray={`${(turnoverRate / 100) * 87.96} 87.96`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-footer">
            <span className={`dash-kpi-trend ${pendingCount > 0 ? "amber" : ""}`}>
              {pendingCount > 0 ? `${pendingCount} pendientes` : "Sin retrasos"}
            </span>
          </div>
        </article>

        {/* KPI 4: Personal en Turno */}
        <article className="dash-small-card dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Personal Activo</span>
            <span className="dash-kpi-icon-pill sage"><span className="material-symbol" aria-hidden="true">badge</span></span>
          </div>
          <div className="dash-kpi-center">
            <div className="dash-kpi-number-wrap">
              <strong>{activeStaffCount} <small style={{ fontSize: 13, color: "#64748b" }}>/ {state.staff.length}</small></strong>
              <span>Carga: {roomsPerActiveStaff} hab / camarista</span>
            </div>
            <div className="dash-kpi-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36" className="kpi-ring-svg">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e0e8ee" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#3d6c80"
                  strokeWidth="3.5"
                  strokeDasharray={`${state.staff.length > 0 ? (activeStaffCount / state.staff.length) * 87.96 : 0} 87.96`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-trend">
              {activeStaffCount > 0 ? "Turno activo hoy" : "Sin personal activo"}
            </span>
          </div>
        </article>
      </section>

      {/* 3. CORE MODULAR GRID: ROOM MATRIX (LEFT) + CAPACITY DONUT RADAR (RIGHT) */}
      <section className="dash-core-grid">
        {/* Card A: Pure Graphical Room Matrix */}
        <article className="dash-small-card dash-matrix-canvas-card">
          <div className="matrix-header-compact">
            <div className="matrix-title-badge">
              <span className="matrix-icon-box" aria-hidden="true">
                <span className="material-symbol" style={{ fontSize: 16 }}>grid_view</span>
              </span>
              <span>Habitaciones del Hotel</span>
              <span className="matrix-live-pill">
                <span className="dashboard-pulse-dot" style={{ width: 6, height: 6 }} aria-hidden="true" />
                {occupancyRate}% Ocupado
              </span>
            </div>

            <div className="matrix-stepper-wrap" role="tablist" aria-label="Filtrar por piso">
              <button
                type="button"
                role="tab"
                aria-selected={selectedFloor === "all"}
                className={`matrix-stepper-btn ${selectedFloor === "all" ? "active" : ""}`}
                onClick={() => setSelectedFloor("all")}
                title="Todos los pisos"
              >
                Todos
              </button>
              {Object.keys(floors).map((fl) => (
                <button
                  key={fl}
                  type="button"
                  role="tab"
                  aria-selected={selectedFloor === fl}
                  className={`matrix-stepper-btn ${selectedFloor === fl ? "active" : ""}`}
                  onClick={() => setSelectedFloor(fl)}
                  title={fl}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>

          <div className="matrix-spatial-body">
            {(() => {
              const currentFloorRooms = selectedFloor === "all"
                ? roomIds
                : (floors[selectedFloor] || []);

              const renderPod = (roomId: string) => {
                const st = state.rooms[roomId] || "free";
                const isMatch = matrixFilterFn(roomId);
                const isDimmed = !isMatch;
                const isHovered = hoveredRoom === roomId;
                const guest = state.guests[roomId];
                const cleaner = state.assignedCleanings[roomId]?.staffName;
                const plan = state.servicePlans[roomId];
                const isVip = isVipRoom(plan);
                const isCommonArea = state.spaceTypes[roomId] === "zona_comun";
                const roomType = state.roomTypes[roomId] || detectRoomType(roomId);

                let dynamicLabel = "Libre";
                if (st === "occupied") {
                  dynamicLabel = guest ? guest.split(" ")[0] : "Ocupada";
                } else if (st === "cleaning") {
                  dynamicLabel = cleaner ? cleaner.split(" ")[0] : "Limpieza";
                } else if (st === "pending") {
                  dynamicLabel = "Aseo";
                } else if (st === "finished") {
                  dynamicLabel = "Lista";
                }

                let subtext = isCommonArea ? "Zona Común" : (roomType === "doble" ? "Doble" : "Estándar");
                if (st === "occupied" && isVip) subtext = "Suite VIP";
                else if (st === "cleaning" && cleaner) subtext = cleaner.split(" ")[0];

                return (
                  <div
                    key={roomId}
                    className={`matrix-room-pod status-${st} ${isDimmed ? "is-dimmed" : ""} ${isCommonArea ? "is-common-area" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Habitación ${roomId}, ${statusLabels[st] || st}`}
                    onClick={() => navigate(`/app/habitaciones?room=${encodeURIComponent(roomId)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/app/habitaciones?room=${encodeURIComponent(roomId)}`);
                      }
                    }}
                    onMouseEnter={() => setHoveredRoom(roomId)}
                    onMouseLeave={() => setHoveredRoom(null)}
                  >
                    <div className="matrix-pod-head">
                      <span className="matrix-pod-num" title={roomId}>{roomId}</span>
                      <div className="matrix-pod-indicators">
                        {isVip && <span className="matrix-pod-vip-tag" title="Habitación VIP">★ VIP</span>}
                        <span className={`matrix-pod-beacon status-${st}`} aria-hidden="true" />
                      </div>
                    </div>

                    <div className="matrix-pod-foot">
                      <span className={`matrix-pod-status-pill status-${st}`} title={dynamicLabel}>
                        {dynamicLabel}
                      </span>
                      <span className="matrix-pod-subtext">{subtext}</span>
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="matrix-tile-tooltip" role="tooltip" style={{ zIndex: 50 }}>
                        <div className="matrix-tooltip-head">
                          <div className="matrix-tooltip-title">
                            <MinimalVectorIcon status={st} isVip={isVip} />
                            <strong style={{ fontFamily: "Space Grotesk, sans-serif" }}>Habitación {roomId}</strong>
                          </div>
                          <span className={`status-pill status-${st}`}>{statusLabels[st]}</span>
                        </div>
                        <div className="matrix-tooltip-body">
                          <div><small>Huésped:</small> <span>{guest || "Sin registro"}</span></div>
                          <div><small>Aseador:</small> <span>{cleaner || "Sin asignar"}</span></div>
                          {plan && <div><small>Plan:</small> <span>{plan}</span></div>}
                          <div className="matrix-tooltip-hint">
                            <MinimalArrowLink style={{ opacity: 1, transform: "none" }} />
                            <span>Clic para gestionar</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              if (selectedFloor === "all") {
                const floorEntries = Object.entries(floors);
                if (floorEntries.length > 1) {
                  return (
                    <div className="matrix-wings-stage">
                      {floorEntries.map(([flName, flRooms]) => (
                        <div key={flName} className="matrix-floor-group">
                          <div className="matrix-floor-group-header">
                            <span className="matrix-floor-group-title">{flName}</span>
                            <span className="matrix-floor-group-count">{flRooms.length} habs</span>
                          </div>
                          <div className="matrix-pod-row">
                            {flRooms.map(renderPod)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
              }

              if (currentFloorRooms.length === 0) {
                return (
                  <div className="matrix-empty-compact">
                    <p>No hay espacios registrados en este piso.</p>
                  </div>
                );
              }

              return (
                <div className="matrix-wings-stage">
                  <div className="matrix-pod-row">
                    {currentFloorRooms.map(renderPod)}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="matrix-footer-compact">
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "all" ? "active" : ""}`}
              onClick={() => setMatrixFilter("all")}
            >
              ● {totalRooms}
            </button>
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "free" ? "active" : ""}`}
              onClick={() => setMatrixFilter(matrixFilter === "free" ? "all" : "free")}
            >
              <span className="matrix-room-dot" style={{ background: "#10b981" }} />
              {freeOnlyCount} Libres
            </button>
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "occupied" ? "active" : ""}`}
              onClick={() => setMatrixFilter(matrixFilter === "occupied" ? "all" : "occupied")}
            >
              <span className="matrix-room-dot" style={{ background: "#f43f5e" }} />
              {occupiedCount} Ocupadas
            </button>
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "pending" ? "active" : ""}`}
              onClick={() => setMatrixFilter(matrixFilter === "pending" ? "all" : "pending")}
            >
              <span className="matrix-room-dot" style={{ background: "#f59e0b" }} />
              {pendingCount} Aseo
            </button>
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "cleaning" ? "active" : ""}`}
              onClick={() => setMatrixFilter(matrixFilter === "cleaning" ? "all" : "cleaning")}
            >
              <span className="matrix-room-dot" style={{ background: "#8b5cf6" }} />
              {cleaningCount} En Ruta
            </button>
            <button
              type="button"
              className={`matrix-capsule-btn ${matrixFilter === "finished" ? "active" : ""}`}
              onClick={() => setMatrixFilter(matrixFilter === "finished" ? "all" : "finished")}
            >
              <span className="matrix-room-dot" style={{ background: "#06b6d4" }} />
              {finishedCount} Listas
            </button>
          </div>
        </article>

        {/* Card B: Pure Graphical Capacity Radar (Interactive Telemetry) */}
        <article className="dash-small-card dash-radar-card">
          <div className="radar-header-compact">
            <div className="radar-title">
              <span className="material-symbol" style={{ fontSize: 16, color: "#17221f" }}>pie_chart</span>
              <span>Capacidad</span>
            </div>
            <strong style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 12.5, color: "#17221f" }}>
              {occupiedCount} <span style={{ color: "#94a3b8" }}>/</span> {totalRooms}
            </strong>
          </div>

          <div className="radar-body-compact">
            <div className="radar-donut-stage">
              <svg viewBox="0 0 140 140" className="radar-donut-svg">
                <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="#edf2ef" strokeWidth="14" />
                {occStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#f05d72"
                    strokeWidth="14"
                    strokeDasharray={`${occStroke} ${donutCircumference - occStroke}`}
                    strokeDashoffset={-donutCircumference * 0.25}
                    strokeLinecap="round"
                    style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                    onClick={() => setMatrixFilter(matrixFilter === "occupied" ? "all" : "occupied")}
                  />
                )}
                {freeStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#26b7a6"
                    strokeWidth="14"
                    strokeDasharray={`${freeStroke} ${donutCircumference - freeStroke}`}
                    strokeDashoffset={-(donutCircumference * 0.25 + occStroke)}
                    strokeLinecap="round"
                    style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                    onClick={() => setMatrixFilter(matrixFilter === "free" ? "all" : "free")}
                  />
                )}
                {turnStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#8d73ff"
                    strokeWidth="14"
                    strokeDasharray={`${turnStroke} ${donutCircumference - turnStroke}`}
                    strokeDashoffset={-(donutCircumference * 0.25 + occStroke + freeStroke)}
                    strokeLinecap="round"
                    style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
                    onClick={() => setMatrixFilter(matrixFilter === "cleaning" ? "all" : "cleaning")}
                  />
                )}
              </svg>
              <div className="radar-donut-center">
                <span className="radar-donut-percent">{occupancyRate}%</span>
                <span className="radar-donut-sub">Ocupación</span>
              </div>
            </div>

            <div className="radar-interactive-pills" role="tablist" aria-label="Filtro rápido radar">
              <button
                type="button"
                className={`radar-stat-pill pill-occ ${matrixFilter === "occupied" ? "active" : ""}`}
                onClick={() => setMatrixFilter(matrixFilter === "occupied" ? "all" : "occupied")}
              >
                <div className="radar-stat-pill-left">
                  <span className="dash-donut-dot coral" />
                  <span>{occupiedCount} Ocupadas</span>
                </div>
                <span className="radar-stat-pill-rate">{occupancyRate}%</span>
              </button>
              <button
                type="button"
                className={`radar-stat-pill pill-free ${matrixFilter === "free" ? "active" : ""}`}
                onClick={() => setMatrixFilter(matrixFilter === "free" ? "all" : "free")}
              >
                <div className="radar-stat-pill-left">
                  <span className="dash-donut-dot mint" />
                  <span>{freeCount} Libres</span>
                </div>
                <span className="radar-stat-pill-rate">{freeRate}%</span>
              </button>
              <button
                type="button"
                className={`radar-stat-pill pill-turn ${matrixFilter === "cleaning" ? "active" : ""}`}
                onClick={() => setMatrixFilter(matrixFilter === "cleaning" ? "all" : "cleaning")}
              >
                <div className="radar-stat-pill-left">
                  <span className="dash-donut-dot purple" />
                  <span>{turnoverCount} Limpieza</span>
                </div>
                <span className="radar-stat-pill-rate">{turnoverRate}%</span>
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* 4. BOTTOM ROW: 3 COMPACT CARDS (ACTIVITY + PROTOCOLS + AGENDACRITICA) */}
      <section className="dash-bottom-grid">
        {/* Card 1: Hourly Operational Load */}
        <article className="dash-small-card dash-card-bottom">
          <div className="dash-card-header">
            <div className="dash-card-header-left">
              <div className="dash-card-header-icon">
                <span className="material-symbol" aria-hidden="true">query_builder</span>
              </div>
              <div>
                <p className="dash-card-eyebrow">Flujo de Operación</p>
                <h2 className="dash-card-title">Carga Horaria</h2>
              </div>
            </div>
            <span className="dash-card-badge">Turnos de Hoy</span>
          </div>

          <div className="dash-card-bottom-body">
            <div className="activity-bars-container" style={{ margin: 0 }}>
              {activityHours.blocks.map((block) => {
                const heightPct = Math.max(16, Math.round((block.count / activityHours.maxCount) * 100));
                return (
                  <div className="activity-bar-column" key={block.label}>
                    <div className="activity-bar-track" style={{ height: 95 }}>
                      <div
                        className="activity-bar-fill"
                        style={{ height: `${heightPct}%` }}
                      >
                        <span className="activity-bar-val">{block.count}</span>
                      </div>
                    </div>
                    <div className="activity-bar-info">
                      <strong className="activity-bar-name" style={{ fontSize: 10 }}>{block.name}</strong>
                      <span className="activity-bar-label" style={{ fontSize: 9 }}>{block.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dash-card-bottom-footer">
            <span className="material-symbol" aria-hidden="true" style={{ fontSize: 13 }}>insights</span>
            <span>Basado en <strong>{state.events.length} eventos</strong> registrados.</span>
          </div>
        </article>

        {/* Card 2: Service Plans Spectrum */}
        <article className="dash-small-card dash-card-bottom">
          <div className="dash-card-header">
            <div className="dash-card-header-left">
              <div className="dash-card-header-icon">
                <span className="material-symbol" aria-hidden="true">cleaning_services</span>
              </div>
              <div>
                <p className="dash-card-eyebrow">Protocolos y Servicios</p>
                <h2 className="dash-card-title">Planes de Limpieza</h2>
              </div>
            </div>
            <Link className="text-link" to="/app/habitaciones" style={{ fontSize: 11 }}>
              Ver <span className="material-symbol" aria-hidden="true" style={{ fontSize: 13 }}>arrow_forward</span>
            </Link>
          </div>

          <div className="dash-card-bottom-body">
            <div className="service-stacked-bar" aria-label="Distribución de protocolos" style={{ height: 14, marginBottom: 12 }}>
              {serviceDistribution.semPct > 0 && (
                <div
                  className="stacked-slice slice-semanal"
                  style={{ width: `${serviceDistribution.semPct}%` }}
                  title={`Semanal: ${serviceDistribution.semanal} habs (${serviceDistribution.semPct}%)`}
                />
              )}
              {serviceDistribution.menPct > 0 && (
                <div
                  className="stacked-slice slice-mensual"
                  style={{ width: `${serviceDistribution.menPct}%` }}
                  title={`Mensual: ${serviceDistribution.mensual} habs (${serviceDistribution.menPct}%)`}
                />
              )}
              {serviceDistribution.prePct > 0 && (
                <div
                  className="stacked-slice slice-premium"
                  style={{ width: `${serviceDistribution.prePct}%` }}
                  title={`Premium: ${serviceDistribution.premium} habs (${serviceDistribution.prePct}%)`}
                />
              )}
              {serviceDistribution.othPct > 0 && (
                <div
                  className="stacked-slice slice-other"
                  style={{ width: `${serviceDistribution.othPct}%` }}
                  title={`Estándar / Sin plan: ${serviceDistribution.other} habs (${serviceDistribution.othPct}%)`}
                />
              )}
            </div>

            <div className="service-pills-row" style={{ gap: 6, flexWrap: "wrap" }}>
              <span className="service-pill-item" style={{ fontSize: 10.5, padding: "3px 7px" }}>
                <span className="pill-dot sem" /> Semanal: <strong>{serviceDistribution.semanal}</strong> ({serviceDistribution.semPct}%)
              </span>
              <span className="service-pill-item" style={{ fontSize: 10.5, padding: "3px 7px" }}>
                <span className="pill-dot men" /> Mensual: <strong>{serviceDistribution.mensual}</strong> ({serviceDistribution.menPct}%)
              </span>
              <span className="service-pill-item" style={{ fontSize: 10.5, padding: "3px 7px" }}>
                <span className="pill-dot pre" /> Premium: <strong>{serviceDistribution.premium}</strong> ({serviceDistribution.prePct}%)
              </span>
            </div>
          </div>

          <div className="dash-card-bottom-footer">
            <span>Total de habitaciones cubiertas</span>
            <strong>{totalRooms} activas</strong>
          </div>
        </article>

        {/* Card 3: Critical Agenda */}
        <article className="dash-small-card dash-card-bottom">
          <div className="dash-card-header">
            <div className="dash-card-header-left">
              <div className="dash-card-header-icon">
                <span className="material-symbol" aria-hidden="true">event_available</span>
              </div>
              <div>
                <p className="dash-card-eyebrow">Agenda Crítica</p>
                <h2 className="dash-card-title">Próximos Aseos</h2>
              </div>
            </div>
            <span className="dash-card-badge" style={{ color: overdueCount > 0 ? "#b91c1c" : "#166534" }}>
              {overdueCount > 0 ? `${overdueCount} vencidas` : upcomingCount > 0 ? `${upcomingCount} en 7d` : "Al día"}
            </span>
          </div>

          <div className="dash-card-bottom-body">
            {scheduledRooms.length === 0 ? (
              <p className="empty-state-compact" style={{ fontSize: 11, textAlign: "center", margin: 0 }}>
                Sin fechas de aseo programadas para los próximos días.
              </p>
            ) : (
              <ul className="critical-schedule-items" style={{ margin: 0, padding: 0 }}>
                {scheduledRooms.slice(0, 3).map((room) => {
                  const isOverdue = room.date < today && room.status !== "finished";
                  const isToday = room.date === today;
                  return (
                    <li className={`critical-item ${isOverdue ? "is-overdue" : ""}`} key={room.roomId} style={{ padding: "6px 0" }}>
                      <div className="critical-room-col">
                        <strong style={{ fontSize: 12 }}>Hab. {room.roomId}</strong>
                        <span style={{ fontSize: 10 }}>{room.cleaner}</span>
                      </div>
                      <div className="critical-date-col">
                        <span className={`critical-tag ${isOverdue ? "tag-overdue" : isToday ? "tag-today" : "tag-normal"}`} style={{ fontSize: 9 }}>
                          {isOverdue ? "Vencida" : isToday ? "Hoy" : "Próxima"}
                        </span>
                        <time dateTime={room.date} style={{ fontSize: 10 }}>{room.date}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="dash-card-bottom-footer">
            <Link className="text-link" to="/app/habitaciones" style={{ fontSize: 11 }}>
              Ver todas las fechas <span className="material-symbol" aria-hidden="true" style={{ fontSize: 12 }}>arrow_forward</span>
            </Link>
            <span>{scheduledRooms.length} en total</span>
          </div>
        </article>
      </section>
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
  const initialRoomType = (state.roomTypes[roomId] || detectRoomType(roomId)) as "normal" | "doble";
  const initialDoubleNumber = state.doubleNumbers?.[roomId] || (initialRoomType === "doble" ? roomId : "");
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
  const [tipoHabitacion, setTipoHabitacion] = useState<"normal" | "doble">(initialRoomType);
  const [numeroDoble, setNumeroDoble] = useState(initialDoubleNumber);
  const [tiempoLimpieza, setTiempoLimpieza] = useState<number>(roomCleaningTime);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isCommonArea = tipoEspacio === "zona_comun";

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
    setTipoHabitacion(initialRoomType);
    setNumeroDoble(initialDoubleNumber);
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
    setTipoHabitacion(initialRoomType);
    setNumeroDoble(initialDoubleNumber);
    setTiempoLimpieza(roomCleaningTime);
    setIsEditing(false);
  }, [roomId, roomStatus, roomGuest, roomServicePlan, roomCleaningDetails, roomScheduledCleaningDate, assignment?.staffId, assignment?.cleaningType, roomFloor, roomSpaceType, initialRoomType, initialDoubleNumber, roomCleaningTime]);

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
        tipo_habitacion: tipoEspacio === "habitacion" ? tipoHabitacion : "normal",
        numero_doble: tipoEspacio === "habitacion" && tipoHabitacion === "doble" ? (numeroDoble.trim() || roomId) : null,
        tiempo_limpieza: tiempoLimpieza > 0 ? tiempoLimpieza : 30,
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
            `El espacio se guardó, pero el historial no: ${messageOf(eventError)}`,
          );
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
      await deleteRoom(roomId);
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
              {isEditing ? "edit" : isCommonArea ? "domain" : "bed"}
            </span>
          </span>
          <div>
            <p className="eyebrow">{isCommonArea ? "Zona Común" : `Habitación · ${piso || "Sin piso"}`}</p>
            <h2>{roomId}</h2>
          </div>
          <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
          {!isCommonArea && tipoHabitacion === "doble" && (
            <span className="room-tag-badge room-tag-double">
              <span className="material-symbol" style={{ fontSize: "14px" }}>bed</span>
              Habitación Doble {numeroDoble && numeroDoble !== roomId ? `(${numeroDoble})` : ""}
            </span>
          )}
          {isCommonArea ? (
            <span className="room-tag-badge room-tag-common">
              <span className="material-symbol" style={{ fontSize: "14px" }}>domain</span>
              Zona Común
            </span>
          ) : piso ? (
            <span className="room-tag-badge room-tag-floor">
              <span className="material-symbol" style={{ fontSize: "14px" }}>layers</span>
              {piso}
            </span>
          ) : null}
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
            <option value="zona_comun">Zona Común</option>
          </select>
        </label>
        {!isCommonArea && (
          <label>
            Tipo de habitación
            <select
              disabled={!isEditing || saving}
              value={tipoHabitacion}
              onChange={(e) => {
                const next = e.target.value as "normal" | "doble";
                setTipoHabitacion(next);
                if (next === "doble" && !numeroDoble) {
                  setNumeroDoble(roomId);
                }
              }}
            >
              <option value="normal">Habitación Normal</option>
              <option value="doble">Habitación Doble (ej. 1.1, 1.2)</option>
            </select>
          </label>
        )}
        {!isCommonArea && tipoHabitacion === "doble" && (
          <label>
            Sub-número / Designación Doble
            <input
              disabled={!isEditing || saving}
              value={numeroDoble}
              placeholder="Ej. 1.1, 1.2, Habitación 1.1"
              onChange={(event) => setNumeroDoble(event.target.value)}
            />
          </label>
        )}
        <label>
          Piso / Ubicación
          <input
            disabled={!isEditing || saving}
            value={piso}
            placeholder={isCommonArea ? "Ej. Planta Baja, Terraza" : "Ej. Piso 1, Piso 2"}
            onChange={(event) => setPiso(event.target.value)}
          />
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
        <label>
          {isCommonArea ? "Responsable / Observación" : "Huésped"}
          <input disabled={!isEditing || saving} value={guest} onChange={(event) => setGuest(event.target.value)} />
        </label>
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
                Editar {isCommonArea ? "zona común" : "habitación"}
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
                Eliminar {isCommonArea ? "zona común" : "habitación"}
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
                  ¿Eliminar {isCommonArea ? "zona común" : "habitación"} "{roomId}"?
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
                <strong>{isCommonArea ? `la zona común "${roomId}"` : `la habitación "${roomId}"`}</strong>.
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
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const { state } = useHotelData();
  const isDoubleRoom = !isCommonArea && (state.roomTypes[roomId] === "doble" || detectRoomType(roomId) === "doble");
  const photoIndex = Array.from(roomId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % roomPhotos.length;

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

  return (
    <button className={`room-picker-card room-picker-card-${status}`} onClick={onSelect} type="button">
      <span className="room-picker-art">
        <img
          alt={isCommonArea ? `Zona común ${roomId}` : `Habitación ${roomId}`}
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
            {isDoubleRoom && (
              <span className="room-tag-badge room-tag-double" title="Habitación Doble">
                <span className="material-symbol" style={{ fontSize: "13px" }}>bed</span>
                Doble
              </span>
            )}
            {isCommonArea ? (
              <span className="room-tag-badge room-tag-common">
                <span className="material-symbol" style={{ fontSize: "13px" }}>domain</span>
                Zona Común
              </span>
            ) : floor ? (
              <span className="room-tag-badge room-tag-floor">
                <span className="material-symbol" style={{ fontSize: "13px" }}>layers</span>
                {floor}
              </span>
            ) : null}
          </span>
          <span className="material-symbol room-picker-arrow" aria-hidden="true">arrow_forward</span>
        </span>
        <span className="room-picker-details">
          <span className="room-picker-meta">
            <span className="material-symbol" aria-hidden="true">
              {isCommonArea ? "location_on" : "person"}
            </span>
            <span className="room-picker-meta-copy">
              <strong>{guest || (isCommonArea ? "Área Compartida" : "Sin huésped")}</strong>
            </span>
          </span>
          <span className="room-picker-secondary">
            <span className="room-picker-service">
              <span className="material-symbol" aria-hidden="true">cleaning_services</span>
              {servicePlan || "Sin servicio"}
            </span>
            {cleanerName && (
              <span
                className="room-picker-assignee"
                title={`Ver ficha del personal: ${cleanerName}`}
                role="button"
                tabIndex={0}
                onClick={handleAssigneeClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleAssigneeClick(e);
                  }
                }}
              >
                <ModernAvatar3D
                  name={cleanerName}
                  size={18}
                  className="room-picker-assignee-avatar"
                  alt={`Avatar 3D de ${cleanerName}`}
                />
                <span>{cleanerName}</span>
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  );
}

function CreateRoomModal({
  isOpen,
  onClose,
  onCreated,
  existingFloors,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
  existingFloors: string[];
}) {
  const [spaceType, setSpaceType] = useState<"habitacion" | "zona_comun">("habitacion");

  // Habitación
  const [selectedFloor, setSelectedFloor] = useState(existingFloors[0] || "Piso 1");
  const [isCustomFloor, setIsCustomFloor] = useState(false);
  const [customFloor, setCustomFloor] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState<"normal" | "doble">("normal");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("free");
  const [guest, setGuest] = useState("");
  const [servicePlan, setServicePlan] = useState("");

  // Zona Común
  const [commonFloor, setCommonFloor] = useState("Planta Baja");
  const [customCommonFloor, setCustomCommonFloor] = useState("");
  const [isCustomCommonFloor, setIsCustomCommonFloor] = useState(false);
  const [commonName, setCommonName] = useState("");
  const [commonStatus, setCommonStatus] = useState<RoomStatus>("free");

  // Tiempo estimado de limpieza (en minutos)
  const [cleaningDuration, setCleaningDuration] = useState<number>(30);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonFloorSuggestions = [
    "Planta Baja",
    "Piso 1",
    "Piso 2",
    "Piso 3",
    "Terraza",
    "Sótano",
    "General",
  ];

  const commonSuggestions = [
    "Lobby Principal",
    "Piscina",
    "Restaurante",
    "Gimnasio",
    "Lavandería",
    "Pasillo Piso 1",
    "Pasillo Piso 2",
    "Terraza Bar",
    "Spa",
  ];

  const effectiveFloor =
    spaceType === "habitacion"
      ? (isCustomFloor ? customFloor.trim() : selectedFloor)
      : (isCustomCommonFloor ? customCommonFloor.trim() : commonFloor);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const targetId = spaceType === "habitacion" ? roomNumber.trim() : commonName.trim();
    if (!targetId) {
      setError(
        spaceType === "habitacion"
          ? "Por favor escribe el número de la habitación."
          : "Por favor escribe el nombre de la zona común.",
      );
      return;
    }

    if (spaceType === "habitacion" && roomType === "doble") {
      if (!/^\d+(\.\d+)$/.test(targetId)) {
        setError("Las habitaciones dobles requieren formato con punto (ej. 1.1 o 1.2).");
        return;
      }
    }

    setSaving(true);
    try {
      await createRoom({
        id: targetId,
        piso: effectiveFloor || (spaceType === "habitacion" ? "Piso 1" : "General"),
        tipo_espacio: spaceType,
        tipo_habitacion: spaceType === "habitacion" ? roomType : "normal",
        numero_doble: spaceType === "habitacion" && roomType === "doble" ? targetId : null,
        estado: spaceType === "habitacion" ? roomStatus : commonStatus,
        guest: spaceType === "habitacion" ? guest.trim() || null : null,
        plan: spaceType === "habitacion" ? servicePlan.trim() || null : null,
        tiempo_limpieza: cleaningDuration > 0 ? cleaningDuration : 30,
      });

      onCreated(targetId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el espacio.");
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
      aria-labelledby="create-space-modal-title"
    >
      <div className="matrix-modal-dialog create-space-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="compact-modal-header">
          <div className="compact-modal-title">
            <span className="material-symbol" style={{ color: "#2563eb", fontSize: "20px" }}>
              {spaceType === "habitacion" ? "bed" : "deck"}
            </span>
            <h3 id="create-space-modal-title">
              {spaceType === "habitacion" ? "Nueva Habitación" : "Nueva Zona Común"}
            </h3>
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

        {error && <p className="form-error" role="alert" style={{ margin: "4px 0" }}>{error}</p>}

        <div className="compact-space-tabs">
          <button
            type="button"
            className={`compact-space-tab ${spaceType === "habitacion" ? "active" : ""}`}
            onClick={() => setSpaceType("habitacion")}
          >
            <span className="material-symbol" style={{ fontSize: "17px" }}>bedroom_parent</span>
            Habitación
          </button>
          <button
            type="button"
            className={`compact-space-tab ${spaceType === "zona_comun" ? "active" : ""}`}
            onClick={() => setSpaceType("zona_comun")}
          >
            <span className="material-symbol" style={{ fontSize: "17px" }}>deck</span>
            Zona Común
          </button>
        </div>

        <form onSubmit={handleSubmit} className="compact-space-form">
          {spaceType === "habitacion" ? (
            <div className="compact-form-grid">
              {/* Columna Izquierda */}
              <div className="compact-col">
                <div className="compact-field">
                  <label>Piso o Nivel</label>
                  <select
                    value={isCustomFloor ? "custom" : selectedFloor}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomFloor(true);
                      } else {
                        setIsCustomFloor(false);
                        setSelectedFloor(e.target.value);
                        if (roomType === "doble") {
                          const base = e.target.value.match(/\d+/)?.[0] || "1";
                          setRoomNumber(`${base}.1`);
                        }
                      }
                    }}
                  >
                    {existingFloors.map((fl) => (
                      <option key={fl} value={fl}>{fl}</option>
                    ))}
                    <option value="custom">+ Otro piso personalizado...</option>
                  </select>
                  {isCustomFloor && (
                    <input
                      type="text"
                      required
                      placeholder="Ej. Piso 4, Terraza"
                      value={customFloor}
                      onChange={(e) => setCustomFloor(e.target.value)}
                      style={{ marginTop: "4px" }}
                    />
                  )}
                </div>

                <div className="compact-field">
                  <label>Tipo de Habitación</label>
                  <div className="compact-type-switch">
                    <button
                      type="button"
                      className={`compact-type-btn ${roomType === "normal" ? "active" : ""}`}
                      onClick={() => {
                        setRoomType("normal");
                        if (roomNumber.includes(".")) {
                          const base = (isCustomFloor ? customFloor : selectedFloor).match(/\d+/)?.[0] || "1";
                          setRoomNumber(`${base}01`);
                        }
                      }}
                    >
                      <span className="material-symbol">single_bed</span> Normal
                    </button>
                    <button
                      type="button"
                      className={`compact-type-btn ${roomType === "doble" ? "active" : ""}`}
                      onClick={() => {
                        setRoomType("doble");
                        if (!roomNumber.includes(".")) {
                          const base = (isCustomFloor ? customFloor : selectedFloor).match(/\d+/)?.[0] || "1";
                          setRoomNumber(`${base}.1`);
                        }
                      }}
                    >
                      <span className="material-symbol">bed</span> Doble
                    </button>
                  </div>
                </div>

                <div className="compact-field">
                  <label>{roomType === "doble" ? "Número (ej. 1.1 o 1.2)" : "Número de Habitación"}</label>
                  <input
                    type="text"
                    required
                    placeholder={roomType === "doble" ? "Ej. 1.1 o 1.2" : "Ej. 101, 201"}
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                  {roomType === "doble" && (
                    <small className="field-hint">Formato decimal obligatorio (ej. 1.1, 1.2)</small>
                  )}
                </div>
              </div>

              {/* Columna Derecha */}
              <div className="compact-col">
                <div className="compact-field">
                  <label>Estado Inicial</label>
                  <select
                    value={roomStatus}
                    onChange={(e) => setRoomStatus(e.target.value as RoomStatus)}
                  >
                    <option value="free">Libre (disponible)</option>
                    <option value="occupied">Ocupada</option>
                    <option value="pending">Por atender / Pendiente</option>
                    <option value="cleaning">En Limpieza</option>
                  </select>
                </div>

                <div className="compact-field">
                  <label>Huésped (opcional)</label>
                  <input
                    type="text"
                    placeholder="Nombre del huésped"
                    value={guest}
                    onChange={(e) => setGuest(e.target.value)}
                  />
                </div>

                <div className="compact-field">
                  <label>Plan de Limpieza (opcional)</label>
                  <select
                    value={servicePlan}
                    onChange={(e) => setServicePlan(e.target.value)}
                  >
                    <option value="">Sin servicio asignado</option>
                    {cleaningServicePlans.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </div>

                <div className="compact-field">
                  <label>Tiempo estimado de limpieza</label>
                  <select
                    value={cleaningDuration}
                    onChange={(e) => setCleaningDuration(parseInt(e.target.value, 10) || 30)}
                  >
                    {CLEANING_DURATION_OPTIONS.map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} min ({(mins / 60).toFixed(1)} h)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="compact-form-grid">
              {/* Columna Izquierda Zona Común */}
              <div className="compact-col">
                <div className="compact-field">
                  <label>Ubicación / Piso</label>
                  <select
                    value={isCustomCommonFloor ? "custom" : commonFloor}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomCommonFloor(true);
                      } else {
                        setIsCustomCommonFloor(false);
                        setCommonFloor(e.target.value);
                      }
                    }}
                  >
                    {commonFloorSuggestions.map((fl) => (
                      <option key={fl} value={fl}>{fl}</option>
                    ))}
                    <option value="custom">+ Otra ubicación...</option>
                  </select>
                  {isCustomCommonFloor && (
                    <input
                      type="text"
                      required
                      placeholder="Ej. Terraza Norte, Jardín"
                      value={customCommonFloor}
                      onChange={(e) => setCustomCommonFloor(e.target.value)}
                      style={{ marginTop: "4px" }}
                    />
                  )}
                </div>

                <div className="compact-field">
                  <label>Nombre de la Zona Común</label>
                  <input
                    list="common-suggestions-list"
                    type="text"
                    required
                    placeholder="Ej. Lobby Principal, Piscina..."
                    value={commonName}
                    onChange={(e) => setCommonName(e.target.value)}
                  />
                  <datalist id="common-suggestions-list">
                    {commonSuggestions.map((sug) => (
                      <option key={sug} value={sug} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Columna Derecha Zona Común */}
              <div className="compact-col">
                <div className="compact-field">
                  <label>Estado Inicial</label>
                  <select
                    value={commonStatus}
                    onChange={(e) => setCommonStatus(e.target.value as RoomStatus)}
                  >
                    <option value="free">Libre / Habilitado</option>
                    <option value="cleaning">En Limpieza</option>
                    <option value="pending">Pendiente de Aseo</option>
                  </select>
                </div>

                <div className="compact-field">
                  <label>Tiempo estimado de limpieza</label>
                  <select
                    value={cleaningDuration}
                    onChange={(e) => setCleaningDuration(parseInt(e.target.value, 10) || 30)}
                  >
                    {CLEANING_DURATION_OPTIONS.map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} min ({(mins / 60).toFixed(1)} h)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="compact-modal-footer">
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button button-primary button-small"
              disabled={saving}
            >
              <span className="material-symbol" aria-hidden="true">
                {saving ? "hourglass_top" : "check"}
              </span>
              {saving
                ? "Guardando..."
                : spaceType === "habitacion"
                ? "Crear Habitación"
                : "Crear Zona Común"}
            </button>
          </div>
        </form>
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
  const [roomTypeFilter, setRoomTypeFilter] = useState<"all" | "normal" | "doble">("all");
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
      if (state.spaceTypes[id] !== "zona_comun") {
        const f = state.floors[id] || detectFloor(id);
        if (f) set.add(f);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [roomIds, state.floors, state.spaceTypes]);

  const commonAreasCount = useMemo(() => {
    return roomIds.filter((id) => state.spaceTypes[id] === "zona_comun").length;
  }, [roomIds, state.spaceTypes]);

  const doubleRoomsCount = useMemo(() => {
    return roomIds.filter(
      (id) => state.spaceTypes[id] !== "zona_comun" && (state.roomTypes[id] === "doble" || detectRoomType(id) === "doble"),
    ).length;
  }, [roomIds, state.roomTypes, state.spaceTypes]);

  const normalRoomsCount = useMemo(() => {
    return roomIds.filter(
      (id) => state.spaceTypes[id] !== "zona_comun" && (state.roomTypes[id] !== "doble" && detectRoomType(id) !== "doble"),
    ).length;
  }, [roomIds, state.roomTypes, state.spaceTypes]);

  const visibleRoomIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return roomIds.filter((roomId) => {
      const isCommonArea = state.spaceTypes[roomId] === "zona_comun";
      const roomFloor = state.floors[roomId] || detectFloor(roomId, undefined, isCommonArea);
      const isDouble = !isCommonArea && (state.roomTypes[roomId] === "doble" || detectRoomType(roomId) === "doble");

      if (selectedFilter === "zonas_comunes" && !isCommonArea) {
        return false;
      }
      if (selectedFilter !== "all" && selectedFilter !== "zonas_comunes") {
        if (isCommonArea || roomFloor !== selectedFilter) {
          return false;
        }
      }

      if (!isCommonArea) {
        if (roomTypeFilter === "doble" && !isDouble) return false;
        if (roomTypeFilter === "normal" && isDouble) return false;
      } else if (roomTypeFilter !== "all") {
        return false;
      }

      return !query || [
        roomId,
        state.guests[roomId] ?? "",
        state.servicePlans[roomId] ?? "",
        state.assignedCleanings[roomId]?.staffName ?? "",
        roomFloor,
        isCommonArea ? "zona comun común" : (isDouble ? "doble habitacion suite 1.1 1.2" : "normal estándar individual"),
      ].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [roomIds, search, selectedFilter, roomTypeFilter, state.assignedCleanings, state.floors, state.guests, state.roomTypes, state.servicePlans, state.spaceTypes]);

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

  function handleRoomCreated(newRoomId: string) {
    refresh().then(() => {
      handleSelectRoom(newRoomId);
    });
  }

  return (
    <div className="page-stack rooms-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventario</p>
          <h1>Habitaciones y Espacios</h1>
          <p className="page-description">Control de pisos, habitaciones y zonas comunes del hotel.</p>
        </div>
        <div className="room-heading-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span className="material-symbol" aria-hidden="true">domain_add</span>
            Nueva habitación / Zona común
          </button>
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
          {/* Pestañas de Filtro por Piso y Zonas Comunes */}
          <div className="room-filter-tabs-wrapper">
            <div className="room-filter-tabs" role="tablist" aria-label="Filtrar por piso o zonas comunes">
              <button
                type="button"
                role="tab"
                aria-selected={selectedFilter === "all"}
                className={`room-filter-tab ${selectedFilter === "all" ? "is-active" : ""}`}
                onClick={() => setSelectedFilter("all")}
              >
                <span className="material-symbol" aria-hidden="true">dashboard</span>
                <span>Todos los espacios</span>
                <span className="room-filter-tab-count">{roomIds.length}</span>
              </button>

              {availableFloors.map((floor) => {
                const count = roomIds.filter(
                  (id) => state.spaceTypes[id] !== "zona_comun" && (state.floors[id] || detectFloor(id)) === floor,
                ).length;
                return (
                  <button
                    key={floor}
                    type="button"
                    role="tab"
                    aria-selected={selectedFilter === floor}
                    className={`room-filter-tab ${selectedFilter === floor ? "is-active" : ""}`}
                    onClick={() => setSelectedFilter(floor)}
                  >
                    <span className="material-symbol" aria-hidden="true">layers</span>
                    <span>{floor}</span>
                    <span className="room-filter-tab-count">{count}</span>
                  </button>
                );
              })}

              <button
                type="button"
                role="tab"
                aria-selected={selectedFilter === "zonas_comunes"}
                className={`room-filter-tab ${selectedFilter === "zonas_comunes" ? "is-active" : ""}`}
                onClick={() => setSelectedFilter("zonas_comunes")}
              >
                <span className="material-symbol" aria-hidden="true">domain</span>
                <span>Zonas Comunes</span>
                <span className="room-filter-tab-count">{commonAreasCount}</span>
              </button>
            </div>
          </div>

          {/* Sub-filtro de tipo de habitación: Todas / Normales / Dobles */}
          <div className="room-type-filter-wrapper">
            <span className="room-type-filter-label">Tipo de habitación:</span>
            <div className="room-subfilter-chips" role="group" aria-label="Filtrar por tipo de habitación">
              <button
                type="button"
                className={`subfilter-chip ${roomTypeFilter === "all" ? "is-active" : ""}`}
                onClick={() => setRoomTypeFilter("all")}
              >
                Todas ({roomIds.length})
              </button>
              <button
                type="button"
                className={`subfilter-chip ${roomTypeFilter === "normal" ? "is-active" : ""}`}
                onClick={() => setRoomTypeFilter("normal")}
                title="Filtrar habitaciones estándar / normales"
              >
                <span className="material-symbol" aria-hidden="true" style={{ fontSize: "14px" }}>single_bed</span>
                Normales ({normalRoomsCount})
              </button>
              <button
                type="button"
                className={`subfilter-chip subfilter-chip-double ${roomTypeFilter === "doble" ? "is-active" : ""}`}
                onClick={() => setRoomTypeFilter("doble")}
                title="Filtrar habitaciones dobles con sub-número decimal (ej. 1.1, 1.2)"
              >
                <span className="material-symbol" aria-hidden="true" style={{ fontSize: "14px" }}>bed</span>
                Dobles ({doubleRoomsCount})
              </button>
            </div>
          </div>

          <div className="room-selection-toolbar">
            <div className="room-selection-controls">
              <label className="search-field">
                <span className="search-input-wrap">
                  <span className="material-symbol" aria-hidden="true">search</span>
                  <input
                    aria-label="Buscar habitación o espacio"
                    autoComplete="off"
                    placeholder="Habitación, zona común, huésped o personal..."
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
              {visibleRoomIds.length} {visibleRoomIds.length === 1 ? "espacio" : "espacios"}
            </p>
          </div>
          {visibleRoomIds.length === 0 ? (
            <p className="empty-state">No hay espacios que coincidan con la búsqueda o filtro seleccionado.</p>
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
                  cleanerId={state.assignedCleanings[roomId]?.staffId ?? null}
                  floor={state.floors[roomId] || detectFloor(roomId, undefined, state.spaceTypes[roomId] === "zona_comun")}
                  isCommonArea={state.spaceTypes[roomId] === "zona_comun"}
                  onSelect={() => handleSelectRoom(roomId)}
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

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRoomCreated}
        existingFloors={availableFloors.length > 0 ? availableFloors : ["Piso 1", "Piso 2", "Piso 3"]}
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
        <div className="cleaning-connection"><HotelDataStatus showStatus={false} /></div>
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
                  <td><strong>Hab. {event.room}</strong></td>
                  <td>
                    <span className={`status-pill status-${event.status}`}>
                      {statusLabels[event.status]}
                    </span>
                  </td>
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
          <HotelDataStatus showStatus={false} />
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
  const [startedRooms, setStartedRooms] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem("cleaner_started_rooms");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  function markRoomStarted(roomId: string) {
    setStartedRooms((prev) => {
      const next = new Set(prev);
      next.add(roomId);
      try {
        sessionStorage.setItem("cleaner_started_rooms", JSON.stringify(Array.from(next)));
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
    } catch {}
    setStartedRooms(new Set());
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
              {rooms.map((room) => {
                const isFinished = room.estado === "finalizado" || statusFromDb(room.estado) === "finished";
                const isCleaning = !isFinished && startedRooms.has(room.id_habitacion);
                const displayStatus: RoomStatus = isFinished
                  ? "finished"
                  : isCleaning
                  ? "cleaning"
                  : "pending";

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
                    <dl className="details-list">
                      <div><dt>Huésped</dt><dd>{room.nombre_huesped || "No registrado"}</dd></div>
                      <div><dt>Plan</dt><dd>{room.plan_limpieza || "No especificado"}</dd></div>
                      <div><dt>Detalles</dt><dd>{room.detalles_limpieza || "Sin indicaciones"}</dd></div>
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
                          {busyRoom === room.id_habitacion ? "Finalizando…" : "Finalizar Limpieza"}
                        </button>
                      )}
                      {isFinished && (
                        <div className="cleaner-completed-badge">
                          <span className="material-symbol" aria-hidden="true">task_alt</span>
                          <span>Limpieza finalizada</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
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
