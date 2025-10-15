// frontend/src/pages/dashboard/Reports.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  DocumentArrowDownIcon, 
  CalendarIcon, 
  FunnelIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  fields: string[]
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'sales-summary',
    name: 'Sales Summary Report',
    description: 'Overview of sales performance, revenue, and conversion metrics',
    category: 'Sales',
    icon: CurrencyDollarIcon,
    fields: ['revenue', 'deals_closed', 'conversion_rate', 'avg_deal_size']
  },
  {
    id: 'lead-analysis',
    name: 'Lead Analysis Report',
    description: 'Detailed analysis of lead sources, quality, and conversion paths',
    category: 'Marketing',
    icon: UsersIcon,
    fields: ['lead_sources', 'lead_quality', 'conversion_funnel', 'follow_up_metrics']
  },
  {
    id: 'technician-performance',
    name: 'Technician Performance Report',
    description: 'Performance metrics for field technicians and service delivery',
    category: 'Operations',
    icon: ChartBarIcon,
    fields: ['jobs_completed', 'customer_satisfaction', 'efficiency_metrics', 'route_optimization']
  },
  {
    id: 'financial-overview',
    name: 'Financial Overview Report',
    description: 'Comprehensive financial analysis including revenue, expenses, and profitability',
    category: 'Finance',
    icon: DocumentTextIcon,
    fields: ['revenue_breakdown', 'expense_analysis', 'profit_margins', 'cash_flow']
  },
  {
    id: 'customer-insights',
    name: 'Customer Insights Report',
    description: 'Customer behavior analysis, retention metrics, and satisfaction scores',
    category: 'Customer Success',
    icon: UsersIcon,
    fields: ['customer_retention', 'satisfaction_scores', 'service_history', 'lifetime_value']
  },
  {
    id: 'ai-performance',
    name: 'AI Performance Report',
    description: 'Analysis of AI conversation performance, lead qualification, and automation metrics',
    category: 'AI & Automation',
    icon: ChartBarIcon,
    fields: ['conversation_metrics', 'qualification_accuracy', 'response_times', 'automation_roi']
  }
]

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: recentReports } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: async () => {
      const response = await api.get('/reports/recent')
      return response.data
    },
  })

  const handleGenerateReport = async (reportId: string) => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Please select a date range')
      return
    }

    setIsGenerating(true)
    try {
      const response = await api.post('/reports/generate', {
        template_id: reportId,
        date_range: dateRange,
        filters: filters,
        format: 'pdf'
      })

      // Download the report
      const link = document.createElement('a')
      link.href = response.data.download_url
      link.download = response.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Report generated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Sales': 'bg-green-100 text-green-800',
      'Marketing': 'bg-blue-100 text-blue-800',
      'Operations': 'bg-purple-100 text-purple-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Customer Success': 'bg-pink-100 text-pink-800',
      'AI & Automation': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate detailed reports and insights for your business
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Report Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedReport(template.id)}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <template.icon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
              </div>
              
              <p className="mt-3 text-sm text-gray-500">{template.description}</p>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Includes:</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  {template.fields.slice(0, 3).map((field) => (
                    <li key={field} className="flex items-center">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                  {template.fields.length > 3 && (
                    <li className="text-primary-600">+{template.fields.length - 3} more</li>
                  )}
                </ul>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGenerateReport(template.id)
                  }}
                  disabled={isGenerating}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  Generate
                </button>
                <span className="text-xs text-gray-400">PDF Export</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
          
          {recentReports?.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentReports.map((report: any) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{report.name}</div>
                            <div className="text-sm text-gray-500">{report.template}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.date_range.start} - {report.date_range.end}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {report.status === 'completed' && (
                          <button
                            onClick={() => window.open(report.download_url, '_blank')}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reports generated yet</p>
              <p className="text-sm text-gray-400">Generate your first report using the templates above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}