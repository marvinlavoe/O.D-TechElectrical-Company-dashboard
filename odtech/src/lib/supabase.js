import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "supabase.auth.token";
const REMEMBER_SESSION_KEY = "odtech.rememberSession";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(REMEMBER_SESSION_KEY) === "false"
    ? window.sessionStorage
    : window.localStorage;
}

const authStorage = {
  getItem: (key) => getBrowserStorage()?.getItem(key) ?? null,
  setItem: (key, value) => getBrowserStorage()?.setItem(key, value),
  removeItem: (key) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setRememberSession(rememberSession) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    REMEMBER_SESSION_KEY,
    rememberSession ? "true" : "false",
  );

  const staleStorage = rememberSession
    ? window.sessionStorage
    : window.localStorage;
  staleStorage.removeItem(AUTH_STORAGE_KEY);
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add some buffer time to prevent token refresh conflicts
      storageKey: AUTH_STORAGE_KEY,
      storage: authStorage,
    },
    global: {
      headers: {
        "X-Client-Info": "odtech-app",
      },
    },
  },
);
