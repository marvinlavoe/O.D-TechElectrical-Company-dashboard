import { useState } from 'react'
import { User, Phone, Mail, Award, MapPin, Search } from 'lucide-react'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'

const ROLES = [
  { value: 'Apprentice', label: 'Apprentice' },
  { value: 'Journeyman', label: 'Journeyman' },
  { value: 'Master Electrician', label: 'Master Electrician' },
  { value: 'Supervisor', label: 'Supervisor' },
]

const STATUSES = [
  { value: 'Available', label: 'Available' },
  { value: 'On Job',    label: 'On Job' },
  { value: 'On Leave',  label: 'On Leave' },
]

const empty = {
  name: '',
  email: '',
  phone: '',
  address: '',
  spec: 'Apprentice',
  status: 'Available',
}

export default function WorkerForm({ initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ─── Profile ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Worker Profile
        </p>
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Jane Smith"
            icon={User}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={errors.name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="e.g. 555-0100"
              icon={Phone}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              error={errors.phone}
              required
            />
            <Input
              label="Email (optional)"
              type="email"
              placeholder="worker@example.com"
              icon={Mail}
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>
          <Input
            label="Address (optional)"
            placeholder="Home address"
            icon={MapPin}
            value={form.address}
            onChange={e => set('address', e.target.value)}
          />
        </div>
      </div>

      {/* ─── Role & Status ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Role & Availability
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role / Specialization"
            options={ROLES}
            value={form.spec}
            onChange={e => set('spec', e.target.value)}
            required
          />
          <Select
            label="Current Status"
            options={STATUSES}
            value={form.status}
            onChange={e => set('status', e.target.value)}
            required
          />
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Save Worker
        </Button>
      </div>
    </form>
  )
}
