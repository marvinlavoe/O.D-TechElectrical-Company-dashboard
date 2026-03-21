import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const navigate = useNavigate()

 const handleLogin = async (e) => {
  e.preventDefault()

  if (loading) return

  if (!email || !password) {
    toast.error('Email and password are required.')
    return
  }

  setLoading(true)

  const loginWithRetry = async () => {
    const maxAttempts = 3
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.debug(`Login attempt ${attempt} for`, email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (!error) {
        return { data }
      }

      const retryable = [408, 429, 500, 502, 503, 504].includes(error.status)
      if (!retryable || attempt === maxAttempts) {
        throw error
      }

      const waitMs = attempt * 1200
      console.warn(`Login attempt ${attempt} failed (${error.message}), retrying in ${waitMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }

    throw new Error('Failed to log in after retries.')
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Login timed out. Please try again.')), 60000)
  )

  try {
    const { data, error } = await Promise.race([loginWithRetry(), timeoutPromise])

    if (error) {
      throw error
    }

    if (!data?.session) {
      throw new Error('No active session. Please login again.')
    }

    const user = data.user
    let role = 'worker'

    // Try fetch profile safely
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('Profile fetch error:', profileError)
      }

      if (profile?.role) {
        role = profile.role
      } else {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          role: 'worker',
        })
        if (upsertError) {
          console.warn('Profile upsert error:', upsertError)
        }
      }
    } catch (profileErr) {
      console.warn('Profile handling failed:', profileErr)
    }

    navigate(role === 'admin' ? '/dashboard' : '/dashboard/worker')

  } catch (err) {
    console.error('Login error:', err)
    toast.error(err.message || 'Login failed.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
        <p className="text-text-secondary mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-text-muted">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted mt-2">
          Don’t have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}