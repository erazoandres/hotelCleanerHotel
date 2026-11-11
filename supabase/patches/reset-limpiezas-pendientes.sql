-- Script opcional para reiniciar habitaciones que quedaron en 'limpieza' a 'pendiente'
-- Ejecútalo en Supabase SQL Editor si deseas que las habitaciones vuelvan a su estado pendiente.

UPDATE public.habitaciones
SET estado = 'pendiente',
    actualizado_en = NOW()
WHERE estado = 'limpieza';
