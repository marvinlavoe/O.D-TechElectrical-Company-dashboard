import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, MapPin, Award,
  Briefcase, Edit2, Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import WorkerForm from './WorkerForm'
import { truncate, formatDate } from '../../lib/utils'

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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-text-muted" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function WorkerDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [worker, setWorker] = useState(null)
  const [currentJobs, setCurrentJobs] = useState([])
  const [history, setHistory] = useState([])

  const fetchWorkerData = async () => {
    setLoading(true)
    try {
      // Fetch worker
      const { data: w, error: wError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (wError) throw wError
      setWorker(w)

      // Fetch jobs assigned to this worker
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('technician_id', id)
        .order('created_at', { ascending: false })
      
      if (jobsData) {
        setCurrentJobs(jobsData.filter(j => j.status !== 'Completed'))
        setHistory(jobsData.filter(j => j.status === 'Completed'))
      }

    } catch (err) {
      toast.error('Failed to load worker details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkerData()
  }, [id])

  const handleEdit = async (form) => {
    const { error } = await supabase
      .from('workers')
      .update({
        name: form.name,
        specialization: form.spec,
        status: form.status,
        phone: form.phone,
        email: form.email,
        address: form.address,
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Worker profile updated')
      fetchWorkerData()
      setEditOpen(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-text-muted">Loading worker profile...</div>
  if (!worker) return <div className="py-20 text-center text-text-muted">Worker not found</div>

  const ST_COLOR = worker.status === 'Available' ? 'success' : worker.status === 'On Job' ? 'info' : 'warning'

  return (
    <div className="space-y-6 max-w-6xl">
      <Link to="/workers" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Workers
      </Link>

      {/* ─── Header ─── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            <Avatar name={worker.name} size="xl" />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">{worker.name}</h1>
                <Badge label={worker.status} color={ST_COLOR} />
              </div>
              <p className="text-sm text-text-primary font-medium">{worker.specialization}</p>
              <p className="text-xs text-text-muted mt-1">{history.length} total lifetime jobs completed</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-top">
        {/* ─── Left col: Contact Info ─── */}
        <div className="space-y-6">
          <SectionCard title="Contact Details">
            <div className="space-y-5">
              <InfoRow icon={Phone} label="Phone Number" value={worker.phone} />
              <InfoRow icon={Mail} label="Email Address" value={worker.email} />
              <InfoRow icon={MapPin} label="Home Address" value={worker.address} />
            </div>
          </SectionCard>
        </div>

        {/* ─── Right Col: Jobs ─── */}
        <div className="lg:col-span-2 space-y-6">
          
          <SectionCard title="Current Assignments">
            {currentJobs.length > 0 ? (
              <div className="space-y-3">
                {currentJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-border bg-surface">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{job.title}</p>
                        <p className="text-xs text-info mt-0.5 flex items-center gap-1">
                          <Calendar size={11} /> {formatDate(job.scheduled_date)} — {job.scheduled_time}
                        </p>
                      </div>
                    </div>
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="ghost" size="xs">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted">
                <Award size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No active assignments</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent History">
             {history.length > 0 ? (
                <div className="divide-y divide-surface-border -mx-5 -mt-5">
                  {history.map(job => (
                    <div key={job.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{job.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">Completed: {formatDate(job.scheduled_date)}</p>
                      </div>
                      <Link to={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="xs">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
             ) : (
               <p className="text-sm text-text-muted text-center py-4">No completed jobs yet</p>
             )}
          </SectionCard>

        </div>
      </div>

      <Drawer isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Worker Profile" width="w-full md:w-[500px]">
        <WorkerForm
          initial={{
            name: worker.name,
            spec: worker.specialization,
            status: worker.status,
            phone: worker.phone,
            email: worker.email,
            address: worker.address,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  )
}
