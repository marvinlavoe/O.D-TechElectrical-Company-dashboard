import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, UserCheck, Briefcase, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Drawer from '../../components/ui/Drawer'
import StatCard from '../../components/ui/StatCard'
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
    const timer = setTimeout(() => {
      fetchWorkers()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const handleAdd = async (form) => {
    setSaving(true)

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
      setWorkers((prev) => [data[0], ...prev])
      setDrawerOpen(false)
    }
  }

  const availableWorkers = workers.filter((worker) => worker.status === 'Available').length
  const onJobWorkers = workers.filter((worker) => worker.status === 'On Job').length
  const jobsCompleted = workers.reduce((sum, worker) => sum + Number(worker.jobs_done || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workers & Technicians</h1>
          <p className="mt-0.5 text-sm text-text-muted">{loading ? 'Loading...' : `${workers.length} team members`}</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus size={16} className="mr-2" /> Add Worker
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Workers"
          value={workers.length}
          subtitle="Team members on record"
          icon={Users}
          color="text-primary"
        />
        <StatCard
          title="Available"
          value={availableWorkers}
          subtitle="Ready for assignment"
          icon={UserCheck}
          color="text-success"
        />
        <StatCard
          title="On Job"
          value={onJobWorkers}
          subtitle="Currently in the field"
          icon={Briefcase}
          color="text-info"
        />
        <StatCard
          title="Jobs Completed"
          value={jobsCompleted}
          subtitle="Total completed jobs by team"
          icon={CheckCircle2}
          color="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="rounded-xl border border-surface-border bg-surface-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={worker.name} size="md" />
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{worker.name}</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">{worker.spec}</p>
                </div>
              </div>
              <Badge
                label={worker.status}
                color={worker.status === 'Available' ? 'success' : worker.status === 'On Job' ? 'info' : 'warning'}
              />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-surface-border pt-3 text-sm">
              <span className="text-xs text-text-muted">{worker.jobs_done || 0} jobs completed</span>
              <Link
                to={`/workers/${worker.id}`}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
              >
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add New Worker"
        width="w-full md:w-[500px]"
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
