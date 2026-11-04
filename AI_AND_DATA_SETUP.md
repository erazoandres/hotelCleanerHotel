# Datos y asistente de IA

## Si las habitaciones no aparecen

1. En **Habitaciones**, revisa el estado de conexión y abre **Ver problemas de lectura**. La aplicación carga las habitaciones separadas del resto de tablas, así que un fallo en personal, historial o asistencias ya no oculta una consulta correcta de habitaciones.
2. Si Supabase responde sin error pero devuelve cero habitaciones, revisa la tabla `public.habitaciones` del proyecto configurado y las políticas RLS aplicadas a esa tabla.
3. La versión anterior también guardaba una copia del estado en `localStorage` del navegador. La app ahora indica si encuentra habitaciones en esa copia cuando Supabase devuelve cero; no las importa automáticamente ni las mezcla con los datos remotos.
4. Si aparece un error de permisos o una tabla/columna inexistente, aplica el esquema/migración revisado de `schema.sql` en el mismo proyecto Supabase, tras hacer respaldo. Confirma que el usuario volvió a iniciar sesión con `app_metadata.role = hotel_admin`.

## Restaurar el asistente

El cliente web invoca `supabase/functions/hotel-chat/index.ts`. La función valida el JWT y el rol administrativo, consulta Supabase con el token del usuario y llama a Groq en el servidor. No lee `groq-config.js` ni expone la clave de Groq al navegador.

1. Crea una clave de API de Groq si no tienes una vigente.
2. En Supabase Dashboard, abre **Edge Functions → Secrets** y guarda `GROQ_API_KEY`. Opcionalmente define `GROQ_MODEL`; el valor predeterminado es `openai/gpt-oss-120b`.
3. Desde la raíz del proyecto, inicia sesión en Supabase CLI y despliega:

   ```powershell
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase functions deploy hotel-chat
   ```

4. Entra de nuevo a la app, abre el botón flotante del asistente y prueba una consulta de ocupación.

No agregues la clave de Groq a `VITE_*`, al código del cliente, `groq-config.js` ni al repositorio. La función requiere una sesión con el rol `hotel_admin`.
