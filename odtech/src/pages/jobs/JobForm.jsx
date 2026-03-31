import { useState, useEffect } from 'react'
import { Briefcase, Calendar, Clock, MapPin, User, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'

const PRIORITIES = [
  { value: 'Low',    label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High',   label: 'High (Urgent)' },
]

const empty = {
  title: '',
  customer_id: '',
  technician_id: '',
  scheduled_date: '',
  scheduled_time: '',
  priority: 'Medium',
  location: '',
  description: '',
}

export default function JobForm({ initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [customers, setCustomers] = useState([])
  const [techs, setTechs] = useState([])

  useEffect(() => {
    async function fetchData() {
      const { data: custData } = await supabase.from('customers').select('id, name').order('name')
      const { data: techData } = await supabase.from('workers').select('id, name').order('name')
      
      if (custData) setCustomers(custData.map(c => ({ value: c.id, label: c.name })))
      if (techData) setTechs(techData.map(t => ({ value: t.id, label: t.name })))
    }
    fetchData()
  }, [])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())          e.title          = 'Job title is required'
    if (!form.customer_id)           e.customer_id    = 'Customer is required'
    if (!form.scheduled_date)        e.scheduled_date = 'Date is required'
    if (!form.scheduled_time)        e.scheduled_time = 'Time is required'
    if (!form.location.trim())       e.location       = 'Location is required'
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

      {/* ─── Basics ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Job Basics
        </p>
        <div className="space-y-4">
          <Input
            label="Job Title"
            placeholder="e.g. Panel Upgrade Phase 1"
            icon={Briefcase}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            error={errors.title}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Customer"
              placeholder="Select Customer"
              options={customers}
              value={form.customer_id}
              onChange={e => set('customer_id', e.target.value)}
              error={errors.customer_id}
              required
            />
            <Select
              label="Assigned Technician"
              placeholder="Select Technician"
              options={techs}
              value={form.technician_id}
              onChange={e => set('technician_id', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Scheduling & Location ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Scheduling
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Scheduled Date"
              icon={Calendar}
              value={form.scheduled_date}
              onChange={e => set('scheduled_date', e.target.value)}
              error={errors.scheduled_date}
              required
            />
            <Input
              type="time"
              label="Scheduled Time"
              icon={Clock}
              value={form.scheduled_time}
              onChange={e => set('scheduled_time', e.target.value)}
              error={errors.scheduled_time}
              required
            />
          </div>
          <Input
            label="Site Location"
            placeholder="123 Site Avenue"
            icon={MapPin}
            value={form.location}
            onChange={e => set('location', e.target.value)}
            error={errors.location}
            required
          />
        </div>
      </div>

      {/* ─── Priority & Description ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Details
        </p>
        <div className="space-y-4">
          <Select
            label="Priority"
            options={PRIORITIES}
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Job Description</label>
            <textarea
              rows={4}
              placeholder="Outline the tasks and requirements..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-lg py-2 px-3 text-sm
                         text-text-primary placeholder:text-text-muted resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ─── Footer actions ─── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Save Job
        </Button>
      </div>

    </form>
  )
}
