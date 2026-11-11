-- Parche para soporte de pisos y zonas comunes en habitaciones
-- Ejecutar en el Editor SQL de Supabase

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS piso TEXT;

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS tipo_espacio TEXT DEFAULT 'habitacion';

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS tipo_habitacion TEXT DEFAULT 'normal';

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS numero_doble TEXT;

-- Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';
