import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { MODULES, getUserRole } from "../lib/authRoutes";

const ALL_MODULE_KEYS = Object.keys(MODULES);

const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  moduleAccess: [],
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setModuleAccess: (moduleAccess) => set({ moduleAccess }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    if (!userId) {
      set({ profile: null });
      return null;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Profile fetch timeout after 5s")),
          5000,
        ),
      );

      const queryPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

      if (error) {
        if (error.code !== "PGRST116") {
          console.warn("Profile fetch error:", error);
        }

        set({ profile: null });
        return null;
      }

      set({ profile: data });
      return data;
    } catch (error) {
      console.error("Profile fetch exception:", error);
      set({ profile: null });
      return null;
    }
  },

  fetchModuleAccess: async (email, profile = null, user = null) => {
    if (getUserRole(profile, user) === "admin") {
      set({ moduleAccess: ALL_MODULE_KEYS });
      return ALL_MODULE_KEYS;
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      set({ moduleAccess: [] });
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("module_access_grants")
        .select("modules, is_active")
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        if (error.code !== "PGRST116") {
          console.warn("Module access fetch error:", error);
        }

        set({ moduleAccess: [] });
        return [];
      }

      const moduleAccess = (data?.modules || []).filter(
        (moduleKey) => MODULES[moduleKey],
      );
      set({ moduleAccess });
      return moduleAccess;
    } catch (error) {
      console.error("Module access fetch exception:", error);
      set({ moduleAccess: [] });
      return [];
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, moduleAccess: [] });
  },
}));

export default useAuthStore;
