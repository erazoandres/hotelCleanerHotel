import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useHotelAuth } from "../components/HotelAuth";
import { FreshlyMark } from "../components/FreshlyBrand";
import { HotelDataStatus, useHotelData } from "../components/HotelData";
import { DashboardHeroSlider } from "../components/DashboardHeroSlider";
import { ModernAvatar3D, Avatar3DStylePicker } from "../components/ModernAvatar3D";
import {
  addEvent,
  createStaff,
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
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const [matrixFilter, setMatrixFilter] = useState<"all" | "free" | "occupied" | "pending" | "cleaning" | "finished">("all");
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [selectedModalRoom, setSelectedModalRoom] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  const getRoomStatusIcon = (st: RoomStatus) => {
    switch (st) {
      case "free":
        return "bed";
      case "finished":
        return "task_alt";
      case "occupied":
        return "hotel";
      case "pending":
        return "schedule";
      case "cleaning":
        return "cleaning_services";
      default:
        return "door_front";
    }
  };

  const isVipRoom = (plan?: string) => {
    if (!plan) return false;
    const p = plan.toLowerCase();
    return p.includes("premium") || p.includes("vip") || p.includes("suite");
  };

  const handleQuickStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    setModalBusy(true);
    setModalFeedback(null);
    try {
      await updateRoom(roomId, { status: newStatus });
      await addEvent({
        room: roomId,
        status: newStatus,
        action: `Estado cambiado a ${statusLabels[newStatus]} desde mapa`,
        guest: state.guests[roomId] || null,
        actor: session?.user.email ?? "Administrador",
        cleanerId: state.assignedCleanings[roomId]?.staffId || null,
        cleaningType: null,
        time: new Date().toISOString(),
      });
      setModalFeedback(`¡Habitación ${roomId} actualizada a "${statusLabels[newStatus]}"!`);
      if (refresh) await refresh();
      setTimeout(() => setModalFeedback(null), 3000);
    } catch (err: unknown) {
      setModalFeedback(err instanceof Error ? err.message : "Error al actualizar la habitación");
    } finally {
      setModalBusy(false);
    }
  };

  const roomIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );
  const totalRooms = roomIds.length;
  const occupiedCount = roomIds.filter((id) => state.rooms[id] === "occupied").length;
  const freeCount = roomIds.filter((id) => state.rooms[id] === "free" || state.rooms[id] === "finished").length;
  const pendingCount = roomIds.filter((id) => state.rooms[id] === "pending").length;
  const cleaningCount = roomIds.filter((id) => state.rooms[id] === "cleaning").length;
  const turnoverCount = pendingCount + cleaningCount;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const freeRate = totalRooms > 0 ? Math.round((freeCount / totalRooms) * 100) : 0;
  const turnoverRate = totalRooms > 0 ? Math.max(0, 100 - occupancyRate - freeRate) : 0;

  // Active staff on shift
  const activeStaffCount = state.attendance.filter((a) => !a.checkOut).length;
  const roomsPerActiveStaff = activeStaffCount > 0 ? (turnoverCount / activeStaffCount).toFixed(1) : String(turnoverCount);

  // Operational health calculation (100 - penalties for overdue & unassigned)
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

  // Group rooms by floors
  const floors = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const id of roomIds) {
      const floorNum = id.length >= 3 ? id.slice(0, -2) : "1";
      const key = `Piso ${floorNum}`;
      if (!map[key]) map[key] = [];
      map[key].push(id);
    }
    return map;
  }, [roomIds]);

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

  // Donut SVG circumference calculation (r = 50, C = 2 * PI * 50 = 314.159)
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius; // 314.159
  const occStroke = (occupancyRate / 100) * donutCircumference;
  const freeStroke = (freeRate / 100) * donutCircumference;
  const turnStroke = (turnoverRate / 100) * donutCircumference;

  // Filtered rooms for floor matrix
  const matrixFilterFn = (id: string) => {
    const s = state.rooms[id] || "free";
    if (matrixFilter === "all") return true;
    if (matrixFilter === "free") return s === "free";
    if (matrixFilter === "occupied") return s === "occupied";
    if (matrixFilter === "pending") return s === "pending";
    if (matrixFilter === "cleaning") return s === "cleaning";
    if (matrixFilter === "finished") return s === "finished";
    return true;
  };

  return (
    <div className="page-stack dashboard-page">
      <DashboardHeroSlider userEmail={session?.user.email ?? "Administrador"} />

      {/* Operational pulse & live status strip */}
      <div className="dashboard-status-strip">
        <div className="dashboard-live-badge">
          <span className="dashboard-pulse-dot" aria-hidden="true" />
          <span>Operación en Vivo</span>
          <span className="dashboard-dot-separator" aria-hidden="true">•</span>
          <strong>{totalRooms} habitaciones monitoreadas</strong>
        </div>
        <div className="dashboard-health-badge">
          <span className="material-symbol" aria-hidden="true">verified</span>
          <span>Índice Operativo: <strong>{operationalHealth}% Óptimo</strong></span>
        </div>
        <div className="dashboard-connection-pill">
          <HotelDataStatus showStatus={false} />
        </div>
      </div>

      {/* Graphical KPI Cards with SVG Mini-Rings */}
      <section className="dashboard-visual-kpis" aria-label="Indicadores gráficos clave">
        <article className="dashboard-kpi-card kpi-occupancy">
          <div className="kpi-card-header">
            <span className="kpi-label">Ocupación Actual</span>
            <span className="kpi-icon-pill coral"><span className="material-symbol" aria-hidden="true">hotel</span></span>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-metric-main">
              <strong>{occupancyRate}%</strong>
              <span>{occupiedCount} de {totalRooms} habitaciones</span>
            </div>
            <div className="kpi-mini-ring" aria-hidden="true">
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
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill">Capacidad: {occupiedCount}/{totalRooms} habs</span>
          </div>
        </article>

        <article className="dashboard-kpi-card kpi-ready">
          <div className="kpi-card-header">
            <span className="kpi-label">Disponibles / Listas</span>
            <span className="kpi-icon-pill mint"><span className="material-symbol" aria-hidden="true">door_open</span></span>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-metric-main">
              <strong>{freeCount}</strong>
              <span>{freeRate}% listas para check-in</span>
            </div>
            <div className="kpi-mini-ring" aria-hidden="true">
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
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill green">Entrega Inmediata</span>
          </div>
        </article>

        <article className="dashboard-kpi-card kpi-turnover">
          <div className="kpi-card-header">
            <span className="kpi-label">En Rotación / Aseo</span>
            <span className="kpi-icon-pill purple"><span className="material-symbol" aria-hidden="true">cleaning_services</span></span>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-metric-main">
              <strong>{turnoverCount}</strong>
              <span>{pendingCount} por asear · {cleaningCount} en curso</span>
            </div>
            <div className="kpi-mini-ring" aria-hidden="true">
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
          <div className="kpi-card-footer">
            <span className={`kpi-trend-pill ${pendingCount > 0 ? "amber" : "neutral"}`}>
              {pendingCount > 0 ? `${pendingCount} pendientes` : "Sin retrasos"}
            </span>
          </div>
        </article>

        <article className="dashboard-kpi-card kpi-staff">
          <div className="kpi-card-header">
            <span className="kpi-label">Personal en Turno</span>
            <span className="kpi-icon-pill sage"><span className="material-symbol" aria-hidden="true">badge</span></span>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-metric-main">
              <strong>{activeStaffCount} <small>/ {state.staff.length}</small></strong>
              <span>Carga: {roomsPerActiveStaff} hab / camarista</span>
            </div>
            <div className="kpi-mini-ring" aria-hidden="true">
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
          <div className="kpi-card-footer">
            <span className="kpi-trend-pill">
              {activeStaffCount > 0 ? "Turno activo" : "Sin ingresos hoy"}
            </span>
          </div>
        </article>
      </section>

      {/* Main Graphical Grid (2 Columns: Donut Gauge + Spatial Floor Matrix) */}
      <section className="dashboard-graphic-row">
        {/* Widget 1: Donut SVG Chart */}
        <article className="dashboard-card dashboard-donut-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-widget-eyebrow">Radar de Capacidad</p>
              <h2 className="dashboard-widget-title">Distribución de Ocupación</h2>
            </div>
            <span className="dashboard-badge-pill">Inventario Real</span>
          </div>

          <div className="dashboard-donut-content">
            <div className="dashboard-donut-visual">
              <svg viewBox="0 0 140 140" className="donut-svg-main">
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="#edf2f5"
                  strokeWidth="15"
                />
                {/* Ocupadas */}
                {occStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#f05d72"
                    strokeWidth="15"
                    strokeDasharray={`${occStroke} ${donutCircumference - occStroke}`}
                    strokeDashoffset={-donutCircumference * 0.25}
                    strokeLinecap="round"
                    className="donut-segment"
                  />
                )}
                {/* Libres */}
                {freeStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#26b7a6"
                    strokeWidth="15"
                    strokeDasharray={`${freeStroke} ${donutCircumference - freeStroke}`}
                    strokeDashoffset={-(donutCircumference * 0.25 + occStroke)}
                    strokeLinecap="round"
                    className="donut-segment"
                  />
                )}
                {/* Rotación */}
                {turnStroke > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="#8d73ff"
                    strokeWidth="15"
                    strokeDasharray={`${turnStroke} ${donutCircumference - turnStroke}`}
                    strokeDashoffset={-(donutCircumference * 0.25 + occStroke + freeStroke)}
                    strokeLinecap="round"
                    className="donut-segment"
                  />
                )}
              </svg>
              <div className="donut-center-readout">
                <strong>{occupancyRate}%</strong>
                <span>Ocupadas</span>
              </div>
            </div>

            <div className="dashboard-donut-legend">
              <div className="donut-legend-row">
                <span className="legend-indicator coral" />
                <span className="legend-title">Ocupadas</span>
                <strong className="legend-count">{occupiedCount} habs</strong>
                <span className="legend-pct">{occupancyRate}%</span>
              </div>
              <div className="donut-legend-progress">
                <span className="donut-progress-bar coral" style={{ width: `${occupancyRate}%` }} />
              </div>

              <div className="donut-legend-row">
                <span className="legend-indicator mint" />
                <span className="legend-title">Listas / Libres</span>
                <strong className="legend-count">{freeCount} habs</strong>
                <span className="legend-pct">{freeRate}%</span>
              </div>
              <div className="donut-legend-progress">
                <span className="donut-progress-bar mint" style={{ width: `${freeRate}%` }} />
              </div>

              <div className="donut-legend-row">
                <span className="legend-indicator purple" />
                <span className="legend-title">En Rotación</span>
                <strong className="legend-count">{turnoverCount} habs</strong>
                <span className="legend-pct">{turnoverRate}%</span>
              </div>
              <div className="donut-legend-progress">
                <span className="donut-progress-bar purple" style={{ width: `${turnoverRate}%` }} />
              </div>
            </div>
          </div>
        </article>

        {/* Widget 2: Spatial Floor Map Matrix */}
        <article className="dashboard-card dashboard-matrix-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-widget-eyebrow">Mapa Espacial</p>
              <h2 className="dashboard-widget-title">Distribución por Pisos</h2>
            </div>
            <div className="dashboard-matrix-filters" role="tablist">
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "all" ? "active" : ""}`}
                onClick={() => setMatrixFilter("all")}
              >
                Todas ({totalRooms})
              </button>
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "free" ? "active" : ""}`}
                onClick={() => setMatrixFilter("free")}
              >
                Libres
              </button>
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "occupied" ? "active" : ""}`}
                onClick={() => setMatrixFilter("occupied")}
              >
                Ocupadas
              </button>
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "pending" ? "active" : ""}`}
                onClick={() => setMatrixFilter("pending")}
              >
                Pendiente
              </button>
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "cleaning" ? "active" : ""}`}
                onClick={() => setMatrixFilter("cleaning")}
              >
                En limpieza
              </button>
              <button
                type="button"
                className={`matrix-filter-pill ${matrixFilter === "finished" ? "active" : ""}`}
                onClick={() => setMatrixFilter("finished")}
              >
                Finalizada
              </button>
            </div>
          </div>

          <div className="dashboard-matrix-content">
            {Object.entries(floors).map(([floorLabel, fRooms]) => {
              const visibleRoomsInFloor = fRooms.filter(matrixFilterFn);
              return (
                <div className="matrix-floor-block" key={floorLabel}>
                  <div className="matrix-floor-heading">
                    <span className="matrix-floor-badge">{floorLabel}</span>
                    <span className="matrix-floor-meta">{visibleRoomsInFloor.length} de {fRooms.length} habitaciones</span>
                  </div>
                  <div className="matrix-room-tiles">
                    {fRooms.map((roomId) => {
                      const st = state.rooms[roomId] || "free";
                      const isVisible = matrixFilterFn(roomId);
                      const isHovered = hoveredRoom === roomId;
                      const isSelected = selectedModalRoom === roomId;
                      const guest = state.guests[roomId];
                      const cleaner = state.assignedCleanings[roomId]?.staffName;
                      const plan = state.servicePlans[roomId];
                      const isVip = isVipRoom(plan);
                      const icon = getRoomStatusIcon(st);

                      return (
                        <div
                          className={`matrix-room-tile tile-${st} ${isVisible ? "" : "is-dimmed"} ${isHovered ? "is-hovered" : ""} ${isSelected ? "is-selected" : ""}`}
                          key={roomId}
                          role="button"
                          tabIndex={0}
                          aria-label={`Habitación ${roomId}, estado ${statusLabels[st] || st}`}
                          onClick={() => setSelectedModalRoom(roomId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedModalRoom(roomId);
                            }
                          }}
                          onMouseEnter={() => setHoveredRoom(roomId)}
                          onMouseLeave={() => setHoveredRoom(null)}
                        >
                          {/* Top: Icon Badge & Live status dot / VIP */}
                          <div className="matrix-tile-top">
                            <div className="matrix-tile-icon-box">
                              <span className="material-symbol" aria-hidden="true">{icon}</span>
                            </div>
                            {isVip ? (
                              <span className="matrix-tile-vip-badge" title="Huésped / Plan VIP">
                                <span className="material-symbol" aria-hidden="true">star</span>
                              </span>
                            ) : (
                              <span className="matrix-tile-dot" aria-hidden="true" />
                            )}
                          </div>

                          {/* Middle: Room Number */}
                          <div className="matrix-tile-middle">
                            <strong className="matrix-tile-num">{roomId}</strong>
                          </div>

                          {/* Bottom: Status Pill / Guest */}
                          <div className="matrix-tile-bottom">
                            <span className="matrix-tile-tag">
                              {st === "occupied" && guest
                                ? guest.split(" ")[0]
                                : statusLabels[st] || st}
                            </span>
                          </div>

                          {/* Interactive Hover Tooltip */}
                          {isHovered && !selectedModalRoom && (
                            <div className="matrix-tile-tooltip" role="tooltip">
                              <div className="matrix-tooltip-head">
                                <div className="matrix-tooltip-title">
                                  <span className="material-symbol" aria-hidden="true">{icon}</span>
                                  <strong>Habitación {roomId}</strong>
                                </div>
                                <span className={`status-pill status-${st}`}>{statusLabels[st]}</span>
                              </div>
                              <div className="matrix-tooltip-body">
                                <div><small>Huésped:</small> <span>{guest || "Sin registro"}</span></div>
                                <div><small>Aseador:</small> <span>{cleaner || "Sin asignar"}</span></div>
                                {plan && <div><small>Plan:</small> <span>{plan}</span></div>}
                                <div className="matrix-tooltip-hint">
                                  <span className="material-symbol" aria-hidden="true">touch_app</span>
                                  <span>Clic para abrir opciones</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Room Action Modal */}
          {selectedModalRoom && (
            <div
              className="matrix-modal-backdrop"
              onClick={() => setSelectedModalRoom(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="matrix-modal-title"
            >
              <div
                className="matrix-modal-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="matrix-modal-header">
                  <div className="matrix-modal-title-group">
                    <div className={`matrix-modal-icon-badge status-${state.rooms[selectedModalRoom] || "free"}`}>
                      <span className="material-symbol" aria-hidden="true">
                        {getRoomStatusIcon(state.rooms[selectedModalRoom] || "free")}
                      </span>
                    </div>
                    <div>
                      <h3 id="matrix-modal-title">Habitación {selectedModalRoom}</h3>
                      <span className={`status-pill status-${state.rooms[selectedModalRoom] || "free"}`}>
                        {statusLabels[state.rooms[selectedModalRoom] || "free"]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="matrix-modal-close"
                    onClick={() => setSelectedModalRoom(null)}
                    aria-label="Cerrar detalles de habitación"
                  >
                    <span className="material-symbol" aria-hidden="true">close</span>
                  </button>
                </div>

                {modalFeedback && (
                  <div className="matrix-modal-feedback" role="status">
                    <span className="material-symbol" aria-hidden="true">info</span>
                    <span>{modalFeedback}</span>
                  </div>
                )}

                <div className="matrix-modal-details-grid">
                  <div className="matrix-detail-item">
                    <span className="matrix-detail-label">Huésped Actual</span>
                    <strong className="matrix-detail-value">
                      {state.guests[selectedModalRoom] || "Sin huésped registrado"}
                    </strong>
                  </div>
                  <div className="matrix-detail-item">
                    <span className="matrix-detail-label">Aseador Asignado</span>
                    <strong className="matrix-detail-value">
                      {state.assignedCleanings[selectedModalRoom]?.staffName || "Sin asignar"}
                    </strong>
                  </div>
                  <div className="matrix-detail-item">
                    <span className="matrix-detail-label">Plan de Limpieza</span>
                    <span className="matrix-detail-value">
                      {state.servicePlans[selectedModalRoom] || "Estándar"}
                    </span>
                  </div>
                  <div className="matrix-detail-item">
                    <span className="matrix-detail-label">Próxima Fecha</span>
                    <span className="matrix-detail-value">
                      {state.scheduledCleaningDates[selectedModalRoom] || "No programada"}
                    </span>
                  </div>
                </div>

                {state.cleaningDetails[selectedModalRoom] && (
                  <div className="matrix-modal-notes">
                    <span className="matrix-detail-label">Indicaciones Especiales</span>
                    <p>{state.cleaningDetails[selectedModalRoom]}</p>
                  </div>
                )}

                <div className="matrix-modal-actions-section">
                  <h4 className="matrix-actions-heading">
                    <span className="material-symbol" aria-hidden="true">bolt</span>
                    Cambio Rápido de Estado
                  </h4>
                  <div className="matrix-quick-buttons-row">
                    <button
                      type="button"
                      className="matrix-quick-btn btn-free"
                      disabled={modalBusy || (state.rooms[selectedModalRoom] || "free") === "free"}
                      onClick={() => handleQuickStatusChange(selectedModalRoom, "free")}
                    >
                      <span className="material-symbol" aria-hidden="true">bed</span>
                      <span>Marcar Libre</span>
                    </button>

                    <button
                      type="button"
                      className="matrix-quick-btn btn-occupied"
                      disabled={modalBusy || (state.rooms[selectedModalRoom] || "free") === "occupied"}
                      onClick={() => handleQuickStatusChange(selectedModalRoom, "occupied")}
                    >
                      <span className="material-symbol" aria-hidden="true">hotel</span>
                      <span>Marcar Ocupada</span>
                    </button>

                    <button
                      type="button"
                      className="matrix-quick-btn btn-pending"
                      disabled={modalBusy || (state.rooms[selectedModalRoom] || "free") === "pending"}
                      onClick={() => handleQuickStatusChange(selectedModalRoom, "pending")}
                    >
                      <span className="material-symbol" aria-hidden="true">schedule</span>
                      <span>Por Limpiar</span>
                    </button>

                    <button
                      type="button"
                      className="matrix-quick-btn btn-cleaning"
                      disabled={modalBusy || (state.rooms[selectedModalRoom] || "free") === "cleaning"}
                      onClick={() => handleQuickStatusChange(selectedModalRoom, "cleaning")}
                    >
                      <span className="material-symbol" aria-hidden="true">cleaning_services</span>
                      <span>En Limpieza</span>
                    </button>

                    <button
                      type="button"
                      className="matrix-quick-btn btn-finished"
                      disabled={modalBusy || (state.rooms[selectedModalRoom] || "free") === "finished"}
                      onClick={() => handleQuickStatusChange(selectedModalRoom, "finished")}
                    >
                      <span className="material-symbol" aria-hidden="true">task_alt</span>
                      <span>Finalizada</span>
                    </button>
                  </div>
                </div>

                <div className="matrix-modal-footer">
                  <Link to="/rooms" className="button button-secondary matrix-modal-editor-btn">
                    <span className="material-symbol" aria-hidden="true">open_in_new</span>
                    Editor Completo
                  </Link>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setSelectedModalRoom(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="dashboard-matrix-legend-strip">
            <span className="matrix-legend-item"><span className="matrix-dot dot-free" /> Libre</span>
            <span className="matrix-legend-item"><span className="matrix-dot dot-occupied" /> Ocupada</span>
            <span className="matrix-legend-item"><span className="matrix-dot dot-pending" /> Por Limpiar</span>
            <span className="matrix-legend-item"><span className="matrix-dot dot-cleaning" /> En Limpieza</span>
          </div>
        </article>
      </section>

      {/* Secondary Graphical Grid (2 Columns: Hourly Activity Bar Chart + Service Spectrum) */}
      <section className="dashboard-graphic-row">
        {/* Widget 3: Shift Operational Load Chart */}
        <article className="dashboard-card dashboard-activity-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-widget-eyebrow">Flujo de Operación</p>
              <h2 className="dashboard-widget-title">Carga Horaria y Actividad</h2>
            </div>
            <span className="dashboard-badge-pill">Turnos de Hoy</span>
          </div>

          <div className="dashboard-activity-chart-wrap">
            <div className="activity-bars-container">
              {activityHours.blocks.map((block) => {
                const heightPct = Math.max(16, Math.round((block.count / activityHours.maxCount) * 100));
                return (
                  <div className="activity-bar-column" key={block.label}>
                    <div className="activity-bar-track">
                      <div
                        className="activity-bar-fill"
                        style={{ height: `${heightPct}%` }}
                      >
                        <span className="activity-bar-val">{block.count}</span>
                      </div>
                    </div>
                    <div className="activity-bar-info">
                      <strong className="activity-bar-name">{block.name}</strong>
                      <span className="activity-bar-label">{block.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="activity-chart-meta">
              <span className="material-symbol" aria-hidden="true">insights</span>
              <span>Distribución en tiempo real basada en <strong>{state.events.length} eventos registrados</strong>.</span>
            </div>
          </div>
        </article>

        {/* Widget 4: Service Plans Spectrum & Critical Agenda */}
        <article className="dashboard-card dashboard-services-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-widget-eyebrow">Protocolos y Agenda</p>
              <h2 className="dashboard-widget-title">Planes y Fechas Críticas</h2>
            </div>
            <Link className="text-link" to="/app/habitaciones">
              Administrar <span className="material-symbol" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>

          {/* Stacked spectrum bar */}
          <div className="dashboard-services-content">
            <div className="service-spectrum-header">
              <span className="spectrum-label">Cobertura de Protocolos</span>
              <span className="spectrum-total">{totalRooms} habitaciones activas</span>
            </div>

            <div className="service-stacked-bar" aria-label="Distribución de protocolos">
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

            <div className="service-pills-row">
              <span className="service-pill-item">
                <span className="pill-dot sem" /> Semanal: <strong>{serviceDistribution.semanal}</strong> ({serviceDistribution.semPct}%)
              </span>
              <span className="service-pill-item">
                <span className="pill-dot men" /> Mensual: <strong>{serviceDistribution.mensual}</strong> ({serviceDistribution.menPct}%)
              </span>
              <span className="service-pill-item">
                <span className="pill-dot pre" /> Premium: <strong>{serviceDistribution.premium}</strong> ({serviceDistribution.prePct}%)
              </span>
            </div>

            {/* Critical schedule list preview */}
            <div className="dashboard-critical-agenda">
              <div className="critical-agenda-title">
                <span>Próximas Fechas de Aseo</span>
                <span className="critical-badge">{overdueCount > 0 ? `${overdueCount} vencidas` : upcomingCount > 0 ? `${upcomingCount} en 7 días` : "Al día"}</span>
              </div>
              {scheduledRooms.length === 0 ? (
                <p className="empty-state-compact">Sin fechas programadas para los próximos días.</p>
              ) : (
                <ul className="critical-schedule-items">
                  {scheduledRooms.slice(0, 3).map((room) => {
                    const isOverdue = room.date < today && room.status !== "finished";
                    const isToday = room.date === today;
                    return (
                      <li className={`critical-item ${isOverdue ? "is-overdue" : ""}`} key={room.roomId}>
                        <div className="critical-room-col">
                          <strong>Hab. {room.roomId}</strong>
                          <span>{room.cleaner}</span>
                        </div>
                        <div className="critical-date-col">
                          <span className={`critical-tag ${isOverdue ? "tag-overdue" : isToday ? "tag-today" : "tag-normal"}`}>
                            {isOverdue ? "Vencida" : isToday ? "Hoy" : "Próxima"}
                          </span>
                          <time dateTime={room.date}>{room.date}</time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function RoomCard({ roomId }: { roomId: string }) {
  const { state, refresh } = useHotelData();
  const { session } = useHotelAuth();
  const roomStatus = state.rooms[roomId] ?? "unknown";
  const roomGuest = state.guests[roomId] ?? "";
  const rawServicePlan = state.servicePlans[roomId] ?? "";
  const roomServicePlan = rawServicePlan.trim().toLowerCase() === "salida" ? "" : rawServicePlan;
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
  const [isEditing, setIsEditing] = useState(false);

  function handleCancel() {
    setStatus(roomStatus);
    setGuest(roomGuest);
    setServicePlan(roomServicePlan);
    setCleaningDetails(roomCleaningDetails);
    setScheduledCleaningDate(roomScheduledCleaningDate);
    setStaffId(assignment?.staffId ?? "");
    setCleaningType(assignment?.cleaningType ?? "");
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
    setIsEditing(false);
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
        servicePlan: servicePlan.trim().toLowerCase() === "salida" ? null : servicePlan.trim() || null,
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
      setIsEditing(false);
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`room-card room-editor-card ${!isEditing ? "is-disabled" : "is-editing"}`}>
      <header className="room-editor-heading">
        <div className="room-editor-title">
          <span className="room-editor-icon">
            <span className="material-symbol" aria-hidden="true">{isEditing ? "edit" : "bed"}</span>
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
          <select disabled={!isEditing || saving} value={status} onChange={(event) => setStatus(event.target.value as RoomStatus)}>
            {status === "unknown" && <option value="unknown" disabled>Sin estado</option>}
            {editableStatuses.map((value) => (
              <option key={value} value={value}>{statusLabels[value]}</option>
            ))}
          </select>
        </label>
        <label>
          Huésped
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
              Editar habitación
            </button>
          ) : (
            <div className="room-editor-actions-group">
              <button
                type="button"
                className="button button-secondary room-editor-cancel-btn"
                disabled={saving}
                onClick={handleCancel}
              >
                <span className="material-symbol" aria-hidden="true">close</span>
                Cancelar
              </button>
              <button className="button button-primary room-editor-save" disabled={saving}>
                <span className="material-symbol" aria-hidden="true">
                  {saving ? "hourglass_top" : "save"}
                </span>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          )}
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
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "cleaning" | "unassigned" | "finished">("all");

  const allCleaningRooms = Object.keys(state.rooms)
    .filter((room) => ["pending", "cleaning", "finished"].includes(state.rooms[room]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const pendingCount = allCleaningRooms.filter((room) => state.rooms[room] === "pending").length;
  const activeCount = allCleaningRooms.filter((room) => state.rooms[room] === "cleaning").length;
  const finishedCount = allCleaningRooms.filter((room) => state.rooms[room] === "finished").length;
  const unassignedCount = allCleaningRooms.filter(
    (roomId) => ["pending", "cleaning"].includes(state.rooms[roomId]) && !state.assignedCleanings[roomId]?.staffId,
  ).length;

  const filteredByStatus = allCleaningRooms.filter((roomId) => {
    const s = state.rooms[roomId];
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return s === "pending";
    if (statusFilter === "cleaning") return s === "cleaning";
    if (statusFilter === "finished") return s === "finished";
    if (statusFilter === "unassigned") return ["pending", "cleaning"].includes(s) && !state.assignedCleanings[roomId]?.staffId;
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
                    <div className="cleaning-card-actions">
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
            <div className="staff-profile-panel compact-modern">
              <header className="staff-profile-header-bar">
                <div className="staff-profile-main-info">
                  <div className="staff-avatar-container">
                    <ModernAvatar3D
                      name={selectedStaff.name}
                      size={58}
                      className="staff-profile-avatar"
                      alt={`Avatar 3D de ${selectedStaff.name}`}
                    />
                    <span
                      className={`staff-avatar-status-dot ${selectedAttendance ? "is-on-shift" : ""}`}
                      title={selectedAttendance ? "En turno activo" : "Fuera de turno"}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="staff-profile-identity-texts">
                    <div className="staff-name-status-row">
                      <h3>{selectedStaff.name}</h3>
                      <span className={`staff-attendance-badge ${selectedAttendance ? "on-shift" : "off-shift"}`}>
                        <span className="badge-pulse-dot" aria-hidden="true" />
                        {selectedAttendance ? "En turno" : "Fuera de turno"}
                      </span>
                    </div>

                    <div className="staff-contact-quick-strip">
                      <span className="staff-quick-item" title="Teléfono">
                        <span className="material-symbol" aria-hidden="true">call</span>
                        <a href={`tel:${selectedStaff.contact}`}>{selectedStaff.contact}</a>
                      </span>
                      <span className="staff-bullet-dot" aria-hidden="true">•</span>
                      <span className="staff-quick-item" title="Correo electrónico">
                        <span className="material-symbol" aria-hidden="true">mail</span>
                        <span>{selectedStaff.email || "Sin correo"}</span>
                      </span>
                      {selectedAttendance && (
                        <>
                          <span className="staff-bullet-dot" aria-hidden="true">•</span>
                          <span className="staff-quick-item staff-shift-item" title="Hora de inicio de turno">
                            <span className="material-symbol" aria-hidden="true">schedule</span>
                            <span>Desde {formatDate(selectedAttendance.checkIn)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="staff-header-actions">
                  <button
                    className={`button button-small staff-action-pill ${editingStaffId === selectedStaff.id ? "is-active" : ""}`}
                    onClick={() => editingStaffId === selectedStaff.id
                      ? setEditingStaffId(null)
                      : startEditingStaff(selectedStaff)}
                    type="button"
                  >
                    <span className="material-symbol" aria-hidden="true">
                      {editingStaffId === selectedStaff.id ? "close" : "edit"}
                    </span>
                    {editingStaffId === selectedStaff.id ? "Cancelar" : "Editar"}
                  </button>
                  {selectedStaff.hasAccount && (
                    <button
                      className="button button-small button-ghost staff-action-pill"
                      onClick={() => void handleResetPassword(selectedStaff.id, selectedStaff.name)}
                      type="button"
                      title="Generar nueva contraseña provisional"
                    >
                      <span className="material-symbol" aria-hidden="true">lock_reset</span>
                      Contraseña
                    </button>
                  )}
                </div>
              </header>

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

              {/* Compact telemetry metrics bar */}
              <div className="staff-telemetry-row">
                <div className="staff-metric-chip">
                  <div className="staff-chip-icon blue">
                    <span className="material-symbol" aria-hidden="true">call</span>
                  </div>
                  <div className="staff-chip-data">
                    <span className="staff-chip-label">Teléfono directo</span>
                    <strong>{selectedStaff.contact}</strong>
                  </div>
                </div>

                <div className="staff-metric-chip">
                  <div className="staff-chip-icon purple">
                    <span className="material-symbol" aria-hidden="true">mail</span>
                  </div>
                  <div className="staff-chip-data">
                    <span className="staff-chip-label">Cuenta de correo</span>
                    <strong title={selectedStaff.email || ""}>{selectedStaff.email || "No registrado"}</strong>
                  </div>
                </div>

                <div className="staff-metric-chip">
                  <div className="staff-chip-icon emerald">
                    <span className="material-symbol" aria-hidden="true">timelapse</span>
                  </div>
                  <div className="staff-chip-data">
                    <span className="staff-chip-label">Horas trabajadas</span>
                    <strong>{reportHours.toFixed(2)} h <small>en periodo</small></strong>
                  </div>
                </div>
              </div>

              {/* Compact Activity and Hours Section */}
              <section className="staff-report-compact" aria-label={`Historial de trabajo de ${selectedStaff.name}`}>
                <div className="staff-report-compact-header">
                  <div className="staff-report-title-wrap">
                    <div className="staff-report-icon-box">
                      <span className="material-symbol" aria-hidden="true">monitoring</span>
                    </div>
                    <div>
                      <h4>Actividad y horas registradas</h4>
                      <p>Horas calculadas por registro de turnos y habitaciones atendidas</p>
                    </div>
                  </div>

                  <div className="staff-report-toolbar">
                    <div className="staff-compact-date-range">
                      <label>
                        <span>Desde</span>
                        <input type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} />
                      </label>
                      <span className="date-arrow" aria-hidden="true">→</span>
                      <label>
                        <span>Hasta</span>
                        <input type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} />
                      </label>
                    </div>

                    <button
                      className="button button-small button-secondary staff-csv-btn"
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

                {!reportPeriod ? (
                  <p className="form-error" role="alert">Selecciona un periodo válido: la fecha inicial debe ser anterior a la final.</p>
                ) : reportRows.length === 0 ? (
                  <div className="staff-report-empty-compact">
                    <span className="material-symbol" aria-hidden="true">event_busy</span>
                    <p>No hay actividad registrada en este periodo para {selectedStaff.name}.</p>
                  </div>
                ) : (
                  <div className="staff-report-table-wrap">
                    <table className="staff-compact-table">
                      <thead>
                        <tr>
                          <th>Fecha y Hora</th>
                          <th>Actividad</th>
                          <th>Habitación</th>
                          <th>Detalle</th>
                          <th className="align-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportRows.map((row, index) => (
                          <tr key={`${row.category}-${row.timestamp}-${row.room}-${index}`}>
                            <td className="cell-date">{formatDate(row.timestamp)}</td>
                            <td>
                              <span className={`staff-activity-tag cat-${row.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                {row.category}
                              </span>
                            </td>
                            <td className="cell-room">{row.room !== "—" ? `Hab. ${row.room}` : "—"}</td>
                            <td className="cell-detail">{row.detail}</td>
                            <td className="align-right cell-hours">
                              {row.hours === null ? "—" : <strong>{row.hours.toFixed(2)} h</strong>}
                            </td>
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
                        <ModernAvatar3D
                          name={person.name}
                          size={44}
                          className="staff-card-avatar"
                          alt={`Avatar 3D de ${person.name}`}
                        />
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

              <Avatar3DStylePicker variant="aside" />
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

  async function handleStart(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    try {
      await startCleanerRoom(roomId);
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
              {rooms.map((room) => {
                const currentStatus = statusFromDb(room.estado);
                const isCleaning = room.estado === "limpieza" || currentStatus === "cleaning";
                const isFinished = room.estado === "finalizado" || currentStatus === "finished";

                return (
                  <article className="room-card cleaner-room-card" key={room.id_habitacion}>
                    <div className="room-card-heading">
                      <div><p className="eyebrow">Habitación</p><h2>{room.id_habitacion}</h2></div>
                      <span className={`status-pill status-${currentStatus}`}>{statusLabels[currentStatus] || room.estado}</span>
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
