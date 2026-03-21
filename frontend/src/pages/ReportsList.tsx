import { Card } from '../components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { getReports } from '../lib/api'
import { Link } from 'react-router-dom'
import { FileText, Activity, Gauge, Brain } from 'lucide-react'

const testTypeIcons = {
  connectivity: Activity,
  performance: Gauge,
  context: Brain,
}

export default function ReportsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  })

  const reports = data?.reports || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">View and export test reports</p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
            <p className="text-gray-500">
              Run some tests to generate reports
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report: Record<string, unknown>) => {
            const Icon = testTypeIcons[String(report.type) as keyof typeof testTypeIcons] || Activity
            const summary = report.summary as Record<string, unknown> | undefined

            return (
              <Link key={String(report.id)} to={`/reports/${String(report.id)}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {String(report.type).charAt(0).toUpperCase() + String(report.type).slice(1)} Test
                      </h3>
                      <p className="text-sm text-gray-500">
                        ID: {String(report.id)}
                      </p>
                      {summary && (
                        <div className="mt-2 flex gap-2 text-xs">
                          <span className="text-green-600">{String(summary.passed)} passed</span>
                          <span className="text-red-600">{String(summary.failed)} failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}