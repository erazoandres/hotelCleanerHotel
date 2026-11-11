-- Parche para corregir iniciar_limpieza_aseador
-- Ejecuta este script en el Editor SQL de Supabase para corregir la función de inicio de limpieza para aseadores.

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
    RAISE EXCEPTION 'No hay una cuenta de aseo activa asociada a esta sesion.';
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

  -- Si ya está en limpieza, no lanzar excepción fatal: retornar TRUE
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

REVOKE ALL ON FUNCTION public.iniciar_limpieza_aseador(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_limpieza_aseador(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
