export type RoomStatus =
  | "free"
  | "occupied"
  | "pending"
  | "cleaning"
  | "finished"
  | "unknown";

export interface StaffMember {
  id: string;
  name: string;
  contact: string;
}

export interface CleanerProfile {
  id_personal: string;
  nombre: string;
}

export interface CleanerRoom {
  id_habitacion: string;
  estado: string;
  nombre_huesped: string | null;
  plan_limpieza: string | null;
  detalles_limpieza: string | null;
  tipo_limpieza_asignada: string | null;
}

export interface CleanerAssignment {
  staffId: string;
  staffName: string;
  cleaningType: string;
}

export interface RoomAssignment {
  id: number;
  roomId: string;
  staffId: string;
  cleaningType: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface CleaningWork {
  staffId: string;
  staffName: string;
  room: string;
  cleaningType: string | null;
  time: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  checkIn: string;
  checkOut: string | null;
}

export interface NoveltyRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  type: string;
  label: string;
  notes: string;
  extraMinutes: number | null;
  createdAt: string;
}

export interface HotelEvent {
  room: string;
  status: RoomStatus;
  action: string;
  guest: string | null;
  actor: string | null;
  cleanerId: string | null;
  cleaningType: string | null;
  time: string;
}

export interface RemoteHotelState {
  warnings: string[];
  rooms: Record<string, RoomStatus>;
  guests: Record<string, string>;
  servicePlans: Record<string, string>;
  cleaningDetails: Record<string, string>;
  assignedCleanings: Record<string, CleanerAssignment>;
  roomAssignments: RoomAssignment[];
  cleaningWork: CleaningWork[];
  attendance: AttendanceRecord[];
  novelties: NoveltyRecord[];
  staff: StaffMember[];
  events: HotelEvent[];
}

export interface RoomUpdate {
  status?: RoomStatus;
  guest?: string | null;
  servicePlan?: string | null;
  cleaningDetails?: string | null;
  assignedCleaner?: Pick<CleanerAssignment, "staffId"> | null;
  assignedCleaningType?: string | null;
}
