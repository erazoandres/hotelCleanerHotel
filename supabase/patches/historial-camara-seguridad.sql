-- ==============================================================================
-- PARCHE: CÁMARA DE SEGURIDAD Y AUDITORÍA TOTAL EN HISTORIAL
-- ==============================================================================
-- Este script permite que public.eventos conserve indefinidamente los registros
-- de habitaciones o espacios eliminados, evitando que una eliminación borre la bitácora.
--
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
-- ==============================================================================

-- 1. Eliminar la restricción de clave foránea restrictiva en eventos
ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_id_habitacion_fkey;

-- 2. Eliminar la restricción de clave foránea en trabajos_limpieza
ALTER TABLE public.trabajos_limpieza
  DROP CONSTRAINT IF EXISTS trabajos_limpieza_id_habitacion_fkey;

-- 3. Notificar recarga de esquema a PostgREST
NOTIFY pgrst, 'reload schema';
