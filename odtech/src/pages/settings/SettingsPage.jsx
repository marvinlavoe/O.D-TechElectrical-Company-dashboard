import { useState } from 'react'
import { Lock, Bell, Settings, User } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Avatar from '../../components/ui/Avatar'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System', icon: Settings },
]

export default function SettingsPage() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    specialization: profile?.specialization || '',
  })

  // Security form state
  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    job_updates: true,
    customer_updates: true,
    system_alerts: true,
  })

  // System preferences
  const [systemPrefs, setSystemPrefs] = useState({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
  })

  const handleProfileChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSecurityChange = (field, value) => {
    setSecurityForm(prev => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSystemChange = (field, value) => {
    setSystemPrefs(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      // TODO: Connect to Supabase profiles table update
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!securityForm.new_password || !securityForm.confirm_password) {
      toast.error('Please fill in all password fields')
      return
    }
    if (securityForm.new_password !== securityForm.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    if (securityForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // TODO: Connect to Supabase auth.updateUser()
      toast.success('Password changed successfully')
      setSecurityForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    try {
      // TODO: Save to local storage or Supabase
      toast.success('Notification preferences updated')
    } catch (err) {
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSystem = async () => {
    setLoading(true)
    try {
      // TODO: Save to local storage or Supabase
      toast.success('System preferences updated')
    } catch (err) {
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-surface-border overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <div className="flex items-center gap-6">
                <Avatar name={profileForm.full_name} size="lg" />
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-text-muted mt-2">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={profileForm.full_name}
                  onChange={e => handleProfileChange('full_name', e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileForm.email}
                  onChange={e => handleProfileChange('email', e.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={profileForm.phone}
                  onChange={e => handleProfileChange('phone', e.target.value)}
                />
                <Input
                  label="Specialization / Department"
                  value={profileForm.specialization}
                  onChange={e => handleProfileChange('specialization', e.target.value)}
                  placeholder="e.g., Electrical Engineer"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button loading={loading} onClick={handleSaveProfile}>Save Profile</Button>
              </div>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <h3 className="text-lg font-semibold text-text-primary">Change Password</h3>
              <div className="space-y-4 max-w-sm">
                <Input
                  label="Current Password"
                  type="password"
                  value={securityForm.current_password}
                  onChange={e => handleSecurityChange('current_password', e.target.value)}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={securityForm.new_password}
                  onChange={e => handleSecurityChange('new_password', e.target.value)}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={securityForm.confirm_password}
                  onChange={e => handleSecurityChange('confirm_password', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button loading={loading} onClick={handleChangePassword}>Update Password</Button>
              </div>

              <div className="mt-8 pt-6 border-t border-surface-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Active Sessions</h3>
                <div className="bg-surface rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-text-primary">Current Session</p>
                      <p className="text-sm text-text-muted">Your current device and browser</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-success/20 text-success rounded">Active</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-text-muted">
                        {key === 'email_alerts' && 'Receive email alerts for important updates'}
                        {key === 'job_updates' && 'Get notified when job status changes'}
                        {key === 'customer_updates' && 'Receive customer-related notifications'}
                        {key === 'system_alerts' && 'System maintenance and security alerts'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-primary' : 'bg-surface-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button loading={loading} onClick={handleSaveNotifications}>Save Preferences</Button>
              </div>
            </>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <>
              <div className="space-y-4 max-w-sm">
                <Select
                  label="Theme"
                  value={systemPrefs.theme}
                  onChange={e => handleSystemChange('theme', e.target.value)}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto (System)' },
                  ]}
                />
                <Select
                  label="Language"
                  value={systemPrefs.language}
                  onChange={e => handleSystemChange('language', e.target.value)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'de', label: 'Deutsch' },
                  ]}
                />
                <Select
                  label="Timezone"
                  value={systemPrefs.timezone}
                  onChange={e => handleSystemChange('timezone', e.target.value)}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'EST', label: 'Eastern Time' },
                    { value: 'CST', label: 'Central Time' },
                    { value: 'PST', label: 'Pacific Time' },
                    { value: 'GMT', label: 'GMT' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button loading={loading} onClick={handleSaveSystem}>Save Preferences</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
