import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CheckCircle, Clock, Calendar, MapPin, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import { jobHasAssignedTechnician } from '../../lib/jobAssignments'
import { updateJobStatusAndAssignedWorkers } from '../../lib/jobStatus'
import { findWorkerForUser } from '../../lib/workerIdentity'
import useAuthStore from '../../store/useAuthStore'

export default function WorkerDashboard() {
  const { profile, session } = useAuthStore()
  const currentUser = session?.user || null
  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState(null)
  const [actioningJobId, setActioningJobId] = useState(null)
  const [stats, setStats] = useState({
    assignedToday: 0,
    completedWeek: 0,
    schedule: []
  })

  useEffect(() => {
    async function fetchWorkerData() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      try {
        const matchedWorker = await findWorkerForUser(profile, currentUser)
        setWorker(matchedWorker)

        if (!matchedWorker) {
          setStats({
            assignedToday: 0,
            completedWeek: 0,
            schedule: []
          })
          return
        }

        const { data: jobs } = await supabase
          .from('jobs')
          .select('*, customers(name)')
          .order('scheduled_date', { ascending: true })

        const assignedJobs = (jobs || []).filter((job) => jobHasAssignedTechnician(job, matchedWorker.id))
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        const assignedToday = assignedJobs.filter((job) => job.scheduled_date === today)
        const completedCount = assignedJobs.filter((job) =>
          job.status === 'Completed' && new Date(job.created_at) >= lastWeek
        ).length
        const schedule = assignedJobs
          .filter((job) => job.status !== 'Completed')
          .slice(0, 10)

        setStats({
          assignedToday: assignedToday.length,
          completedWeek: completedCount || 0,
          schedule
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkerData()
  }, [currentUser, profile])

  const handleStatusChange = async (job, nextStatus) => {
    if (actioningJobId) return

    setActioningJobId(job.id)

    try {
      await updateJobStatusAndAssignedWorkers(job, nextStatus)
      toast.success(
        nextStatus === 'In Progress'
          ? 'Job started and worker status changed to On Job'
          : 'Job completed and worker availability updated',
      )

      const today = new Date().toISOString().split('T')[0]
      const nextSchedule = stats.schedule
        .map((entry) => (entry.id === job.id ? { ...entry, status: nextStatus } : entry))
        .filter((entry) => entry.status !== 'Completed')

      setStats((previous) => ({
        assignedToday:
          nextStatus === 'Completed' && job.scheduled_date === today
            ? Math.max(previous.assignedToday - 1, 0)
            : previous.assignedToday,
        completedWeek:
          nextStatus === 'Completed'
            ? previous.completedWeek + 1
            : previous.completedWeek,
        schedule: nextSchedule,
      }))
    } catch (error) {
      toast.error(error.message || 'Failed to update the job status')
    } finally {
      setActioningJobId(null)
    }
  }

  if (loading) return <div className="py-20 text-center text-text-muted">Loading your schedule...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Assigned Jobs" value={stats.assignedToday} subtitle="Scheduled Today" icon={Briefcase} color="text-primary" />
        <StatCard title="Completed Jobs" value={stats.completedWeek} subtitle="This Week" icon={CheckCircle} color="text-success" />
        <StatCard title="Priority Tasks" value={stats.schedule.filter(j => j.priority === 'High').length} subtitle="Requires Attention" icon={Clock} color="text-danger" />
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5 overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-primary" /> My Upcoming Schedule
        </h2>

        {!worker && (
          <div className="mb-4 rounded-xl border border-dashed border-surface-border bg-surface px-4 py-3 text-sm text-text-muted">
            Your account is not matched to a worker profile yet, so job actions are unavailable.
          </div>
        )}
        
        <div className="space-y-3">
          {stats.schedule.length > 0 ? stats.schedule.map(job => (
            <div
              key={job.id} 
              className="group flex flex-wrap items-center justify-between p-4 rounded-xl border border-surface-border bg-surface hover:border-primary/40 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border flex flex-col items-center justify-center text-primary">
                  <span className="text-[10px] font-bold uppercase leading-none">{job.scheduled_date.split('-')[1]}</span>
                  <span className="text-sm font-bold leading-none mt-0.5">{job.scheduled_date.split('-')[2]}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-xs text-text-muted flex items-center gap-1"><Clock size={12} /> {job.scheduled_time}</span>
                    <span className="text-xs text-text-muted flex items-center gap-1"><MapPin size={12} /> {job.location || 'Site View'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <Badge label={job.status} color={job.status === 'In Progress' ? 'info' : 'warning'} />
                {job.status === 'Pending' && worker && (
                  <Button
                    size="xs"
                    onClick={() => handleStatusChange(job, 'In Progress')}
                    disabled={actioningJobId === job.id}
                  >
                    Start Job
                  </Button>
                )}
                {job.status === 'In Progress' && worker && (
                  <Button
                    size="xs"
                    color="success"
                    onClick={() => handleStatusChange(job, 'Completed')}
                    disabled={actioningJobId === job.id}
                  >
                    Complete
                  </Button>
                )}
                <Link to={`/jobs/${job.id}`} className="inline-flex items-center">
                  <ChevronRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </Link>
              </div>
            </div>
          )) : (
            <div className="py-12 text-center text-text-muted bg-surface rounded-xl border border-dashed border-surface-border">
               You have no upcoming jobs scheduled.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
