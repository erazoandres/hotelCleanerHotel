import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import type {
  AttendanceRecord,
  CleanerHistoryItem,
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

function dateInputValue(value: string | null): string | null {
  const date = value?.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/i)?.[1];
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : date;
}

export function detectSpaceType(
  roomId: string,
  rawSpaceType?: string | null,
): "habitacion" | "zona_comun" {
  if (rawSpaceType === "zona_comun" || rawSpaceType === "habitacion") {
    return rawSpaceType;
  }
  const lower = roomId.trim().toLowerCase();
  const commonKeywords = [
    "lobby",
    "piscina",
    "pasillo",
    "zona",
    "comun",
    "común",
    "terraza",
    "restaurante",
    "gimnasio",
    "gym",
    "recepcion",
    "recepción",
    "lavanderia",
    "lavandería",
    "parqueadero",
    "estacionamiento",
    "patio",
    "jardin",
    "jardín",
    "spa",
    "ascensor",
    "elevador",
    "salon",
    "salón",
    "cafeteria",
    "cafetería",
    "bar",
  ];
  if (commonKeywords.some((kw) => lower.includes(kw))) {
    return "zona_comun";
  }
  return "habitacion";
}

export function detectRoomType(
  roomId: string,
  rawRoomType?: string | null,
): "normal" | "doble" {
  if (rawRoomType === "doble" || rawRoomType === "normal") {
    return rawRoomType;
  }
  const cleanId = roomId.trim();
  // Si contiene punto decimal seguido de dígitos (ej. "1.1", "1.2", "2.1", "101.1", etc.)
  if (/\b\d+\.\d+\b/.test(cleanId) || /^\d+\.\d+$/.test(cleanId) || /\.\d+/.test(cleanId)) {
    return "doble";
  }
  return "normal";
}

export function detectFloor(
  roomId: string,
  rawFloor?: string | null,
  isCommonArea?: boolean,
): string {
  if (rawFloor && rawFloor.trim()) {
    return rawFloor.trim();
  }

  const cleanId = roomId.trim();
  const lower = cleanId.toLowerCase();

  if (isCommonArea) {
    if (lower.includes("piso 1") || lower.includes("nivel 1") || lower.includes("primer")) return "Piso 1";
    if (lower.includes("piso 2") || lower.includes("nivel 2") || lower.includes("segundo")) return "Piso 2";
    if (lower.includes("piso 3") || lower.includes("nivel 3") || lower.includes("tercer")) return "Piso 3";
    if (lower.includes("piso 4") || lower.includes("nivel 4") || lower.includes("cuarto")) return "Piso 4";
    if (lower.includes("terraza") || lower.includes("rooftop")) return "Terraza";
    if (lower.includes("sotano") || lower.includes("sótano") || lower.includes("subsuelo")) return "Sótano";
    if (lower.includes("planta baja") || lower.includes("pb")) return "Planta Baja";
    return "Zonas Comunes";
  }

  // Formato decimal: "1.1", "2.3" -> Piso 1, Piso 2
  const dotMatch = cleanId.match(/^(\d+)\.\d+/);
  if (dotMatch) {
    return `Piso ${dotMatch[1]}`;
  }

  // Prefijo con P: P1, P-1, P01, Piso 1
  const prefixMatch = lower.match(/^p(?:iso)?[-_ ]?(\d+)/i);
  if (prefixMatch) {
    return `Piso ${parseInt(prefixMatch[1], 10)}`;
  }

  // Habitaciones numeradas comunes: "101", "204" -> Piso 1, Piso 2
  const numMatch = cleanId.match(/^(\d{3,4})\b/);
  if (numMatch) {
    const numStr = numMatch[1];
    if (numStr.length === 3) {
      return `Piso ${numStr[0]}`;
    } else if (numStr.length === 4) {
      const floorNum = parseInt(numStr.slice(0, 2), 10);
      return floorNum >= 10 ? `Piso ${floorNum}` : `Piso ${numStr[0]}`;
    }
  }

  // 1 o 2 dígitos directos: "1", "02"
  const singleDigitMatch = cleanId.match(/^(\d{1,2})[a-zA-Z]?$/);
  if (singleDigitMatch) {
    const n = parseInt(singleDigitMatch[1], 10);
    return `Piso ${n}`;
  }

  return "Piso 1";
}

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
    scheduledCleaningDates: {},
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
    floors: {},
    spaceTypes: {},
    roomTypes: {},
    doubleNumbers: {},
  };

  for (const room of rooms ?? []) {
    state.rooms[room.id_habitacion] =
      statusFromDatabase[room.estado] ?? "unknown";
    if (room.nombre_huesped) state.guests[room.id_habitacion] = room.nombre_huesped;
    if (room.plan_limpieza) state.servicePlans[room.id_habitacion] = room.plan_limpieza;
    if (room.detalles_limpieza) {
      state.cleaningDetails[room.id_habitacion] = room.detalles_limpieza;
    }
    const scheduledDate = dateInputValue(room.fecha_limpieza_programada);
    if (scheduledDate) state.scheduledCleaningDates[room.id_habitacion] = scheduledDate;
    if (room.id_personal_asignado) {
      const assignedStaff = staffById.get(room.id_personal_asignado);
      state.assignedCleanings[room.id_habitacion] = {
        staffId: room.id_personal_asignado,
        staffName: assignedStaff?.nombre ?? "",
        cleaningType: room.tipo_limpieza_asignada ?? "",
      };
    }

    const rawSpaceType = (room as { tipo_espacio?: string | null }).tipo_espacio;
    const spaceType = detectSpaceType(room.id_habitacion, rawSpaceType);
    state.spaceTypes[room.id_habitacion] = spaceType;

    const rawFloor = (room as { piso?: string | null }).piso;
    state.floors[room.id_habitacion] = detectFloor(
      room.id_habitacion,
      rawFloor,
      spaceType === "zona_comun",
    );

    const rawRoomType = (room as { tipo_habitacion?: string | null }).tipo_habitacion;
    state.roomTypes[room.id_habitacion] = detectRoomType(room.id_habitacion, rawRoomType);

    const rawNumeroDoble = (room as { numero_doble?: string | null }).numero_doble;
    if (rawNumeroDoble) {
      state.doubleNumbers[room.id_habitacion] = rawNumeroDoble;
    }
  }

  return state;
}

export const getRemoteHotelState = fetchRemoteState;

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
    fecha_limpieza_programada?: string | null;
    id_personal_asignado?: string | null;
    tipo_limpieza_asignada?: string | null;
    piso?: string | null;
    tipo_espacio?: string | null;
    tipo_habitacion?: string | null;
    numero_doble?: string | null;
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
  if (updates.scheduledCleaningDate !== undefined) {
    row.fecha_limpieza_programada = updates.scheduledCleaningDate;
  }
  if (updates.assignedCleaner !== undefined) {
    row.id_personal_asignado = updates.assignedCleaner?.staffId ?? null;
    row.tipo_limpieza_asignada = updates.assignedCleaningType ?? null;
  }
  if (updates.piso !== undefined) row.piso = updates.piso;
  if (updates.tipo_espacio !== undefined) row.tipo_espacio = updates.tipo_espacio;
  if (updates.tipo_habitacion !== undefined) row.tipo_habitacion = updates.tipo_habitacion;
  if (updates.numero_doble !== undefined) row.numero_doble = updates.numero_doble;

  let { error } =
    row.estado === undefined
      ? await supabase
          .from("habitaciones")
          .update(row)
          .eq("id_habitacion", String(roomId))
      : await supabase
          .from("habitaciones")
          .upsert({ id_habitacion: String(roomId), ...row, estado: row.estado });

  // Si falla por columnas que aún no existen en la BD, reintentar sin las columnas nuevas
  if (
    error &&
    (updates.piso !== undefined ||
      updates.tipo_espacio !== undefined ||
      updates.tipo_habitacion !== undefined ||
      updates.numero_doble !== undefined)
  ) {
    delete row.piso;
    delete row.tipo_espacio;
    delete row.tipo_habitacion;
    delete row.numero_doble;
    const retry =
      row.estado === undefined
        ? await supabase
            .from("habitaciones")
            .update(row)
            .eq("id_habitacion", String(roomId))
        : await supabase
            .from("habitaciones")
            .upsert({ id_habitacion: String(roomId), ...row, estado: row.estado });
    error = retry.error;
  }

  if (error) throw new Error(`No se pudo actualizar la habitación: ${error.message}`);
}

export async function createRoom(data: {
  id: string;
  piso?: string | null;
  tipo_espacio?: "habitacion" | "zona_comun";
  tipo_habitacion?: "normal" | "doble";
  numero_doble?: string | null;
  estado?: RoomStatus;
  guest?: string | null;
  plan?: string | null;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const roomId = data.id.trim();
  if (!roomId) throw new Error("El identificador o nombre es obligatorio.");

  const status = statusToDatabase[data.estado ?? "free"] ?? "libre";
  const spaceType = data.tipo_espacio ?? detectSpaceType(roomId);
  const floor = data.piso?.trim() || detectFloor(roomId, undefined, spaceType === "zona_comun");
  const roomType = data.tipo_habitacion ?? detectRoomType(roomId);
  const doubleNumber = data.numero_doble?.trim() || (roomType === "doble" ? roomId : null);

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from("habitaciones")
    .select("id_habitacion")
    .eq("id_habitacion", roomId)
    .maybeSingle();

  if (existing) {
    throw new Error(`Ya existe un espacio con el identificador "${roomId}".`);
  }

  const fullRow = {
    id_habitacion: roomId,
    estado: status,
    nombre_huesped: data.guest?.trim() || null,
    plan_limpieza: data.plan?.trim() || null,
    piso: floor,
    tipo_espacio: spaceType,
    tipo_habitacion: roomType,
    numero_doble: doubleNumber,
    actualizado_en: new Date().toISOString(),
  };

  const { error: fullError } = await supabase
    .from("habitaciones")
    .insert(fullRow);

  if (fullError) {
    // Si falla porque las columnas nuevas aún no existen en la BD, reintentar con las base
    console.warn("Fallo al insertar con nuevas columnas, intentando inserción base:", fullError.message);
    const baseRow = {
      id_habitacion: roomId,
      estado: status,
      nombre_huesped: data.guest?.trim() || null,
      plan_limpieza: data.plan?.trim() || null,
      actualizado_en: new Date().toISOString(),
    };
    const { error: baseError } = await supabase
      .from("habitaciones")
      .insert(baseRow);
    if (baseError) {
      throw new Error(`No se pudo crear el espacio: ${baseError.message}`);
    }
  }

  // Registrar evento inicial
  try {
    const spaceLabel = spaceType === "zona_comun" ? "Zona común creada" : "Habitación creada";
    await addEvent({
      room: roomId,
      status: data.estado ?? "free",
      action: `${spaceLabel} (${floor})`,
      guest: data.guest?.trim() || null,
      actor: "Sistema",
      cleanerId: null,
      cleaningType: null,
      time: new Date().toISOString(),
    });
  } catch (eventErr) {
    console.warn("No se pudo registrar evento inicial:", eventErr);
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const cleanId = roomId.trim();
  if (!cleanId) throw new Error("Identificador no válido.");

  // Limpiar relaciones primero para evitar violaciones de clave foránea
  await supabase.from("asignaciones_habitacion").delete().eq("id_habitacion", cleanId);
  await supabase.from("trabajos_limpieza").delete().eq("id_habitacion", cleanId);
  await supabase.from("eventos").delete().eq("id_habitacion", cleanId);

  const { error } = await supabase
    .from("habitaciones")
    .delete()
    .eq("id_habitacion", cleanId);

  if (error) throw new Error(`No se pudo eliminar el espacio: ${error.message}`);
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
    if (error.name === "FunctionsFetchError") {
      throw new Error(
        "No se pudo conectar con la función de cuentas. Comprueba tu conexión y que staff-account esté desplegada en Supabase.",
      );
    }
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
  customPassword?: string,
): Promise<string> {
  const digits = person.contact.replace(/\D/g, "");
  if (digits.length < 7) throw new Error("El personal debe tener un teléfono válido.");
  const trimmed = customPassword?.trim();
  if (trimmed && (trimmed.length < 6 || trimmed.length > 128)) {
    throw new Error("La contraseña debe tener entre 6 y 128 caracteres.");
  }
  const password = trimmed || createTemporaryPassword();
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

export async function resetCleanerPassword(
  staffId: string,
  customPassword?: string,
): Promise<string> {
  const trimmed = customPassword?.trim();
  if (trimmed && (trimmed.length < 6 || trimmed.length > 128)) {
    throw new Error("La contraseña debe tener entre 6 y 128 caracteres.");
  }
  const password = trimmed || createTemporaryPassword();
  await invokeStaffAccount<{ id_personal: string }>({
    action: "reset_password",
    id_personal: staffId,
    password,
  });
  return password;
}

export async function changeStaffPassword(
  staffId: string,
  newPassword: string,
): Promise<void> {
  const trimmed = newPassword.trim();
  if (trimmed.length < 6 || trimmed.length > 128) {
    throw new Error("La contraseña debe tener entre 6 y 128 caracteres.");
  }
  await invokeStaffAccount<{ id_personal: string }>({
    action: "reset_password",
    id_personal: staffId,
    password: trimmed,
  });
}

export async function updateCleanerSelfPassword(newPassword: string): Promise<void> {
  const trimmed = newPassword.trim();
  if (trimmed.length < 6 || trimmed.length > 128) {
    throw new Error("La contraseña debe tener entre 6 y 128 caracteres.");
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: trimmed });
  if (error) {
    throw new Error(error.message || "No se pudo actualizar la contraseña.");
  }
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

export async function getCleanerHistory(): Promise<CleanerHistoryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("historial_habitaciones_aseador");
  if (error) throw new Error(`No se pudo cargar el historial: ${error.message}`);
  return data;
}

export async function startCleanerRoom(
  roomId: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const cleanRoomId = String(roomId).trim();

  const { data, error } = await supabase.rpc("iniciar_limpieza_aseador", {
    p_id_habitacion: cleanRoomId,
  });

  if (!error && data) {
    return;
  }

  if (error && error.message.includes("Could not find the function")) {
    // Intentar actualización directa de estado como fallback
    const { error: directError } = await supabase
      .from("habitaciones")
      .update({ estado: "limpieza", actualizado_en: new Date().toISOString() })
      .eq("id_habitacion", cleanRoomId);

    if (!directError) {
      return;
    }

    throw new Error(
      "La función 'iniciar_limpieza_aseador' no está creada en tu base de datos de Supabase. " +
      "Por favor ejecuta el script 'supabase/patches/fix-iniciar-limpieza.sql' en el Editor SQL de Supabase para crearla."
    );
  }

  if (error) {
    throw new Error(`No se pudo iniciar la limpieza: ${error.message}`);
  }
  if (!data) {
    throw new Error("No se pudo iniciar la limpieza: la habitación no está disponible o no está asignada.");
  }
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
  await deleteStaff(id);
}

export async function deleteStaff(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const cleanId = id.trim();
  if (!cleanId) throw new Error("Identificador de personal no válido.");

  // 1. Limpiar dependencias en base de datos para evitar bloqueos por FK
  try {
    await supabase
      .from("habitaciones")
      .update({ id_personal_asignado: null, tipo_limpieza_asignada: null })
      .eq("id_personal_asignado", cleanId);
    await supabase.from("asignaciones_habitacion").delete().eq("id_personal", cleanId);
    await supabase.from("asistencias").delete().eq("id_personal", cleanId);
    await supabase.from("novedades").delete().eq("id_personal", cleanId);
    await supabase.from("trabajos_limpieza").delete().eq("id_personal", cleanId);
    await supabase.from("eventos").update({ id_personal: null }).eq("id_personal", cleanId);
  } catch (cleanErr) {
    console.warn("Advertencia limpiando dependencias de personal:", cleanErr);
  }

  // 2. Intentar llamar a staff-account para borrar cuenta en Supabase Auth y tabla
  try {
    await invokeStaffAccount<{ id_personal: string }>({
      action: "delete_staff",
      id_personal: cleanId,
    });
    return;
  } catch (fnErr) {
    console.warn("staff-account delete_staff no disponible o falló, aplicando borrado directo:", fnErr);
  }

  // 3. Borrado directo en tabla personal
  const { error } = await supabase.from("personal").delete().eq("id_personal", cleanId);
  if (error) {
    // Si falla el borrado por alguna restricción adicional, desactivarlo
    const { error: deactErr } = await supabase.from("personal").update({ activo: false }).eq("id_personal", cleanId);
    if (deactErr) throw new Error(`No se pudo eliminar el personal: ${error.message}`);
  }
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
