# Crear la base de datos

El archivo [`schema.sql`](./schema.sql) crea las tablas y permisos que usa la aplicación:

- `habitaciones`: estado y datos de cada habitación.
- `personal`: trabajadores del hotel.
- `personal_credenciales`: claves protegidas del personal de aseo.
- `asignaciones_habitacion`: historial de asignaciones.
- `asistencias`: entradas y salidas.
- `trabajos_limpieza`: limpiezas finalizadas.
- `eventos`: historial de cambios.
- `novedades`: notas del personal.

## Pasos

1. En Supabase, abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido completo de `schema.sql` y ejecútalo.
3. La consulta crea y ajusta tablas sin borrar tablas ni datos operativos existentes. Si encuentra claves antiguas en texto plano, las convierte a hashes, quita esa columna insegura y exige regenerarlas. Si quieres una base totalmente vacía, crea un proyecto nuevo de Supabase y ejecuta el SQL allí.
4. Asigna el rol `hotel_admin` a la cuenta administrativa usando los pasos de `README.md`; luego cierra sesión y vuelve a entrar.
5. Si el personal ya existía, abre **Personal** y usa **Regenerar clave** para cada trabajador antes de que vuelva a iniciar sesión.

El SQL crea las tablas, pero no inventa números de habitación ni agrega registros de ejemplo. Para agregar una habitación real, ejecuta una fila por habitación y reemplaza el número:

```sql
INSERT INTO public.habitaciones (id_habitacion, estado)
VALUES ('101', 'libre')
ON CONFLICT (id_habitacion) DO NOTHING;
```

La versión anterior también podía guardar información solo en el navegador. Esos datos locales no se copian automáticamente a Supabase; hay que volver a registrar las habitaciones en la base de datos.
