import { useState } from 'react'
import { User, Phone, MapPin, Mail, Briefcase, DollarSign, FileText } from 'lucide-react'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'

const PROJECT_TYPES = [
  { value: 'residential_wiring',  label: 'Residential Wiring' },
  { value: 'commercial_wiring',   label: 'Commercial Wiring' },
  { value: 'industrial_wiring',   label: 'Industrial Wiring' },
  { value: 'panel_upgrade',       label: 'Panel / Board Upgrade' },
  { value: 'security_systems',    label: 'Security Systems' },
  { value: 'solar_installation',  label: 'Solar Installation' },
  { value: 'ev_charging',         label: 'EV Charging Station' },
  { value: 'maintenance',         label: 'Maintenance & Repair' },
  { value: 'other',               label: 'Other' },
]

const PAYMENT_STATUSES = [
  { value: 'unpaid',   label: 'Unpaid' },
  { value: 'partial',  label: 'Partial' },
  { value: 'paid',     label: 'Paid' },
]

const empty = {
  full_name:      '',
  email:          '',
  phone:          '',
  address:        '',
  city:           '',
  project_type:   '',
  payment_status: '',
  notes:          '',
}

export default function CustomerForm({ initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim())    e.full_name    = 'Full name is required'
    if (!form.phone.trim())        e.phone        = 'Phone number is required'
    if (!form.address.trim())      e.address      = 'Address is required'
    if (!form.project_type)        e.project_type = 'Please select a project type'
    if (!form.payment_status)      e.payment_status = 'Please select a payment status'
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

      {/* ─── Section: Contact info ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Contact Information
        </p>
        <div className="space-y-4">
          <Input
            label="Full Name / Company"
            placeholder="e.g. John Smith or Acme Corp"
            icon={User}
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            error={errors.full_name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="+233 20 000 0000"
              icon={Phone}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              error={errors.phone}
              required
            />
            <Input
              label="Email (optional)"
              type="email"
              placeholder="customer@example.com"
              icon={Mail}
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Section: Location ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Location
        </p>
        <div className="space-y-4">
          <Input
            label="Street Address"
            placeholder="12 Ring Road Central"
            icon={MapPin}
            value={form.address}
            onChange={e => set('address', e.target.value)}
            error={errors.address}
            required
          />
          <Input
            label="City / Area"
            placeholder="Accra"
            value={form.city}
            onChange={e => set('city', e.target.value)}
          />
        </div>
      </div>

      {/* ─── Section: Project ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Project Details
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select
              label="Project Type"
              options={PROJECT_TYPES}
              placeholder="Select project type…"
              value={form.project_type}
              onChange={e => set('project_type', e.target.value)}
              error={errors.project_type}
              required
            />
          </div>
          <div className="col-span-2">
            <Select
              label="Payment Status"
              options={PAYMENT_STATUSES}
              placeholder="Select status…"
              value={form.payment_status}
              onChange={e => set('payment_status', e.target.value)}
              error={errors.payment_status}
              required
            />
          </div>
        </div>
      </div>

      {/* ─── Section: Notes ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Notes
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Internal Notes (optional)</label>
          <textarea
            rows={4}
            placeholder="Any additional information about this customer…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg py-2 px-3 text-sm
                       text-text-primary placeholder:text-text-muted resize-none
                       focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* ─── Footer actions ─── */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          loading={loading}
        >
          Save Customer
        </Button>
      </div>

    </form>
  )
}
