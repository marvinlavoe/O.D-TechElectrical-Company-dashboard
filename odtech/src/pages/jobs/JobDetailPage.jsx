import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Clock, MapPin, User,
  FileText, Edit2, PlayCircle, CheckCircle, Navigation, MessageSquare
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import JobForm from './JobForm'
import { formatDate } from '../../lib/utils'

const STATUS_COLOR = {
  Pending: 'warning',
  'In Progress': 'info',
  Completed: 'success',
  Cancelled: 'danger'
}
const PRIORITY_COLOR = { High: 'danger', Medium: 'warning', Low: 'success' }

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-text-muted mb-0.5">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-medium text-text-primary ml-5">{value || '—'}</span>
    </div>
  )
}

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

export default function JobDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [job, setJob] = useState(null)
  const [tasks, setTasks] = useState([])

  const fetchJobData = async () => {
    setLoading(true)
    try {
      // Fetch job with relations
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*, customers(name), workers(name)')
        .eq('id', id)
        .single()
      
      if (jobError) throw jobError
      setJob(jobData)

      // Fetch tasks / checklist
      const { data: tasksData } = await supabase
        .from('job_tasks')
        .select('*')
        .eq('job_id', id)
        .order('created_at', { ascending: true })
      setTasks(tasksData || [])

    } catch (err) {
      toast.error('Failed to load job details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobData()
  }, [id])

  const handleEdit = async (form) => {
    const { error } = await supabase
      .from('jobs')
      .update({
        title: form.title,
        customer_id: form.customer_id,
        technician_id: form.technician_id,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        priority: form.priority,
        location: form.location,
        description: form.description,
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Job details updated')
      fetchJobData()
      setEditOpen(false)
    }
  }

  const updateStatus = async (newStatus) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Status updated to ${newStatus}`)
      setJob(prev => ({ ...prev, status: newStatus }))
    }
  }

  const toggleChecklist = async (taskId, currentDone) => {
    const { error } = await supabase
      .from('job_tasks')
      .update({ is_completed: !currentDone })
      .eq('id', taskId)

    if (error) {
      toast.error('Failed to update task')
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !currentDone } : t))
    }
  }

  if (loading) return <div className="py-20 text-center text-text-muted">Loading job details...</div>
  if (!job) return <div className="py-20 text-center text-text-muted">Job not found</div>

  const tasksDone = tasks.filter(t => t.is_completed).length
  const tasksTotal = tasks.length
  const progressPercent = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100)

  return (
    <div className="space-y-6 max-w-6xl">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Jobs
      </Link>

      {/* ─── Header ─── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>
              <Badge label={job.status} color={STATUS_COLOR[job.status] || 'default'} />
              <Badge label={job.priority} color={PRIORITY_COLOR[job.priority] || 'default'} />
            </div>
            <p className="text-sm text-text-muted">Job ID: #{job.id} • Scheduled for {formatDate(job.scheduled_date)} at {job.scheduled_time}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit Job
            </Button>
            {job.status === 'Pending' && (
              <Button size="sm" onClick={() => updateStatus('In Progress')}>
                <PlayCircle size={14} /> Start Job
              </Button>
            )}
            {job.status === 'In Progress' && (
              <Button size="sm" color="success" onClick={() => updateStatus('Completed')}>
                <CheckCircle size={14} /> Mark Completed
              </Button>
            )}
            {job.status === 'Completed' && (
              <Button size="sm" variant="outline">
                <FileText size={14} /> Create Invoice
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-top">
        {/* ─── Left Col: Details & Client ─── */}
        <div className="space-y-6">
          <SectionCard title="Job Details">
            <div className="space-y-5">
              <InfoRow icon={Calendar} label="Date" value={formatDate(job.scheduled_date)} />
              <InfoRow icon={Clock} label="Time" value={job.scheduled_time} />
              <InfoRow icon={User} label="Technician" value={job.workers?.name || 'Not assigned'} />
              
              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-text-muted mb-0.5">
                  <MapPin size={14} />
                  <span className="text-xs">Location</span>
                </div>
                <div className="ml-5 bg-surface rounded-lg p-3 text-sm text-text-primary mt-1 border border-surface-border">
                  {job.location || 'No location set'}
                  <div className="mt-2 text-primary font-medium flex items-center gap-1 text-xs cursor-pointer hover:underline">
                    <Navigation size={12} /> Get Directions
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Customer">
            <div className="flex items-center gap-3 relative group">
              <Avatar name={job.customers?.name} size="md" />
              <div>
                <Link to={`/customers/${job.customer_id}`} className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1">
                  {job.customers?.name}
                </Link>
                <div className="flex gap-3 text-xs text-text-muted mt-0.5">
                  <span className="flex items-center gap-1 hover:text-text-primary cursor-pointer transition-colors"><MessageSquare size={12} /> Chat</span>
                  <Link to={`/customers/${job.customer_id}`} className="flex items-center gap-1 hover:text-text-primary cursor-pointer transition-colors"><User size={12} /> View Profile</Link>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ─── Middle & Right Col: Description & Tasks ─── */}
        <div className="lg:col-span-2 space-y-6">
          
          <SectionCard title="Description & Scope">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {job.description || 'No description provided.'}
            </p>
          </SectionCard>

          <SectionCard title="Task Checklist">
            <div className="mb-4">
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-primary transition-all duration-500 ${progressPercent === 100 ? 'bg-success' : ''}`}
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-2 mt-4">
                {tasks.map(task => (
                  <label key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-surface-border hover:bg-surface cursor-pointer ring-primary/40 focus-within:ring-2 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 w-4 h-4 rounded border-surface-border text-primary focus:ring-primary focus:ring-offset-surface block"
                      checked={task.is_completed}
                      onChange={() => toggleChecklist(task.id, task.is_completed)}  
                    />
                    <span className={`text-sm select-none ${task.is_completed ? 'text-text-muted line-through' : 'text-text-primary font-medium'}`}>
                      {task.title}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <p className="text-sm text-text-muted text-center">No tasks added to checklist.</p>
                <Button variant="ghost" size="xs" onClick={() => toast.success('Logic to add tasks needed')}>Add Task</Button>
              </div>
            )}
          </SectionCard>

        </div>
      </div>

      <Drawer isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Job" width="w-full md:w-[500px]">
        <JobForm
          initial={{
            title: job.title,
            customer_id: job.customer_id,
            technician_id: job.technician_id,
            scheduled_date: job.scheduled_date,
            scheduled_time: job.scheduled_time,
            priority: job.priority,
            location: job.location,
            description: job.description,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  )
}
