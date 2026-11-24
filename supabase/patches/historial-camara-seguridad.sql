-- ==============================================================================
-- PARCHE: CÁMARA DE SEGURIDAD Y AUDITORÍA TOTAL EN HISTORIAL
-- ==============================================================================
-- Este script permite que public.eventos y public.trabajos_limpieza conserven
-- indefinidamente los registros históricos de habitaciones o espacios eliminados,
-- evitando que una eliminación sea bloqueada o borre la bitácora de auditoría.
--
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
-- ==============================================================================

-- 1. Eliminar restricciones conocidas de clave foránea en eventos y trabajos_limpieza
ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_id_habitacion_fkey;

ALTER TABLE public.trabajos_limpieza
  DROP CONSTRAINT IF EXISTS trabajos_limpieza_id_habitacion_fkey;

-- 2. Eliminar dinámicamente cualquier otra FK hacia habitaciones en eventos y trabajos_limpieza
-- (útil si Supabase o Postgres asignó un nombre autogenerado distinto)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'habitaciones'
          AND tc.table_name IN ('eventos', 'trabajos_limpieza')
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- 3. Asegurar que las asignaciones activas de personal se limpien en cascada si se borra la habitación
ALTER TABLE public.asignaciones_habitacion
  DROP CONSTRAINT IF EXISTS asignaciones_habitacion_id_habitacion_fkey;

ALTER TABLE public.asignaciones_habitacion
  ADD CONSTRAINT asignaciones_habitacion_id_habitacion_fkey
  FOREIGN KEY (id_habitacion)
  REFERENCES public.habitaciones(id_habitacion)
  ON DELETE CASCADE;

-- 4. Notificar recarga inmediata de esquema a la API de PostgREST
NOTIFY pgrst, 'reload schema';
