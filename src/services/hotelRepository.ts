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
      .select("id_personal, nombre, contacto, correo, auth_user_id, activo, creado_en")
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
      email: person.correo,
      hasAccount: Boolean(person.auth_user_id),
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
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const maxByte = Math.floor(256 / alphabet.length) * alphabet.length;
  const password: string[] = [];

  while (password.length < 20) {
    const bytes = new Uint8Array(20 - password.length);
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error("Este navegador no permite generar una clave segura.");
    }
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < maxByte) password.push(alphabet[byte % alphabet.length]);
      if (password.length === 20) break;
    }
  }
  return password.join("");
}

async function invokeStaffAccount<T>(
  body: Record<string, string>,
): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<T>("staff-account", {
    body,
  });
  if (error) {
    let detail = error.message;
    if (error.context instanceof Response) {
      try {
        const response = await error.context.clone().json() as { error?: string };
        if (response.error) detail = response.error;
      } catch {
        // Use the function error when the response is not JSON.
      }
    }
    throw new Error(detail);
  }
  if (!data) throw new Error("El servidor no devolvió los datos de la cuenta.");
  return data;
}

export async function createStaff(
  person: StaffMember,
): Promise<string> {
  const digits = person.contact.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("El personal debe tener un teléfono válido.");
  const password = createTemporaryPassword();
  await invokeStaffAccount<{ id_personal: string }>({
    action: "create_staff",
    id_personal: person.id,
    nombre: person.name,
    contacto: person.contact,
    correo: person.email ?? "",
    password,
  });
  return password;
}

export async function createStaffWithExistingAccount(
  person: StaffMember,
): Promise<void> {
  const digits = person.contact.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("El personal debe tener un teléfono válido.");
  if (!person.email) throw new Error("Escribe el correo de la cuenta Supabase existente.");
  await invokeStaffAccount<{ id_personal: string }>({
    action: "create_staff_link_account",
    id_personal: person.id,
    nombre: person.name,
    contacto: person.contact,
    correo: person.email.trim().toLowerCase(),
  });
}

export async function updateStaff(
  person: Pick<StaffMember, "id" | "name" | "contact" | "email" | "hasAccount">,
): Promise<void> {
  const digits = person.contact.replace(/\D/g, "");
  if (!person.name.trim() || person.name.length > 80) {
    throw new Error("El nombre debe tener entre 1 y 80 caracteres.");
  }
  if (digits.length < 7 || person.contact.length > 30) {
    throw new Error("El teléfono no es válido.");
  }
  const email = person.email?.trim().toLowerCase() ?? "";
  if (
    (person.hasAccount && !email)
    || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
  ) {
    throw new Error("Escribe un correo electrónico válido.");
  }
  await invokeStaffAccount<{ id_personal: string }>({
    action: "update_staff",
    id_personal: person.id,
    nombre: person.name.trim(),
    contacto: person.contact.trim(),
    correo: email,
  });
}

export async function createCleanerAccount(
  staffId: string,
  email: string,
): Promise<string> {
  const password = createTemporaryPassword();
  await invokeStaffAccount<{ id_personal: string }>({
    action: "create_account",
    id_personal: staffId,
    correo: email.trim(),
    password,
  });
  return password;
}

export async function linkCleanerAccount(
  staffId: string,
  email: string,
): Promise<void> {
  await invokeStaffAccount<{ id_personal: string }>({
    action: "link_account",
    id_personal: staffId,
    correo: email.trim(),
  });
}

export async function resetCleanerPassword(staffId: string): Promise<string> {
  const password = createTemporaryPassword();
  await invokeStaffAccount<{ id_personal: string }>({
    action: "reset_password",
    id_personal: staffId,
    password,
  });
  return password;
}

export async function loginCleaner(email: string, password: string): Promise<CleanerProfile> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: loginError } =
    await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (loginError) throw new Error("Correo o contraseña incorrectos.");
  if (sessionData.user.app_metadata.role !== "hotel_cleaner") {
    await supabase.auth.signOut();
    throw new Error("Esta cuenta no tiene acceso al portal de aseo.");
  }

  const { data, error } = await supabase.rpc("perfil_aseador");
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  if (data.length !== 1) {
    await supabase.auth.signOut();
    throw new Error("No se encontró una ficha activa asociada a esta cuenta.");
  }
  return data[0];
}

export async function getCleanerProfile(): Promise<CleanerProfile | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`No se pudo consultar la sesión: ${sessionError.message}`);
  if (sessionData.session?.user.app_metadata.role !== "hotel_cleaner") return null;

  const { data, error } = await supabase.rpc("perfil_aseador");
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  return data.length === 1 ? data[0] : null;
}

export async function logoutCleaner(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(`No se pudo cerrar sesión: ${error.message}`);
}

export async function getCleanerRooms(): Promise<CleanerRoom[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("habitaciones_aseador");
  if (error) throw new Error(`No se pudieron cargar las habitaciones: ${error.message}`);
  return data;
}

export async function finishCleanerRoom(
  roomId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("finalizar_habitacion_aseador", {
    p_id_habitacion: String(roomId),
  });
  if (error) throw new Error(`No se pudo finalizar la habitación: ${error.message}`);
  if (!data) throw new Error("No se pudo finalizar la habitación.");
}

export async function removeStaff(id: string): Promise<void> {
  await invokeStaffAccount<{ id_personal: string }>({
    action: "deactivate_staff",
    id_personal: id,
  });
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
