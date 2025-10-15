// frontend/src/components/dashboard/ServiceRequestsWidget.tsx - NEW FILE
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  ClipboardDocumentListIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { serviceRequestsService } from '../../services/serviceRequests.service'

export default function ServiceRequestsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['service-requests-stats'],
    queryFn: () => serviceRequestsService.getServiceRequestsStats()
  })

  const { data: recentRequests } = useQuery({
    queryKey: ['recent-service-requests'],
    queryFn: () => serviceRequestsService.getServiceRequests({ 
      limit: 5, 
      offset: 0,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const quickStats = [
    {
      name: 'Pending',
      value: stats.pending_requests,
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'In Progress',
      value: stats.assigned_requests,
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Completed',
      value: stats.completed_requests,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Service Requests</h3>
              <p className="text-sm text-gray-500">{stats.total_requests} total requests</p>
            </div>
          </div>
          <Link
            to="/crm/service-requests"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
          >
            View All
            <ArrowRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickStats.map((stat) => (
            <div key={stat.name} className="text-center">
              <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.name}</div>
            </div>
          ))}
        </div>

        {/* Completion Rate */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Completion Rate</span>
            <span>{stats.completion_rate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.completion_rate}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Requests</h4>
          {recentRequests?.service_requests?.length ? (
            <div className="space-y-3">
              {recentRequests.service_requests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.customer_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {request.service_type} - {request.description.slice(0, 40)}...
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.priority}
                    </span>
                    <Link
                      to="/crm/service-requests"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent service requests
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex space-x-3">
          <Link
            to="/crm/service-requests?status=pending"
            className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            View Pending ({stats.pending_requests})
          </Link>
          <Link
            to="/crm/leads"
            className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            Convert to Leads
          </Link>
        </div>
      </div>
    </div>
  )
}