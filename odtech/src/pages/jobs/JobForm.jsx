import { useState, useEffect } from 'react'
import { Briefcase, Calendar, Clock, MapPin, Plus, Search, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import CustomerForm from '../customers/CustomerForm'
import { getAssignedTechnicianIds } from '../../lib/jobAssignments'
import { buildCustomerInsertPayload } from '../../lib/customerPayloads'

const PRIORITIES = [
  { value: 'Low',    label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High',   label: 'High (Urgent)' },
]

const empty = {
  title: '',
  customer_id: '',
  technician_ids: [],
  technician_id: '',
  scheduled_date: '',
  scheduled_time: '',
  priority: 'Medium',
  location: '',
  description: '',
}

function normalizeInitialForm(initial = {}) {
  const technicianIds = getAssignedTechnicianIds(initial)

  return {
    ...empty,
    ...initial,
    technician_ids: technicianIds,
    technician_id: technicianIds[0] ?? initial.technician_id ?? '',
  }
}

export default function JobForm({ initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(() => normalizeInitialForm(initial))
  const [errors, setErrors] = useState({})
  const [customers, setCustomers] = useState([])
  const [techs, setTechs] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResultsOpen, setCustomerResultsOpen] = useState(false)
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [customerFormKey, setCustomerFormKey] = useState(0)

  useEffect(() => {
    setForm(normalizeInitialForm(initial))
  }, [initial])

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

  const toggleTechnician = (techId) => {
    setForm((prev) => {
      const technicianIds = prev.technician_ids.some((id) => String(id) === String(techId))
        ? prev.technician_ids.filter((id) => String(id) !== String(techId))
        : [...prev.technician_ids, techId]

      return {
        ...prev,
        technician_ids: technicianIds,
        technician_id: technicianIds[0] ?? '',
      }
    })

    if (errors.technician_ids) setErrors(prev => ({ ...prev, technician_ids: '' }))
  }

  const selectedTechnicians = techs.filter((tech) =>
    form.technician_ids.some((id) => String(id) === String(tech.value))
  )
  const selectedCustomer = customers.find((customer) => String(customer.value) === String(form.customer_id))
  const filteredCustomers = customers.filter((customer) =>
    customer.label.toLowerCase().includes(customerSearch.trim().toLowerCase())
  )
  const visibleCustomers = customerSearch.trim() ? filteredCustomers : customers.slice(0, 8)

  useEffect(() => {
    if (selectedCustomer && !customerSearch.trim()) {
      setCustomerSearch(selectedCustomer.label)
    }
  }, [selectedCustomer, customerSearch])

  const handleOpenCustomerDrawer = () => {
    setCustomerFormKey((prev) => prev + 1)
    setCustomerDrawerOpen(true)
  }

  const handleCloseCustomerDrawer = () => {
    setCustomerDrawerOpen(false)
  }

  const handleCustomerSearchChange = (value) => {
    setCustomerSearch(value)
    setCustomerResultsOpen(true)

    if (selectedCustomer && value !== selectedCustomer.label) {
      set('customer_id', '')
    }
  }

  const handleSelectCustomer = (customer) => {
    set('customer_id', customer.value)
    setCustomerSearch(customer.label)
    setCustomerResultsOpen(false)
  }

  const handleQuickAddCustomer = async (customerForm) => {
    setCustomerSaving(true)

    const newCustomer = buildCustomerInsertPayload(customerForm)
    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select('id, name, address')
      .single()

    setCustomerSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    const customerOption = { value: data.id, label: data.name }
    setCustomers((prev) => {
      const next = [...prev, customerOption]
      return next.sort((a, b) => a.label.localeCompare(b.label))
    })

    setForm((prev) => ({
      ...prev,
      customer_id: data.id,
      location: prev.location.trim() ? prev.location : (data.address || ''),
    }))
    setCustomerSearch(data.name)
    setCustomerResultsOpen(false)
    setErrors((prev) => ({ ...prev, customer_id: '' }))
    setCustomerDrawerOpen(false)
    toast.success('Customer added and selected')
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
    <>
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
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-text-secondary">
                  Customer
                  <span className="text-danger ml-0.5">*</span>
                </label>
                <Button type="button" variant="ghost" size="xs" onClick={handleOpenCustomerDrawer}>
                  <Plus size={12} /> Add New
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search and select customer"
                  icon={Search}
                  value={customerSearch}
                  onFocus={() => setCustomerResultsOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerResultsOpen(false), 150)}
                  onChange={e => handleCustomerSearchChange(e.target.value)}
                  error={errors.customer_id}
                  required
                  hint={
                    selectedCustomer
                      ? `Selected customer: ${selectedCustomer.label}`
                      : customerSearch.trim()
                        ? `${filteredCustomers.length} customer${filteredCustomers.length === 1 ? '' : 's'} match your search`
                        : `Start typing to filter ${customers.length} customer${customers.length === 1 ? '' : 's'}`
                  }
                />
                {customerResultsOpen && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-xl">
                    {visibleCustomers.length > 0 ? (
                      visibleCustomers.map((customer) => {
                        const isSelected = String(customer.value) === String(form.customer_id)

                        return (
                          <button
                            key={customer.value}
                            type="button"
                            onMouseDown={() => handleSelectCustomer(customer)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-primary hover:bg-surface'
                            }`}
                          >
                            <span className="font-medium">{customer.label}</span>
                            {isSelected && <span className="text-xs font-semibold">Selected</span>}
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-text-muted">
                        No customers found. Use Add New to create one.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Don&apos;t see the customer? Add them here and we&apos;ll select them automatically.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Assigned Technicians
              </label>
              <div className={`rounded-lg border bg-surface p-3 ${errors.technician_ids ? 'border-danger' : 'border-surface-border'}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-text-muted">
                    <Users size={16} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedTechnicians.length > 0 ? (
                        selectedTechnicians.map((tech) => (
                          <span
                            key={tech.value}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {tech.label}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-text-muted">No technicians assigned yet.</p>
                      )}
                    </div>
                    <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto pr-1">
                      {techs.map((tech) => {
                        const checked = form.technician_ids.some((id) => String(id) === String(tech.value))

                        return (
                          <label
                            key={tech.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              checked
                                ? 'border-primary bg-primary/5 text-text-primary'
                                : 'border-surface-border bg-surface-card text-text-secondary hover:border-primary/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTechnician(tech.value)}
                              className="h-4 w-4 rounded border-surface-border text-primary focus:ring-primary"
                            />
                            <span className="font-medium">{tech.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {errors.technician_ids && <p className="text-xs text-danger">{errors.technician_ids}</p>}
            </div>
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

      <Drawer
        isOpen={customerDrawerOpen}
        onClose={handleCloseCustomerDrawer}
        title="Add New Customer"
        width="w-full md:w-[520px]"
      >
        <CustomerForm
          key={customerFormKey}
          onSubmit={handleQuickAddCustomer}
          onCancel={handleCloseCustomerDrawer}
          loading={customerSaving}
        />
      </Drawer>
    </>
  )
}
