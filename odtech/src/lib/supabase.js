import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add some buffer time to prevent token refresh conflicts
      storageKey: "supabase.auth.token",
    },
    global: {
      headers: {
        "X-Client-Info": "odtech-app",
      },
    },
  },
);
