import { create } from "zustand";
import { supabase } from "../lib/supabase";

const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
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

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));

export default useAuthStore;
