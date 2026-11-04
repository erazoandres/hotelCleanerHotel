/// <reference types="vite/client" />

interface Window {
  SUPABASE_CONFIG?: {
    url: string;
    anonKey: string;
  };
}
