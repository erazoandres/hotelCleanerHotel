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

export interface StructureItemDefinition {
  name: string;
  category: "Circulación" | "Aseos y Servicios" | "Estudio y Trabajo" | "Ocio y Convivencia" | "Bienestar y Exteriores";
  icon: string;
  suggestedDuration: number;
}

export const HOTEL_STRUCTURE_CATALOG: StructureItemDefinition[] = [
  // Circulación y Accesos
  { name: "Área ascensor", category: "Circulación", icon: "elevator", suggestedDuration: 20 },
  { name: "Zona ascensor", category: "Circulación", icon: "elevator", suggestedDuration: 20 },
  { name: "Ascensor hall", category: "Circulación", icon: "elevator", suggestedDuration: 20 },
  { name: "Ascensor salida 2", category: "Circulación", icon: "elevator", suggestedDuration: 20 },
  { name: "Escaleras", category: "Circulación", icon: "stairs", suggestedDuration: 25 },
  { name: "Escaleras A", category: "Circulación", icon: "stairs", suggestedDuration: 25 },
  { name: "Escaleras B", category: "Circulación", icon: "stairs", suggestedDuration: 25 },
  { name: "Escaleras de la piscina", category: "Circulación", icon: "stairs", suggestedDuration: 20 },
  { name: "Pasillos", category: "Circulación", icon: "alt_route", suggestedDuration: 30 },
  { name: "Baño y pasillo salones", category: "Circulación", icon: "alt_route", suggestedDuration: 30 },
  { name: "Hall", category: "Circulación", icon: "door_sliding", suggestedDuration: 25 },

  // Aseos y Servicios
  { name: "Baño 1", category: "Aseos y Servicios", icon: "wc", suggestedDuration: 25 },
  { name: "Baños", category: "Aseos y Servicios", icon: "wc", suggestedDuration: 30 },
  { name: "Baño PMR", category: "Aseos y Servicios", icon: "accessible", suggestedDuration: 25 },
  { name: "Baños vestieres", category: "Aseos y Servicios", icon: "checkroom", suggestedDuration: 35 },
  { name: "Baños de la piscina", category: "Aseos y Servicios", icon: "wc", suggestedDuration: 30 },
  { name: "Cuarto de basuras", category: "Aseos y Servicios", icon: "delete_sweep", suggestedDuration: 20 },
  { name: "Lavandería", category: "Aseos y Servicios", icon: "local_laundry_service", suggestedDuration: 35 },

  // Estudio y Trabajo
  { name: "Salón de estudio", category: "Estudio y Trabajo", icon: "school", suggestedDuration: 30 },
  { name: "Salón de estudio 1", category: "Estudio y Trabajo", icon: "menu_book", suggestedDuration: 30 },
  { name: "Salón de estudio 2", category: "Estudio y Trabajo", icon: "menu_book", suggestedDuration: 30 },
  { name: "Salón de conferencias", category: "Estudio y Trabajo", icon: "groups", suggestedDuration: 40 },
  { name: "Recepción", category: "Estudio y Trabajo", icon: "desk", suggestedDuration: 30 },
  { name: "Oficinas", category: "Estudio y Trabajo", icon: "business_center", suggestedDuration: 30 },
  { name: "Salas de espera 1-2-3", category: "Estudio y Trabajo", icon: "weekend", suggestedDuration: 25 },

  // Ocio y Convivencia
  { name: "Sala de TikTok", category: "Ocio y Convivencia", icon: "videocam", suggestedDuration: 30 },
  { name: "Sala de cine", category: "Ocio y Convivencia", icon: "movie", suggestedDuration: 35 },
  { name: "Sala de Play", category: "Ocio y Convivencia", icon: "sports_esports", suggestedDuration: 30 },
  { name: "Txoco", category: "Ocio y Convivencia", icon: "soup_kitchen", suggestedDuration: 45 },
  { name: "Zonas de mesas de juegos", category: "Ocio y Convivencia", icon: "casino", suggestedDuration: 30 },
  { name: "Comedor", category: "Ocio y Convivencia", icon: "restaurant", suggestedDuration: 40 },

  // Bienestar y Exteriores
  { name: "Gimnasio", category: "Bienestar y Exteriores", icon: "fitness_center", suggestedDuration: 40 },
  { name: "Zona de calistenia", category: "Bienestar y Exteriores", icon: "fitness_center", suggestedDuration: 25 },
  { name: "Área de la piscina", category: "Bienestar y Exteriores", icon: "pool", suggestedDuration: 45 },
  { name: "Terraza", category: "Bienestar y Exteriores", icon: "deck", suggestedDuration: 35 },
  { name: "Roof top", category: "Bienestar y Exteriores", icon: "roofing", suggestedDuration: 40 },
];

export function getStructureIcon(name: string): string {
  const clean = name.trim();
  const match = HOTEL_STRUCTURE_CATALOG.find(
    (item) => item.name.toLowerCase() === clean.toLowerCase()
  );
  if (match) return match.icon;
  const lower = clean.toLowerCase();
  if (lower.includes("ascensor") || lower.includes("elevador")) return "elevator";
  if (lower.includes("escalera")) return "stairs";
  if (lower.includes("baño") || lower.includes("bano") || lower.includes("wc")) return "wc";
  if (lower.includes("pmr")) return "accessible";
  if (lower.includes("vestier")) return "checkroom";
  if (lower.includes("basura")) return "delete_sweep";
  if (lower.includes("lavander")) return "local_laundry_service";
  if (lower.includes("tiktok") || lower.includes("video")) return "videocam";
  if (lower.includes("estudio") || lower.includes("libro")) return "menu_book";
  if (lower.includes("conferencia") || lower.includes("reunion")) return "groups";
  if (lower.includes("recepcion") || lower.includes("desk")) return "desk";
  if (lower.includes("oficina")) return "business_center";
  if (lower.includes("cine")) return "movie";
  if (lower.includes("play") || lower.includes("juego") || lower.includes("gamer")) return "sports_esports";
  if (lower.includes("txoco") || lower.includes("comedor") || lower.includes("cocina")) return "restaurant";
  if (lower.includes("mesa")) return "casino";
  if (lower.includes("espera")) return "weekend";
  if (lower.includes("piscina") || lower.includes("pool")) return "pool";
  if (lower.includes("gym") || lower.includes("gimnasio") || lower.includes("calistenia")) return "fitness_center";
  if (lower.includes("terraza") || lower.includes("deck")) return "deck";
  if (lower.includes("roof")) return "roofing";
  if (lower.includes("pasillo") || lower.includes("hall")) return "alt_route";
  return "domain";
}

export function getStructurePhoto(name: string): string {
  const lower = name.trim().toLowerCase();

  // 1. Casos compuestos altamente específicos
  if (lower.includes("escalera") && (lower.includes("piscina") || lower.includes("pool"))) {
    return "/images/structures/escaleras-piscina.jpg";
  }

  if ((lower.includes("baño") || lower.includes("bano")) && (lower.includes("piscina") || lower.includes("pool"))) {
    return "/images/structures/bano-piscina.jpg";
  }

  if ((lower.includes("baño") || lower.includes("bano")) && (lower.includes("pasillo") || lower.includes("salon") || lower.includes("salón"))) {
    return "/images/structures/bano-pasillo.jpg";
  }

  // 2. Escaleras
  if (lower.includes("escalera")) {
    return "/images/structures/escaleras.jpg";
  }

  // 3. Cuarto de basuras y residuos
  if (lower.includes("basura")) {
    return "/images/structures/basuras.jpg";
  }

  // 4. Lavandería y lencería
  if (lower.includes("lavander") || lower.includes("laundry")) {
    return "/images/structures/lavanderia.jpg";
  }

  // 5. Baños y Aseos generales
  if (
    lower.includes("baño") ||
    lower.includes("bano") ||
    lower.includes("wc") ||
    lower.includes("pmr") ||
    lower.includes("vestier") ||
    lower.includes("toilet") ||
    lower.includes("ducha") ||
    lower.includes("aseo")
  ) {
    return "/images/structures/bathroom.jpg";
  }

  // 6. Gimnasio y Calistenia
  if (
    lower.includes("gym") ||
    lower.includes("gimnasio") ||
    lower.includes("calistenia") ||
    lower.includes("fitness") ||
    lower.includes("pesas") ||
    lower.includes("cardio")
  ) {
    return "/images/structures/gym.jpg";
  }

  // 7. Sala de Play, Juegos, Consolas, TikTok
  if (
    lower.includes("play") ||
    lower.includes("juego") ||
    lower.includes("gamer") ||
    lower.includes("gaming") ||
    lower.includes("consola") ||
    lower.includes("arcade") ||
    lower.includes("tiktok") ||
    lower.includes("video") ||
    lower.includes("mesa")
  ) {
    return "/images/structures/playroom.jpg";
  }

  // 8. Piscina
  if (
    lower.includes("piscina") ||
    lower.includes("pool") ||
    lower.includes("alberca") ||
    lower.includes("pileta") ||
    lower.includes("jacuzzi")
  ) {
    return "/images/structures/pool.jpg";
  }

  // 9. Terraza y Rooftop
  if (
    lower.includes("terraza") ||
    lower.includes("deck") ||
    lower.includes("roof") ||
    lower.includes("rooftop") ||
    lower.includes("mirador") ||
    lower.includes("balcon") ||
    lower.includes("balcón")
  ) {
    return "/images/structures/terrace.jpg";
  }

  // 10. Cine
  if (
    lower.includes("cine") ||
    lower.includes("cinema") ||
    lower.includes("movie") ||
    lower.includes("pelicula") ||
    lower.includes("película") ||
    lower.includes("teatro")
  ) {
    return "/images/structures/cinema.jpg";
  }

  // 11. Estudio, Coworking, Conferencias, Oficinas
  if (
    lower.includes("estudio") ||
    lower.includes("libro") ||
    lower.includes("biblioteca") ||
    lower.includes("conferencia") ||
    lower.includes("reunion") ||
    lower.includes("reunión") ||
    lower.includes("oficina") ||
    lower.includes("cowork")
  ) {
    return "/images/structures/coworking.jpg";
  }

  // 12. Comedor, Cocina, Txoco, Restaurante
  if (
    lower.includes("txoco") ||
    lower.includes("choko") ||
    lower.includes("comedor") ||
    lower.includes("cocina") ||
    lower.includes("restaurante") ||
    lower.includes("restaurant") ||
    lower.includes("bar") ||
    lower.includes("cafeteria") ||
    lower.includes("cafetería") ||
    lower.includes("buffet")
  ) {
    return "/images/structures/dining.jpg";
  }

  // 13. Pasillos, Ascensores, Hall, Recepción, Lobby
  if (
    lower.includes("ascensor") ||
    lower.includes("elevador") ||
    lower.includes("pasillo") ||
    lower.includes("hall") ||
    lower.includes("recepcion") ||
    lower.includes("recepción") ||
    lower.includes("espera") ||
    lower.includes("lobby") ||
    lower.includes("entrada")
  ) {
    return "/images/structures/hallway.jpg";
  }

  return "/images/structures/common-area.jpg";
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
    "pasillos",
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
    "baño",
    "baños",
    "bano",
    "banos",
    "escalera",
    "escaleras",
    "basura",
    "basuras",
    "pmr",
    "vestier",
    "vestieres",
    "tiktok",
    "conferencia",
    "conferencias",
    "hall",
    "oficina",
    "oficinas",
    "cine",
    "play",
    "txoco",
    "choko",
    "mesas",
    "juegos",
    "comedor",
    "espera",
    "calistenia",
    "roof",
    "rooftop",
  ];
  if (commonKeywords.some((kw) => lower.includes(kw))) {
    return "zona_comun";
  }
  return "habitacion";
}

export function detectRoomType(
  _roomId?: string,
  _rawRoomType?: string | null,
): "normal" {
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
    cleaningTimes: {},
  };

  for (const room of rooms ?? []) {
    state.rooms[room.id_habitacion] =
      statusFromDatabase[room.estado] ?? "unknown";
    if (room.nombre_huesped?.trim()) {
      state.guests[room.id_habitacion] = room.nombre_huesped.trim();
    } else {
      const recentGuestEvent = eventRows.find((e) => e.id_habitacion === room.id_habitacion && e.nombre_huesped?.trim());
      if (recentGuestEvent?.nombre_huesped?.trim()) {
        state.guests[room.id_habitacion] = recentGuestEvent.nombre_huesped.trim();
      }
    }
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

    const rawTiempoLimpieza = (room as { tiempo_limpieza?: number | null }).tiempo_limpieza;
    if (typeof rawTiempoLimpieza === "number") {
      state.cleaningTimes[room.id_habitacion] = rawTiempoLimpieza;
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
    tiempo_limpieza?: number | null;
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
  if (updates.tiempo_limpieza !== undefined) row.tiempo_limpieza = updates.tiempo_limpieza;

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
      updates.numero_doble !== undefined ||
      updates.tiempo_limpieza !== undefined)
  ) {
    delete row.piso;
    delete row.tipo_espacio;
    delete row.tipo_habitacion;
    delete row.numero_doble;
    delete row.tiempo_limpieza;
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
  tiempo_limpieza?: number | null;
  estado?: RoomStatus;
  guest?: string | null;
  plan?: string | null;
  actor?: string | null;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const roomId = data.id.trim();
  if (!roomId) throw new Error("El identificador o nombre es obligatorio.");

  const status = statusToDatabase[data.estado ?? "free"] ?? "libre";
  const spaceType = data.tipo_espacio ?? detectSpaceType(roomId);
  const floor = data.piso?.trim() || detectFloor(roomId, undefined, spaceType === "zona_comun");
  const roomType = "normal";
  const doubleNumber = null;
  const tiempoLimpieza = typeof data.tiempo_limpieza === "number" && data.tiempo_limpieza > 0 ? data.tiempo_limpieza : 30;

  // Verificar si ya existe
  const { data: existing, error: selectError } = await supabase
    .from("habitaciones")
    .select("id_habitacion")
    .eq("id_habitacion", roomId)
    .maybeSingle();

  if (selectError) {
    if (selectError.message?.includes("schema cache") || (selectError as { code?: string }).code === "PGRST205") {
      throw new Error(
        "La tabla 'public.habitaciones' no se encuentra en Supabase. Debes ejecutar el script SQL 'crear-o-reparar-tabla-habitaciones.sql' en el Editor SQL de Supabase para solucionarlo.",
      );
    }
  }

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
    tiempo_limpieza: tiempoLimpieza,
    actualizado_en: new Date().toISOString(),
  };

  const { error: fullError } = await supabase
    .from("habitaciones")
    .insert(fullRow);

  if (fullError) {
    if (fullError.message?.includes("schema cache") || (fullError as { code?: string }).code === "PGRST205") {
      throw new Error(
        "La tabla 'public.habitaciones' no existe en Supabase. Ejecuta el script SQL 'crear-o-reparar-tabla-habitaciones.sql' en tu panel de Supabase.",
      );
    }

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
      if (baseError.message?.includes("schema cache") || (baseError as { code?: string }).code === "PGRST205") {
        throw new Error(
          "La tabla 'public.habitaciones' no existe en Supabase. Ejecuta el script 'crear-o-reparar-tabla-habitaciones.sql' en el Editor SQL de Supabase.",
        );
      }
      throw new Error(`No se pudo crear el espacio: ${baseError.message}`);
    }
  }

  // Registrar evento inicial en la cámara de seguridad
  try {
    const spaceLabel = spaceType === "zona_comun" ? "Zona común creada" : "Habitación creada";
    const creator = data.actor?.trim() || "Administrador";
    await addEvent({
      room: roomId,
      status: data.estado ?? "free",
      action: `${spaceLabel}: ${roomId} (${floor})`,
      guest: data.guest?.trim() || null,
      actor: creator,
      cleanerId: null,
      cleaningType: null,
      time: new Date().toISOString(),
    });
  } catch (eventErr) {
    console.warn("No se pudo registrar evento inicial:", eventErr);
  }
}

export interface CreateFloorPayload {
  floorName: string;
  structures: Array<{
    name: string;
    type?: "habitacion" | "zona_comun";
    roomType?: "normal" | "doble";
    status?: RoomStatus;
    cleaningDuration?: number;
  }>;
  actor?: string | null;
}

export async function createFloorWithStructures(data: CreateFloorPayload): Promise<{
  floor: string;
  createdCount: number;
  createdIds: string[];
}> {
  const supabase = getSupabaseClient();
  const floorName = data.floorName.trim();
  if (!floorName) {
    throw new Error("El nombre personalizado del piso es obligatorio.");
  }
  if (!data.structures || data.structures.length === 0) {
    throw new Error("Debes indicar al menos un área compartida o habitación para este piso.");
  }

  // Leer registros existentes para evitar choques de clave primaria
  const { data: existingRows, error: fetchErr } = await supabase
    .from("habitaciones")
    .select("id_habitacion");

  if (fetchErr && (fetchErr.message?.includes("schema cache") || (fetchErr as { code?: string }).code === "PGRST205")) {
    throw new Error(
      "La tabla 'public.habitaciones' no se encuentra en la base de datos de Supabase. Ejecuta el script SQL 'crear-o-reparar-tabla-habitaciones.sql' en el Editor SQL de Supabase para repararla.",
    );
  }

  const existingSet = new Set<string>(
    (existingRows || []).map((r: { id_habitacion: string }) => r.id_habitacion.trim().toLowerCase()),
  );

  const createdIds: string[] = [];
  const errors: string[] = [];

  for (const st of data.structures) {
    const rawName = st.name.trim();
    if (!rawName) continue;

    // Si ya existe este nombre (por ejemplo "Pasillos" o "Escaleras" en otro piso),
    // lo identificamos unívocamente con el piso para la clave primaria: "Pasillos - Piso 2"
    let targetId = rawName;
    if (existingSet.has(targetId.toLowerCase())) {
      targetId = `${rawName} - ${floorName}`;
      if (existingSet.has(targetId.toLowerCase())) {
        targetId = `${rawName} (${floorName}) ${Date.now().toString().slice(-3)}`;
      }
    }
    existingSet.add(targetId.toLowerCase());

    const spaceType = st.type ?? detectSpaceType(rawName);
    const roomType = st.roomType ?? (spaceType === "habitacion" ? detectRoomType(rawName) : "normal");
    const duration = st.cleaningDuration && st.cleaningDuration > 0 ? st.cleaningDuration : 30;
    const initialStatus = st.status ?? "free";

    try {
      await createRoom({
        id: targetId,
        piso: floorName,
        tipo_espacio: spaceType,
        tipo_habitacion: roomType,
        tiempo_limpieza: duration,
        estado: initialStatus,
        actor: data.actor ?? "Administrador",
      });
      createdIds.push(targetId);
    } catch (err) {
      console.error(`Error al crear área compartida "${targetId}":`, err);
      errors.push(`${rawName}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  if (createdIds.length === 0 && errors.length > 0) {
    throw new Error(`No se pudo crear ninguna área compartida: ${errors.join(", ")}`);
  }

  return {
    floor: floorName,
    createdCount: createdIds.length,
    createdIds,
  };
}

export async function deleteRoom(
  roomId: string,
  actor?: string | null,
  roomDetails?: {
    floor?: string | null;
    spaceType?: string | null;
    guest?: string | null;
    status?: RoomStatus;
  },
): Promise<void> {
  const supabase = getSupabaseClient();
  const cleanId = roomId.trim();
  if (!cleanId) throw new Error("Identificador no válido.");

  // Obtener información del espacio para la auditoría (cámara de seguridad)
  let floor = roomDetails?.floor;
  let spaceType = roomDetails?.spaceType;
  let guest = roomDetails?.guest;
  let status: RoomStatus = roomDetails?.status ?? "free";

  if (!floor) {
    try {
      const { data: existing } = await supabase
        .from("habitaciones")
        .select("piso, tipo_espacio, nombre_huesped, estado")
        .eq("id_habitacion", cleanId)
        .maybeSingle();
      if (existing) {
        floor = existing.piso || undefined;
        spaceType = existing.tipo_espacio || undefined;
        guest = existing.nombre_huesped || undefined;
        status = statusFromDatabase[existing.estado] ?? "free";
      }
    } catch {
      // Continuar con valores por defecto
    }
  }

  const auditActor = actor?.trim() || "Administrador";
  const spaceLabel = spaceType === "zona_comun" ? "Zona común eliminada" : "Habitación eliminada";
  const actionText = `${spaceLabel} permanentemente: ${cleanId}${floor ? ` (${floor})` : ""}`;

  // 1. Limpiar asignaciones activas de personal
  await supabase.from("asignaciones_habitacion").delete().eq("id_habitacion", cleanId);

  // 2. Registrar evento de eliminación permanente en auditoría (cámara de seguridad)
  // NOTA CRÍTICA: Jamás se eliminan eventos de la tabla 'eventos' para garantizar trazabilidad de auditoría completa.
  try {
    await addEvent({
      room: cleanId,
      status: status,
      action: actionText,
      guest: guest ?? null,
      actor: auditActor,
      cleanerId: null,
      cleaningType: null,
      time: new Date().toISOString(),
    });
  } catch (evErr) {
    console.warn("No se pudo registrar el evento de auditoría de eliminación previa:", evErr);
  }

  // 3. Eliminar el registro de habitación
  const { error } = await supabase
    .from("habitaciones")
    .delete()
    .eq("id_habitacion", cleanId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        `No se pudo eliminar el espacio porque Supabase tiene activa la clave foránea en eventos. ` +
        `Por favor ejecuta el script 'supabase/patches/historial-camara-seguridad.sql' en el Editor SQL de Supabase para desvincularla y conservar el historial.`
      );
    }
    throw new Error(`No se pudo eliminar el espacio: ${error.message}`);
  }
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
    const { data: updatedRows, error: directError } = await supabase
      .from("habitaciones")
      .update({ estado: "limpieza", actualizado_en: new Date().toISOString() })
      .eq("id_habitacion", cleanRoomId)
      .select("id_habitacion");

    if (!directError && updatedRows && updatedRows.length > 0) {
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

  // Registrar en eventos generales como cámara de seguridad
  try {
    const noteSummary = record.notes ? ` - ${record.notes}` : "";
    const detail = `Novedad de personal [${record.label || record.type}]: ${record.staffName || "Personal"}${noteSummary}`;
    await addEvent({
      room: "GENERAL",
      status: "pending",
      action: detail.slice(0, 300),
      guest: null,
      actor: record.staffName || "Personal",
      cleanerId: record.staffId || null,
      cleaningType: null,
      time: record.createdAt || new Date().toISOString(),
    });
  } catch (evErr) {
    // Si aún existe restricción FK contra id_habitacion en la base de datos, no detener el guardado de novedad
    console.warn("No se pudo duplicar novedad en eventos centrales:", evErr);
  }
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
