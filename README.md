# Control de habitaciones

Aplicación React + TypeScript + Vite para la operación de habitaciones, limpiezas, historial y personal. Supabase se conserva como backend.

## Desarrollo

1. Instala Node.js y npm.
2. La aplicación reutiliza la URL y clave publicable existentes en `supabase-config.js`. Si prefieres configuración por entorno, copia `.env.example` a `.env.local` y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; estas variables tienen prioridad.
3. Ejecuta `npm install` y `npm run dev`.
4. Antes de desplegar, ejecuta `npm run typecheck` y `npm run build`.

La aplicación no usa autenticación local simulada ni guarda cambios cuando Supabase no está configurado.
El servidor de despliegue debe redirigir las rutas `/app/*` a `index.html` para que funcione el enrutamiento del cliente.

## Supabase y acceso

1. Respalda el proyecto Supabase y revisa `schema.sql` antes de ejecutarlo. La migración conserva las habitaciones y registros operativos, añade la vinculación a cuentas de Supabase y retira el acceso de aseo anterior por teléfono.
2. La migración restringe las políticas administrativas a usuarios cuyo `app_metadata.role` sea `hotel_admin`; el personal de aseo usa cuentas con `app_metadata.role = hotel_cleaner`.
3. Desactiva el registro público de usuarios en Supabase Auth y provisiona las cuentas administrativas fuera del cliente web.
4. Después de aplicar el esquema, despliega la función de gestión de cuentas con `supabase functions deploy staff-account`.
5. Inicia sesión como administrador, abre **Personal** y crea una cuenta nueva o vincula la cuenta Supabase existente de cada trabajador mediante su correo.
6. El personal entra por **Acceso de aseo** usando el correo y la contraseña de su cuenta. Las contraseñas temporales nuevas se muestran una sola vez; compártelas mediante un canal seguro.

### Asignar acceso administrativo

El rol se administra con Supabase Auth Admin API; no se puede activar desde el navegador. Desde PowerShell, en la raíz del proyecto:

```powershell
$env:SUPABASE_URL = "https://TU_PROYECTO.supabase.co"
$secureKey = Read-Host "Pega la service_role key" -AsSecureString
try {
  $env:SUPABASE_SERVICE_ROLE_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
  node scripts/grant-admin-role.mjs correo-del-administrador@hotel.com
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
  $secureKey.Dispose()
}
```

Confirma la operación escribiendo `SI`. La clave `service_role` solo se utiliza en este proceso local; no la pongas en `VITE_*`, en archivos del repositorio ni en el navegador. Luego, cierra sesión y vuelve a entrar para renovar el JWT. Asigna el rol solo a cuentas de confianza.

Las cuentas nuevas se crean por medio de una Edge Function protegida; la clave de servicio de Supabase nunca se entrega al navegador. Las funciones RPC del portal de aseo requieren una sesión autenticada y solo permiten consultar las habitaciones asignadas al trabajador o finalizar una asignación propia.

El asistente de IA anterior no se incluye en el cliente React: una clave de proveedor de IA no debe almacenarse ni enviarse desde el navegador. Para recuperarlo se requiere un endpoint server-side protegido.
