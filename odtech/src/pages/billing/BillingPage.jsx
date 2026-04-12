import React, { useState, useEffect } from 'react'
import { Plus, Download, FileText, Wallet, AlertTriangle, Scale } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Drawer from '../../components/ui/Drawer'
import StatCard from '../../components/ui/StatCard'
import InvoiceForm from './InvoiceForm'
import { formatCurrency, formatDate } from '../../lib/utils'
import { generateInvoicePDF } from '../../lib/pdfGenerator'
import useAuthStore from '../../store/useAuthStore'

export default function BillingPage() {
  const { profile, session } = useAuthStore()
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [quotes, setQuotes] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [formType, setFormType] = useState('Invoice')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data: docs, error } = await supabase
      .from('billing_documents')
      .select('*, customers(name), document_items(*)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load billing data')
    } else {
      setInvoices(docs?.filter((doc) => doc.type === 'Invoice') || [])
      setQuotes(docs?.filter((doc) => doc.type === 'Quote') || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchData()
    })
  }, [])

  const handleOpenDrawer = (type, record = null) => {
    setFormType(type)
    setEditingRecord(record)
    setDrawerOpen(true)
  }

  const handleCreate = async (form) => {
    setSaving(true)

    const prefix = formType === 'Invoice' ? 'INV' : 'QUO'
    const count = (formType === 'Invoice' ? invoices.length : quotes.length) + 1
    const docNum = `${prefix}-${String(count).padStart(3, '0')}-${Math.floor(Math.random() * 1000)}`

    const { data: doc, error: docError } = await supabase
      .from('billing_documents')
      .insert([{
        document_number: docNum,
        customer_id: form.customer_id,
        type: formType,
        date: form.date,
        amount: form.amount,
        status: form.status
      }])
      .select()

    if (docError) {
      toast.error(docError.message)
      setSaving(false)
      return
    }

    const lineItems = form.items.map((item) => ({
      document_id: doc[0].id,
      description: item.description,
      qty: parseInt(item.qty, 10),
      price: parseFloat(item.price)
    }))

    const { error: itemsError } = await supabase
      .from('document_items')
      .insert(lineItems)

    setSaving(false)

    if (itemsError) {
      toast.error('Document created but failed to save line items')
    } else {
      toast.success(`${formType} created successfully`)
      fetchData()
      setDrawerOpen(false)
    }
  }

  const handleUpdate = async (form) => {
    setSaving(true)

    const { error: docError } = await supabase
      .from('billing_documents')
      .update({
        customer_id: form.customer_id,
        date: form.date,
        amount: form.amount,
        status: form.status
      })
      .eq('id', editingRecord.id)

    if (docError) {
      toast.error(docError.message)
      setSaving(false)
      return
    }

    const { error: deleteError } = await supabase
      .from('document_items')
      .delete()
      .eq('document_id', editingRecord.id)

    if (deleteError) {
      toast.error('Failed to update line items')
      setSaving(false)
      return
    }

    const lineItems = form.items.map((item) => ({
      document_id: editingRecord.id,
      description: item.description,
      qty: parseInt(item.qty, 10),
      price: parseFloat(item.price)
    }))

    const { error: itemsError } = await supabase
      .from('document_items')
      .insert(lineItems)

    setSaving(false)

    if (itemsError) {
      toast.error('Document updated but failed to save some line items')
    } else {
      toast.success(`${formType} updated successfully`)
      fetchData()
      setDrawerOpen(false)
      setEditingRecord(null)
    }
  }

  const handleGeneratePDF = async (row, type) => {
    const pdfData = {
      ...row,
      customer: row.customers?.name,
      items: row.document_items || [],
      generated_by: profile?.full_name || session?.user?.email || 'Account user'
    }

    try {
      await generateInvoicePDF(pdfData, type)
    } catch (error) {
      console.error(error)
      toast.error(`Failed to generate ${type.toLowerCase()} PDF`)
    }
  }

  const docColumns = [
    { key: 'document_number', header: 'Document #' },
    { key: 'customers', header: 'Customer', render: (val) => val?.name || 'Walk-in' },
    { key: 'date', header: 'Date', render: (val) => formatDate(val) },
    {
      key: 'amount',
      header: 'Amount',
      render: (val) => <span className="font-semibold text-text-primary">{formatCurrency(val)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        let color = 'default'
        if (val === 'Paid') color = 'success'
        if (val === 'Partially Paid') color = 'warning'
        if (val === 'Overdue') color = 'danger'
        if (val === 'Sent') color = 'info'
        return <Badge label={val} color={color} />
      }
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenDrawer(row.type, row)}>
            <FileText size={14} className="mr-1.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleGeneratePDF(row, row.type)}>
            <Download size={14} className="mr-1.5" /> PDF
          </Button>
        </div>
      )
    }
  ]

  const paymentColumns = [
    { key: 'id', header: 'Receipt #' },
    { key: 'invoiceId', header: 'For Invoice' },
    { key: 'customer', header: 'Customer' },
    { key: 'method', header: 'Method' },
    { key: 'date', header: 'Date', render: (val) => formatDate(val) },
    { key: 'amount', header: 'Amount Paid', render: (val) => <span className="font-bold text-success">{formatCurrency(val)}</span> },
  ]

  const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)
  const totalQuoteAmount = quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0)
  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'Overdue')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Billing & Finances</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {loading ? 'Loading...' : 'Manage quotes, invoices, and payments'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => handleOpenDrawer('Quote')}>
            <FileText size={16} className="mr-2" /> Create Quote
          </Button>
          <Button onClick={() => handleOpenDrawer('Invoice')}>
            <Plus size={16} className="mr-2" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Invoices"
          value={invoices.length}
          subtitle={`${paidInvoices.length} paid invoice${paidInvoices.length === 1 ? '' : 's'}`}
          icon={FileText}
          color="text-primary"
        />
        <StatCard
          title="Invoice Value"
          value={formatCurrency(totalInvoiceAmount)}
          subtitle="Total value of all invoices"
          icon={Wallet}
          color="text-success"
        />
        <StatCard
          title="Quotes Value"
          value={formatCurrency(totalQuoteAmount)}
          subtitle={`${quotes.length} quote${quotes.length === 1 ? '' : 's'} prepared`}
          icon={Scale}
          color="text-info"
        />
        <StatCard
          title="Overdue Invoices"
          value={overdueInvoices.length}
          subtitle={overdueInvoices.length ? 'Needs follow-up' : 'Nothing overdue right now'}
          icon={AlertTriangle}
          color="text-danger"
        />
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card">
        <div className="flex gap-6 border-b border-surface-border px-5 pt-4">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`border-b-2 pb-2 font-medium transition-colors ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`border-b-2 pb-2 font-medium transition-colors ${activeTab === 'quotes' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`border-b-2 pb-2 font-medium transition-colors ${activeTab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            Payments
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {activeTab === 'invoices' && <DataTable data={invoices} columns={docColumns} />}
            {activeTab === 'quotes' && <DataTable data={quotes} columns={docColumns} />}
            {activeTab === 'payments' && <DataTable data={[]} columns={paymentColumns} />}
          </>
        )}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingRecord(null)
        }}
        title={editingRecord ? `Edit ${formType}` : `Create New ${formType}`}
        width="w-full md:w-[600px]"
      >
        <InvoiceForm
          type={formType}
          initial={editingRecord ? {
            ...editingRecord,
            items: editingRecord.document_items || []
          } : undefined}
          onSubmit={editingRecord ? handleUpdate : handleCreate}
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
