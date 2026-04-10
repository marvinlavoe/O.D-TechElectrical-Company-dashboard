import React, { useState, useEffect } from 'react'
import { Plus, Download, Printer, Search, ArrowRight, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Drawer from '../../components/ui/Drawer'
import ReceiptForm from './ReceiptForm'
import { formatCurrency, formatDate } from '../../lib/utils'
import { generateReceiptPDF } from '../../lib/pdfGenerator'
import useAuthStore from '../../store/useAuthStore'

export default function ReceiptsPage() {
  const { profile, session } = useAuthStore()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchReceipts = async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true)
    }
    const { data, error } = await supabase
      .from('receipts')
      .select('*, customers(name), jobs(title)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load receipts')
      console.error(error)
    } else {
      setReceipts(data || [])
    }
    if (showLoader) {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchReceipts({ showLoader: false })
    })
  }, [])

  const handleEdit = (record) => {
    setEditingRecord(record)
    setDrawerOpen(true)
  }

  const handleSubmit = async (form) => {
    setSaving(true)
    
    if (editingRecord) {
      const { data, error } = await supabase
        .from('receipts')
        .update({
          customer_id: form.customer_id,
          job_id: form.job_id || null,
          date: form.date,
          amount: parseFloat(form.amount || 0),
          method: form.method,
          notes: form.notes
        })
        .eq('id', editingRecord.id)
        .select('*, customers(name), jobs(title)')
        .single()

      setSaving(false)

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Receipt updated successfully')
        setReceipts(prev => prev.map(r => r.id === editingRecord.id ? data : r))
        setDrawerOpen(false)
        setEditingRecord(null)
      }
    } else {
      // Generate receipt number
      const count = receipts.length + 1
      const receiptNum = `REC-${String(count).padStart(3, '0')}-${new Date().getFullYear()}`

      const { data, error } = await supabase
        .from('receipts')
        .insert([{
          receipt_number: receiptNum,
          customer_id: form.customer_id,
          job_id: form.job_id || null,
          date: form.date,
          amount: parseFloat(form.amount || 0),
          method: form.method,
          notes: form.notes
        }])
        .select('*, customers(name), jobs(title)')
        .single()

      setSaving(false)

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Receipt generated successfully')
        setReceipts(prev => [data, ...prev])
        setDrawerOpen(false)
        
        // Auto-generate PDF for convenience
        generateReceiptPDF({ 
          ...data, 
          customer: data.customers?.name,
          job_title: data.jobs?.title,
          generated_by: profile?.full_name || session?.user?.email || 'Account user'
        })
      }
    }
  }

  const handleDownload = (row) => {
    generateReceiptPDF({
      ...row,
      customer: row.customers?.name,
      job_title: row.jobs?.title,
      generated_by: profile?.full_name || session?.user?.email || 'Account user'
    })
  }

  const filtered = receipts.filter(r => 
    r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
    r.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'receipt_number', header: 'Receipt #' },
    { key: 'customers', header: 'Customer', render: (val) => val?.name || 'Walk-in' },
    { key: 'jobs', header: 'Job Reference', render: (val) => (
      <span className="text-xs text-text-muted italic">{val?.title || 'General Payment'}</span>
    )},
    { key: 'date', header: 'Date', render: (val) => formatDate(val) },
    { key: 'method', header: 'Method', render: (val) => (
       <span className="text-xs font-medium text-text-secondary bg-surface px-2 py-1 rounded-md border border-surface-border">
         {val}
       </span>
    )},
    { key: 'amount', header: 'Amount Paid', render: (val) => (
      <span className="font-bold text-success text-sm">{formatCurrency(val)}</span>
    )},
    { key: 'actions', header: '', render: (_, row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="xs" onClick={() => handleEdit(row)}>
          <FileText size={13} className="mr-1.5" /> Edit
        </Button>
        <Button variant="ghost" size="xs" onClick={() => handleDownload(row)}>
          <Download size={13} className="mr-1.5" /> PDF
        </Button>
      </div>
    )}
  ]

  return (
    <div className="space-y-6">
      
      {/* ─── Header ─── */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payment Receipts</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage and issue proof of payment</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search receipts..."
              className="pl-10 pr-4 py-2 bg-surface text-sm border border-surface-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} className="mr-2" /> New Receipt
          </Button>
        </div>
      </div>

      {/* ─── Level 2: Stats (Optional) ─── */}
      {!loading && receipts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-card border border-surface-border p-5 rounded-xl">
             <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Total Collected (All Time)</p>
             <p className="text-2xl font-bold text-success">
               {formatCurrency(receipts.reduce((acc, curr) => acc + curr.amount, 0))}
             </p>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="bg-surface-card rounded-xl border border-surface-border shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-text-muted animate-pulse font-medium">Loading receipts...</p>
          </div>
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingRecord(null)
        }}
        title={editingRecord ? 'Edit Payment Receipt' : 'Create Payment Receipt'}
        width="w-full md:w-[500px]"
      >
        <ReceiptForm
          initial={editingRecord}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false)
            setEditingRecord(null)
          }}
          loading={saving}
        />
      </Drawer>

    </div>
  )
}
