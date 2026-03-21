import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Briefcase, DollarSign, Users, AlertTriangle, TrendingUp, TrendingDown, Package, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import { formatCurrency, formatDate, statusColor } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    jobsToday: { value: 0, pending: 0 },
    revenueMTD: { value: 0, trend: 0 },
    collectedToday: 0,
    workers: { active: 0, total: 0, available: 0 },
    overdueInvoices: 0,
    recentJobs: [],
    lowStock: [],
    revenueData: [],
    jobStatusData: []
  })

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = today.substring(0, 7) // YYYY-MM

      try {
        // 1. Fetch Jobs Today
        const { data: jobsTodayData } = await supabase
          .from('jobs')
          .select('status')
          .eq('scheduled_date', today)
        
        const jobsCount = jobsTodayData?.length || 0
        const pendingJobs = jobsTodayData?.filter(j => j.status === 'Pending').length || 0

        // 2. Fetch Revenue MTD
        const { data: revenueData } = await supabase
          .from('billing_documents')
          .select('amount, status, date')
          .eq('type', 'Invoice')
          .gte('date', `${currentMonth}-01`)
        
        const mtdTotal = revenueData?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0

        // 3. Fetch Overdue Invoices
        const { count: overdueCount } = await supabase
          .from('billing_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Overdue')

        // 4. Fetch Workers
        const { data: workersData } = await supabase
          .from('workers')
          .select('status')
        
        const totalWorkers = workersData?.length || 0
        const availableWorkers = workersData?.filter(w => w.status === 'Available').length || 0

        // 5. Fetch Collected Today (Receipts)
        const { data: receiptsToday } = await supabase
          .from('receipts')
          .select('amount')
          .eq('date', today)
        
        const collectedToday = receiptsToday?.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) || 0

        // 6. Fetch Recent Jobs
        const { data: recentJobs } = await supabase
          .from('jobs')
          .select('*, customers(name)')
          .order('created_at', { ascending: false })
          .limit(5)

        // 7. Fetch Low Stock Alerts
        const { data: lowStock } = await supabase
          .from('inventory')
          .select('*')
          .eq('status', 'Low Stock')
          .limit(5)

        // 8. Calculate Revenue Timeline (Actual data grouped by day)
        const dailyRevenue = (revenueData || []).reduce((acc, curr) => {
          const day = curr.date.split('-')[2] // Just the day number
          acc[day] = (acc[day] || 0) + parseFloat(curr.amount)
          return acc
        }, {})

        const revenueChartData = Object.entries(dailyRevenue)
          .map(([day, revenue]) => ({ name: `Day ${day}`, revenue }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

        // Fallback if no revenue data yet
        const displayRevenueData = revenueChartData.length > 0 ? revenueChartData : [
          { name: 'Week 1', revenue: 0 },
          { name: 'Week 2', revenue: 0 },
          { name: 'Week 3', revenue: 0 },
          { name: 'Week 4', revenue: 0 },
        ]

        // 9. Group jobs by status for Pie Chart
        const { data: allJobs } = await supabase.from('jobs').select('status')
        const statusMap = (allJobs || []).reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1
          return acc
        }, {})
        
        const jobStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

        setStats({
          jobsToday: { value: jobsCount, pending: pendingJobs },
          revenueMTD: { value: mtdTotal, trend: 0 },
          collectedToday: collectedToday,
          workers: { active: totalWorkers - availableWorkers, total: totalWorkers, available: availableWorkers },
          overdueInvoices: overdueCount || 0,
          recentJobs: recentJobs || [],
          lowStock: lowStock || [],
          revenueData: displayRevenueData,
          jobStatusData: jobStatusData.length > 0 ? jobStatusData : [{ name: 'No Jobs', value: 1 }]
        })
      } catch (error) {
        console.error('Dashboard Fetch Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted font-medium animate-pulse">Syncing Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Top Stat Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Jobs Today" 
          value={stats.jobsToday.value} 
          subtitle={`${stats.jobsToday.pending} pending`} 
          icon={Briefcase} 
          color="text-info" 
        />
        <StatCard 
          title="Revenue (MTD)" 
          value={formatCurrency(stats.revenueMTD.value)} 
          subtitle="Invoiced this month" 
          icon={DollarSign} 
          color="text-success" 
        />
        <StatCard 
          title="Collected Today" 
          value={formatCurrency(stats.collectedToday)} 
          subtitle="Real-time cash flow" 
          icon={TrendingUp} 
          color="text-primary" 
        />
        <StatCard 
          title="Overdue Invoices" 
          value={stats.overdueInvoices} 
          subtitle="Requires attention" 
          icon={AlertTriangle} 
          color="text-danger" 
        />
      </div>

      {/* ─── Level 2: Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Revenue Timeline</h2>
            <Badge label="Current Month" color="info" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `GHS ${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Job Status Overview</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.jobStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.jobStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Level 3: Lists ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Recent Jobs
            </h2>
            <Link to="/jobs" className="text-xs font-medium text-primary hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-surface-border">
            {stats.recentJobs.length > 0 ? stats.recentJobs.map(job => (
              <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate max-w-[200px]">{job.title}</span>
                  <span className="text-xs text-text-muted">{job.customers?.name || 'Walk-in'}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge label={job.status} color={statusColor[job.status]} />
                  <span className="text-[10px] text-text-muted">{formatDate(job.scheduled_date)}</span>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-text-muted text-sm">No recent jobs found</div>
            )}
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Package size={18} className="text-danger" /> Low Stock Alerts
            </h2>
            <Link to="/inventory" className="text-xs font-medium text-primary hover:underline">Inventory</Link>
          </div>
          <div className="divide-y divide-surface-border">
            {stats.lowStock.length > 0 ? stats.lowStock.map(item => (
              <div key={item.id} onClick={() => navigate(`/inventory/${item.id}`)} className="px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors cursor-pointer">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary">{item.name}</span>
                  <span className="text-xs text-text-muted">{item.category}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-danger">{item.qty} {item.unit} left</span>
                  <span className="text-[10px] text-text-muted">Min: {item.threshold}</span>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-text-primary/60 text-sm italic font-medium">
                ✅ All inventory levels are healthy!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
