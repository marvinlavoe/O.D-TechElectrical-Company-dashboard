import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Drawer from '../../components/ui/Drawer'
import JobForm from './JobForm'
import {
  buildJobAssignmentPayload,
  createWorkerLookup,
  formatAssignedTechnicians,
} from '../../lib/jobAssignments'

export default function JobsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [jobs, setJobs] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workersById, setWorkersById] = useState({})

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const [
      { data, error },
      { data: workersData, error: workersError }
    ] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(name), workers(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('workers')
        .select('id, name')
        .order('name')
    ])

    if (error || workersError) {
      toast.error('Failed to load jobs')
      console.error(error || workersError)
    } else {
      setJobs(data || [])
      setWorkersById(createWorkerLookup(workersData || []))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchJobs])

  const handleCreate = async (form) => {
    setSaving(true)
    const assignmentPayload = buildJobAssignmentPayload(form)
    
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        title: form.title,
        customer_id: form.customer_id,
        ...assignmentPayload,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        priority: form.priority,
        location: form.location,
        description: form.description,
        status: 'Pending'
      }])
      .select('*, customers(name), workers(name)')

    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Job scheduled successfully')
      setJobs(prev => [data[0], ...prev])
      setDrawerOpen(false)
    }
  }

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'customers', header: 'Customer', render: (val) => val?.name || 'Walk-in' },
    {
      key: 'technicians',
      header: 'Technicians',
      render: (_, row) => formatAssignedTechnicians(row, workersById)
    },
    { key: 'scheduled_date', header: 'Date & Time', render: (_, row) => `${row.scheduled_date} ${row.scheduled_time}` },
    {
      key: 'priority',
      header: 'Priority',
      render: (val) => {
        const color = val === 'High' ? 'danger' : val === 'Medium' ? 'warning' : 'success'
        return <Badge label={val} color={color} />
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const color = val === 'Pending' ? 'warning' : val === 'In Progress' ? 'info' : val === 'Completed' ? 'success' : 'default'
        return <Badge label={val} color={color} />
      }
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${row.id}`) }}>View</Button>
      ),
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-surface pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Jobs & Scheduling</h1>
          <p className="text-sm text-text-muted mt-0.5">{loading ? 'Loading...' : `${jobs.length} jobs assigned`}</p>
        </div>
        <div className="flex gap-3 h-10">
          <div className="flex bg-surface-card p-1 rounded-lg border border-surface-border">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'list' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'calendar' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Calendar
            </button>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} className="mr-2" /> Create Job
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable data={jobs} columns={columns} />
      ) : (
        <div className="bg-surface-card rounded-xl border border-surface-border p-5">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={jobs.map(job => ({
              id: job.id,
              title: `${job.title} — ${job.customers?.name}`,
              start: job.scheduled_date + 'T' + job.scheduled_time,
              color: job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#f59e0b' : '#10b981',
            }))}
            eventClick={({ event }) => navigate(`/jobs/${event.id}`)}
            editable={false}
            droppable={false}
            height="70vh"
            eventClassNames="cursor-pointer font-medium border-0 rounded text-xs px-1 shadow-sm transition-transform hover:scale-[1.02]"
            dayMaxEvents={3}
          />
        </div>
      )}

      {/* ─── Drawer ─── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Schedule New Job"
        width="w-full md:w-[500px]"
      >
        <JobForm
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>

    </div>
  )
}
