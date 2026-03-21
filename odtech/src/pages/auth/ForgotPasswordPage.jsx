import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (error) return toast.error(error.message)

    toast.success('Password reset link sent to your email!')
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Reset password</h2>
        <p className="text-text-secondary mt-1">Enter your email to receive a reset link</p>
      </div>
      <form onSubmit={handleReset} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending link...' : 'Send Reset Link'}
        </Button>
      </form>
      <p className="text-center text-sm text-text-muted mt-4">
        Return to <Link to="/login" className="text-primary hover:underline">Login</Link>
      </p>
    </div>
  )
}
