// src/pages/technician_portal/JobDetail.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ArrowTopRightOnSquareIcon,
  CameraIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  XMarkIcon,
  PaperClipIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import { JobActions } from './JobActions'
export const technicianAPI = {
  updateJobStatus: async (jobId: string, status: string, notes?: string) => {
    const response = await api.patch(`/technician-portal/jobs/${jobId}/status`, {
      status,
      notes
    })
    return response.data
  },

  generateInvoice: async (jobId: string) => {
    const response = await api.post(`/technician-portal/jobs/${jobId}/generate-invoice`, {})
    return response.data
  },

  sendInvoice: async (jobId: string) => {
    const response = await api.post(`/technician-portal/jobs/${jobId}/send-invoice`, {})
    return response.data
  }
}

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('details')
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [photoCategory, setPhotoCategory] = useState('before')
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [noteContent, setNoteContent] = useState('')
  const [isCustomerVisible, setIsCustomerVisible] = useState(true)
  const [completionData, setCompletionData] = useState({
    completion_notes: '',
    work_performed: '',
    materials_used: [],
    customer_signature: null,
    recommendations: [],
    follow_up_required: false,
    follow_up_date: null
  })
  const [newMaterial, setNewMaterial] = useState({ name: '', quantity: 1, unit: 'ea' })
  const [newRecommendation, setNewRecommendation] = useState('')

  // Fetch job details
  const { data: jobData, isLoading, error } = useQuery({
    queryKey: ['job-detail', jobId],
    queryFn: async () => {
      const response = await api.get(`/technician-portal/jobs/${jobId}`)
      return response.data
    },
    enabled: !!jobId
  })

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }) => {
      const response = await api.patch(`/technician-portal/jobs/${jobId}/status`, {
        status,
        notes
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-detail', jobId])
      queryClient.invalidateQueries(['technician-jobs'])
      queryClient.invalidateQueries(['technician-dashboard'])
    }
  })

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/technician-portal/jobs/${jobId}/complete`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-detail', jobId])
      queryClient.invalidateQueries(['technician-jobs'])
      queryClient.invalidateQueries(['technician-dashboard'])
      setShowCompletionModal(false)
    }
  })

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ content, is_customer_visible }) => {
      const response = await api.post(`/technician-portal/jobs/${jobId}/notes`, {
        content,
        note_type: 'general',
        is_customer_visible
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-detail', jobId])
      setShowNoteModal(false)
      setNoteContent('')
    }
  })

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, category, description }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('description', description || '')
      
      const response = await api.post(`/technician-portal/jobs/${jobId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-detail', jobId])
      setSelectedImage(null)
    }
  })

  // Helper functions
  const formatStatus = (status) => {
    if (!status) return 'Scheduled'
    return status.replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatPriority = (priority) => {
    if (!priority) return 'Medium'
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
      emergency: 'bg-red-200 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const openNavigation = (location) => {
    if (!location) return
    
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
      window.open(url, '_blank')
    } else if (location.street) {
      const address = `${location.street}, ${location.city}, ${location.state} ${location.zip_code}`
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      window.open(url, '_blank')
    }
  }

  // const startJob = () => {
  //   updateStatusMutation.mutate({
  //     status: 'in_progress',
  //     notes: 'Job started by technician'
  //   })
  // }

  // const completeJob = () => {
  //   setShowCompletionModal(true)
  // }

  const handleCompletionSubmit = () => {
    completeJobMutation.mutate(completionData)
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage({
          file,
          preview: e.target.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadPhoto = () => {
    if (selectedImage?.file) {
      uploadPhotoMutation.mutate({
        file: selectedImage.file,
        category: photoCategory,
        description: ''
      })
    }
  }

  const addMaterial = () => {
    if (newMaterial.name.trim()) {
      setCompletionData({
        ...completionData,
        materials_used: [...completionData.materials_used, { ...newMaterial }]
      })
      setNewMaterial({ name: '', quantity: 1, unit: 'ea' })
    }
  }

  const addRecommendation = () => {
    if (newRecommendation.trim()) {
      setCompletionData({
        ...completionData,
        recommendations: [...completionData.recommendations, newRecommendation]
      })
      setNewRecommendation('')
    }
  }

  const handleSignature = (signature) => {
    setCompletionData({
      ...completionData,
      customer_signature: signature
    })
  }

  const submitNote = () => {
    if (noteContent.trim()) {
      addNoteMutation.mutate({
        content: noteContent,
        is_customer_visible: isCustomerVisible
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load job details</p>
          <button 
            onClick={() => navigate('/technician-portal/jobs')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  // Safe property access with defaults
  const job = jobData
  const safeTimeTracking = job.time_tracking || {}
  const safePriority = job.priority || 'medium'
  const safeStatus = job.status || 'scheduled'
  const safeCustomer = job.customer || {}
  const safeLocation = job.location || {}
  const safeServiceDetails = job.service_details || {}
  
  const isJobActive = safeStatus === 'in_progress'
  const isJobCompleted = safeStatus === 'completed'
  const canStart = safeStatus === 'scheduled' || safeStatus === 'confirmed'
  const canComplete = safeStatus === 'in_progress'
  const photos = job.photos || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/technician-portal/jobs')}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Jobs
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title || job.service_type || 'Service Call'}</h1>
              <p className="text-gray-600">Job #{job.job_number || 'N/A'} • {job.service_type || 'Service Call'}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(safeStatus)}`}>
              {formatStatus(safeStatus)}
            </span>
          </div>
        </div>

        {/* Job Status Actions */}
         {/* Job Info and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(safePriority)} mr-2`}>
                {formatPriority(safePriority)} Priority
              </div>
              {safeTimeTracking.scheduled_start && (
                <div className="text-sm text-gray-600">
                  {formatDate(safeTimeTracking.scheduled_start)} • {formatTime(safeTimeTracking.scheduled_start)} - {formatTime(safeTimeTracking.scheduled_end || safeTimeTracking.scheduled_start)}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isJobActive && (
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                  Add Note
                </button>
              )}

              {(safeLocation.street || safeLocation.latitude) && (
                <button
                  onClick={() => openNavigation(safeLocation)}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  Navigate
                </button>
              )}
            </div>
          </div>

          {/* NEW: Job Actions Component */}
          <JobActions
            job={{
              id: job.id,
              status: job.status,
              invoice_created: job.invoice_created || false,
              invoice_id: job.invoice_id,
              invoice_number: job.invoice_number
            }}
            onStatusUpdate={async (jobId, status) => {
              return updateStatusMutation.mutateAsync({ status, notes: '' })
            }}
            onInvoiceGenerate={async (jobId) => {
              return technicianAPI.generateInvoice(jobId)
            }}
            onInvoiceSend={async (jobId) => {
              return technicianAPI.sendInvoice(jobId)
            }}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'photos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Photos
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notes
              </button>
              {isJobCompleted && (
                <button
                  onClick={() => setActiveTab('completion')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'completion'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Completion
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                  
                  {safeCustomer.name || safeCustomer.phone || safeCustomer.email ? (
                    <div className="space-y-3">
                      {safeCustomer.name && (
                        <div className="flex items-start">
                          <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">{safeCustomer.name}</p>
                            {safeCustomer.company && (
                              <p className="text-sm text-gray-600">{safeCustomer.company}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {safeCustomer.phone && (
                        <div className="flex items-start">
                          <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                          <div>
                            <a 
                              href={`tel:${safeCustomer.phone}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {safeCustomer.phone}
                            </a>
                            <p className="text-xs text-gray-500">Call Customer</p>
                          </div>
                        </div>
                      )}
                      
                      {safeCustomer.email && (
                        <div className="flex items-start">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                          <div>
                            <a 
                              href={`mailto:${safeCustomer.email}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {safeCustomer.email}
                            </a>
                            <p className="text-xs text-gray-500">Email Customer</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No customer information available</p>
                  )}
                </div>

                {/* Location */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Location</h3>
                  
                  {safeLocation.street || safeLocation.city ? (
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                        <div>
                          {safeLocation.street && (
                            <p className="font-medium text-gray-900">
                              {safeLocation.street}
                            </p>
                          )}
                          {safeLocation.city && (
                            <p className="text-sm text-gray-600">
                              {safeLocation.city}{safeLocation.state && `, ${safeLocation.state}`} {safeLocation.zip_code || ''}
                            </p>
                          )}
                          {(safeLocation.street || safeLocation.latitude) && (
                            <button
                              onClick={() => openNavigation(safeLocation)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Get Directions
                            </button>
                          )}
                        </div>
                      </div>

                      {safeLocation.access_instructions && (
                        <div className="flex items-start">
                          <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">Access Instructions</p>
                            <p className="text-sm text-gray-600">{safeLocation.access_instructions}</p>
                          </div>
                        </div>
                      )}

                      {safeLocation.gate_code && (
                        <div className="flex items-start">
                          <InformationCircleIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">Gate Code</p>
                            <p className="text-sm text-gray-600">{safeLocation.gate_code}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No location information available</p>
                  )}
                </div>

                {/* Service Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-900">Description</p>
                      <p className="text-sm text-gray-600">{job.description || 'No description provided'}</p>
                    </div>

                    {safeServiceDetails.special_instructions && (
                      <div>
                        <p className="font-medium text-gray-900">Special Instructions</p>
                        <p className="text-sm text-gray-600">{safeServiceDetails.special_instructions}</p>
                      </div>
                    )}

                    {safeServiceDetails.equipment_needed && safeServiceDetails.equipment_needed.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-900">Equipment Needed</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {safeServiceDetails.equipment_needed.map((item, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded-full text-gray-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {safeServiceDetails.safety_requirements && safeServiceDetails.safety_requirements.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-900">Safety Requirements</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {safeServiceDetails.safety_requirements.map((item, idx) => (
                            <span key={idx} className="px-2 py-1 bg-red-50 text-xs rounded-full text-red-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Tracking */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Scheduled Start</p>
                        <p className="font-medium text-gray-900">
                          {safeTimeTracking.scheduled_start ? formatTime(safeTimeTracking.scheduled_start) : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Scheduled End</p>
                        <p className="font-medium text-gray-900">
                          {safeTimeTracking.scheduled_end ? formatTime(safeTimeTracking.scheduled_end) : 'Not set'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Actual Start</p>
                        <p className="font-medium text-gray-900">
                          {safeTimeTracking.actual_start ? formatTime(safeTimeTracking.actual_start) : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Actual End</p>
                        <p className="font-medium text-gray-900">
                          {safeTimeTracking.actual_end ? formatTime(safeTimeTracking.actual_end) : 'Not completed'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">
                        {safeTimeTracking.scheduled_duration || 0} minutes (scheduled)
                        {safeTimeTracking.actual_duration && ` / ${safeTimeTracking.actual_duration} minutes (actual)`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Job Photos</h3>
                  <button
                    onClick={() => setShowPhotosModal(true)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    <CameraIcon className="h-4 w-4 mr-1" />
                    Add Photo
                  </button>
                </div>

                {photos.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No photos added yet</p>
                    <p className="text-sm text-gray-400 mt-2">Take photos to document the job progress</p>
                  </div>
                ) : (
                  <div>
                    {/* Before Photos */}
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Before Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.filter(p => p.category === 'before').map((photo) => (
                          <div 
                            key={photo.id} 
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <img 
                              src={photo.url} 
                              alt="Before service" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {photos.filter(p => p.category === 'before').length === 0 && (
                          <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No before photos</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Photos */}
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Progress Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.filter(p => p.category === 'progress').map((photo) => (
                          <div 
                            key={photo.id} 
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <img 
                              src={photo.url} 
                              alt="Work in progress" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {photos.filter(p => p.category === 'progress').length === 0 && (
                          <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No progress photos</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After Photos */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">After Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.filter(p => p.category === 'after').map((photo) => (
                          <div 
                            key={photo.id} 
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <img 
                              src={photo.url} 
                              alt="After service" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {photos.filter(p => p.category === 'after').length === 0 && (
                          <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No after photos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Job Notes</h3>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                    Add Note
                  </button>
                </div>

                {job.notes && job.notes.length > 0 ? (
                  <div className="space-y-4">
                    {job.notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              note.note_type === 'status_update' ? 'bg-blue-100 text-blue-800' : 
                              note.is_important ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {note.note_type === 'status_update' ? 'Status Update' : 
                               note.is_important ? 'Important' : 'Note'}
                            </span>
                            {!note.is_customer_visible && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Internal Only
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No notes added yet</p>
                    <p className="text-sm text-gray-400 mt-2">Add notes to keep track of important information</p>
                  </div>
                )}
              </div>
            )}

            {/* Completion Tab */}
            {activeTab === 'completion' && isJobCompleted && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Job Completion Details</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Work Performed</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{job.completion?.work_performed || 'No details provided'}</p>
                  </div>

                  {job.completion?.issues_found && job.completion.issues_found.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Issues Found</h4>
                      <ul className="list-disc pl-5 text-gray-700">
                        {job.completion.issues_found.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.completion?.recommendations && job.completion.recommendations.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="list-disc pl-5 text-gray-700">
                        {job.completion.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.materials && job.materials.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Materials Used</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                              <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {job.materials.map((material, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">{material.name}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-700">{material.quantity}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">{material.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {job.completion?.customer_signature && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Customer Signature</h4>
                      <div className="border border-gray-300 rounded p-2">
                        <img 
                          src={job.completion.customer_signature} 
                          alt="Customer signature" 
                          className="w-full h-auto max-h-24 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {job.completion?.follow_up_required && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">Follow-up Required</h4>
                      {job.completion.follow_up_date && (
                        <p className="text-yellow-700">
                          Scheduled for: {formatDate(job.completion.follow_up_date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {showPhotosModal && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Upload Job Photo</h3>
              <button 
                onClick={() => {
                  setShowPhotosModal(false)
                  setSelectedImage(null)
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Category
                </label>
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="before">Before Service</option>
                  <option value="progress">In Progress</option>
                  <option value="after">After Service</option>
                  <option value="issue">Issue Found</option>
                </select>
              </div>

              {!selectedImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Take a photo or upload from your device</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id="photoUpload"
                    onChange={handlePhotoUpload}
                  />
                  <label
                    htmlFor="photoUpload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    Select Photo
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={selectedImage.preview} 
                      alt="Selected" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUploadPhoto}
                      disabled={uploadPhotoMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploadPhotoMutation.isLoading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img 
              src={selectedPhoto.url} 
              alt="Job photo" 
              className="max-w-full max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            {selectedPhoto.description && (
              <div className="absolute bottom-4 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-center">
                {selectedPhoto.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Job Note</h3>
              <button 
                onClick={() => {
                  setShowNoteModal(false)
                  setNoteContent('')
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md p-2"
                  placeholder="Enter your note here..."
                />
              </div>

              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="customerVisible"
                  checked={isCustomerVisible}
                  onChange={(e) => setIsCustomerVisible(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="customerVisible" className="ml-2 text-sm text-gray-700">
                  Visible to customer
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowNoteModal(false)
                    setNoteContent('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitNote}
                  disabled={!noteContent.trim() || addNoteMutation.isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {addNoteMutation.isLoading ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Complete Job</h3>
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Work Performed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Performed
                  </label>
                  <textarea
                    value={completionData.work_performed}
                    onChange={(e) => setCompletionData({...completionData, work_performed: e.target.value})}
                    rows={4}
                    className="block w-full border border-gray-300 rounded-md p-2"
                    placeholder="Describe the work you completed..."
                  />
                </div>

                {/* Completion Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={completionData.completion_notes}
                    onChange={(e) => setCompletionData({...completionData, completion_notes: e.target.value})}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md p-2"
                    placeholder="Any additional notes about the job..."
                  />
                </div>

                {/* Materials Used */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materials Used
                  </label>
                  
                  {completionData.materials_used.length > 0 ? (
                    <div className="mb-3 border border-gray-200 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {completionData.materials_used.map((material, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{material.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-900">{material.quantity}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{material.unit}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                <button
                                  onClick={() => {
                                    const newMaterials = [...completionData.materials_used]
                                    newMaterials.splice(index, 1)
                                    setCompletionData({...completionData, materials_used: newMaterials})
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mb-3 text-center py-4 bg-gray-50 rounded-md text-gray-500 text-sm">
                      No materials added
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Material name"
                        value={newMaterial.name}
                        onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        className="block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newMaterial.quantity}
                        onChange={(e) => setNewMaterial({...newMaterial, quantity: parseInt(e.target.value) || 1})}
                        className="block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div className="w-20">
                      <select
                        value={newMaterial.unit}
                        onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                        className="block w-full border border-gray-300 rounded-md p-2"
                      >
                        <option value="ea">ea</option>
                        <option value="ft">ft</option>
                        <option value="in">in</option>
                        <option value="lb">lb</option>
                        <option value="oz">oz</option>
                        <option value="gal">gal</option>
                      </select>
                    </div>
                    <button
                      onClick={addMaterial}
                      disabled={!newMaterial.name.trim()}
                      className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </label>
                  
                  {completionData.recommendations.length > 0 ? (
                    <div className="mb-3 space-y-2">
                      {completionData.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <div className="text-sm text-gray-700">{rec}</div>
                          <button
                            onClick={() => {
                              const newRecs = [...completionData.recommendations]
                              newRecs.splice(index, 1)
                              setCompletionData({...completionData, recommendations: newRecs})
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-3 text-center py-4 bg-gray-50 rounded-md text-gray-500 text-sm">
                      No recommendations added
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a recommendation"
                      value={newRecommendation}
                      onChange={(e) => setNewRecommendation(e.target.value)}
                      className="flex-1 block border border-gray-300 rounded-md p-2"
                    />
                    <button
                      onClick={addRecommendation}
                      disabled={!newRecommendation.trim()}
                      className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Follow-up Required */}
                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="followUpRequired"
                      checked={completionData.follow_up_required}
                      onChange={(e) => setCompletionData({...completionData, follow_up_required: e.target.checked})}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="followUpRequired" className="ml-2 text-sm font-medium text-gray-700">
                      Follow-up required
                    </label>
                  </div>
                  
                  {completionData.follow_up_required && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={completionData.follow_up_date || ''}
                        onChange={(e) => setCompletionData({...completionData, follow_up_date: e.target.value})}
                        className="block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                  )}
                </div>

                {/* Customer Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Signature
                  </label>
                  
                  {completionData.customer_signature ? (
                    <div className="mb-3">
                      <div className="border border-gray-300 rounded-md p-2 bg-white">
                        <img
                          src={completionData.customer_signature}
                          alt="Customer signature"
                          className="h-24 w-full object-contain"
                        />
                      </div>
                      <button
                        onClick={() => setCompletionData({...completionData, customer_signature: null})}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Signature
                      </button>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-md p-2 text-center py-10 bg-gray-50">
                      <p className="text-gray-500 mb-2">Customer signature not captured</p>
                      <button
                        className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Capture Signature
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCompletionModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompletionSubmit}
                    disabled={!completionData.work_performed || completeJobMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {completeJobMutation.isLoading ? 'Completing...' : 'Complete Job'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}