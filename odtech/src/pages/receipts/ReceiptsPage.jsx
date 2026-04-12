import React, { useState, useEffect } from 'react'
import { Plus, Download, Search, FileText, Wallet, CalendarDays, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import StatCard from '../../components/ui/StatCard'
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

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, customers(name), jobs(title)')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setReceipts(data || [])
    } catch (error) {
      toast.error('Failed to load receipts')
      console.error(error)
      setReceipts([])
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchReceipts()
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
        setReceipts((prev) => prev.map((receipt) => (receipt.id === editingRecord.id ? data : receipt)))
        setDrawerOpen(false)
        setEditingRecord(null)
      }
    } else {
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
        setReceipts((prev) => [data, ...prev])
        setDrawerOpen(false)

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

  const filtered = receipts.filter((receipt) =>
    (receipt.receipt_number || '').toLowerCase().includes(search.toLowerCase()) ||
    receipt.customers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const todayKey = new Date().toISOString().slice(0, 10)
  const totalCollected = receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0)
  const todaysReceipts = receipts.filter((receipt) => receipt.date === todayKey)
  const todaysCollected = todaysReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0)
  const averageReceiptAmount = receipts.length ? totalCollected / receipts.length : 0

  const columns = [
    { key: 'receipt_number', header: 'Receipt #' },
    { key: 'customers', header: 'Customer', render: (val) => val?.name || 'Walk-in' },
    {
      key: 'jobs',
      header: 'Job Reference',
      render: (val) => <span className="text-xs italic text-text-muted">{val?.title || 'General Payment'}</span>
    },
    { key: 'date', header: 'Date', render: (val) => formatDate(val) },
    {
      key: 'method',
      header: 'Method',
      render: (val) => (
        <span className="rounded-md border border-surface-border bg-surface px-2 py-1 text-xs font-medium text-text-secondary">
          {val}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      render: (val) => <span className="text-sm font-bold text-success">{formatCurrency(val)}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="xs" onClick={() => handleEdit(row)}>
            <FileText size={13} className="mr-1.5" /> Edit
          </Button>
          <Button variant="ghost" size="xs" onClick={() => handleDownload(row)}>
            <Download size={13} className="mr-1.5" /> PDF
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payment Receipts</h1>
          <p className="mt-0.5 text-sm text-text-muted">Manage and issue proof of payment</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search receipts..."
              className="w-64 rounded-lg border border-surface-border bg-surface py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} className="mr-2" /> New Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(totalCollected)}
          subtitle="All receipt payments recorded"
          icon={Wallet}
          color="text-success"
        />
        <StatCard
          title="Receipts Issued"
          value={receipts.length}
          subtitle="Documents created so far"
          icon={FileText}
          color="text-primary"
        />
        <StatCard
          title="Collected Today"
          value={formatCurrency(todaysCollected)}
          subtitle={`${todaysReceipts.length} receipt${todaysReceipts.length === 1 ? '' : 's'} for ${formatDate(todayKey)}`}
          icon={CalendarDays}
          color="text-warning"
        />
        <StatCard
          title="Average Receipt"
          value={formatCurrency(averageReceiptAmount)}
          subtitle="Average payment per receipt"
          icon={BarChart3}
          color="text-info"
        />
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p className="animate-pulse text-sm font-medium text-text-muted">Loading receipts...</p>
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
