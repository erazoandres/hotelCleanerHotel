-- Apply this patch in the Supabase SQL Editor to enable cleaner room history.
CREATE INDEX IF NOT EXISTS trabajos_limpieza_personal_fecha
  ON public.trabajos_limpieza (id_personal, creado_en DESC);

CREATE OR REPLACE FUNCTION public.historial_habitaciones_aseador()
RETURNS TABLE (
  id_trabajo BIGINT,
  id_habitacion TEXT,
  tipo_limpieza TEXT,
  creado_en TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
  SELECT t.id_trabajo, t.id_habitacion, t.tipo_limpieza, t.creado_en
  FROM public.trabajos_limpieza t
  JOIN public.personal p ON p.id_personal = t.id_personal
  WHERE p.auth_user_id = auth.uid()
    AND p.activo IS TRUE
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'hotel_cleaner'
  ORDER BY t.creado_en DESC, t.id_trabajo DESC;
$$;

REVOKE ALL ON FUNCTION public.historial_habitaciones_aseador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.historial_habitaciones_aseador() TO authenticated;

NOTIFY pgrst, 'reload schema';
