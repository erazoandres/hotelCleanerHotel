import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import "../../supabase-config.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.SUPABASE_CONFIG?.url;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Configura Supabase en supabase-config.js o define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
    );
  }

  client ??= createClient<Database>(supabaseUrl, supabaseKey);
  return client;
}
