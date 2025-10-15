

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  CameraIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  SignalIcon,
  BellIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

export default function TechnicianDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  
  // Modal states
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [modalJob, setModalJob] = useState(null)
  const [currentModalJobData, setCurrentModalJobData] = useState(null)
  
  // Form states for modals
  const [noteContent, setNoteContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceDescription, setInvoiceDescription] = useState('')
  
  const queryClient = useQueryClient()

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Get location permission and start tracking
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationEnabled(true)
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
          
          // Start continuous location tracking
          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
              }
              setCurrentLocation(newLocation)
              
              // Update location on server
              updateLocationMutation.mutate(newLocation)
            },
            (error) => console.error('Location error:', error),
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
          )
          
          return () => navigator.geolocation.clearWatch(watchId)
        },
        (error) => {
          console.error('Location permission denied:', error)
          setLocationEnabled(false)
        }
      )
    }
  }, [])

  // Fetch technician dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['technician-dashboard'],
    queryFn: async () => {
      const response = await api.get('/technician-portal/dashboard')
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2
  })

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location) => {
      await api.post('/technician-portal/location/update', location)
    },
    onError: (error) => {
      console.error('Failed to update location:', error)
    }
  })

  // Update job status mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status, notes }) => {
      console.log('Updating job status:', { jobId, status, notes })
      
      const response = await api.patch(`/technician-portal/jobs/${jobId}/status`, {
        status,
        notes,
        actual_start_time: status === 'in_progress' ? new Date().toISOString() : undefined,
        actual_end_time: status === 'completed' ? new Date().toISOString() : undefined
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      console.log('Status update successful:', data)
      queryClient.invalidateQueries(['technician-dashboard'])
      toast.success(`Job ${variables.status === 'completed' ? 'completed' : 'started'} successfully!`)
      
      // Close modals after successful action
      closeModals()
    },
    onError: (error, variables) => {
      console.error('Status update failed:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update job status'
      toast.error(`Failed to ${variables.status === 'completed' ? 'complete' : 'start'} job: ${errorMessage}`)
    }
  })

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ jobId, content }) => {
      const response = await api.post(`/technician-portal/jobs/${jobId}/notes`, {
        content,
        note_type: 'general',
        is_customer_visible: true
      })
      return response.data
    },
    onSuccess: async (data, variables) => {
      toast.success('Note added successfully!')
      setNoteContent('')
      
      await fetchUpdatedJobData(variables.jobId)
      queryClient.invalidateQueries(['technician-dashboard'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add note')
    }
  })

  // Add invoice generation mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async ({ jobId, amount, description }) => {
      console.log('Generating manual invoice:', { jobId, amount, description })
      const response = await api.post(`/technician-portal/jobs/${jobId}/generate-invoice`, {
        amount: amount ? parseFloat(amount) : null,
        description: description || ''
      })
      console.log('Invoice generation response:', response.data)
      return response.data
    },
    onSuccess: (data) => {
      console.log('Invoice generated successfully:', data)
      toast.success(`Invoice ${data.invoice_number || 'generated'} successfully!`)
      queryClient.invalidateQueries(['technician-dashboard'])
      closeModals()
    },
    onError: (error) => {
      console.error('Invoice generation error:', error)
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to generate invoice'
      toast.error(`Invoice generation failed: ${errorMessage}`)
    }
  })

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (job) => {
      console.log('Sending invoice for job ID:', job.id)
      const response = await api.post(`/technician-portal/jobs/${job.id}/send-invoice`)
      console.log('Send invoice response:', response.data)
      return response.data
    },
    onSuccess: (data, variables) => {
      console.log('Invoice sent successfully:', data)
      toast.success('Invoice sent to customer!')
      
      // Copy payment link if provided
      if (data.payment_link || data.invoice_id) {
        const paymentLink = data.payment_link || `${window.location.origin}/customer-portal/payments/${data.invoice_id}`
        console.log('Customer payment link:', paymentLink)
        
        navigator.clipboard.writeText(paymentLink)
        toast.success('Payment link copied to clipboard!')
      }
      
      queryClient.invalidateQueries(['technician-dashboard'])
    },
    onError: (error) => {
      console.error('Send invoice error:', error)
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to send invoice'
      toast.error(`Send invoice failed: ${errorMessage}`)
    }
  })

  // Invoice functions
  const generateInvoice = (job) => {
    console.log('Manual invoice generation triggered for job:', job.id)
    
    // Check if job is in correct status
    if (job.status !== 'completed') {
      toast.error('Job must be completed before generating invoice')
      return
    }
    
    // Check if invoice already exists
    if (job.invoice_created || job.invoice_number) {
      toast.error('Invoice already exists for this job')
      return
    }
    
    // Open invoice amount modal
    setModalJob(job)
    setInvoiceAmount('')
    setInvoiceDescription('')
    setShowInvoiceModal(true)
  }

  const submitManualInvoice = () => {
    if (!invoiceAmount || parseFloat(invoiceAmount) <= 0) {
      toast.error('Please enter a valid invoice amount')
      return
    }
    
    generateInvoiceMutation.mutate({
      jobId: modalJob.id,
      amount: invoiceAmount,
      description: invoiceDescription
    })
  }

  const sendInvoiceToCustomer = (job) => {
    console.log('Manual send invoice triggered for job:', job.id)
    
    // Check if invoice exists
    if (!job.invoice_created && !job.invoice_number) {
      toast.error('No invoice found. Generate invoice first.')
      return
    }
    
    sendInvoiceMutation.mutate(job)
  }

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ jobId, file, category, description }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('description', description)
      
      const response = await api.post(`/technician-portal/jobs/${jobId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: async (data, variables) => {
      console.log('Photo upload response:', data);
      toast.success('Photo uploaded successfully!')
      setSelectedFile(null)
      
      // Add small delay before fetching updated data
      setTimeout(async () => {
        await fetchUpdatedJobData(variables.jobId)
        queryClient.invalidateQueries(['technician-dashboard'])
      }, 500)
    },
    onError: (error) => {
      console.error('Photo upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload photo')
    }
  })

  // Helper functions
  const formatTime = (dateString) => {
    if (!dateString) return 'Not scheduled'
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Invalid time'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    try {
      return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      assigned: 'bg-purple-100 text-purple-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-l-gray-400',
      medium: 'border-l-yellow-400',
      high: 'border-l-orange-400',
      urgent: 'border-l-red-400',
      emergency: 'border-l-red-600'
    }
    return colors[priority] || 'border-l-gray-400'
  }

  // Modal handlers
  const openPhotosModal = async (job) => {
    console.log('Opening photos modal for job:', job.id)
    setModalJob(job)
    setCurrentModalJobData(job)
    setShowPhotosModal(true)
    
    // Immediately fetch fresh job data when opening photos modal
    try {
      const response = await api.get(`/technician-portal/jobs/${job.id}`)
      const freshJobData = response.data.job || response.data
      console.log('Fresh job data for photos:', freshJobData)
      setCurrentModalJobData(freshJobData)
    } catch (error) {
      console.error('Failed to fetch fresh job data:', error)
    }
  }

  const openDetailsModal = (job) => {
    console.log('Opening details modal for job:', job.id)
    setModalJob(job)
    setCurrentModalJobData(job)
    setShowDetailsModal(true)
  }

  const openNotesModal = async (job) => {
    console.log('Opening notes modal for job:', job.id)
    setModalJob(job)
    setCurrentModalJobData(job)
    setShowNotesModal(true)
    
    // Immediately fetch fresh job data when opening notes modal
    try {
      const response = await api.get(`/technician-portal/jobs/${job.id}`)
      const freshJobData = response.data.job || response.data
      console.log('Fresh job data for notes:', freshJobData)
      console.log('Job notes:', freshJobData.notes)
      setCurrentModalJobData(freshJobData)
    } catch (error) {
      console.error('Failed to fetch fresh job data:', error)
    }
  }

  const closeModals = () => {
    setShowPhotosModal(false)
    setShowDetailsModal(false)
    setShowNotesModal(false)
    setShowInvoiceModal(false)
    setModalJob(null)
    setCurrentModalJobData(null)
    setNoteContent('')
    setSelectedFile(null)
    setInvoiceAmount('')
    setInvoiceDescription('')
  }

  const fetchUpdatedJobData = async (jobId) => {
    try {
      const response = await api.get(`/technician-portal/jobs/${jobId}`)
      const updatedJob = response.data.job || response.data
      
      console.log('Fetched updated job data:', updatedJob)
      console.log('Updated job photos:', updatedJob.photos)
      
      setCurrentModalJobData(updatedJob)
      
      queryClient.setQueryData(['technician-dashboard'], (oldData) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          today_jobs: oldData.today_jobs.map(job => 
            job.id === jobId ? { ...job, ...updatedJob } : job
          )
        }
      })
    } catch (error) {
      console.error('Failed to fetch updated job data:', error)
    }
  }

  // Job actions
  const startJob = (job) => {
    console.log('Starting job:', job.id)
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: 'in_progress',
      notes: 'Job started by technician'
    })
  }

  const completeJob = (job) => {
    console.log('Completing job:', job.id)
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: 'completed',
      notes: 'Job completed by technician'
    })
  }

  const openNavigation = (job) => {
    console.log('Opening navigation for job:', job)
    console.log('Job location data:', job.location)
    console.log('Job customer data:', job.customer)
    
    let address = null
    let coordinates = null
    
    // Try multiple possible location data structures
    if (job.location) {
      // Handle if location is a string
      if (typeof job.location === 'string') {
        address = job.location
      }
      // Handle if location is an object
      else if (typeof job.location === 'object') {
        // Try coordinates first (most accurate)
        if (job.location.latitude && job.location.longitude) {
          coordinates = {
            lat: parseFloat(job.location.latitude),
            lng: parseFloat(job.location.longitude)
          }
        }
        
        // Try different address formats
        address = job.location.full_address || 
                  job.location.address ||
                  job.location.street_address ||
                  (job.location.street ? 
                    `${job.location.street}, ${job.location.city || ''}, ${job.location.state || ''} ${job.location.zip_code || ''}`.trim().replace(/,\s*,/g, ',').replace(/,\s*$/, '') : 
                    null)
      }
    }
    
    // Try job-level address fields
    if (!address && !coordinates) {
      address = job.address || job.job_address || job.service_address
    }
    
    // Try customer address as fallback
    if (!address && !coordinates && job.customer) {
      address = job.customer.address || job.customer.street_address || job.customer.location
      
      // Try customer coordinates
      if (job.customer.latitude && job.customer.longitude) {
        coordinates = {
          lat: parseFloat(job.customer.latitude),
          lng: parseFloat(job.customer.longitude)
        }
      }
    }
    
    console.log('Extracted navigation data:', { address, coordinates })
    
    // If still no location data, prompt user to add it
    if (!address && !coordinates) {
      console.error('No address or coordinates found for navigation')
      toast.error('No location information available for this job. Please contact dispatch to add address.')
      
      // Try to open a generic maps search as last resort
      const fallbackQuery = job.customer?.name ? `${job.customer.name} ${job.service_type || 'service'}` : 'location'
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`
      
      const userConfirmed = window.confirm('No specific address found. Would you like to search Google Maps with available information?')
      if (userConfirmed) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }
    
    // Build Google Maps URL
    let mapsUrl = ''
    
    if (coordinates) {
      if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        mapsUrl = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${coordinates.lat},${coordinates.lng}`
      } else {
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
      }
    } else if (address) {
      const encodedAddress = encodeURIComponent(address.trim())
      if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        mapsUrl = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${encodedAddress}`
      } else {
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
      }
    }
    
    console.log('Opening maps URL:', mapsUrl)
    
    try {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
      toast.success('Opening navigation...')
    } catch (error) {
      console.error('Failed to open maps:', error)
      toast.error('Failed to open navigation')
    }
  }

  // Handle photo file selection
  const handlePhotoSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
      } else {
        toast.error('Please select an image file')
      }
    }
  }

  // Upload photo
  const handlePhotoUpload = () => {
    if (selectedFile && modalJob) {
      setUploading(true)
      uploadPhotoMutation.mutate({
        jobId: modalJob.id,
        file: selectedFile,
        category: 'job_progress',
        description: 'Job photo'
      })
      setUploading(false)
    }
  }

  // Add note
  const handleAddNote = () => {
    if (noteContent.trim() && modalJob) {
      addNoteMutation.mutate({
        jobId: modalJob.id,
        content: noteContent.trim()
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mb-4">
            {error?.response?.data?.detail || error?.message || 'Unknown error'}
          </p>
          <div className="space-x-2">
            <button 
              onClick={() => refetch()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Safe data extraction
  const todayJobs = dashboardData?.today_jobs || []
  const stats = dashboardData?.stats || {
    today: { total: 0, completed: 0, in_progress: 0, pending: 0 },
    week: { total: 0, completed: 0, completion_rate: 0 },
    overall: { total_jobs: 0, completed_jobs: 0, in_progress_jobs: 0, completion_rate: 0 }
  }
  const technician = dashboardData?.technician || { name: 'Technician' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <UserIcon className="h-8 w-8 text-gray-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Hello, {technician.name || 'Technician'}
                </h1>
                <p className="text-sm text-gray-500">
                  {formatDate(currentTime.toISOString())} • {formatTime(currentTime.toISOString())}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Location Status */}
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                locationEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <SignalIcon className="h-3 w-3 mr-1" />
                {locationEnabled ? 'GPS Active' : 'GPS Off'}
              </div>
              
              {/* Notifications */}
              <button className="p-2 text-gray-600 hover:text-gray-900 relative">
                <BellIcon className="h-6 w-6" />
                {stats.today.pending > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Today's Jobs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.today?.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.today?.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.today?.in_progress || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.week?.total || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Today's Schedule</h2>
            <p className="text-sm text-gray-500">Your jobs for {formatDate(currentTime.toISOString())}</p>
          </div>

          {todayJobs.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No jobs scheduled for today</p>
              <p className="text-sm text-gray-400">Enjoy your day off!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {todayJobs.map((job) => (
                <div key={job.id} className={`p-6 border-l-4 ${getPriorityColor(job.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Job Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {String(job.title || `${job.service_type || 'Service'} - ${job.customer?.name || 'Customer'}`)}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {(job.status || 'scheduled').replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(job.scheduled_start)} - {formatTime(job.scheduled_end)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {typeof job.estimated_duration === 'object' ? '2 hours' : (job.estimated_duration || '2 hours')}
                          </p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="h-4 w-4 mr-1" />
                          {String(job.customer?.name || 'Unknown Customer')}
                        </div>
                        {job.customer?.phone && (
                          <button 
                            onClick={() => window.open(`tel:${job.customer.phone}`)}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {String(job.customer.phone)}
                          </button>
                        )}
                      </div>

                      {/* Address */}
                      {(job.location?.full_address || job.location || job.customer?.address) && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {typeof job.location === 'object' ? 
                              (job.location?.full_address || 'No address') : 
                              String(job.location || job.customer?.address || 'No address')
                            }
                          </div>
                          <button
                            onClick={() => openNavigation(job)}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                            Navigate
                          </button>
                        </div>
                      )}

                      {/* Description */}
                      {job.description && (
                        <p className="text-sm text-gray-600 mb-3">{String(job.description)}</p>
                      )}

                      {/* Special Instructions */}
                      {job.special_instructions && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                          <div className="flex items-start">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Special Instructions</p>
                              <p className="text-sm text-yellow-700">{String(job.special_instructions)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Equipment Needed */}
                      {job.equipment_needed && job.equipment_needed.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Equipment Needed:</p>
                          <div className="flex flex-wrap gap-1">
                            {job.equipment_needed.map((equipment, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {typeof equipment === 'string' ? equipment : JSON.stringify(equipment)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        {(job.status === 'scheduled' || job.status === 'confirmed' || job.status === 'assigned') ? (
                          <button
                            onClick={() => startJob(job)}
                            disabled={updateJobStatusMutation.isLoading}
                            className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            <PlayIcon className="h-4 w-4 mr-1" />
                            {updateJobStatusMutation.isLoading ? 'Starting...' : 'Start Job'}
                          </button>
                        ) : job.status === 'in_progress' ? (
                          <button
                            onClick={() => completeJob(job)}
                            disabled={updateJobStatusMutation.isLoading}
                            className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            {updateJobStatusMutation.isLoading ? 'Completing...' : 'Complete Job'}
                          </button>
                        ) : null}

                        <button 
                          onClick={() => openPhotosModal(job)}
                          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                        >
                          <CameraIcon className="h-4 w-4 mr-1" />
                          Photos
                        </button>

                        <button 
                          onClick={() => openDetailsModal(job)}
                          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          Details
                        </button>

                        <button 
                          onClick={() => openNotesModal(job)}
                          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                          Notes
                        </button>

                        {/* Invoice Buttons */}
                        {job.status === 'completed' && !job.invoice_created && (
                          <button
                            onClick={() => generateInvoice(job)}
                            disabled={generateInvoiceMutation.isLoading}
                            className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            {generateInvoiceMutation.isLoading ? 'Generating...' : 'Generate Invoice'}
                          </button>
                        )}

                        {job.invoice_created && job.invoice_number && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              Invoice: {String(job.invoice_number)}
                            </span>
                            <button
                              onClick={() => sendInvoiceToCustomer(job)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Send to Customer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photos Modal */}
      {showPhotosModal && modalJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Photos - {modalJob.job_number || 'Job'}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {(() => {
                // Use updated data first, then fallback to original data
                const photos = (currentModalJobData?.photos && currentModalJobData.photos.length > 0) 
                  ? currentModalJobData.photos 
                  : (modalJob?.photos || []);
                
                if (!Array.isArray(photos) || photos.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No photos uploaded yet</p>
                    </div>
                  );
                }
                
                return (
                  <>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Uploaded Photos ({photos.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo, index) => {
                          const url = photo?.url || '';
                          const description = photo?.description || photo?.filename || '';
                          const uploadedAt = photo?.uploaded_at || '';
                          
                          return (
                            <div key={`photo-${index}`} className="border rounded-lg p-2">
                              <img 
                                src={url}
                                alt={description || `Photo ${index + 1}`}
                                className="w-full h-32 object-cover rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              {description && (
                                <p className="text-xs text-gray-600 mt-1">{String(description)}</p>
                              )}
                              {uploadedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(uploadedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Upload New Photo</h4>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-600">{selectedFile.name}</span>
                      <button
                        onClick={handlePhotoUpload}
                        disabled={uploading || uploadPhotoMutation.isLoading}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {uploading || uploadPhotoMutation.isLoading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && modalJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Job Details - {modalJob.job_number}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Number</label>
                  <p className="mt-1 text-sm text-gray-900">{modalJob.job_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Type</label>
                  <p className="mt-1 text-sm text-gray-900">{modalJob.service_type}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{modalJob.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="mt-1 text-sm text-gray-900">{modalJob.customer?.name}</p>
                  {modalJob.customer?.phone && (
                    <p className="text-sm text-blue-600 cursor-pointer" onClick={() => window.open(`tel:${modalJob.customer.phone}`)}>
                      {modalJob.customer.phone}
                    </p>
                  )}
                  {modalJob.customer?.email && (
                    <p className="text-sm text-blue-600">{modalJob.customer.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(modalJob.status)}`}>
                    {(modalJob.status || 'scheduled').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">
                  {modalJob.location?.full_address || modalJob.location || 'No address provided'}
                </p>
                {(modalJob.location?.full_address || modalJob.location) && (
                  <button
                    onClick={() => openNavigation(modalJob)}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Open in Maps →
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatTime(modalJob.scheduled_start)} - {formatTime(modalJob.scheduled_end)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <span className={`mt-1 inline-flex items-center px-2 py-1 text-xs font-medium rounded border-l-4 ${getPriorityColor(modalJob.priority).replace('border-l-', 'border-l-4 border-')}`}>
                    {(modalJob.priority || 'medium').toUpperCase()}
                  </span>
                </div>
              </div>
              
              {modalJob.special_instructions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                  <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">{modalJob.special_instructions}</p>
                  </div>
                </div>
              )}
              
              {modalJob.equipment_needed && modalJob.equipment_needed.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Equipment Needed</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {modalJob.equipment_needed.map((equipment, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {equipment}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && modalJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Notes - {modalJob.job_number}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Existing Notes */}
              {(() => {
                // Use updated data first, then fallback to original data
                const notes = (currentModalJobData?.notes && currentModalJobData.notes.length > 0) 
                  ? currentModalJobData.notes 
                  : (modalJob?.notes || []);
                  
                if (!Array.isArray(notes) || notes.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No notes added yet</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700">
                      Existing Notes ({notes.length})
                    </h4>
                    {notes.map((note, index) => {
                      const noteContent = typeof note === 'string' ? note : (note?.content || '');
                      const noteDate = note?.created_at ? new Date(note.created_at).toLocaleString() : 'No date';
                      const noteAuthor = note?.created_by ? ` • by ${note.created_by}` : '';
                      
                      return (
                        <div key={index} className="border-l-4 border-blue-400 bg-blue-50 p-3">
                          <p className="text-sm text-gray-800">{noteContent}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {noteDate}{noteAuthor}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Add New Note */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Note</h4>
                <div className="space-y-2">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a new note..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">This note will be visible to customers</p>
                    <button
                      onClick={handleAddNote}
                      disabled={!noteContent.trim() || addNoteMutation.isLoading}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {addNoteMutation.isLoading ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Amount Modal */}
      {showInvoiceModal && modalJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Generate Invoice - {modalJob.job_number}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the invoice amount for this completed job:
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="Enter amount (e.g., 150.00)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  placeholder="Service description"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600">
                  <p><strong>Job:</strong> {modalJob.service_type}</p>
                  <p><strong>Customer:</strong> {modalJob.customer?.name}</p>
                  {invoiceAmount && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p><strong>Subtotal:</strong> ${parseFloat(invoiceAmount || 0).toFixed(2)}</p>
                      <p><strong>Tax (8.25%):</strong> ${(parseFloat(invoiceAmount || 0) * 0.0825).toFixed(2)}</p>
                      <p className="font-semibold"><strong>Total:</strong> ${(parseFloat(invoiceAmount || 0) * 1.0825).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={submitManualInvoice}
                disabled={!invoiceAmount || parseFloat(invoiceAmount) <= 0 || generateInvoiceMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                {generateInvoiceMutation.isLoading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}













