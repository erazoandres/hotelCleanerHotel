-- ==============================================================================
-- SCRIPT: REINICIAR Y VOLVER A INGRESAR EL PERSONAL
-- Ejecuta este script completo en el SQL Editor de tu proyecto en Supabase.
-- ==============================================================================

BEGIN;

-- 1. Respaldar temporalmente el personal actual que exista en la base de datos
CREATE TEMP TABLE IF NOT EXISTS temp_personal_backup AS
SELECT 
  id_personal, 
  nombre, 
  contacto, 
  correo, 
  COALESCE(activo, TRUE) AS activo
FROM public.personal;

-- 2. Limpiar las referencias foráneas que bloquean el borrado de personal
-- Desasignar habitaciones asignadas a este personal
UPDATE public.habitaciones
SET id_personal_asignado = NULL, 
    tipo_limpieza_asignada = NULL
WHERE id_personal_asignado IS NOT NULL;

-- Limpiar historiales vinculados a id_personal
DELETE FROM public.asignaciones_habitacion;
DELETE FROM public.asistencias;
DELETE FROM public.novedades;
DELETE FROM public.trabajos_limpieza;

-- En eventos, desvincular la referencia de id_personal para preservar el historial de eventos
UPDATE public.eventos
SET id_personal = NULL
WHERE id_personal IS NOT NULL;

-- 3. Borrar todo el personal existente en la tabla
DELETE FROM public.personal;

-- 4. Volver a ingresar el personal respaldado (reseteando auth_user_id para que puedan configurarse de nuevo)
INSERT INTO public.personal (id_personal, nombre, contacto, correo, activo, auth_user_id)
SELECT 
  id_personal, 
  nombre, 
  contacto, 
  correo, 
  activo, 
  NULL AS auth_user_id
FROM temp_personal_backup
ON CONFLICT (id_personal) DO UPDATE
SET nombre = EXCLUDED.nombre,
    contacto = EXCLUDED.contacto,
    correo = EXCLUDED.correo,
    activo = EXCLUDED.activo,
    auth_user_id = NULL;

-- 5. Si la tabla estaba vacía o no tenía registros, insertar el personal inicial predeterminado
INSERT INTO public.personal (id_personal, nombre, contacto, correo, activo)
VALUES
  ('DEMO-ASEADOR-01', 'Demo - Ana Torres', '3000000001', 'ana.torres@hotel.com', TRUE),
  ('DEMO-ASEADOR-02', 'Demo - Luis Gomez', '3000000002', 'luis.gomez@hotel.com', TRUE),
  ('DEMO-ASEADOR-03', 'Demo - Maria Rojas', '3000000003', 'maria.rojas@hotel.com', TRUE)
ON CONFLICT (id_personal) DO UPDATE
SET nombre = EXCLUDED.nombre,
    contacto = EXCLUDED.contacto,
    activo = EXCLUDED.activo;

DROP TABLE IF EXISTS temp_personal_backup;

COMMIT;

-- Notificar a PostgREST para recargar el esquema en tiempo real
NOTIFY pgrst, 'reload schema';
