type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      personal: Table<
        {
          id_personal: string;
          nombre: string;
          contacto: string;
          correo: string | null;
          auth_user_id: string | null;
          activo: boolean;
          creado_en: string;
        },
        "id_personal" | "nombre" | "contacto"
      >;
      habitaciones: Table<
        {
          id_habitacion: string;
          estado: string;
          nombre_huesped: string | null;
          plan_limpieza: string | null;
          detalles_limpieza: string | null;
          fecha_limpieza_programada: string | null;
          id_personal_asignado: string | null;
          tipo_limpieza_asignada: string | null;
          actualizado_en: string;
        },
        "id_habitacion" | "estado"
      >;
      asignaciones_habitacion: Table<
        {
          id_asignacion: number;
          id_habitacion: string;
          id_personal: string;
          tipo_limpieza: string | null;
          asignado_en: string;
          liberado_en: string | null;
        },
        "id_habitacion" | "id_personal"
      >;
      asistencias: Table<
        {
          id_asistencia: string;
          id_personal: string;
          nombre_personal: string;
          entrada: string;
          salida: string | null;
        },
        "id_asistencia" | "id_personal" | "nombre_personal" | "entrada"
      >;
      eventos: Table<
        {
          id_evento: number;
          id_habitacion: string;
          estado: string;
          accion: string;
          nombre_huesped: string | null;
          responsable: string | null;
          id_personal: string | null;
          tipo_limpieza: string | null;
          creado_en: string;
        },
        "id_habitacion" | "estado" | "accion"
      >;
      trabajos_limpieza: Table<
        {
          id_trabajo: number;
          id_personal: string;
          nombre_personal: string;
          id_habitacion: string;
          tipo_limpieza: string | null;
          creado_en: string;
        },
        "id_personal" | "nombre_personal" | "id_habitacion"
      >;
      novedades: Table<
        {
          id_novedad: string;
          id_personal: string;
          nombre_personal: string;
          fecha: string;
          tipo: string;
          etiqueta: string;
          notas: string | null;
          minutos_extra: number | null;
          creado_en: string;
        },
        "id_novedad" | "id_personal" | "nombre_personal" | "fecha" | "tipo" | "etiqueta"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      perfil_aseador: {
        Args: Record<PropertyKey, never>;
        Returns: { id_personal: string; nombre: string }[];
      };
      habitaciones_aseador: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id_habitacion: string;
          estado: string;
          nombre_huesped: string | null;
          plan_limpieza: string | null;
          detalles_limpieza: string | null;
          tipo_limpieza_asignada: string | null;
          fecha_limpieza_programada: string | null;
        }[];
      };
      historial_habitaciones_aseador: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id_trabajo: number;
          id_habitacion: string;
          tipo_limpieza: string | null;
          creado_en: string;
        }[];
      };
      finalizar_habitacion_aseador: {
        Args: { p_id_habitacion: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
