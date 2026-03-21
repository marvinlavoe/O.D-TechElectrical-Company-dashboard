import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Drawer from '../../components/ui/Drawer'
import WorkerForm from './WorkerForm'

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchWorkers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load workers')
      console.error(error)
    } else {
      setWorkers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  const handleAdd = async (form) => {
    setSaving(true)
    
    // Map the form state to match our Supabase schema
    const newWorker = {
      name: form.name,
      spec: form.spec,
      status: form.status,
      phone: form.phone,
      email: form.email || null,
      address: form.address,
      jobs_done: 0
    }

    const { data, error } = await supabase
      .from('workers')
      .insert([newWorker])
      .select()

    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Worker added successfully')
      setWorkers(prev => [data[0], ...prev])
      setDrawerOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex justify-between items-center bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workers & Technicians</h1>
          <p className="text-sm text-text-muted mt-0.5">{loading ? 'Loading...' : `${workers.length} team members`}</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Worker
        </Button>
      </div>

      {/* ─── Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workers.map(w => (
          <div key={w.id} className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-primary/50 hover:shadow-sm transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={w.name} size="md" />
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">{w.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{w.spec}</p>
                </div>
              </div>
              <Badge 
                label={w.status} 
                color={w.status === 'Available' ? 'success' : w.status === 'On Job' ? 'info' : 'warning'} 
              />
            </div>
            
            <div className="flex items-center justify-between text-sm mt-5 pt-3 border-t border-surface-border">
              <span className="text-text-muted text-xs">{w.jobs_done || 0} jobs completed</span>
              <Link to={`/workers/${w.id}`} className="text-primary hover:text-primary-hover font-medium text-xs flex items-center gap-1 transition-colors">
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Drawer ─── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add New Worker"
        width="w-[500px]"
      >
        <WorkerForm
          onSubmit={handleAdd}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>
    </div>
  )
}
