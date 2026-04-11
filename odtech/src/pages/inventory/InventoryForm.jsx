import { useState } from 'react'
import { Package, Hash, Tag, AlertTriangle, DollarSign } from 'lucide-react'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'

const CATEGORIES = [
  { value: 'Cables', label: 'Cables & Wiring' },
  { value: 'Breakers', label: 'Breakers & Panels' },
  { value: 'Connectors', label: 'Connectors & Terminals' },
  { value: 'Lighting', label: 'Lighting Fixtures' },
  { value: 'Tools', label: 'Tools & Equipment' },
  { value: 'Other', label: 'Other' },
]

const UNITS = [
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Boxes (box)' },
  { value: 'pack', label: 'Packs (pack)' },
]

const empty = {
  name: '',
  category: 'Cables',
  qty: '',
  unit: 'pcs',
  threshold: '',
  location: '',
  supplier: '',
  cost: '',
  selling_price: ''
}

export default function InventoryForm({ initial = empty, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Item name is required'
    if (form.qty === '' || isNaN(form.qty)) e.qty = 'Valid quantity is required'
    if (form.threshold === '' || isNaN(form.threshold)) e.threshold = 'Valid threshold is required'
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

      {/* ─── Item Basics ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Item Details
        </p>
        <div className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. 12 AWG Copper Wire"
            icon={Package}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={errors.name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={CATEGORIES}
              value={form.category}
              onChange={e => set('category', e.target.value)}
              required
            />
            <Select
              label="Unit of Measure"
              options={UNITS}
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* ─── Stock Levels ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Stock Monitoring
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Current Quantity"
            type="number"
            placeholder="0"
            icon={Hash}
            value={form.qty}
            onChange={e => set('qty', e.target.value)}
            error={errors.qty}
            required
          />
          <Input
            label="Low Stock Threshold"
            type="number"
            placeholder="10"
            icon={AlertTriangle}
            value={form.threshold}
            onChange={e => set('threshold', e.target.value)}
            error={errors.threshold}
            required
          />
        </div>
      </div>

      {/* ─── Purchasing Info ─── */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Purchasing Info (Optional)
        </p>
        <div className="space-y-4">
          <Input
            label="Default Supplier"
            placeholder="e.g. ElectroSupply Inc."
            icon={Tag}
            value={form.supplier}
            onChange={e => set('supplier', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.cost}
              onChange={e => set('cost', e.target.value)}
            />
            <Input
              label="Selling Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              icon={DollarSign}
              value={form.selling_price}
              onChange={e => set('selling_price', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Storage Location"
              placeholder="e.g. Aisle 3, Shelf B"
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Save Item
        </Button>
      </div>
    </form>
  )
}
