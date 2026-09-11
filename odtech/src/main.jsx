import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { supabase } from "./lib/supabase";
import { initializeDatabase } from "./db/sqlite";
import { isMobileApp } from "./lib/platform";
import {
  applySystemPreferences,
  readStoredSystemPreferences,
} from "./lib/settings";
import useAuthStore from "./store/useAuthStore";
import Router from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

async function syncAuthState(session) {
  const store = useAuthStore.getState();

  store.setSession(session);

  if (session?.user) {
    const profile = await store.fetchProfile(session.user.id);
    await store.fetchModuleAccess(session.user.email, profile, session.user);
  } else {
    store.setProfile(null);
    store.setModuleAccess([]);
  }

  store.setLoading(false);
}

async function initializeApp() {
  if (isMobileApp) {
    await initializeDatabase();
    const store = useAuthStore.getState();
    store.setSession({ user: { email: "local@device" } });
    store.setProfile({ full_name: "Local user", role: "admin" });
    store.setModuleAccess([]);
    store.setLoading(false);
    return;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      syncAuthState(session).catch((error) => {
        console.error("Auth state sync failed:", error);
        const store = useAuthStore.getState();
        store.setProfile(null);
        store.setModuleAccess([]);
        store.setLoading(false);
      });
    }, 0);
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  await syncAuthState(data?.session ?? null);
}

initializeApp().catch((error) => {
  console.error("Initial app load failed:", error);
  const store = useAuthStore.getState();
  store.setSession(null);
  store.setProfile(null);
  store.setModuleAccess([]);
  store.setLoading(false);
});

applySystemPreferences(readStoredSystemPreferences());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1E293B",
            color: "#F1F5F9",
            border: "1px solid #334155",
            borderRadius: "10px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#10B981", secondary: "#1E293B" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#1E293B" } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
