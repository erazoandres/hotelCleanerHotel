// ==============================================================================
// CONFIGURACIÓN DE SUPABASE
// ==============================================================================
// Coloca aquí la URL de tu proyecto y la Anon Public Key que encuentras en:
// Supabase Dashboard -> Project Settings -> API
// ==============================================================================

window.SUPABASE_CONFIG = {
  url: "https://zwkkwmdfqssduomssyrv.supabase.co", // Reemplazar con tu Project URL
  anonKey: "sb_publishable_9cHpWaMKi9LJeQ-wepKfyQ_bQRpO82A"            // Reemplazar con tu Anon Key
};

// Inicializador del cliente global
(function() {
  if (typeof window.supabase !== "undefined" && window.SUPABASE_CONFIG.url && !window.SUPABASE_CONFIG.url.includes("TU-PROYECTO")) {
    try {
      window.sbClient = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey
      );
      console.log("[Supabase] Cliente inicializado correctamente.");
    } catch (e) {
      console.error("[Supabase] Error inicializando cliente:", e);
      window.sbClient = null;
    }
  } else {
    console.info("[Supabase] Cliente en modo desconectado / fallback local (credenciales pendientes).");
    window.sbClient = null;
  }
})();
