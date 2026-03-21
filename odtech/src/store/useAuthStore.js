import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    console.log('📦 fetchProfile: Starting for userId:', userId)
    try {
      console.log('📦 fetchProfile: Calling supabase.from("profiles").select()')
      
      // Wrap in timeout to avoid indefinite hangs
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout after 5s')), 5000)
      )
      
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      console.log('📦 fetchProfile: Query returned, error:', error, 'data:', data)

      if (error) {
        console.warn('📦 fetchProfile error:', error)
        // Don't fail on "not found", just return null (profile may not exist yet)
        if (error.code === 'PGRST116') {
          console.log('📦 fetchProfile: No profile found (this is ok for new users)')
          set({ profile: null })
          return null
        }
        set({ profile: null })
        return null
      }

      console.log('📦 fetchProfile: Setting profile data')
      set({ profile: data })
      console.log('📦 fetchProfile: Profile set successfully')
      return data
    } catch (err) {
      console.error('📦 fetchProfile exception:', err)
      set({ profile: null })
      return null
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))

export default useAuthStore
