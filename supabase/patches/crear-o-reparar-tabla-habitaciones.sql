-- ==============================================================================
-- SCRIPT DE CREACIÓN Y REPARACIÓN: TABLA 'public.habitaciones'
-- Ejecuta este script completo en el SQL Editor de tu proyecto en Supabase:
-- https://supabase.com/dashboard/project/zwkkwmdfqssduomssyrv/sql
-- ==============================================================================

-- 1. Asegurar esquema público y permisos de esquema
CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Asegurar existencia de la tabla personal (por clave foránea)
CREATE TABLE IF NOT EXISTS public.personal (
  id_personal TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  contacto TEXT NOT NULL,
  correo TEXT,
  auth_user_id UUID,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Crear tabla habitaciones si no existe
CREATE TABLE IF NOT EXISTS public.habitaciones (
  id_habitacion TEXT PRIMARY KEY,
  estado TEXT NOT NULL DEFAULT 'libre' CHECK (
    estado IN ('libre', 'ocupada', 'pendiente', 'limpieza', 'finalizado')
  ),
  nombre_huesped TEXT,
  plan_limpieza TEXT,
  fecha_limpieza_programada DATE,
  detalles_limpieza TEXT,
  id_personal_asignado TEXT REFERENCES public.personal(id_personal) ON DELETE SET NULL,
  tipo_limpieza_asignada TEXT,
  piso TEXT,
  tipo_espacio TEXT DEFAULT 'habitacion',
  tipo_habitacion TEXT DEFAULT 'normal',
  numero_doble TEXT,
  tiempo_limpieza INTEGER DEFAULT 30,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Asegurar que todas las columnas existan (por si la tabla ya existía parcialmente)
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS nombre_huesped TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS plan_limpieza TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS fecha_limpieza_programada DATE;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS detalles_limpieza TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS id_personal_asignado TEXT REFERENCES public.personal(id_personal) ON DELETE SET NULL;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS tipo_limpieza_asignada TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS piso TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS tipo_espacio TEXT DEFAULT 'habitacion';
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS tipo_habitacion TEXT DEFAULT 'normal';
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS numero_doble TEXT;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS tiempo_limpieza INTEGER DEFAULT 30;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Validar restricción de estados
ALTER TABLE public.habitaciones DROP CONSTRAINT IF EXISTS habitaciones_estado_check;
ALTER TABLE public.habitaciones ADD CONSTRAINT habitaciones_estado_check
  CHECK (estado IN ('libre', 'ocupada', 'pendiente', 'limpieza', 'finalizado'));

-- 5. Otorgar permisos directos sobre public.habitaciones y public.personal
GRANT ALL ON TABLE public.habitaciones TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.personal TO anon, authenticated, service_role;

-- 6. Configurar Row Level Security (RLS) permisivo para operar sin bloqueos
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total habitaciones" ON public.habitaciones;
DROP POLICY IF EXISTS "Administradores gestionan datos" ON public.habitaciones;
DROP POLICY IF EXISTS "Lectura publica habitaciones" ON public.habitaciones;

CREATE POLICY "Acceso total habitaciones" ON public.habitaciones
  FOR ALL TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 7. Agregar public.habitaciones a la publicación en tiempo real de Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.habitaciones;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END;
$$;

-- 8. Notificar a PostgREST para recargar inmediatamente la caché de esquemas
NOTIFY pgrst, 'reload schema';
