import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const email = process.argv[2]?.trim().toLowerCase();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !supabaseUrl || !serviceRoleKey) {
  console.error(
    "Uso: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno; " +
      "node scripts/grant-admin-role.mjs correo@hotel.com",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let targetUser = null;
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 1000,
  });
  if (error) {
    console.error(`No se pudo buscar la cuenta: ${error.message}`);
    process.exit(1);
  }

  targetUser = data.users.find((user) => user.email?.toLowerCase() === email);
  if (targetUser || data.users.length < 1000) break;
}

if (!targetUser) {
  console.error(`No se encontró una cuenta con el correo ${email}.`);
  process.exit(1);
}

if (targetUser.app_metadata.role === "hotel_admin") {
  console.log("La cuenta ya tiene el rol hotel_admin.");
  process.exit(0);
}

const readline = createInterface({ input: stdin, output: stdout });
const confirmation = await readline.question(
  `Se dará acceso administrativo a ${email}. Escribe SI para confirmar: `,
);
readline.close();

if (confirmation !== "SI") {
  console.log("Operación cancelada.");
  process.exit(0);
}

const { error } = await supabase.auth.admin.updateUserById(targetUser.id, {
  app_metadata: { ...targetUser.app_metadata, role: "hotel_admin" },
});
if (error) {
  console.error(`No se pudo asignar el rol: ${error.message}`);
  process.exit(1);
}

console.log(
  "Rol asignado. Cierra sesión y vuelve a entrar en la aplicación para renovar el token.",
);
