// frontend/src/pages/estimates/EstimateList.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface Estimate {
  id: string
  estimate_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_id: string
  service_type: string
  description: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  valid_until: string
  created_at: string
  updated_at: string
  sent_at?: string
  viewed_at?: string
  responded_at?: string
  line_items: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  terms_and_conditions: string
  notes?: string
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800'
}

const statusIcons = {
  draft: DocumentTextIcon,
  sent: EnvelopeIcon,
  viewed: EyeIcon,
  accepted: CheckCircleIcon,
  rejected: XCircleIcon,
  expired: ClockIcon
}

export default function EstimateList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)

  const queryClient = useQueryClient()

  const { data: estimatesResponse, isLoading } = useQuery({
    queryKey: ['estimates', searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFilter !== 'all') params.append('date_filter', dateFilter)
      
      const response = await api.get(`/estimates/?${params.toString()}`)
      return response.data
    },
  })
  const estimates = estimatesResponse?.estimates || []

  const sendEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => api.post(`/estimates/${estimateId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] })
      toast.success('Estimate sent successfully!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to send estimate')
    },
  })

  const duplicateEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const response = await api.post(`/estimates/${estimateId}/duplicate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] })
      toast.success('Estimate duplicated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to duplicate estimate')
    },
  })

  const deleteEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      await api.delete(`/estimates/${estimateId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] })
      toast.success('Estimate deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete estimate')
    },
  })

  const handleSendEstimate = (estimateId: string) => {
    sendEstimateMutation.mutate(estimateId)
  }

  const handleDuplicateEstimate = (estimateId: string) => {
    duplicateEstimateMutation.mutate(estimateId)
  }

  const handleDeleteEstimate = (estimateId: string) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      deleteEstimateMutation.mutate(estimateId)
    }
  }

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || DocumentTextIcon
    return <IconComponent className="h-4 w-4" />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEstimateStats = () => {
    if (!estimates || !Array.isArray(estimates)) {
      return { total: 0, draft: 0, sent: 0, accepted: 0, totalValue: 0 }
    }
    
    return {
      total: estimates.length,
      draft: estimates.filter((est: Estimate) => est.status === 'draft').length,
      sent: estimates.filter((est: Estimate) => est.status === 'sent').length,
      accepted: estimates.filter((est: Estimate) => est.status === 'accepted').length,
      totalValue: estimates.reduce((sum: number, est: Estimate) => sum + est.total_amount, 0)
    }
  }

  const stats = getEstimateStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, manage, and track your service estimates that are automatically sent to customers
          </p>
        </div>
        <Link
          to="/estimates/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Estimate
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Estimates</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EnvelopeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sent</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.sent}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Accepted</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.accepted}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalValue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-send notification */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-800">
              <strong>Automatic Email Delivery:</strong> All estimates are automatically sent to customers when created. 
              Status shows 'sent' when successfully delivered.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
          </select>

          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Export List
          </button>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estimates?.map((estimate: Estimate) => (
                  <tr key={estimate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full ${
                          statusColors[estimate.status].replace('text-', 'text-white bg-').replace('bg-', 'bg-').replace('-100', '-500')
                        }`}>
                          {getStatusIcon(estimate.status)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            #{estimate.estimate_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{estimate.customer_name}</div>
                      <div className="text-sm text-gray-500">{estimate.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{estimate.service_type}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{estimate.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(estimate.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[estimate.status]
                      }`}>
                        {estimate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(estimate.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(estimate.valid_until)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedEstimate(estimate)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        <Link
                          to={`/estimates/${estimate.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        
                        {estimate.status === 'draft' && (
                          <button
                            onClick={() => handleSendEstimate(estimate.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Send Estimate"
                          >
                            <EnvelopeIcon className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDuplicateEstimate(estimate.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        
                        {estimate.status === 'accepted' && (
                          <Link
                            to={`/estimates/${estimate.id}/invoice`}
                            className="text-purple-600 hover:text-purple-900"
                            title="Create Invoice"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estimate Details Modal */}
      {selectedEstimate && (
        <Modal
          isOpen={!!selectedEstimate}
          onClose={() => setSelectedEstimate(null)}
          title={`Estimate #${selectedEstimate.estimate_number}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2">{selectedEstimate.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2">{selectedEstimate.customer_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2">{selectedEstimate.customer_phone}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Estimate Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2">{selectedEstimate.service_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedEstimate.status]
                    }`}>
                      {selectedEstimate.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2">{formatDate(selectedEstimate.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Valid Until:</span>
                    <span className="ml-2">{formatDate(selectedEstimate.valid_until)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Line Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedEstimate.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(selectedEstimate.subtotal)}</span>
                </div>
                {selectedEstimate.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount:</span>
                    <span className="text-red-600">-{formatCurrency(selectedEstimate.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax:</span>
                  <span>{formatCurrency(selectedEstimate.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedEstimate.total_amount)}</span>
                </div>
              </div>
            </div>
            
            {selectedEstimate.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedEstimate.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedEstimate(null)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleSendEstimate(selectedEstimate.id)}
                disabled={selectedEstimate.status !== 'draft'}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Send Estimate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}