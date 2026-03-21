import { useState, useEffect } from 'react'
import { FileText, User, Calendar, DollarSign, Tag, Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'

const METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Mobile Money', label: 'Mobile Money' },
  { value: 'Credit Card', label: 'Credit Card' },
]

export default function ReceiptForm({ onSubmit, onCancel, loading = false }) {
  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({
    customer_id: '',
    job_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Mobile Money',
    notes: 'Payment received for services rendered.'
  })

  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('id, name').order('name')
      if (data) setCustomers(data.map(c => ({ value: c.id, label: c.name })))
    }
    fetchCustomers()
  }, [])

  useEffect(() => {
    async function fetchJobs() {
      if (!form.customer_id) {
        setJobs([])
        return
      }
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('customer_id', form.customer_id)
        .order('created_at', { ascending: false })
      
      if (data) {
        setJobs(data.map(j => ({ value: j.id, label: j.title })))
      }
    }
    fetchJobs()
  }, [form.customer_id])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.customer_id || !form.amount) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="space-y-4">
        <Select
          label="Customer"
          options={customers}
          value={form.customer_id}
          onChange={e => setForm({ ...form, customer_id: e.target.value, job_id: '' })}
          required
        />

        <Select
          label="Linked Job / Service (Optional)"
          options={[{ value: '', label: 'No Specific Job' }, ...jobs]}
          value={form.job_id}
          onChange={e => setForm({ ...form, job_id: e.target.value })}
          icon={Briefcase}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            icon={Calendar}
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            required
          />
          <Select
            label="Payment Method"
            options={METHODS}
            value={form.method}
            onChange={e => setForm({ ...form, method: e.target.value })}
            required
          />
        </div>

        <Input
          label="Amount Paid"
          type="number"
          step="0.01"
          placeholder="0.00"
          icon={DollarSign}
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          required
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5 ml-1">
            <Tag size={12} /> Notes / Description
          </label>
          <textarea
            className="w-full h-32 px-4 py-3 rounded-xl bg-surface border border-surface-border text-text-primary text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
            placeholder="Details about the payment..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-surface-border">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Generate Receipt
        </Button>
      </div>
    </form>
  )
}
