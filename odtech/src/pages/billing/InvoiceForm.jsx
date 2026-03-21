import { useState, useMemo, useEffect } from 'react'
import { FileText, User, Calendar, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'

const STATUSES = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Overdue', label: 'Overdue' },
]

const empty = {
  customer_id: '',
  date: new Date().toISOString().split('T')[0],
  status: 'Draft',
  items: [{ id: 1, description: '', qty: 1, price: 0 }]
}

export default function InvoiceForm({ type = 'Invoice', initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('id, name').order('name')
      if (data) setCustomers(data.map(c => ({ value: c.id, label: c.name })))
    }
    fetchCustomers()
  }, [])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleItemChange = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }))
  }

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), description: '', qty: 1, price: 0 }]
    }))
  }

  const removeItem = (id) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.customer_id) e.customer_id = 'Customer is required'
    if (!form.date)        e.date = 'Date is required'
    if (form.items.length === 0) e.items = 'At least one item is required'
    return e
  }

  const total = useMemo(() => {
    return form.items.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)), 0)
  }, [form.items])

  const handleSubmit = (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSubmit({ ...form, amount: total, type })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* ─── Details ─── */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            {type} Details
          </p>
          <div className="space-y-4">
            <Select
              label="Select Customer"
              placeholder="Pick a customer…"
              options={customers}
              value={form.customer_id}
              onChange={e => set('customer_id', e.target.value)}
              error={errors.customer_id}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Issue Date"
                type="date"
                icon={Calendar}
                value={form.date}
                onChange={e => set('date', e.target.value)}
                error={errors.date}
                required
              />
              <Select
                label="Status"
                options={STATUSES}
                value={form.status}
                onChange={e => set('status', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── Line Items ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
              Line Items
            </p>
            {errors.items && <p className="text-xs text-danger">{errors.items}</p>}
          </div>

          <div className="space-y-3">
            {form.items.map((item, i) => (
              <div key={item.id} className="group relative flex gap-2 items-start bg-surface border border-surface-border p-3 rounded-xl">
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.qty}
                      onChange={e => handleItemChange(item.id, 'qty', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      step="0.01"
                      value={item.price}
                      onChange={e => handleItemChange(item.id, 'price', e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors mt-[2px]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <Button type="button" variant="ghost" size="sm" className="w-full mt-3 text-primary border border-dashed border-primary/30" onClick={addItem}>
            <Plus size={16} /> Add Line Item
          </Button>

          <div className="mt-6 pt-4 border-t border-surface-border flex justify-between items-center px-2">
             <span className="text-sm font-semibold text-text-muted">Total Amount</span>
             <span className="text-lg font-bold text-text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* ─── Actions (sticky footer) ─── */}
      <div className="flex gap-3 pt-4 border-t border-surface-border">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Save {type}
        </Button>
      </div>

    </form>
  )
}
