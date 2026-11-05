import { createClient, type User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AccountRequest = {
  action?: unknown;
  id_personal?: unknown;
  nombre?: unknown;
  contacto?: unknown;
  correo?: unknown;
  password?: unknown;
};

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return response({ error: "Método no permitido." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: "El servicio de cuentas no está configurado." }, 503);
  }

  const token = authorization.replace(/^Bearer\s+/i, "");
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || userData.user?.app_metadata?.role !== "hotel_admin") {
    return response({ error: "Se requiere una sesión administrativa válida." }, 403);
  }

  let input: AccountRequest;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 5000) {
      return response({ error: "La solicitud es demasiado extensa." }, 413);
    }
    input = JSON.parse(rawBody) as AccountRequest;
  } catch {
    return response({ error: "La solicitud no tiene formato JSON válido." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return response({ error: "La solicitud no tiene el formato esperado." }, 400);
  }

  const action = typeof input.action === "string" ? input.action : "";
  const staffId = typeof input.id_personal === "string" ? input.id_personal.trim() : "";
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (action === "create_staff") {
      const name = typeof input.nombre === "string" ? input.nombre.trim() : "";
      const contact = typeof input.contacto === "string" ? input.contacto.trim() : "";
      const email = typeof input.correo === "string" ? input.correo.trim().toLowerCase() : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (!staffId || !name || name.length > 80 || !contact || contact.length > 30) {
        return response({ error: "Revisa el nombre, teléfono e identificador del personal." }, 400);
      }
      if (contact.replace(/\D/g, "").length < 7) {
        return response({ error: "El teléfono no es válido." }, 400);
      }
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: "Escribe un correo electrónico válido." }, 400);
      }
      if (password.length < 12 || password.length > 128) {
        return response({ error: "La contraseña temporal debe tener entre 12 y 128 caracteres." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "hotel_cleaner", staff_id: staffId },
        user_metadata: { full_name: name },
      });
      if (createError) return response({ error: createError.message }, 409);

      const { error: insertError } = await admin.from("personal").insert({
        id_personal: staffId,
        nombre: name,
        contacto: contact,
        correo: email,
        auth_user_id: created.user.id,
        activo: true,
      });
      if (insertError) {
        const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
        if (rollbackError) console.error("Could not remove unlinked auth user", rollbackError.message);
        return response({ error: `No se pudo crear la ficha: ${insertError.message}` }, 409);
      }
      return response({ id_personal: staffId });
    }

    if (action === "create_staff_link_account") {
      const name = typeof input.nombre === "string" ? input.nombre.trim() : "";
      const contact = typeof input.contacto === "string" ? input.contacto.trim() : "";
      const email = typeof input.correo === "string" ? input.correo.trim().toLowerCase() : "";
      if (!staffId || !name || name.length > 80 || !contact || contact.length > 30) {
        return response({ error: "Revisa el nombre, teléfono e identificador del personal." }, 400);
      }
      if (contact.replace(/\D/g, "").length < 7) {
        return response({ error: "El teléfono no es válido." }, 400);
      }
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: "Escribe un correo electrónico válido." }, 400);
      }

      let linkedUser: User | null = null;
      for (let page = 1; ; page += 1) {
        const { data: users, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listError) throw listError;
        linkedUser = users.users.find(
          (user: User) => user.email?.toLowerCase() === email,
        ) ?? null;
        if (linkedUser || users.users.length < 1000) break;
      }
      if (!linkedUser) {
        return response({ error: "No existe una cuenta Supabase con ese correo." }, 404);
      }
      if (!linkedUser.email_confirmed_at) {
        return response({ error: "La cuenta debe confirmar su correo antes de vincularla." }, 409);
      }

      const existingRole = linkedUser.app_metadata?.role;
      const existingStaffId = linkedUser.app_metadata?.staff_id;
      if (
        existingRole === "hotel_admin" ||
        (existingRole && (existingRole !== "hotel_cleaner" || existingStaffId !== staffId))
      ) {
        return response({ error: "Esa cuenta ya tiene otro rol o está asignada a otro trabajador." }, 409);
      }
      const { data: existingStaff, error: existingStaffError } = await admin.from("personal")
        .select("id_personal")
        .eq("auth_user_id", linkedUser.id)
        .maybeSingle();
      if (existingStaffError) throw existingStaffError;
      if (existingStaff) {
        return response({ error: "Esa cuenta ya está vinculada a otra ficha de personal." }, 409);
      }

      const previousMetadata = linkedUser.app_metadata ?? {};
      const { error: metadataError } = await admin.auth.admin.updateUserById(
        linkedUser.id,
        { app_metadata: { ...previousMetadata, role: "hotel_cleaner", staff_id: staffId } },
      );
      if (metadataError) throw metadataError;

      const { error: insertError } = await admin.from("personal").insert({
        id_personal: staffId,
        nombre: name,
        contacto: contact,
        correo: email,
        auth_user_id: linkedUser.id,
        activo: true,
      });
      if (insertError) {
        const { error: rollbackError } = await admin.auth.admin.updateUserById(
          linkedUser.id,
          { app_metadata: previousMetadata },
        );
        if (rollbackError) console.error("Could not restore linked account metadata", rollbackError.message);
        return response({ error: `No se pudo crear la ficha: ${insertError.message}` }, 409);
      }
      return response({ id_personal: staffId });
    }

    if (!staffId) return response({ error: "Falta el identificador del personal." }, 400);

    const { data: staff, error: staffError } = await admin
      .from("personal")
      .select("id_personal, nombre, contacto, activo, correo, auth_user_id")
      .eq("id_personal", staffId)
      .maybeSingle();
    if (staffError) throw staffError;
    if (!staff) return response({ error: "No se encontró la ficha del personal." }, 404);

    if (action === "update_staff") {
      if (!staff.activo) return response({ error: "No se puede editar personal inactivo." }, 409);
      const name = typeof input.nombre === "string" ? input.nombre.trim() : "";
      const contact = typeof input.contacto === "string" ? input.contacto.trim() : "";
      const email = typeof input.correo === "string" ? input.correo.trim().toLowerCase() : "";
      if (!name || name.length > 80 || !contact || contact.length > 30) {
        return response({ error: "Revisa el nombre y teléfono del personal." }, 400);
      }
      if (contact.replace(/\D/g, "").length < 7) {
        return response({ error: "El teléfono no es válido." }, 400);
      }
      if (
        (staff.auth_user_id && !email)
        || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
      ) {
        return response({ error: "Escribe un correo electrónico válido." }, 400);
      }

      let previousEmail: string | null = null;
      let previousUserMetadata: User["user_metadata"] = {};
      if (staff.auth_user_id) {
        const { data: authData, error: authLookupError } = await admin.auth.admin
          .getUserById(staff.auth_user_id);
        if (authLookupError) throw authLookupError;
        if (!authData.user) return response({ error: "No se encontró la cuenta vinculada." }, 404);
        if (!authData.user.email) {
          return response({ error: "La cuenta vinculada no tiene un correo válido." }, 409);
        }
        previousEmail = authData.user.email;
        previousUserMetadata = authData.user.user_metadata ?? {};
        const { error: authUpdateError } = await admin.auth.admin.updateUserById(
          staff.auth_user_id,
          {
            email,
            email_confirm: true,
            user_metadata: { ...previousUserMetadata, full_name: name },
          },
        );
        if (authUpdateError) return response({ error: authUpdateError.message }, 409);
      }

      const { error: updateError } = await admin.from("personal")
        .update({ nombre: name, contacto: contact, correo: email || null })
        .eq("id_personal", staffId);
      if (updateError) {
        if (staff.auth_user_id && previousEmail) {
          const { error: rollbackError } = await admin.auth.admin.updateUserById(
            staff.auth_user_id,
            {
              email: previousEmail,
              email_confirm: true,
              user_metadata: previousUserMetadata,
            },
          );
          if (rollbackError) {
            return response({
              error: `No se pudo actualizar la ficha (${updateError.message}) ni restaurar la cuenta (${rollbackError.message}).`,
            }, 500);
          }
        }
        return response({ error: `No se pudo actualizar la ficha: ${updateError.message}` }, 409);
      }
      return response({ id_personal: staffId });
    }

    if (action === "create_account") {
      if (!staff.activo) return response({ error: "No se puede crear acceso para personal inactivo." }, 409);
      if (staff.auth_user_id) return response({ error: "Esta ficha ya tiene una cuenta de acceso." }, 409);
      const email = typeof input.correo === "string" ? input.correo.trim().toLowerCase() : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: "Escribe un correo electrónico válido." }, 400);
      }
      if (password.length < 12 || password.length > 128) {
        return response({ error: "La contraseña temporal debe tener entre 12 y 128 caracteres." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "hotel_cleaner", staff_id: staffId },
        user_metadata: { full_name: staff.nombre },
      });
      if (createError) return response({ error: createError.message }, 409);

      const { data: linked, error: updateError } = await admin.from("personal")
        .update({ correo: email, auth_user_id: created.user.id })
        .eq("id_personal", staffId)
        .is("auth_user_id", null)
        .select("id_personal")
        .maybeSingle();
      if (updateError || !linked) {
        const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
        if (rollbackError) console.error("Could not remove unlinked auth user", rollbackError.message);
        return response({
          error: updateError
            ? `No se pudo vincular la cuenta: ${updateError.message}`
            : "La ficha ya tiene una cuenta vinculada.",
        }, 409);
      }
      return response({ id_personal: staffId });
    }

    if (action === "reset_password") {
      const password = typeof input.password === "string" ? input.password : "";
      if (!staff.activo || !staff.auth_user_id) {
        return response({ error: "El personal no tiene una cuenta de acceso activa." }, 409);
      }
      if (password.length < 12 || password.length > 128) {
        return response({ error: "La contraseña temporal debe tener entre 12 y 128 caracteres." }, 400);
      }
      const { error: updateError } = await admin.auth.admin.updateUserById(
        staff.auth_user_id,
        { password },
      );
      if (updateError) return response({ error: updateError.message }, 500);
      return response({ id_personal: staffId });
    }

    if (action === "link_account") {
      if (!staff.activo) return response({ error: "No se puede vincular una cuenta a personal inactivo." }, 409);
      if (staff.auth_user_id) return response({ error: "Esta ficha ya tiene una cuenta vinculada." }, 409);
      const email = typeof input.correo === "string" ? input.correo.trim().toLowerCase() : "";
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: "Escribe un correo electrónico válido." }, 400);
      }

      let linkedUser: User | null = null;
      for (let page = 1; ; page += 1) {
        const { data: users, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (listError) throw listError;
        linkedUser = users.users.find(
          (user: User) => user.email?.toLowerCase() === email,
        ) ?? null;
        if (linkedUser || users.users.length < 1000) break;
      }
      if (!linkedUser) {
        return response({ error: "No existe una cuenta Supabase con ese correo." }, 404);
      }
      if (!linkedUser.email_confirmed_at) {
        return response({ error: "La cuenta debe confirmar su correo antes de vincularla." }, 409);
      }

      const existingRole = linkedUser.app_metadata?.role;
      const existingStaffId = linkedUser.app_metadata?.staff_id;
      if (
        existingRole === "hotel_admin" ||
        (existingRole && (existingRole !== "hotel_cleaner" || existingStaffId !== staffId))
      ) {
        return response({ error: "Esa cuenta ya tiene otro rol o está asignada a otro trabajador." }, 409);
      }

      const { data: linkedStaff, error: linkedStaffError } = await admin.from("personal")
        .select("id_personal")
        .eq("auth_user_id", linkedUser.id)
        .maybeSingle();
      if (linkedStaffError) throw linkedStaffError;
      if (linkedStaff && linkedStaff.id_personal !== staffId) {
        return response({ error: "Esa cuenta ya está vinculada a otra ficha de personal." }, 409);
      }

      const previousMetadata = linkedUser.app_metadata ?? {};
      const { error: metadataError } = await admin.auth.admin.updateUserById(
        linkedUser.id,
        { app_metadata: { ...previousMetadata, role: "hotel_cleaner", staff_id: staffId } },
      );
      if (metadataError) throw metadataError;

      const { data: linked, error: updateError } = await admin.from("personal")
        .update({ correo: email, auth_user_id: linkedUser.id })
        .eq("id_personal", staffId)
        .is("auth_user_id", null)
        .select("id_personal")
        .maybeSingle();
      if (updateError || !linked) {
        const { error: rollbackError } = await admin.auth.admin.updateUserById(
          linkedUser.id,
          { app_metadata: previousMetadata },
        );
        if (rollbackError) console.error("Could not restore linked account metadata", rollbackError.message);
        return response({
          error: updateError
            ? `No se pudo vincular la cuenta: ${updateError.message}`
            : "La ficha ya tiene una cuenta vinculada.",
        }, 409);
      }
      return response({ id_personal: staffId });
    }

    if (action === "deactivate_staff") {
      const { error: roomsError } = await admin.from("habitaciones")
        .update({ id_personal_asignado: null, tipo_limpieza_asignada: null })
        .eq("id_personal_asignado", staffId);
      if (roomsError) throw roomsError;
      const { error: deactivateError } = await admin.from("personal")
        .update({ activo: false })
        .eq("id_personal", staffId);
      if (deactivateError) throw deactivateError;
      if (staff.auth_user_id) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(staff.auth_user_id);
        if (deleteError) {
          return response({
            error: `La ficha quedó desactivada, pero no se pudo eliminar la cuenta: ${deleteError.message}`,
          }, 500);
        }
      }
      return response({ id_personal: staffId });
    }

    return response({ error: "La operación solicitada no es válida." }, 400);
  } catch (error) {
    console.error(
      "staff-account failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return response({ error: "No se pudo completar la operación de cuenta." }, 500);
  }
});
