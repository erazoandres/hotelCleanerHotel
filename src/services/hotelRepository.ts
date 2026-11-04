import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import type {
  AttendanceRecord,
  CleanerProfile,
  CleanerRoom,
  CleaningWork,
  HotelEvent,
  NoveltyRecord,
  RemoteHotelState,
  RoomStatus,
  RoomUpdate,
  StaffMember,
} from "../types/hotel";

const statusToDatabase: Partial<Record<RoomStatus, string>> = {
  free: "libre",
  occupied: "ocupada",
  pending: "pendiente",
  cleaning: "limpieza",
  finished: "finalizado",
};

const statusFromDatabase: Record<string, RoomStatus> = {
  libre: "free",
  ocupada: "occupied",
  pendiente: "pending",
  limpieza: "cleaning",
  finalizado: "finished",
};

export async function fetchRemoteState(): Promise<RemoteHotelState> {
  const supabase = getSupabaseClient();
  const warnings: string[] = [];
  const [
    { data: rooms, error: roomsError },
    { data: staff, error: staffError },
    { data: assignments, error: assignmentsError },
    { data: events, error: eventsError },
    { data: cleaningWork, error: cleaningWorkError },
    { data: attendance, error: attendanceError },
    { data: novelties, error: noveltiesError },
  ] = await Promise.all([
    supabase.from("habitaciones").select("*"),
    supabase
      .from("personal")
      .select("id_personal, nombre, contacto, activo, creado_en")
      .eq("activo", true),
    supabase
      .from("asignaciones_habitacion")
      .select("*")
      .order("asignado_en", { ascending: false }),
    supabase
      .from("eventos")
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(100),
    supabase
      .from("trabajos_limpieza")
      .select("*")
      .order("creado_en", { ascending: false }),
    supabase.from("asistencias").select("*"),
    supabase
      .from("novedades")
      .select("*")
      .order("creado_en", { ascending: false }),
  ]);

  if (roomsError) {
    throw new Error(`No se pudieron cargar las habitaciones: ${roomsError.message}`);
  }
  const availableRows = <T,>(
    label: string,
    data: T[] | null,
    error: { message: string } | null,
  ): T[] => {
    if (error) {
      warnings.push(`${label}: ${error.message}`);
      return [];
    }
    return data ?? [];
  };
  const staffRows = availableRows("Personal", staff, staffError);
  const assignmentRows = availableRows("Asignaciones", assignments, assignmentsError);
  const eventRows = availableRows("Historial", events, eventsError);
  const cleaningRows = availableRows("Trabajos de limpieza", cleaningWork, cleaningWorkError);
  const attendanceRows = availableRows("Asistencias", attendance, attendanceError);
  const noveltyRows = availableRows("Novedades", novelties, noveltiesError);

  const staffById = new Map(
    staffRows.map((person) => [person.id_personal, person]),
  );
  const state: RemoteHotelState = {
    warnings,
    rooms: {},
    guests: {},
    servicePlans: {},
    cleaningDetails: {},
    assignedCleanings: {},
    roomAssignments: assignmentRows.map((assignment) => ({
      id: assignment.id_asignacion,
      roomId: assignment.id_habitacion,
      staffId: assignment.id_personal,
      cleaningType: assignment.tipo_limpieza,
      assignedAt: assignment.asignado_en,
      unassignedAt: assignment.liberado_en,
    })),
    cleaningWork: cleaningRows.map((work) => ({
      staffId: work.id_personal,
      staffName: work.nombre_personal,
      room: work.id_habitacion,
      cleaningType: work.tipo_limpieza,
      time: work.creado_en,
    })),
    attendance: attendanceRows.map((record) => ({
      id: record.id_asistencia,
      staffId: record.id_personal,
      staffName: record.nombre_personal,
      checkIn: record.entrada,
      checkOut: record.salida,
    })),
    novelties: noveltyRows.map((novelty) => ({
      id: novelty.id_novedad,
      staffId: novelty.id_personal,
      staffName: novelty.nombre_personal,
      date: novelty.fecha,
      type: novelty.tipo,
      label: novelty.etiqueta,
      notes: novelty.notas ?? "",
      extraMinutes: novelty.minutos_extra,
      createdAt: novelty.creado_en,
    })),
    staff: staffRows.map((person): StaffMember => ({
      id: person.id_personal,
      name: person.nombre,
      contact: person.contacto,
    })),
    events: eventRows.map((event) => ({
      room: event.id_habitacion,
      status: statusFromDatabase[event.estado] ?? "unknown",
      action: event.accion,
      guest: event.nombre_huesped,
      actor: event.responsable,
      cleanerId: event.id_personal,
      cleaningType: event.tipo_limpieza,
      time: event.creado_en,
    })),
  };

  for (const room of rooms ?? []) {
    state.rooms[room.id_habitacion] =
      statusFromDatabase[room.estado] ?? "unknown";
    if (room.nombre_huesped) state.guests[room.id_habitacion] = room.nombre_huesped;
    if (room.plan_limpieza) state.servicePlans[room.id_habitacion] = room.plan_limpieza;
    if (room.detalles_limpieza) {
      state.cleaningDetails[room.id_habitacion] = room.detalles_limpieza;
    }
    if (room.id_personal_asignado) {
      const assignedStaff = staffById.get(room.id_personal_asignado);
      state.assignedCleanings[room.id_habitacion] = {
        staffId: room.id_personal_asignado,
        staffName: assignedStaff?.nombre ?? "",
        cleaningType: room.tipo_limpieza_asignada ?? "",
      };
    }
  }

  return state;
}

export async function updateRoom(
  roomId: string,
  updates: RoomUpdate,
): Promise<void> {
  const supabase = getSupabaseClient();
  const row: {
    estado?: string;
    nombre_huesped?: string | null;
    plan_limpieza?: string | null;
    detalles_limpieza?: string | null;
    id_personal_asignado?: string | null;
    tipo_limpieza_asignada?: string | null;
    actualizado_en: string;
  } = { actualizado_en: new Date().toISOString() };

  if (updates.status !== undefined) {
    const status = statusToDatabase[updates.status];
    if (!status) throw new Error("Estado de habitación no válido.");
    row.estado = status;
  }
  if (updates.guest !== undefined) row.nombre_huesped = updates.guest;
  if (updates.servicePlan !== undefined) row.plan_limpieza = updates.servicePlan;
  if (updates.cleaningDetails !== undefined) {
    row.detalles_limpieza = updates.cleaningDetails;
  }
  if (updates.assignedCleaner !== undefined) {
    row.id_personal_asignado = updates.assignedCleaner?.staffId ?? null;
    row.tipo_limpieza_asignada = updates.assignedCleaningType ?? null;
  }

  const { error } =
    row.estado === undefined
      ? await supabase
          .from("habitaciones")
          .update(row)
          .eq("id_habitacion", String(roomId))
      : await supabase
          .from("habitaciones")
          .upsert({ id_habitacion: String(roomId), ...row, estado: row.estado });
  if (error) throw new Error(`No se pudo actualizar la habitación: ${error.message}`);
}

export async function addEvent(event: HotelEvent): Promise<void> {
  const supabase = getSupabaseClient();
  const status = statusToDatabase[event.status];
  if (!status) throw new Error("Estado de evento no válido.");

  const { error } = await supabase.from("eventos").insert({
    id_habitacion: String(event.room),
    estado: status,
    accion: event.action || "No Registrado",
    nombre_huesped: event.guest,
    responsable: event.actor && event.actor !== "No Registrado" ? event.actor : null,
    id_personal: event.cleanerId,
    tipo_limpieza: event.cleaningType,
    creado_en: event.time || new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo registrar el evento: ${error.message}`);
}

export async function addCleaningWork(work: CleaningWork): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("trabajos_limpieza").insert({
    id_personal: work.staffId,
    nombre_personal: work.staffName || "No Registrado",
    id_habitacion: String(work.room),
    tipo_limpieza: work.cleaningType,
    creado_en: work.time || new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo registrar el trabajo: ${error.message}`);
}

function createTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const maxByte = Math.floor(256 / alphabet.length) * alphabet.length;
  const password: string[] = [];

  while (password.length < 16) {
    const bytes = new Uint8Array(16 - password.length);
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error("Este navegador no permite generar una clave segura.");
    }
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < maxByte) password.push(alphabet[byte % alphabet.length]);
      if (password.length === 16) break;
    }
  }
  return password.join("");
}

export async function createStaff(person: StaffMember): Promise<string> {
  const supabase = getSupabaseClient();
  const digits = person.contact.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("El personal debe tener un teléfono válido.");
  const password = createTemporaryPassword();

  const { error } = await supabase.rpc("crear_aseador", {
    p_id_personal: person.id,
    p_nombre: person.name,
    p_contacto: person.contact,
    p_password: password,
  });
  if (error) throw new Error(`No se pudo crear el registro de personal: ${error.message}`);
  return password;
}

export async function resetCleanerPassword(staffId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("regenerar_clave_aseador", {
    p_id_personal: staffId,
  });
  if (error) throw new Error(`No se pudo regenerar la clave: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvió la nueva clave.");
  return data;
}

export async function loginCleaner(
  phone: string,
  password: string,
): Promise<CleanerProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("autenticar_aseador", {
    p_telefono: phone,
    p_password: password,
  });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  return data.length === 1 ? data[0] : null;
}

export async function getCleanerRooms(
  phone: string,
  password: string,
): Promise<CleanerRoom[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("habitaciones_aseador", {
    p_telefono: phone,
    p_password: password,
  });
  if (error) throw new Error(`No se pudieron cargar las habitaciones: ${error.message}`);
  return data;
}

export async function finishCleanerRoom(
  phone: string,
  password: string,
  roomId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("finalizar_habitacion_aseador", {
    p_telefono: phone,
    p_password: password,
    p_id_habitacion: String(roomId),
  });
  if (error) throw new Error(`No se pudo finalizar la habitación: ${error.message}`);
  if (!data) throw new Error("No se pudo finalizar la habitación.");
}

export async function removeStaff(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error: assignmentsError } = await supabase
    .from("habitaciones")
    .update({
      id_personal_asignado: null,
      tipo_limpieza_asignada: null,
    })
    .eq("id_personal_asignado", id);
  if (assignmentsError) {
    throw new Error(`No se pudieron liberar las habitaciones: ${assignmentsError.message}`);
  }

  const { error } = await supabase
    .from("personal")
    .update({ activo: false })
    .eq("id_personal", id);
  if (error) throw new Error(`No se pudo desactivar al personal: ${error.message}`);
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("asistencias").upsert({
    id_asistencia: record.id,
    id_personal: record.staffId,
    nombre_personal: record.staffName || "No Registrado",
    entrada: record.checkIn,
    salida: record.checkOut,
  });
  if (error) throw new Error(`No se pudo guardar la asistencia: ${error.message}`);
}

export async function addNovelty(record: NoveltyRecord): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("novedades").insert({
    id_novedad: record.id,
    id_personal: record.staffId,
    nombre_personal: record.staffName || "No Registrado",
    fecha: record.date,
    tipo: record.type,
    etiqueta: record.label,
    notas: record.notes || null,
    minutos_extra: record.extraMinutes,
    creado_en: record.createdAt || new Date().toISOString(),
  });
  if (error) throw new Error(`No se pudo guardar la novedad: ${error.message}`);
}

export function subscribeRealtime(
  onSyncRequired: () => void,
  onStatusChange?: (status: string) => void,
): RealtimeChannel {
  const supabase = getSupabaseClient();
  return supabase
    .channel("hotel-realtime-sync")
    .on("postgres_changes", { event: "*", schema: "public" }, () => {
      onSyncRequired();
    })
    .subscribe((status) => {
      onStatusChange?.(status);
    });
}
