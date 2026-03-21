import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import useAuthStore from './store/useAuthStore'
import Router from './router'
import './index.css'

console.log('🚀 App initializing...')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

// Single auth state listener
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
  console.log('🔐 onAuthStateChange fired:', session ? 'Session exists' : 'No session')
  if (session) {
    console.log('🔐 Session user:', session.user?.id)
  }
  
  const store = useAuthStore.getState()
  store.setSession(session)

  try {
    if (session?.user) {
      console.log('🔐 Fetching profile for user:', session.user.id)
      const result = await store.fetchProfile(session.user.id)
      console.log('🔐 Profile fetch result:', result ? 'Success' : 'Failed or timeout')
      if (!result) {
        console.log('🔐 No profile found, using fallback')
      }
    } else {
      store.setProfile(null)
    }
  } catch (err) {
    console.error('🔐 onAuthStateChange fetchProfile failed:', err)
    console.warn('🔐 Continuing without profile data')
    store.setProfile(null)
  } finally {
    console.log('🔐 Setting loading=false')
    store.setLoading(false)
  }
})

// Initialise session on load (only if no session from listener)
supabase.auth.getSession().then(async ({ data }) => {
  console.log('📋 getSession called, data:', data ? 'Has session' : 'No session')
  
  const store = useAuthStore.getState()
  const currentSession = store.session
  console.log('📋 Current store session:', currentSession ? 'Exists' : 'Null')

  if (!currentSession && data?.session) {
    // Real session found
    console.log('✅ Real session found, using it')
    store.setSession(data.session)
    try {
      await store.fetchProfile(data.session.user.id)
    } catch (err) {
      console.error('Initial getSession fetchProfile failed:', err)
    }
  } else if (!currentSession && !data?.session) {
    // DEV BYPASS: No real session, create mock session for database access during development
    console.warn('[DEV MODE] 🎭 No auth session found. Creating mock session for development.')
    
    const mockSession = {
      user: {
        id: 'dev-user-000',
        email: 'dev@localhost',
        role: 'admin',
      },
      access_token: 'dev-token',
    }
    
    console.log('🎭 Mock session created:', mockSession)
    store.setSession(mockSession)
    store.setProfile({
      id: 'dev-user-000',
      email: 'dev@localhost',
      full_name: 'Dev User',
      role: 'admin',
      avatar_url: null,
    })
    console.log('🎭 Mock profile set')
  } else {
    console.log('⚠️  Existing session found in store, skipping init')
  }

  // Always set loading to false after initial check
  console.log('✅ Initialization complete, setting loading=false')
  store.setLoading(false)
}).catch(err => {
  console.error('❌ getSession error:', err)
  console.warn('🎭 Falling back to mock session due to getSession error')
  
  // Fallback: create mock session on error
  const mockSession = {
    user: {
      id: 'dev-user-000',
      email: 'dev@localhost',
      role: 'admin',
    },
    access_token: 'dev-token',
  }
  
  const store = useAuthStore.getState()
  store.setSession(mockSession)
  store.setProfile({
    id: 'dev-user-000',
    email: 'dev@localhost',
    full_name: 'Dev User',
    role: 'admin',
    avatar_url: null,
  })
  store.setLoading(false)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E293B',
            color: '#F1F5F9',
            border: '1px solid #334155',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#1E293B' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#1E293B' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
