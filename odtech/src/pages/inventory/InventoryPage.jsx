import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Drawer from '../../components/ui/Drawer'
import InventoryForm from './InventoryForm'

export default function InventoryPage() {
  const navigate = useNavigate()
  const [inventory, setInventory] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load inventory')
      console.error(error)
    } else {
      setInventory(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleAdd = async (form) => {
    setSaving(true)
    
    // Calculate stock status dynamically
    const status = parseInt(form.qty, 10) <= parseInt(form.threshold, 10) ? 'Low Stock' : 'In Stock'
    
    const newItem = {
      name: form.name,
      category: form.category,
      qty: parseInt(form.qty, 10),
      unit: form.unit,
      threshold: parseInt(form.threshold, 10),
      status: status,
      supplier: form.supplier || null,
      cost: form.cost ? parseFloat(form.cost) : 0,
      location: form.location || null
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert([newItem])
      .select()

    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Inventory item added successfully')
      setInventory(prev => [data[0], ...prev])
      setDrawerOpen(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'qty', header: 'Qty', render: (val, row) => `${val} ${row.unit}` },
    { key: 'threshold', header: 'Threshold' },
    { key: 'status', header: 'Status', render: (val) => (
        <Badge label={val} color={val === 'Low Stock' ? 'danger' : 'success'} />
      ) 
    },
    { key: 'actions', header: '', render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${row.id}`)}>View</Button>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory Management</h1>
          <p className="text-sm text-text-muted mt-0.5">{loading ? 'Loading...' : `${inventory.length} tracked items`}</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Item
        </Button>
      </div>

      <DataTable data={inventory} columns={columns} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add Inventory Item"
        width="w-[500px]"
      >
        <InventoryForm
          onSubmit={handleAdd}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>
    </div>
  )
}
