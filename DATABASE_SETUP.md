# Crear la base de datos

El archivo [`schema.sql`](./schema.sql) crea las tablas y permisos que usa la aplicación:

- `habitaciones`: estado y datos de cada habitación.
- `personal`: trabajadores del hotel.
- cuentas de Supabase para el acceso del personal con correo y contraseña.
- `asignaciones_habitacion`: historial de asignaciones.
- `asistencias`: entradas y salidas.
- `trabajos_limpieza`: limpiezas finalizadas.
- `eventos`: historial de cambios.
- `novedades`: notas del personal.

## Pasos

1. En Supabase, abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido completo de `schema.sql` y ejecútalo. El script también crea el esquema `public` si no existe y concede acceso de esquema a los roles de Supabase que usa la aplicación.
3. La consulta crea y ajusta tablas sin borrar habitaciones ni registros operativos. Elimina las claves antiguas de aseo y la tabla de hashes que ya no se usa; el personal necesitará una cuenta nueva de correo y contraseña. Si quieres una base totalmente vacía, crea un proyecto nuevo de Supabase y ejecuta el SQL allí.
4. Asigna el rol `hotel_admin` a la cuenta administrativa usando los pasos de `README.md`; luego cierra sesión y vuelve a entrar.
5. Despliega la función para administrar cuentas del personal: `npx supabase functions deploy staff-account`.
6. Abre **Personal**. En las fichas anteriores, vincula una cuenta Supabase existente por correo o crea una nueva. Las altas nuevas piden el correo junto al nombre y teléfono.
7. Para las cuentas nuevas, comparte con cada trabajador el correo y la contraseña temporal mostrada una sola vez. Las cuentas vinculadas conservan su contraseña actual. Si alguien pierde su contraseña, usa **Regenerar contraseña**.

El personal inicia sesión desde **Acceso de aseo** usando ese correo y contraseña. Las cuentas se crean en Supabase Auth por la función administrativa; no habilites el registro público para esta operación.

El SQL crea las tablas, pero no inventa números de habitación ni agrega registros de ejemplo. Para agregar una habitación real, ejecuta una fila por habitación y reemplaza el número:

```sql
INSERT INTO public.habitaciones (id_habitacion, estado)
VALUES ('101', 'libre')
ON CONFLICT (id_habitacion) DO NOTHING;
```

La versión anterior también podía guardar información solo en el navegador. Esos datos locales no se copian automáticamente a Supabase; hay que volver a registrar las habitaciones en la base de datos.

## Datos de demostración

Para poblar las tablas con habitaciones, personal y movimientos de prueba, ejecuta [`seed_demo.sql`](./seed_demo.sql) desde **Supabase SQL Editor**, después de `schema.sql`. El script se puede ejecutar más de una vez y usa identificadores `DEMO-` para sus datos. No crea cuentas de acceso; en la app, ve a **Personal** y crea el acceso de cada trabajador demo usando un correo real. La contraseña temporal se muestra una sola vez.
