import { useState, useEffect } from 'react'
import { Download, FileText, Calendar, TrendingUp, Users, Briefcase, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import StatCard from '../../components/ui/StatCard'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  })

  // Report data states
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalJobs: 0,
    totalCustomers: 0,
    totalInventory: 0
  })

  const [revenueData, setRevenueData] = useState([])
  const [jobStatusData, setJobStatusData] = useState([])
  const [workerPerformance, setWorkerPerformance] = useState([])
  const [inventoryUsage, setInventoryUsage] = useState([])

  // Fetch all report data
  const fetchReports = async () => {
    setLoading(true)
    try {
      const startDate = new Date(dateRange.start).toISOString()
      const endDate = new Date(dateRange.end).toISOString()

      // Fetch stats
      await Promise.all([
        fetchStats(),
        fetchRevenueData(startDate, endDate),
        fetchJobStatusData(),
        fetchWorkerPerformance(),
        fetchInventoryUsage()
      ])
    } catch (err) {
      console.error('Reports fetch error:', err)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Total revenue (from jobs with payment_status = 'paid')
      const { data: revenueData, error: revenueError } = await supabase
        .from('jobs')
        .select('total_cost')
        .eq('payment_status', 'paid')

      if (revenueError) throw revenueError

      const totalRevenue = revenueData?.reduce((sum, job) => sum + (job.total_cost || 0), 0) || 0

      // Total jobs
      const { count: totalJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })

      if (jobsError) throw jobsError

      // Total customers
      const { count: totalCustomers, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      if (customersError) throw customersError

      // Total inventory items
      const { count: totalInventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })

      if (inventoryError) throw inventoryError

      setStats({
        totalRevenue,
        totalJobs: totalJobs || 0,
        totalCustomers: totalCustomers || 0,
        totalInventory: totalInventory || 0
      })
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }

  const fetchRevenueData = async (startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at, total_cost')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at')

      if (error) throw error

      // Group by date
      const grouped = data?.reduce((acc, job) => {
        const date = new Date(job.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + (job.total_cost || 0)
        return acc
      }, {}) || {}

      const chartData = Object.entries(grouped).map(([date, revenue]) => ({
        date,
        revenue
      }))

      setRevenueData(chartData)
    } catch (err) {
      console.error('Revenue data fetch error:', err)
    }
  }

  const fetchJobStatusData = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('status')

      if (error) throw error

      const statusCounts = data?.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {}) || {}

      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count
      }))

      setJobStatusData(chartData)
    } catch (err) {
      console.error('Job status data fetch error:', err)
    }
  }

  const fetchWorkerPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('name, specialization')

      if (error) throw error

      // For now, just show worker count by specialization
      const specCounts = data?.reduce((acc, worker) => {
        const spec = worker.specialization || 'Unassigned'
        acc[spec] = (acc[spec] || 0) + 1
        return acc
      }, {}) || {}

      const chartData = Object.entries(specCounts).map(([specialization, count]) => ({
        specialization,
        count
      }))

      setWorkerPerformance(chartData)
    } catch (err) {
      console.error('Worker performance fetch error:', err)
    }
  }

  const fetchInventoryUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('category, quantity')
        .order('quantity', { ascending: false })
        .limit(10)

      if (error) throw error

      setInventoryUsage(data || [])
    } catch (err) {
      console.error('Inventory usage fetch error:', err)
    }
  }

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleRefresh = () => {
    fetchReports()
  }

  const handleExport = (format) => {
    // TODO: Implement export functionality
    toast.success(`Exporting as ${format.toUpperCase()}...`)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText size={16} /> PDF
          </Button>
          <Button variant="primary" onClick={() => handleExport('excel')}>
            <Download size={16} /> Excel
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-text-muted" />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              label="Start Date"
              value={dateRange.start}
              onChange={e => handleDateChange('start', e.target.value)}
              className="w-40"
            />
            <span className="text-text-muted">to</span>
            <Input
              type="date"
              label="End Date"
              value={dateRange.end}
              onChange={e => handleDateChange('end', e.target.value)}
              className="w-40"
            />
            <Button onClick={handleRefresh} disabled={loading}>
              Apply Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="success"
          loading={loading}
        />
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          icon={Briefcase}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString()}
          icon={Users}
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Inventory Items"
          value={stats.totalInventory.toLocaleString()}
          icon={Package}
          color="info"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Revenue Over Time</h2>
        {loading ? (
          <div className="h-64 bg-surface rounded flex items-center justify-center text-text-muted">
            Loading...
          </div>
        ) : revenueData.length > 0 ? (
          <div className="h-64 bg-surface rounded p-4">
            <div className="space-y-2">
              {revenueData.slice(-10).map((item, index) => (
                <div key={item.date} className="flex items-center gap-4">
                  <span className="text-sm text-text-muted w-24">{item.date}</span>
                  <div className="flex-1 bg-surface-border rounded-full h-4">
                    <div
                      className="bg-primary h-4 rounded-full"
                      style={{
                        width: `${(item.revenue / Math.max(...revenueData.map(d => d.revenue))) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary w-20 text-right">
                    ${item.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 bg-surface rounded flex items-center justify-center text-text-muted">
            No revenue data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Job Status */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Job Status Distribution</h2>
          {loading ? (
            <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
              Loading...
            </div>
          ) : jobStatusData.length > 0 ? (
            <div className="space-y-3">
              {jobStatusData.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{item.status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-border rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...jobStatusData.map(d => d.count))) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
              No job data available
            </div>
          )}
        </div>

        {/* Worker Performance */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Worker Distribution</h2>
          {loading ? (
            <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
              Loading...
            </div>
          ) : workerPerformance.length > 0 ? (
            <div className="space-y-3">
              {workerPerformance.map((item, index) => (
                <div key={item.specialization} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{item.specialization}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-surface-border rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...workerPerformance.map(d => d.count))) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
              No worker data available
            </div>
          )}
        </div>
      </div>

      {/* Inventory Usage */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top Inventory Categories</h2>
        {loading ? (
          <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
            Loading...
          </div>
        ) : inventoryUsage.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-2 px-4 text-sm font-medium text-text-muted">Category</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-text-muted">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {inventoryUsage.map((item, index) => (
                  <tr key={index} className="border-b border-surface-border/50">
                    <td className="py-2 px-4 text-sm text-text-primary">{item.category || 'Uncategorized'}</td>
                    <td className="py-2 px-4 text-sm text-text-primary text-right">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
            No inventory data available
          </div>
        )}
      </div>
    </div>
  )
}
