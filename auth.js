// ==============================================================================
// GESTOR DE AUTENTICACIÓN Y SEGURIDAD (SUPABASE AUTH / JWT / RLS)
// ==============================================================================

window.HotelAuth = (function () {
  "use strict";

  function getClient() {
    return window.sbClient || (window.parent && window.parent.sbClient) || null;
  }

  function requireClient() {
    const sb = getClient();
    if (!sb) throw new Error("Supabase no está configurado. No se puede autenticar.");
    return sb;
  }

  async function getSession() {
    const { data, error } = await requireClient().auth.getSession();
    if (error) throw error;
    const { session } = data;
    return session ? session.user : null;
  }

  async function signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({
      email: email.trim(),
      password
    });

    return { user: data?.user || null, error };
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await requireClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: fullName }
      }
    });

    return { user: data?.user || null, error };
  }

  async function signOut() {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    const { data } = requireClient().auth.onAuthStateChange((event, session) => {
      callback(session ? session.user : null);
    });
    return () => data.subscription.unsubscribe();
  }

  return {
    getSession,
    signIn,
    signUp,
    signOut,
    onAuthStateChange
  };
})();
