import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useHotelAuth } from "../components/HotelAuth";
import { HotelDataStatus, useHotelData } from "../components/HotelData";
import {
  addEvent,
  addNovelty,
  createStaff,
  finishCleanerRoom,
  getCleanerRooms,
  loginCleaner,
  resetCleanerPassword,
  removeStaff,
  saveAttendance,
  updateRoom,
} from "../services/hotelRepository";
import type {
  AttendanceRecord,
  CleanerProfile,
  CleanerRoom,
  HotelEvent,
  RoomStatus,
} from "../types/hotel";

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
  const counts = [
    { label: "Habitaciones", value: roomStatuses.length },
    { label: "Ocupadas", value: roomStatuses.filter((status) => status === "occupied").length },
    {
      label: "Por atender",
      value: roomStatuses.filter((status) => status === "pending" || status === "cleaning").length,
    },
    { label: "Personal activo", value: state.staff.length },
  ];

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Centro de operaciones</p>
          <h1>Resumen del hotel</h1>
          <p className="muted">Sesión: {session?.user.email ?? "Administrador"}</p>
        </div>
        <HotelDataStatus />
      </div>
      <section className="metric-grid" aria-label="Resumen">
        {counts.map((item) => (
          <article className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
      <section className="page-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2>Últimos movimientos</h2>
          </div>
          <Link className="text-link" to="/app/historial">Ver historial</Link>
        </div>
        {state.events.length === 0 ? (
          <p className="empty-state">Todavía no hay movimientos registrados.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Hora</th><th>Habitación</th><th>Acción</th><th>Responsable</th></tr>
              </thead>
              <tbody>
                {state.events.slice(0, 8).map((event, index) => (
                  <tr key={`${event.room}-${event.time}-${index}`}>
                    <td>{formatDate(event.time)}</td>
                    <td>{event.room}</td>
                    <td>{event.action}</td>
                    <td>{event.actor ?? "No registrado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const assignment = state.assignedCleanings[roomId];
  const [status, setStatus] = useState(roomStatus);
  const [guest, setGuest] = useState(roomGuest);
  const [servicePlan, setServicePlan] = useState(roomServicePlan);
  const [cleaningDetails, setCleaningDetails] = useState(roomCleaningDetails);
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
    setStaffId(assignment?.staffId ?? "");
    setCleaningType(assignment?.cleaningType ?? "");
  }, [roomId, roomStatus, roomGuest, roomServicePlan, roomCleaningDetails, assignment?.staffId, assignment?.cleaningType]);

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
    <article className="room-card">
      <div className="room-card-heading">
        <div>
          <p className="eyebrow">Habitación</p>
          <h2>{roomId}</h2>
        </div>
        <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
      </div>
      <form className="form-grid" onSubmit={handleSave}>
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
          Plan de limpieza
          <input value={servicePlan} onChange={(event) => setServicePlan(event.target.value)} />
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
        {staffId && (
          <label>
            Tipo de limpieza
            <input value={cleaningType} onChange={(event) => setCleaningType(event.target.value)} />
          </label>
        )}
        <label className="form-wide">
          Detalles
          <textarea
            rows={2}
            value={cleaningDetails}
            onChange={(event) => setCleaningDetails(event.target.value)}
          />
        </label>
        <div className="form-wide form-actions">
          <ActionMessage error={error} success={success} />
          <button className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </article>
  );
}

export function RoomsPage() {
  const { state, loading, error, refresh } = useHotelData();
  const roomIds = useMemo(
    () => Object.keys(state.rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [state.rooms],
  );

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">Inventario</p><h1>Habitaciones</h1></div>
        <button className="button" onClick={() => void refresh()}>Actualizar</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && roomIds.length === 0 ? (
        <p className="empty-state">Cargando habitaciones…</p>
      ) : roomIds.length === 0 ? (
        <p className="empty-state">No hay habitaciones registradas en Supabase.</p>
      ) : (
        <section className="room-grid">
          {roomIds.map((roomId) => <RoomCard key={roomId} roomId={roomId} />)}
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
  const rooms = Object.keys(state.rooms)
    .filter((room) => ["pending", "cleaning"].includes(state.rooms[room]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">Operación diaria</p><h1>Limpiezas</h1></div>
        <HotelDataStatus />
      </div>
      <ActionMessage error={error} success={null} />
      {rooms.length === 0 ? (
        <p className="empty-state">No hay limpiezas pendientes o en curso.</p>
      ) : (
        <section className="room-grid">
          {rooms.map((roomId) => {
            const assignment = state.assignedCleanings[roomId];
            const status = state.rooms[roomId];
            return (
              <article className="room-card" key={roomId}>
                <div className="room-card-heading">
                  <div><p className="eyebrow">Habitación</p><h2>{roomId}</h2></div>
                  <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
                </div>
                <dl className="details-list">
                  <div><dt>Personal</dt><dd>{assignment?.staffName || "Sin asignar"}</dd></div>
                  <div><dt>Tipo</dt><dd>{assignment?.cleaningType || "No especificado"}</dd></div>
                  <div><dt>Huésped</dt><dd>{state.guests[roomId] || "No registrado"}</dd></div>
                </dl>
                {status === "pending" && (
                  <button
                    className="button button-primary"
                    disabled={busyRoom === roomId}
                    onClick={() => void startCleaning(roomId)}
                  >
                    {busyRoom === roomId ? "Actualizando…" : "Iniciar limpieza"}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}
      <Link className="text-link" to="/app/aseo">Abrir acceso para personal de aseo</Link>
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
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">Registro de actividad</p><h1>Historial</h1></div>
        <button className="button" onClick={() => void refresh()}>Actualizar</button>
      </div>
      <label className="search-field">
        Buscar por habitación, acción o responsable
        <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      </label>
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
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [credentialName, setCredentialName] = useState("");
  const [noveltyStaffId, setNoveltyStaffId] = useState("");
  const [noveltyLabel, setNoveltyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      });
      setNewPassword(password);
      setCredentialName(name.trim());
      setName("");
      setContact("");
      setSuccess("Registro creado. Copia la clave temporal; solo se mostrará una vez.");
      await refresh();
    } catch (createError: unknown) {
      setError(messageOf(createError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAttendance(personId: string, personName: string) {
    setError(null);
    setSuccess(null);
    const activeRecord = state.attendance.find(
      (record) => record.staffId === personId && !record.checkOut,
    );
    try {
      const record: AttendanceRecord = activeRecord
        ? { ...activeRecord, checkOut: new Date().toISOString() }
        : {
            id: crypto.randomUUID(),
            staffId: personId,
            staffName: personName,
            checkIn: new Date().toISOString(),
            checkOut: null,
          };
      await saveAttendance(record);
      setSuccess(activeRecord ? "Salida registrada." : "Entrada registrada.");
      await refresh();
    } catch (attendanceError: unknown) {
      setError(messageOf(attendanceError));
    }
  }

  async function handleNovelty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noveltyStaffId) {
      setError("Selecciona una persona para registrar la novedad.");
      return;
    }
    const person = state.staff.find((member) => member.id === noveltyStaffId);
    if (!person) {
      setError("La persona seleccionada ya no está disponible.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await addNovelty({
        id: crypto.randomUUID(),
        staffId: person.id,
        staffName: person.name,
        date: new Date().toISOString().slice(0, 10),
        type: "nota",
        label: noveltyLabel.trim(),
        notes: "",
        extraMinutes: null,
        createdAt: new Date().toISOString(),
      });
      setNoveltyLabel("");
      setSuccess("Novedad registrada.");
      await refresh();
    } catch (noveltyError: unknown) {
      setError(messageOf(noveltyError));
    }
  }

  async function handleRemove(personId: string) {
    if (!window.confirm("¿Desactivar esta ficha de personal?")) return;
    setError(null);
    setSuccess(null);
    try {
      await removeStaff(personId);
      setSuccess("Ficha desactivada.");
      await refresh();
    } catch (removeError: unknown) {
      setError(messageOf(removeError));
    }
  }

  async function handleResetPassword(personId: string, personName: string) {
    if (!window.confirm(`¿Generar una nueva clave temporal para ${personName}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const password = await resetCleanerPassword(personId);
      setCredentialName(personName);
      setNewPassword(password);
      setSuccess("Nueva clave temporal generada. La clave anterior ya no es válida.");
    } catch (resetError: unknown) {
      setError(messageOf(resetError));
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">Equipo</p><h1>Personal</h1></div>
        <HotelDataStatus />
      </div>
      <ActionMessage error={error} success={success} />
      {newPassword && (
        <section className="credential-notice" aria-live="polite">
          <strong>Clave temporal para {credentialName || "el personal"} — compartir una sola vez</strong>
          <code>{newPassword}</code>
          <button className="button button-small" onClick={() => setNewPassword(null)}>
            Ocultar clave
          </button>
        </section>
      )}
      <section className="staff-layout">
        <form className="page-card form-stack" onSubmit={handleCreate}>
          <div><p className="eyebrow">Nuevo registro</p><h2>Agregar personal</h2></div>
          <label>Nombre completo<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Teléfono<input required maxLength={30} type="tel" value={contact} onChange={(event) => setContact(event.target.value)} /></label>
          <button className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear ficha y clave"}
          </button>
        </form>
        <section className="page-card">
          <div className="section-heading"><div><p className="eyebrow">Equipo activo</p><h2>Personal registrado</h2></div></div>
          {state.staff.length === 0 ? (
            <p className="empty-state">No hay personal activo.</p>
          ) : (
            <div className="staff-list">
              {state.staff.map((person) => {
                const active = state.attendance.find(
                  (record) => record.staffId === person.id && !record.checkOut,
                );
                return (
                  <article className="staff-row" key={person.id}>
                    <div className="staff-identity">
                      <strong>{person.name}</strong>
                      <span>{person.contact}</span>
                      <span>{active ? `En turno desde ${formatDate(active.checkIn)}` : "Fuera de turno"}</span>
                    </div>
                    <div className="staff-actions">
                      <button className="button button-small" onClick={() => void toggleAttendance(person.id, person.name)}>
                        {active ? "Registrar salida" : "Registrar entrada"}
                      </button>
                      <button className="button button-small" onClick={() => void handleResetPassword(person.id, person.name)}>
                        Regenerar clave
                      </button>
                      <button className="button button-small button-danger" onClick={() => void handleRemove(person.id)}>
                        Desactivar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
      <form className="page-card novelty-form" onSubmit={handleNovelty}>
        <div><p className="eyebrow">Registro diario</p><h2>Agregar novedad</h2></div>
        <label>Personal
          <select required value={noveltyStaffId} onChange={(event) => setNoveltyStaffId(event.target.value)}>
            <option value="">Seleccionar…</option>
            {state.staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label>Descripción
          <input required maxLength={180} value={noveltyLabel} onChange={(event) => setNoveltyLabel(event.target.value)} />
        </label>
        <button className="button button-primary">Guardar novedad</button>
      </form>
      <section className="page-card">
        <div><p className="eyebrow">Novedades</p><h2>Registro reciente</h2></div>
        {state.novelties.length === 0 ? (
          <p className="empty-state">No hay novedades registradas.</p>
        ) : (
          <ul className="novelty-list">
            {state.novelties.slice(0, 12).map((item) => (
              <li key={item.id}><strong>{item.staffName}</strong><span>{item.label}</span><time>{item.date}</time></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function CleanerPortal() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [rooms, setRooms] = useState<CleanerRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  async function loadRooms(currentPhone: string, currentPassword: string) {
    const assignedRooms = await getCleanerRooms(currentPhone, currentPassword);
    setRooms(assignedRooms);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authenticated = await loginCleaner(phone.trim(), password);
      if (!authenticated) {
        setError("Teléfono o clave incorrectos.");
        return;
      }
      setProfile(authenticated);
      await loadRooms(phone.trim(), password);
    } catch (loginError: unknown) {
      setError(messageOf(loginError));
      setProfile(null);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish(roomId: string) {
    setBusyRoom(roomId);
    setError(null);
    try {
      await finishCleanerRoom(phone.trim(), password, roomId);
      await loadRooms(phone.trim(), password);
    } catch (finishError: unknown) {
      setError(messageOf(finishError));
    } finally {
      setBusyRoom(null);
    }
  }

  function signOut() {
    setProfile(null);
    setRooms([]);
    setPhone("");
    setPassword("");
    setError(null);
  }

  return (
    <main className="auth-page">
      {!profile ? (
        <form className="auth-card" onSubmit={handleLogin}>
          <p className="eyebrow">Acceso de aseo</p>
          <h1>Mis habitaciones</h1>
          <p className="muted">Ingresa el teléfono y la clave temporal que te entregó el administrador.</p>
          <label>Teléfono<input autoComplete="tel" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>Clave<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={loading}>{loading ? "Validando…" : "Ingresar"}</button>
          <Link className="text-link" to="/app/inicio">Volver al acceso administrativo</Link>
        </form>
      ) : (
        <section className="cleaner-page page-stack">
          <div className="page-heading">
            <div><p className="eyebrow">Acceso de aseo</p><h1>Hola, {profile.nombre}</h1></div>
            <button className="button" onClick={signOut}>Cerrar sesión</button>
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

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
