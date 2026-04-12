import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Hash,
  AlertTriangle,
  MapPin,
  ShoppingCart,
  Tag,
  Edit2,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import InventoryForm from './InventoryForm'
import { formatCurrency } from '../../lib/utils'

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-surface/30">
        <h2 className="font-semibold text-text-primary text-sm tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  )
}

function InfoRow(props) {
  const IconComponent = props.icon

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
        <IconComponent size={14} className="text-text-muted" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{props.label}</p>
        <p className="text-sm font-medium text-text-primary">{props.value || '-'}</p>
      </div>
    </div>
  )
}

export default function InventoryDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [item, setItem] = useState(null)

  const fetchItemData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setItem(data)
    } catch (err) {
      toast.error('Failed to load item details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setItem(data)
      } catch (err) {
        toast.error('Failed to load item details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
  }, [id])

  const handleEdit = async (form) => {
    const status = parseInt(form.qty, 10) <= parseInt(form.threshold, 10) ? 'Low Stock' : 'In Stock'

    const { error } = await supabase
      .from('inventory')
      .update({
        name: form.name,
        category: form.category,
        qty: form.qty,
        unit: form.unit,
        threshold: form.threshold,
        location: form.location,
        supplier: form.supplier,
        cost: form.cost,
        selling_price: form.selling_price,
        status,
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Item updated')
      fetchItemData()
      setEditOpen(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-text-muted">Loading item...</div>
  if (!item) return <div className="py-20 text-center text-text-muted">Item not found</div>

  const ST_COLOR = item.status === 'In Stock' ? 'success' : item.status === 'Low Stock' ? 'warning' : 'danger'
  const isLowStock = parseInt(item.qty, 10) <= parseInt(item.threshold, 10)
  const unitProfit = Number(item.selling_price || 0) - Number(item.cost || 0)
  const potentialProfit = unitProfit * Number(item.qty || 0)

  return (
    <div className="space-y-6 max-w-6xl">
      <Link to="/inventory" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Inventory
      </Link>

      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-surface border border-surface-border flex items-center justify-center flex-shrink-0 text-primary">
              <Package size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">{item.name}</h1>
                <Badge label={item.status} color={ST_COLOR} />
              </div>
              <p className="text-sm text-text-muted mt-1">Item ID: #{item.id} - Category: {item.category}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit Item
            </Button>
            <Button size="sm" variant={isLowStock ? 'primary' : 'outline'}>
              <ShoppingCart size={14} /> Reorder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-surface-border">
          <div className="bg-surface rounded-lg p-3 border border-surface-border relative overflow-hidden">
            {isLowStock && <div className="absolute top-0 right-0 w-1.5 h-full bg-danger"></div>}
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><Hash size={12} /> Quantity</p>
            <p className={`text-xl font-bold ${isLowStock ? 'text-danger' : 'text-text-primary'}`}>
              {item.qty} <span className="text-sm text-text-muted font-normal">{item.unit}</span>
            </p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-surface-border">
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><AlertTriangle size={12} /> Low Threshold</p>
            <p className="text-xl font-bold text-text-primary">
              {item.threshold} <span className="text-sm text-text-muted font-normal">{item.unit}</span>
            </p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-surface-border">
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><Tag size={12} /> Cost Price</p>
            <p className="text-xl font-bold text-text-primary">{item.cost ? formatCurrency(item.cost) : '-'}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-surface-border">
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><TrendingUp size={12} /> Selling Price</p>
            <p className="text-xl font-bold text-text-primary">{formatCurrency(item.selling_price)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-surface-border">
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><DollarSign size={12} /> Unit Profit</p>
            <p className={`text-xl font-bold ${unitProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(unitProfit)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3 border border-surface-border">
            <p className="text-xs text-text-muted flex items-center gap-1.5 mb-1"><MapPin size={12} /> Location</p>
            <p className="text-sm font-bold text-text-primary mt-1.5 truncate" title={item.location}>{item.location || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-top">
        <div className="space-y-6">
          <SectionCard title="Supplier Details">
            <div className="space-y-5">
              <InfoRow icon={ShoppingCart} label="Default Supplier" value={item.supplier} />
              <InfoRow icon={Tag} label="Last Known Cost" value={item.cost ? formatCurrency(item.cost) : null} />
              <InfoRow icon={TrendingUp} label="Selling Price" value={formatCurrency(item.selling_price)} />
              <InfoRow icon={DollarSign} label="Potential Profit on Stock" value={formatCurrency(potentialProfit)} />
            </div>
            {item.supplier && (
              <div className="mt-5 pt-4 border-t border-surface-border">
                <Button variant="outline" className="w-full">View Supplier Profile</Button>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Stock Movement History" action={<Button variant="ghost" size="sm">Manually Adjust</Button>}>
            <p className="text-sm text-text-muted text-center py-6">No movement history for this item.</p>
          </SectionCard>
        </div>
      </div>

      <Drawer isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Inventory Item" width="w-full md:w-[500px]">
        <InventoryForm
          key={`inventory-edit-${editOpen ? "open" : "closed"}-${item.id}`}
          initial={{
            name: item.name,
            category: item.category,
            qty: item.qty,
            unit: item.unit,
            threshold: item.threshold,
            location: item.location,
            supplier: item.supplier,
            cost: item.cost,
            selling_price: item.selling_price,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  )
}
