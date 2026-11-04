-- Datos de demostracion para probar la aplicacion.
-- Ejecutar despues de schema.sql desde Supabase SQL Editor.
-- Solo crea o actualiza registros cuyos identificadores comienzan con DEMO.
-- No crea cuentas ni contrasenas. En la app, abre Personal y usa
-- "Crear acceso" para vincular un correo real a cada trabajador demo.

CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

BEGIN;

INSERT INTO public.personal (id_personal, nombre, contacto, activo)
VALUES
  ('DEMO-ASEADOR-01', 'Demo - Ana Torres', '3000000001', TRUE),
  ('DEMO-ASEADOR-02', 'Demo - Luis Gomez', '3000000002', TRUE),
  ('DEMO-ASEADOR-03', 'Demo - Maria Rojas', '3000000003', TRUE)
ON CONFLICT (id_personal) DO UPDATE
SET nombre = EXCLUDED.nombre,
    contacto = EXCLUDED.contacto,
    activo = EXCLUDED.activo;

-- Las asignaciones se registran automaticamente en el historial.
INSERT INTO public.habitaciones (
  id_habitacion, estado, nombre_huesped, plan_limpieza,
  detalles_limpieza, id_personal_asignado, tipo_limpieza_asignada,
  actualizado_en
)
VALUES
  ('DEMO-101', 'ocupada', 'Huesped Demo 1', NULL, NULL, NULL, NULL, NOW()),
  ('DEMO-102', 'libre', NULL, NULL, NULL, NULL, NULL, NOW()),
  ('DEMO-103', 'pendiente', 'Huesped Demo 2', 'Semanal', 'Preparar cama y revisar bano.', 'DEMO-ASEADOR-01', 'Salida', NOW()),
  ('DEMO-104', 'limpieza', 'Huesped Demo 3', 'Mensual', 'Solicita toallas limpias.', 'DEMO-ASEADOR-02', 'Estadia', NOW()),
  ('DEMO-105', 'finalizado', NULL, 'Premium', 'Limpieza de prueba completada.', NULL, NULL, NOW()),
  ('DEMO-106', 'ocupada', 'Huesped Demo 4', NULL, NULL, NULL, NULL, NOW()),
  ('DEMO-107', 'pendiente', 'Huesped Demo 5', 'Premium', 'Revisar ventanas y balcon.', 'DEMO-ASEADOR-03', 'Profunda', NOW())
ON CONFLICT (id_habitacion) DO UPDATE
SET estado = EXCLUDED.estado,
    nombre_huesped = EXCLUDED.nombre_huesped,
    plan_limpieza = EXCLUDED.plan_limpieza,
    detalles_limpieza = EXCLUDED.detalles_limpieza,
    id_personal_asignado = EXCLUDED.id_personal_asignado,
    tipo_limpieza_asignada = EXCLUDED.tipo_limpieza_asignada,
    actualizado_en = NOW();

INSERT INTO public.asistencias (
  id_asistencia, id_personal, nombre_personal, entrada, salida
)
VALUES
  ('DEMO-ASISTENCIA-01', 'DEMO-ASEADOR-01', 'Demo - Ana Torres', NOW() - INTERVAL '2 hours', NULL),
  ('DEMO-ASISTENCIA-02', 'DEMO-ASEADOR-02', 'Demo - Luis Gomez', NOW() - INTERVAL '1 day 9 hours', NOW() - INTERVAL '1 day'),
  ('DEMO-ASISTENCIA-03', 'DEMO-ASEADOR-03', 'Demo - Maria Rojas', NOW() - INTERVAL '3 hours', NULL)
ON CONFLICT (id_asistencia) DO UPDATE
SET id_personal = EXCLUDED.id_personal,
    nombre_personal = EXCLUDED.nombre_personal,
    entrada = EXCLUDED.entrada,
    salida = EXCLUDED.salida;

INSERT INTO public.eventos (
  id_habitacion, estado, accion, nombre_huesped, responsable,
  id_personal, tipo_limpieza
)
SELECT datos.id_habitacion, datos.estado, datos.accion, datos.nombre_huesped,
       'Datos demo', datos.id_personal, datos.tipo_limpieza
FROM (VALUES
  ('DEMO-101', 'ocupada', 'Demo - Check-in registrado', 'Huesped Demo 1', NULL::TEXT, NULL::TEXT),
  ('DEMO-102', 'libre', 'Demo - Habitacion disponible', NULL::TEXT, NULL::TEXT, NULL::TEXT),
  ('DEMO-103', 'pendiente', 'Demo - Limpieza pendiente', 'Huesped Demo 2', 'DEMO-ASEADOR-01', 'Salida'),
  ('DEMO-104', 'limpieza', 'Demo - Limpieza en curso', 'Huesped Demo 3', 'DEMO-ASEADOR-02', 'Estadia'),
  ('DEMO-105', 'finalizado', 'Demo - Limpieza finalizada', NULL::TEXT, 'DEMO-ASEADOR-01', 'Salida'),
  ('DEMO-106', 'ocupada', 'Demo - Huesped alojado', 'Huesped Demo 4', NULL::TEXT, NULL::TEXT),
  ('DEMO-107', 'pendiente', 'Demo - Limpieza profunda pendiente', 'Huesped Demo 5', 'DEMO-ASEADOR-03', 'Profunda')
) AS datos(id_habitacion, estado, accion, nombre_huesped, id_personal, tipo_limpieza)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.eventos e
  WHERE e.id_habitacion = datos.id_habitacion
    AND e.accion = datos.accion
    AND e.responsable = 'Datos demo'
);

INSERT INTO public.trabajos_limpieza (
  id_personal, nombre_personal, id_habitacion, tipo_limpieza
)
SELECT datos.id_personal, datos.nombre_personal, datos.id_habitacion, datos.tipo_limpieza
FROM (VALUES
  ('DEMO-ASEADOR-01', 'Demo - Ana Torres', 'DEMO-105', 'Demo - Salida'),
  ('DEMO-ASEADOR-02', 'Demo - Luis Gomez', 'DEMO-102', 'Demo - Estadia')
) AS datos(id_personal, nombre_personal, id_habitacion, tipo_limpieza)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.trabajos_limpieza t
  WHERE t.id_personal = datos.id_personal
    AND t.id_habitacion = datos.id_habitacion
    AND t.tipo_limpieza = datos.tipo_limpieza
);

INSERT INTO public.novedades (
  id_novedad, id_personal, nombre_personal, fecha, tipo,
  etiqueta, notas, minutos_extra
)
VALUES
  ('DEMO-NOVEDAD-01', 'DEMO-ASEADOR-01', 'Demo - Ana Torres', CURRENT_DATE - 1, 'turno', 'Demo - Apoyo de turno', 'Registro de prueba.', 30),
  ('DEMO-NOVEDAD-02', 'DEMO-ASEADOR-02', 'Demo - Luis Gomez', CURRENT_DATE, 'nota', 'Demo - Insumos', 'Solicitar reposicion de jabon.', NULL),
  ('DEMO-NOVEDAD-03', 'DEMO-ASEADOR-03', 'Demo - Maria Rojas', CURRENT_DATE, 'turno', 'Demo - Habitacion extra', 'Registro de prueba.', 45)
ON CONFLICT (id_novedad) DO UPDATE
SET id_personal = EXCLUDED.id_personal,
    nombre_personal = EXCLUDED.nombre_personal,
    fecha = EXCLUDED.fecha,
    tipo = EXCLUDED.tipo,
    etiqueta = EXCLUDED.etiqueta,
    notas = EXCLUDED.notas,
    minutos_extra = EXCLUDED.minutos_extra;

COMMIT;

-- Para comprobar que se cargaron las habitaciones de prueba:
-- SELECT id_habitacion, estado, id_personal_asignado
-- FROM public.habitaciones
-- WHERE id_habitacion LIKE 'DEMO-%'
-- ORDER BY id_habitacion;
