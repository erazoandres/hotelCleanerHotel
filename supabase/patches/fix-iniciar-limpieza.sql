-- Parche integral para iniciar y finalizar limpieza desde el portal de personal
-- Ejecuta este script en el Editor SQL de Supabase.

-- 1. Función para iniciar limpieza
CREATE OR REPLACE FUNCTION public.iniciar_limpieza_aseador(
  p_id_habitacion TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  trabajador RECORD;
  hab RECORD;
  tipo TEXT;
BEGIN
  SELECT p.id_personal, p.nombre
  INTO trabajador
  FROM public.personal p
  WHERE p.auth_user_id = auth.uid()
    AND p.activo IS TRUE
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'hotel_cleaner';

  IF trabajador.id_personal IS NULL THEN
    RAISE EXCEPTION 'No hay una cuenta de aseo activa asociada a esta sesión.';
  END IF;

  SELECT h.id_habitacion, h.estado, h.tipo_limpieza_asignada, h.id_personal_asignado
  INTO hab
  FROM public.habitaciones h
  WHERE h.id_habitacion = p_id_habitacion;

  IF hab.id_habitacion IS NULL THEN
    RAISE EXCEPTION 'La habitación % no existe.', p_id_habitacion;
  END IF;

  IF hab.id_personal_asignado IS DISTINCT FROM trabajador.id_personal THEN
    RAISE EXCEPTION 'La habitación % no está asignada a su usuario.', p_id_habitacion;
  END IF;

  -- Si ya está en limpieza, retornar TRUE
  IF hab.estado = 'limpieza' THEN
    RETURN TRUE;
  END IF;

  IF hab.estado = 'finalizado' THEN
    RAISE EXCEPTION 'La habitación % ya fue finalizada.', p_id_habitacion;
  END IF;

  UPDATE public.habitaciones h
  SET estado = 'limpieza',
      actualizado_en = NOW()
  WHERE h.id_habitacion = p_id_habitacion
    AND h.id_personal_asignado = trabajador.id_personal
  RETURNING h.tipo_limpieza_asignada INTO tipo;

  INSERT INTO public.eventos (
    id_habitacion, estado, accion, responsable, id_personal, tipo_limpieza
  )
  VALUES (
    p_id_habitacion, 'limpieza', 'Limpieza iniciada por personal',
    trabajador.nombre, trabajador.id_personal, COALESCE(tipo, hab.tipo_limpieza_asignada)
  );

  RETURN TRUE;
END;
$$;

-- 2. Función para finalizar limpieza
CREATE OR REPLACE FUNCTION public.finalizar_habitacion_aseador(
  p_id_habitacion TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  trabajador RECORD;
  tipo TEXT;
BEGIN
  SELECT p.id_personal, p.nombre
  INTO trabajador
  FROM public.personal p
  WHERE p.auth_user_id = auth.uid()
    AND p.activo IS TRUE
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'hotel_cleaner';

  IF trabajador.id_personal IS NULL THEN
    RAISE EXCEPTION 'No hay una cuenta de aseo activa asociada a esta sesión.';
  END IF;

  UPDATE public.habitaciones h
  SET estado = 'finalizado',
      actualizado_en = NOW()
  WHERE h.id_habitacion = p_id_habitacion
    AND h.id_personal_asignado = trabajador.id_personal
    AND h.estado <> 'finalizado'
  RETURNING h.tipo_limpieza_asignada INTO tipo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La habitación no está asignada o ya fue finalizada.';
  END IF;

  INSERT INTO public.trabajos_limpieza (
    id_habitacion, id_personal, tipo_limpieza
  )
  VALUES (
    p_id_habitacion, trabajador.id_personal, COALESCE(tipo, 'Estándar')
  );

  INSERT INTO public.eventos (
    id_habitacion, estado, accion, responsable, id_personal, tipo_limpieza
  )
  VALUES (
    p_id_habitacion, 'finalizado', 'Limpieza finalizada por personal',
    trabajador.nombre, trabajador.id_personal, tipo
  );

  RETURN TRUE;
END;
$$;

-- 3. Permisos de ejecución
REVOKE ALL ON FUNCTION public.iniciar_limpieza_aseador(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_limpieza_aseador(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.finalizar_habitacion_aseador(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_habitacion_aseador(TEXT) TO authenticated;

-- 4. Política RLS de respaldo: permite que el personal actualice sus habitaciones asignadas directamente
DROP POLICY IF EXISTS "Personal actualiza sus habitaciones asignadas" ON public.habitaciones;
CREATE POLICY "Personal actualiza sus habitaciones asignadas" ON public.habitaciones
FOR UPDATE TO authenticated
USING (
  id_personal_asignado IN (
    SELECT p.id_personal FROM public.personal p WHERE p.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  id_personal_asignado IN (
    SELECT p.id_personal FROM public.personal p WHERE p.auth_user_id = auth.uid()
  )
);

-- 5. Publicación en tiempo real para habitaciones
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

-- 6. Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
