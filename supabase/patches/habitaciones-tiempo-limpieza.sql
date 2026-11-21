-- Patch: Agregar columna tiempo_limpieza a la tabla habitaciones
-- Permite definir la duración estimada de limpieza de cada habitación en minutos (default 30)
-- Utilizado para calcular con precisión las horas trabajadas por empleado en la sección de personal.

ALTER TABLE public.habitaciones
ADD COLUMN IF NOT EXISTS tiempo_limpieza INTEGER DEFAULT 30;

-- Recargar caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
