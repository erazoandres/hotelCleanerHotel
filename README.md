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

1. Respalda el proyecto Supabase y revisa `schema.sql` antes de ejecutarlo. La migración mueve las claves existentes a una tabla privada con hashes bcrypt, exige regenerar las claves antiguas y elimina la columna de texto plano.
2. La migración restringe las políticas administrativas a usuarios cuyo `app_metadata.role` sea `hotel_admin`.
3. Desactiva el registro público de usuarios en Supabase Auth y provisiona las cuentas administrativas fuera del cliente web.
4. Después de aplicar el esquema y configurar el rol, inicia sesión en la app y usa **Regenerar clave** para cada miembro del personal existente. Las claves antiguas dejan de funcionar después de la migración.
5. Las claves temporales nuevas se muestran una sola vez. Compártelas mediante un canal seguro.

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

Las funciones RPC de personal de aseo permanecen disponibles para el rol `anon` porque los trabajadores no tienen cuentas administrativas. La clave temporal se genera con alta entropía, se almacena como hash bcrypt y solo permite consultar las habitaciones asignadas o finalizar una asignación. Para despliegues con exposición pública, se recomienda poner esos RPC detrás de una Supabase Edge Function con límites de intentos.

El asistente de IA anterior no se incluye en el cliente React: una clave de proveedor de IA no debe almacenarse ni enviarse desde el navegador. Para recuperarlo se requiere un endpoint server-side protegido.
