// frontend/src/Pages/crm/ServiceRequests.tsx - RESPONSIVE VERSION
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ClipboardDocumentListIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { serviceRequestsService, ServiceRequest, UpdateServiceRequestData } from '../../services/serviceRequests.service'
import { api } from '../../services/api'
import { format } from 'date-fns'

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  converted_to_lead: 'bg-indigo-100 text-indigo-800'
}

interface User {
  id: string
  name: string
  email: string
  role: string
  first_name?: string
  last_name?: string
}

interface ServiceRequestModalProps {
  request: ServiceRequest | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, data: UpdateServiceRequestData) => void
  onAssign: (id: string, userId: string, notes?: string) => void
  onConvertToLead: (id: string) => void
}

function ServiceRequestModal({ 
  request, 
  isOpen, 
  onClose, 
  onUpdate, 
  onAssign, 
  onConvertToLead 
}: ServiceRequestModalProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<UpdateServiceRequestData>>({})
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')

  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status,
        priority: request.priority,
        admin_notes: request.admin_notes || '',
        estimated_cost: request.estimated_cost || 0,
        estimated_duration: request.estimated_duration || 0
      })
    }
  }, [request])

  // Fetch available users for assignment
 // Fetch only technicians for assignment
const { data: availableTechnicians, isLoading: loadingTechnicians } = useQuery({
  queryKey: ['technicians'],
  queryFn: async (): Promise<User[]> => {
    try {
      // Add ?role=technician to filter only technicians
      const response = await api.get('/users', {
        params: { role: 'technician' }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching technicians:', error)
      toast.error('Failed to load technicians')
      return []
    }
  },
  enabled: activeTab === 'actions' && isOpen
})

  const handleSave = () => {
    if (request) {
      onUpdate(request.id, formData)
      setEditMode(false)
    }
  }

  const handleAssignment = () => {
    if (request && selectedUserId) {
      onAssign(request.id, selectedUserId, assignmentNotes)
      setSelectedUserId('')
      setAssignmentNotes('')
    }
  }

  if (!isOpen || !request) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold truncate">Service Request #{request.request_number}</h2>
            <p className="text-xs sm:text-sm text-gray-600">Created {format(new Date(request.created_at), 'MMM dd, yyyy at h:mm a')}</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm"
            >
              <PencilIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{editMode ? 'Cancel Edit' : 'Edit'}</span>
              <span className="sm:hidden">{editMode ? 'Cancel' : 'Edit'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              <XMarkIcon className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {['details','actions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-3 text-sm font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {editMode ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  {editMode ? (
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}`}>
                      {request.priority}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <p className="text-gray-900 text-sm">{request.service_type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm break-words">{request.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900 text-sm break-words">{request.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date/Time</label>
                  <p className="text-gray-900 text-sm">
                    {request.preferred_date && format(new Date(request.preferred_date), 'MMM dd, yyyy')}
                    {request.preferred_time && ` at ${request.preferred_time}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="text-gray-900 text-sm">${request.estimated_cost || 0}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (hours)</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="text-gray-900 text-sm">{(request.estimated_duration || 0) / 60} hours</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                {editMode ? (
                  <textarea
                    value={formData.admin_notes}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Add internal notes..."
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm break-words">
                    {request.admin_notes || 'No admin notes'}
                  </p>
                )}
              </div>

              {editMode && (
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-4">
              {request.customer && (
                <>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="text-gray-900 text-sm">{request.customer.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900 text-sm break-all">{request.customer.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-gray-900 text-sm">{request.customer.phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Phone (for this request)</label>
                        <p className="text-gray-900 text-sm">{request.contact_phone || 'Same as primary'}</p>
                      </div>
                    </div>
                  </div>

                  {request.special_instructions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm break-words">{request.special_instructions}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Available Actions</h3>
              
              {/* Assignment Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Assign to Team Member</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select a team member...</option>
                     {availableTechnicians && availableTechnicians.length > 0 ? (
  availableTechnicians.map((tech) => (
    <option key={tech.id} value={tech.id}>
      {tech.name || `${tech.first_name} ${tech.last_name}` || tech.email}
    </option>
  ))
) : (
  <option value="" disabled>No technicians available</option>
)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Notes</label>
                    <textarea
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Add any notes about this assignment..."
                    />
                  </div>
                  
                  <button
                    onClick={handleAssignment}
                    disabled={!selectedUserId}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <UserPlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Assign Request</span>
                  </button>
                </div>
              </div>

              {/* Convert to Lead Section
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Convert to Lead</h4>
                <p className="text-sm text-gray-600 mb-4">
                  This will create a sales lead from this service request and mark the request as converted.
                </p>
                <button
                  onClick={() => onConvertToLead(request.id)}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Convert to Lead</span>
                </button>
              </div> */}

              {/* Current Assignment Info */}
              {request.assigned_user && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Currently Assigned To</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div>
                      <p className="font-medium text-sm">{request.assigned_user.name}</p>
                      <p className="text-sm text-gray-500 break-all">{request.assigned_user.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full self-start sm:self-center">
                      {request.assigned_user.role || 'Assigned'}
                    </span>
                  </div>
                </div>
              )}

              {/* Related Jobs */}
              {request.related_jobs && request.related_jobs.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Related Jobs</h4>
                  <div className="space-y-2">
                    {request.related_jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{job.job_number}</p>
                          <p className="text-xs text-gray-500">Status: {job.status}</p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 flex-shrink-0 ml-2">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Estimates */}
              {request.related_estimates && request.related_estimates.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Related Estimates</h4>
                  <div className="space-y-2">
                    {request.related_estimates.map((estimate) => (
                      <div key={estimate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{estimate.estimate_number}</p>
                          <p className="text-xs text-gray-500">${estimate.total_amount} - {estimate.status}</p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 flex-shrink-0 ml-2">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ServiceRequests() {
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const pageSize = 20

  const queryClient = useQueryClient()

  // Fetch service requests
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-requests', filters, currentPage],
    queryFn: () => serviceRequestsService.getServiceRequests({
      ...filters,
      offset: (currentPage - 1) * pageSize,
      limit: pageSize
    })
  })

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['service-requests-stats'],
    queryFn: () => serviceRequestsService.getServiceRequestsStats()
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceRequestData }) =>
      serviceRequestsService.updateServiceRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] })
      queryClient.invalidateQueries({ queryKey: ['service-requests-stats'] })
      toast.success('Service request updated successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to update service request: ' + (error?.response?.data?.detail || error.message))
    }
  })

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: ({ id, userId, notes }: { id: string; userId: string; notes?: string }) =>
      serviceRequestsService.assignServiceRequest(id, { assigned_to: userId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] })
      queryClient.invalidateQueries({ queryKey: ['service-requests-stats'] })
      toast.success('Service request assigned successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to assign service request: ' + (error?.response?.data?.detail || error.message))
    }
  })

  // Convert to lead mutation
  const convertMutation = useMutation({
    mutationFn: (id: string) => serviceRequestsService.convertToLead(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] })
      queryClient.invalidateQueries({ queryKey: ['service-requests-stats'] })
      toast.success(`Service request converted to lead successfully! Lead #${data.lead_number}`)
      setShowModal(false)
    },
    onError: (error: any) => {
      toast.error('Failed to convert to lead: ' + (error?.response?.data?.detail || error.message))
    }
  })

  const handleViewRequest = async (request: ServiceRequest) => {
    try {
      const fullRequest = await serviceRequestsService.getServiceRequest(request.id)
      setSelectedRequest(fullRequest.service_request)
      setShowModal(true)
    } catch (error: any) {
      toast.error('Failed to load service request details: ' + (error?.response?.data?.detail || error.message))
    }
  }

  const handleUpdateRequest = (id: string, data: UpdateServiceRequestData) => {
    updateMutation.mutate({ id, data })
  }

  const handleAssignRequest = (id: string, userId: string, notes?: string) => {
    assignMutation.mutate({ id, userId, notes })
  }

  const handleConvertToLead = (id: string) => {
    if (window.confirm('Are you sure you want to convert this service request to a lead? This action cannot be undone.')) {
      convertMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">Failed to load service requests</span>
          </div>
        </div>
      </div>
    )
  }

  const serviceRequests = data?.service_requests || []
  const totalRequests = data?.total || 0

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage incoming customer service requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
                <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <UserPlusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.completed_requests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.completion_rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filters & Search
          <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className={`bg-white p-4 sm:p-4 rounded-lg shadow border ${!showFilters ? 'hidden lg:block' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-2.5 sm:top-3 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search requests..."
                className="pl-9 sm:pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-end space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => setFilters({ status: '', priority: '', search: '' })}
              className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Clear Filters
            </button>
            
            {/* View Mode Toggle (Desktop) */}
            <div className="hidden sm:flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Bars3Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Service Requests Display */}
      <div className="bg-white shadow border rounded-lg overflow-hidden">
        {viewMode === 'table' ? (
          // Table View
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Customer
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Service Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{request.request_number}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate max-w-xs">{request.description.slice(0, 50)}...</p>
                        {/* Mobile: Show customer info here */}
                        <div className="sm:hidden mt-1">
                          <p className="text-xs text-gray-500">{request.customer_name}</p>
                          <p className="text-xs text-gray-400">{request.customer_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{request.customer_name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{request.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 hidden md:table-cell">
                      {request.service_type}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewRequest(request)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Cards View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
            {serviceRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">#{request.request_number}</h3>
                    <p className="text-xs text-gray-500">{format(new Date(request.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="flex space-x-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[request.priority as keyof typeof PRIORITY_COLORS]}`}>
                      {request.priority}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900">{request.customer_name}</p>
                  <p className="text-xs text-gray-500 truncate">{request.customer_email}</p>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-600 font-medium">{request.service_type}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{request.description}</p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleViewRequest(request)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="w-3 h-3 mr-1" />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {serviceRequests.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No service requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(Boolean) 
                ? 'No service requests match your current filters.'
                : 'No service requests have been submitted yet.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > pageSize && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!data.has_prev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!data.has_next}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalRequests)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalRequests}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!data.has_prev}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.ceil(totalRequests / pageSize) }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === Math.ceil(totalRequests / pageSize) || 
                      Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, array) => (
                      <div key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}

                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!data.has_next}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Request Modal */}
      <ServiceRequestModal
        request={selectedRequest}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUpdate={handleUpdateRequest}
        onAssign={handleAssignRequest}
        onConvertToLead={handleConvertToLead}
      />
    </div>
  )
}