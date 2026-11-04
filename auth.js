// ==============================================================================
// GESTOR DE AUTENTICACIÓN Y SEGURIDAD (SUPABASE AUTH / JWT / RLS)
// ==============================================================================

window.HotelAuth = (function () {
  "use strict";

  function getClient() {
    return window.sbClient || (window.parent && window.parent.sbClient) || null;
  }

  // Verifica si hay sesión activa
  async function getSession() {
    const sb = getClient();
    if (!sb) {
      // Modo local de respaldo si no hay Supabase configurado
      const localUser = localStorage.getItem("hotel-local-auth-user");
      return localUser ? JSON.parse(localUser) : null;
    }
    const { data: { session } } = await sb.auth.getSession();
    return session ? session.user : null;
  }

  // Iniciar Sesión con Email y Contraseña
  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) {
      // Fallback local seguro
      if (email && password.length >= 6) {
        const dummyUser = { email, user_metadata: { name: email.split("@")[0] } };
        localStorage.setItem("hotel-local-auth-user", JSON.stringify(dummyUser));
        return { user: dummyUser, error: null };
      }
      return { user: null, error: { message: "Contraseña mínimo 6 caracteres" } };
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    return { user: data?.user || null, error };
  }

  // Registrar un nuevo usuario (opcional si el hotel registra a sus empleados)
  async function signUp(email, password, fullName) {
    const sb = getClient();
    if (!sb) {
      const dummyUser = { email, user_metadata: { name: fullName || email.split("@")[0] } };
      localStorage.setItem("hotel-local-auth-user", JSON.stringify(dummyUser));
      return { user: dummyUser, error: null };
    }

    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: { name: fullName }
      }
    });

    return { user: data?.user || null, error };
  }

  // Cerrar Sesión
  async function signOut() {
    const sb = getClient();
    if (!sb) {
      localStorage.removeItem("hotel-local-auth-user");
      return;
    }
    await sb.auth.signOut();
  }

  // Escuchar cambios de sesión
  function onAuthStateChange(callback) {
    const sb = getClient();
    if (!sb) return;
    sb.auth.onAuthStateChange((event, session) => {
      callback(session ? session.user : null);
    });
  }

  return {
    getSession,
    signIn,
    signUp,
    signOut,
    onAuthStateChange
  };
})();
