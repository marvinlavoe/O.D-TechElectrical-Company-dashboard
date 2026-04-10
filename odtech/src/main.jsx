import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { supabase } from "./lib/supabase";
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
    await store.fetchProfile(session.user.id);
  } else {
    store.setProfile(null);
  }

  store.setLoading(false);
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  try {
    await syncAuthState(session);
  } catch (error) {
    console.error("Auth state sync failed:", error);
    const store = useAuthStore.getState();
    store.setProfile(null);
    store.setLoading(false);
  }
});

supabase.auth
  .getSession()
  .then(async ({ data, error }) => {
    if (error) throw error;
    await syncAuthState(data?.session ?? null);
  })
  .catch((error) => {
    console.error("Initial session load failed:", error);
    const store = useAuthStore.getState();
    store.setSession(null);
    store.setProfile(null);
    store.setLoading(false);
  });

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
