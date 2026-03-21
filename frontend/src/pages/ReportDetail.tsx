import { useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Table } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useQuery } from '@tanstack/react-query'
import { getReport, exportReport } from '../lib/api'
import { useState } from 'react'

export default function ReportDetail() {
  const { id } = useParams()
  const [exporting, setExporting] = useState<string | null>(null)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: !!id,
  })

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!id) return
    setExporting(format)
    try {
      const result = await exportReport(id, format)
      
      // Create download
      const blob = new Blob(
        [format === 'json' ? JSON.stringify(result.data, null, 2) : result.data],
        { type: format === 'json' ? 'application/json' : 'text/markdown' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.${format === 'json' ? 'json' : 'md'}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading report...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card className="border-red-200 bg-red-50">
        <p className="text-red-700">Report not found</p>
      </Card>
    )
  }

  const results = report.results || []
  const summary = report.summary as Record<string, unknown> | undefined

  const columns = [
    { key: 'provider', header: 'Provider' },
    { key: 'model', header: 'Model' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={String(row.status)} />
      ),
    },
    {
      key: 'latency_ms',
      header: 'Latency',
      render: (row: Record<string, unknown>) =>
        row.latency_ms ? `${Math.round(Number(row.latency_ms))}ms` : '-',
    },
    {
      key: 'ttft_ms',
      header: 'TTFT',
      render: (row: Record<string, unknown>) =>
        row.ttft_ms ? `${Math.round(Number(row.ttft_ms))}ms` : '-',
    },
    {
      key: 'tokens_per_second',
      header: 'Tokens/s',
      render: (row: Record<string, unknown>) =>
        row.tokens_per_second ? Number(row.tokens_per_second).toFixed(1) : '-',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Report: {String(report.type).charAt(0).toUpperCase() + String(report.type).slice(1)} Test
          </h1>
          <p className="text-gray-600 mt-1">Test ID: {id}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleExport('json')}
            loading={exporting === 'json'}
          >
            Export JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('markdown')}
            loading={exporting === 'markdown'}
          >
            Export Markdown
          </Button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <Card title="Summary">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(summary.total)}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{String(summary.passed)}</p>
              <p className="text-sm text-gray-500">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{String(summary.failed)}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{String(summary.success_rate)}%</p>
              <p className="text-sm text-gray-500">Success Rate</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results Table */}
      <Card title="Test Results">
        <Table columns={columns} data={results} />
      </Card>
    </div>
  )
}