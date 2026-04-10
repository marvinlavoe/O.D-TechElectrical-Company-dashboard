import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase,
  DollarSign, FileText, Edit2, MoreHorizontal,
  CheckCircle, Clock, AlertTriangle, Plus, Download
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import CustomerForm from './CustomerForm'
import { formatCurrency, formatDate } from '../../lib/utils'
import { generateReceiptPDF } from '../../lib/pdfGenerator'
import useAuthStore from '../../store/useAuthStore'

const STATUS_COLOR  = { Active: 'success', Inactive: 'danger', paid: 'success', partial: 'warning', unpaid: 'danger' }
const STATUS_LABEL  = { Active: 'Active', Inactive: 'Inactive', paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' }
const JOB_COLOR     = { Completed: 'success', 'In Progress': 'info', Pending: 'warning', Cancelled: 'danger' }
const INV_COLOR     = { Paid: 'success', Unpaid: 'danger', Overdue: 'danger', 'Partially Paid': 'warning' }

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-text-muted" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-primary font-medium mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
        <h2 className="font-semibold text-text-primary text-sm">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function CustomerDetailPage() {
  const { profile, session } = useAuthStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [receipts, setReceipts] = useState([])

  const fetchCustomerData = async () => {
    setLoading(true)
    try {
      // Fetch customer
      const { data: cust, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (custError) throw custError
      setCustomer(cust)

      // Fetch jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
      setJobs(jobsData || [])

      // Fetch invoices
      const { data: invData } = await supabase
        .from('billing_documents')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
      setInvoices(invData || [])

      // Fetch receipts
      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
      setReceipts(receiptsData || [])

    } catch (err) {
      toast.error('Failed to load customer details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerData()
  }, [id])

  const handleEdit = async (form) => {
    const { error } = await supabase
      .from('customers')
      .update({
        name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        type: form.project_type,
        status: form.payment_status === 'unpaid' ? 'Inactive' : 'Active',
        notes: form.notes
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Customer updated')
      fetchCustomerData()
      setEditOpen(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-text-muted">Loading customer...</div>
  if (!customer) return <div className="py-20 text-center text-text-muted">Customer not found</div>

  /* ─── Derived stats ─── */
  const totalBilled   = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const totalPaid     = receipts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const totalOutstanding = Math.max(0, totalBilled - totalPaid)
  const jobsCompleted = jobs.filter(j => j.status === 'Completed').length

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ─── Breadcrumb ─── */}
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Customers
      </Link>

      {/* ─── Profile Header ─── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Avatar name={customer.name} size="xl" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-text-primary">{customer.name}</h1>
                <Badge
                  label={STATUS_LABEL[customer.status] ?? customer.status}
                  color={STATUS_COLOR[customer.status] ?? 'default'}
                />
              </div>
              <p className="text-sm text-text-muted mt-1">{customer.type || 'No project type set'}</p>
              <p className="text-xs text-text-muted mt-1">
                Customer since {formatDate(customer.created_at, 'long')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit
            </Button>
            <Button size="sm" onClick={() => toast.success('Navigate to Create Job with this ID')}>
              <Plus size={14} /> New Job
            </Button>
          </div>
        </div>

        {/* ─── Quick stat chips ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-surface-border">
          {[
            { label: 'Total Jobs',     value: jobs.length,           icon: Briefcase,      color: 'text-info' },
            { label: 'Jobs Done',      value: jobsCompleted,          icon: CheckCircle,    color: 'text-success' },
            { label: 'Total Billed',   value: formatCurrency(totalBilled),           icon: DollarSign,     color: 'text-primary' },
            { label: 'Outstanding',    value: formatCurrency(totalOutstanding),       icon: AlertTriangle,  color: totalOutstanding > 0 ? 'text-danger' : 'text-success' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3">
              <stat.icon size={18} className={stat.color} />
              <div>
                <p className="text-xs text-text-muted">{stat.label}</p>
                <p className="text-sm font-bold text-text-primary mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Two-column layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — contact info + notes */}
        <div className="space-y-6">
          <SectionCard title="Contact Information">
            <div className="space-y-4">
              <InfoRow icon={Phone}  label="Phone"   value={customer.phone} />
              <InfoRow icon={Mail}   label="Email"   value={customer.email} />
              <InfoRow icon={MapPin} label="Address" value={customer.address} />
            </div>
          </SectionCard>

          {customer.notes && (
            <SectionCard title="Notes">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {customer.notes}
              </p>
            </SectionCard>
          )}
        </div>

        {/* Right column — job history + invoices */}
        <div className="lg:col-span-2 space-y-6">

          {/* Jobs */}
          <SectionCard
            title={`Jobs (${jobs.length})`}
            action={
              <Button variant="ghost" size="sm">
                <Plus size={14} /> Add Job
              </Button>
            }
          >
            {jobs.length ? (
              <div className="divide-y divide-surface-border -mx-5 -mt-5">
                {jobs.map(job => (
                  <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                        <Briefcase size={14} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{job.title}</p>
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          {formatDate(job.scheduled_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge label={job.status} color={JOB_COLOR[job.status] ?? 'default'} />
                      {/* Job amount might need a join or items total, leaving as blank if not directly in jobs table or fetch separately */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No jobs yet</p>
            )}
          </SectionCard>

          {/* Invoices */}
          <SectionCard
            title={`Billing Documents (${invoices.length})`}
            action={
              <Button variant="ghost" size="sm">
                <FileText size={14} /> New Invoice
              </Button>
            }
          >
            {invoices.length ? (
              <div className="divide-y divide-surface-border -mx-5 -mt-5">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{inv.document_number}</p>
                        <p className="text-xs text-text-muted mt-0.5">{formatDate(inv.date)} — {inv.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge label={inv.status} color={INV_COLOR[inv.status] ?? 'default'} />
                      <span className="text-sm font-semibold text-text-primary">{formatCurrency(inv.amount)}</span>
                      <Button variant="ghost" size="xs">PDF</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No documents yet</p>
            )}
          </SectionCard>

          {/* Receipts */}
          <SectionCard
            title={`Payment Receipts (${receipts.length})`}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/receipts')}>
                <Plus size={14} /> New Receipt
              </Button>
            }
          >
            {receipts.length ? (
              <div className="divide-y divide-surface-border -mx-5 -mt-5">
                {receipts.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={14} className="text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{rec.receipt_number}</p>
                        <p className="text-xs text-text-muted mt-0.5">{formatDate(rec.date)} — {rec.method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-success">{formatCurrency(rec.amount)}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          generateReceiptPDF({
                            ...rec,
                            customer: customer.name,
                            generated_by: profile?.full_name || session?.user?.email || 'Account user'
                          })
                        }
                      >
                        <Download size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No receipts issued yet</p>
            )}
          </SectionCard>

        </div>
      </div>

      {/* ─── Edit Customer Drawer ─── */}
      <Drawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Customer"
        width="w-full md:w-[520px]"
      >
        <CustomerForm
          initial={{
            full_name:      customer.name,
            email:          customer.email,
            phone:          customer.phone,
            address:        customer.address,
            project_type:   customer.type,
            payment_status: customer.status === 'Inactive' ? 'unpaid' : 'paid',
            notes:          customer.notes,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>

    </div>
  )
}
