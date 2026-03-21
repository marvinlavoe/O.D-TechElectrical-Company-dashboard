import React from 'react'
import Button from '../../components/ui/Button'
import { Download, FileText } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sm"><FileText size={16} /> PDF</Button>
          <Button variant="primary" className="text-sm"><Download size={16} /> Excel</Button>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Revenue Over Time</h2>
        <div className="h-64 bg-surface rounded flex items-center justify-center text-text-muted">
          LineChart Placeholder
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Job Status</h2>
          <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
            PieChart Placeholder
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Worker Performance</h2>
          <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
            BarChart Placeholder
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Inventory Usage</h2>
        <div className="h-48 bg-surface rounded flex items-center justify-center text-text-muted">
          BarChart Placeholder (Top Categories)
        </div>
      </div>
    </div>
  )
}
