// frontend/src/pages/scheduling/Calendar.tsx - COMPLETE RESPONSIVE VERSION
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'
import JobForm from '../../components/forms/JobForm'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

interface Job {
  id: string
  title: string
  customer_name: string
  customer_phone?: string
  address: string
  city: string
  state: string
  zip_code?: string
  technician_id?: string
  technician_name?: string
  start_time: Date
  end_time: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  service_type: string
  notes?: string
  special_instructions?: string
  estimated_duration: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  job_number?: string
  customer_id?: string
  equipment_needed?: string[]
  quoted_price?: number
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Job
}

const statusColors = {
  scheduled: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  cancelled: '#EF4444'
}

const priorityColors = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444'
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>('week')
  const [selectedEvent, setSelectedEvent] = useState<Job | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [showTechnicianAssign, setShowTechnicianAssign] = useState(false)
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null)
  const [selectedTechnician, setSelectedTechnician] = useState('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const queryClient = useQueryClient()

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch jobs for calendar
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['calendar-jobs', currentDate, selectedTechnician],
    queryFn: async () => {
      const startDate = moment(currentDate).startOf('month').format('YYYY-MM-DD')
      const endDate = moment(currentDate).endOf('month').format('YYYY-MM-DD')
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      
      if (selectedTechnician !== 'all') {
        params.append('technician_id', selectedTechnician)
      }
      
      const response = await api.get(`/jobs/calendar?${params.toString()}`)
      return response.data
    },
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  })

  // Fetch technicians (robust)
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        const res = await api.get('/scheduling/technicians')
        return res.data?.results || res.data || []
      } catch (e: any) {
        try {
          const res = await api.get('/users/list')
          const list = res.data?.results || res.data || []
          return list.filter((u: any) => {
            const role = (u.role || u.user_role || '').toLowerCase()
            const groups = (u.groups || u.roles || []).map((g: any) =>
              (g?.name || g)?.toLowerCase()
            )
            return (
              role === 'technician' ||
              groups.includes('technician') ||
              (u.is_technician === true)
            )
          })
        } catch {
          const res = await api.get('/users/')
          const list = res.data?.results || res.data || []
          return list.filter((u: any) => {
            const role = (u.role || u.user_role || '').toLowerCase()
            const groups = (u.groups || u.roles || []).map((g: any) =>
              (g?.name || g)?.toLowerCase()
            )
            return (
              role === 'technician' ||
              groups.includes('technician') ||
              (u.is_technician === true)
            )
          })
        }
      }
    },
  })

  // Calculate end time
  const calculateEndTime = (date: string, startTime: string, duration: number) => {
    let durationInMinutes = duration
    if (duration < 24 && duration % 1 !== 0) durationInMinutes = duration * 60
    const startMoment = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm')
    const endMoment = startMoment.clone().add(durationInMinutes, 'minutes')
    return endMoment.format('YYYY-MM-DDTHH:mm:ss')
  }

  // Create job uses existing /api/v1/jobs/ POST
  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const requiredFields = ['customer_id', 'service_type', 'scheduled_date', 'start_time']
      const missing = requiredFields.filter(f => !jobData[f])
      if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`)
      
      const startDateTime = `${jobData.scheduled_date}T${jobData.start_time}:00`
      const endDateTime = calculateEndTime(jobData.scheduled_date, jobData.start_time, jobData.estimated_duration || 60)

      const apiData = {
        customer_id: jobData.customer_id,
        title: `${jobData.service_type} - Service Call`,
        service_type: jobData.service_type,
        description: jobData.notes || jobData.special_instructions || `${jobData.service_type} service appointment`,
        address: {
          street: jobData.address || '',
          city: jobData.city || '',
          state: jobData.state || '',
          postal_code: jobData.zip_code || '',
        },
        time_tracking: {
          scheduled_start: startDateTime,
          scheduled_end: endDateTime,
          scheduled_duration: jobData.estimated_duration || 60,
        },
        technician_id: jobData.technician_id || null,
        priority: jobData.priority || 'medium',
        status: 'scheduled',
        special_instructions: jobData.special_instructions || '',
        equipment_needed: jobData.equipment_needed ? [jobData.equipment_needed] : [],
        quoted_price: jobData.estimated_cost || null,
        estimated_duration: jobData.estimated_duration || 60,
      }

      const response = await api.post('/jobs/', apiData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      refetch()
      setShowCreateModal(false)
      toast.success('Job created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to create job')
    },
  })

  // Update job via existing PATCH /jobs/{id}
  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: any }) => {
      const response = await api.patch(`/jobs/${jobId}`, updates)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      setShowEditModal(false)
      setEditingJob(null)
      setSelectedEvent(null)
      toast.success('Job updated successfully!')
      setTimeout(() => refetch(), 400)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update job')
    },
  })

  // Reschedule uses existing POST /scheduling/reschedule/{job_id}
  const rescheduleMutation = useMutation({
    mutationFn: async ({ jobId, newStart, newEnd }: { jobId: string; newStart: Date; newEnd: Date }) => {
      const response = await api.post(`/scheduling/reschedule/${jobId}`, {
        new_start: newStart.toISOString(),
        new_end: newEnd.toISOString(),
        reason: 'Rescheduled via drag and drop',
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      toast.success('Job rescheduled successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to reschedule job')
    },
  })

  // Assign technician via PATCH /jobs/{id}
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ jobId, technicianId }: { jobId: string; technicianId: string }) => {
      const response = await api.patch(`/jobs/${jobId}`, { technician_id: technicianId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      setShowTechnicianAssign(false)
      setAssigningJobId(null)
      setSelectedEvent(null)
      toast.success('Technician assigned successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to assign technician')
    },
  })

  // Cancel job (status=cancelled)
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.patch(`/jobs/${jobId}`, { status: 'cancelled' })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      setSelectedEvent(null)
      toast.success('Job cancelled.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to cancel job')
    },
  })

  // Convert API jobs to calendar events
  const events: CalendarEvent[] = jobs?.jobs?.map((job: any) => {
    try {
      const startStr = job.scheduled_start || job.start_time
      const endStr = job.scheduled_end || job.end_time

      const startTime = startStr ? moment(startStr).toDate() : new Date()
      const endTime = endStr
        ? moment(endStr).toDate()
        : moment(startTime).add(job.estimated_duration || job.time_tracking?.scheduled_duration || 60, 'minutes').toDate()

      return {
        id: job.id,
        title: `${job.customer?.name || 'Unknown'} - ${job.service_type || job.job_type || 'Service'}`,
        start: startTime,
        end: endTime,
        resource: {
          id: job.id,
          title: job.title,
          customer_name: job.customer?.name || 'Unknown',
          customer_phone: job.customer?.phone,
          customer_id: job.customer?.id,
          address: job.location?.street || '',
          city: job.location?.city || '',
          state: job.location?.state || '',
          zip_code: job.location?.postal_code || '',
          technician_id: job.technician?.id,
          technician_name: job.technician?.name,
          start_time: startTime,
          end_time: endTime,
          status: job.status,
          service_type: job.job_type || job.service_type || 'Service',
          notes: job.description,
          special_instructions: job.special_instructions,
          estimated_duration: job.estimated_duration || 60,
          priority: job.priority || 'medium',
          job_number: job.job_number,
          equipment_needed: job.equipment_needed,
          quoted_price: job.quoted_price
        }
      }
    } catch (e) {
      console.error('Error mapping calendar job:', e)
      return null as any
    }
  }).filter(Boolean) || []

  const eventStyleGetter = (event: CalendarEvent) => {
    const job = event.resource
    const backgroundColor = statusColors[job.status]
    const borderColor = priorityColors[job.priority]
    return {
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '2px 5px',
        fontSize: isMobile ? '10px' : '12px'
      }
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => setSelectedEvent(event.resource)

  const handleEventDrop = ({ event, start, end }: any) => {
    if (isMobile) return // Disable drag on mobile
    rescheduleMutation.mutate({ jobId: event.id, newStart: start, newEnd: end })
  }

  const handleEventResize = ({ event, start, end }: any) => {
    if (isMobile) return // Disable resize on mobile
    rescheduleMutation.mutate({ jobId: event.id, newStart: start, newEnd: end })
  }

  const handleCreateJob = (jobData: any) => createJobMutation.mutate(jobData)

  const handleEditJob = (job: Job) => {
    setEditingJob(job)
    setShowEditModal(true)
  }

  const handleUpdateJob = (jobData: any) => {
    if (!selectedEvent && !editingJob) return
    const jobToUpdate = editingJob || selectedEvent

    const startDateTime = `${jobData.scheduled_date}T${jobData.start_time}:00`
    const endDateTime = calculateEndTime(jobData.scheduled_date, jobData.start_time, jobData.estimated_duration)

    const updates = {
      title: `${jobData.service_type} - Service Call`,
      service_type: jobData.service_type,
      description: jobData.notes || jobData.special_instructions || '',
      address: {
        street: jobData.address,
        city: jobData.city,
        state: jobData.state,
        postal_code: jobData.zip_code,
      },
      time_tracking: {
        scheduled_start: startDateTime,
        scheduled_end: endDateTime,
        scheduled_duration: jobData.estimated_duration,
      },
      technician_id: jobData.technician_id || null,
      priority: jobData.priority,
      special_instructions: jobData.special_instructions,
      estimated_duration: jobData.estimated_duration,
    }

    updateJobMutation.mutate({ jobId: jobToUpdate.id, updates })
  }

  const handleAssignTechnician = (jobId: string) => {
    setAssigningJobId(jobId)
    setShowTechnicianAssign(true)
  }

  const handleTechnicianAssignment = (technicianId: string) => {
    if (assigningJobId) {
      assignTechnicianMutation.mutate({ jobId: assigningJobId, technicianId })
    }
  }

  const handleCancelJob = () => {
    if (!selectedEvent) return
    if (window.confirm('Mark this job as cancelled?')) {
      cancelJobMutation.mutate(selectedEvent.id)
    }
  }

  const jobToFormData = (job: Job) => ({
    customer_id: job.customer_id || job.id,
    service_type: job.service_type,
    scheduled_date: moment(job.start_time).format('YYYY-MM-DD'),
    start_time: moment(job.start_time).format('HH:mm'),
    estimated_duration: job.estimated_duration,
    technician_id: job.technician_id || '',
    priority: job.priority,
    address: job.address,
    city: job.city,
    state: job.state,
    zip_code: job.zip_code || '',
    notes: job.notes || '',
    special_instructions: job.special_instructions || '',
  })

  const ResponsiveToolbar = ({ label, onNavigate, onView }: any) => (
    <div className="p-4 bg-white rounded-lg shadow mb-4 sm:mb-6">
      {/* Mobile Layout */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <button onClick={() => onNavigate('PREV')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-gray-900 truncate">{label}</h2>
            <button onClick={() => onNavigate('NEXT')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Collapsible Controls */}
        {showMobileFilters && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex space-x-2">
              <button onClick={() => onNavigate('TODAY')} className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
                Today
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 inline mr-1" />
                Schedule
              </button>
            </div>

            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Technicians</option>
              {technicians?.map((tech: any) => (
                <option key={tech.id || tech._id} value={tech.id || tech._id}>
                  {tech.first_name && tech.last_name ? `${tech.first_name} ${tech.last_name}` : (tech.name || 'Technician')}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-3 bg-gray-100 rounded-lg p-1">
              {['month', 'week', 'day'].map((view) => (
                <button
                  key={view}
                  onClick={() => onView(view)}
                  className={`px-2 py-1 text-sm rounded-md transition-colors ${
                    currentView === view ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex sm:justify-between sm:items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => onNavigate('PREV')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
            <button onClick={() => onNavigate('NEXT')} className="p-2 rounded-md hover:bg-gray-100">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <button onClick={() => onNavigate('TODAY')} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
            Today
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Technicians</option>
            {technicians?.map((tech: any) => (
              <option key={tech.id || tech._id} value={tech.id || tech._id}>
                {tech.first_name && tech.last_name ? `${tech.first_name} ${tech.last_name}` : (tech.name || 'Technician')}
              </option>
            ))}
          </select>

          <div className="flex bg-gray-100 rounded-lg p-1">
            {['month', 'week', 'day'].map((view) => (
              <button
                key={view}
                onClick={() => onView(view)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  currentView === view ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center bg-blue-600 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Schedule Job
          </button>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error Loading Calendar</h3>
          <p className="text-red-600 text-sm mt-1">
            {(error as any).message || 'Failed to load calendar data'}
          </p>
          <button onClick={() => refetch()} className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Schedule and manage field service appointments
            {!isMobile && ' with drag-and-drop functionality'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Jobs loaded: {events.length} | Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button onClick={() => refetch()} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap">
          Refresh Calendar
        </button>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ 
            height: isMobile ? 500 : 600, 
            padding: isMobile ? '10px' : '20px' 
          }}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          selectable={!isMobile}
          resizable={!isMobile}
          onSelectEvent={handleSelectEvent}
          onEventDrop={!isMobile ? handleEventDrop : undefined}
          onEventResize={!isMobile ? handleEventResize : undefined}
          eventPropGetter={eventStyleGetter}
          components={{ toolbar: ResponsiveToolbar }}
          formats={{
            timeGutterFormat: isMobile ? 'h A' : 'h:mm A',
            eventTimeRangeFormat: ({ start, end }) =>
              isMobile 
                ? `${moment(start).format('h:mm')}-${moment(end).format('h:mm A')}`
                : `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
          }}
          step={30}
          timeslots={1}
          min={new Date(0, 0, 0, 7, 0, 0)}
          max={new Date(0, 0, 0, 19, 0, 0)}
          scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
          draggableAccessor={() => !isMobile}
          popup={isMobile}
          popupOffset={isMobile ? 30 : 0}
        />
      </div>

      {/* Job Creation Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Schedule New Job" size="xl">
          <JobForm
            onSubmit={handleCreateJob}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createJobMutation.isPending}
            mode="create"
          />
        </Modal>
      )}

      {/* Job Edit Modal */}
      {showEditModal && editingJob && (
        <Modal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingJob(null) }}
          title="Edit Job"
          size="xl"
        >
          <JobForm
            onSubmit={(data) => handleUpdateJob(data)}
            onCancel={() => { setShowEditModal(false); setEditingJob(null) }}
            isLoading={updateJobMutation.isPending}
            mode="edit"
            initialData={jobToFormData(editingJob)}
          />
        </Modal>
      )}

      {/* Technician Assignment Modal */}
      {showTechnicianAssign && (
        <Modal
          isOpen={showTechnicianAssign}
          onClose={() => { setShowTechnicianAssign(false); setAssigningJobId(null) }}
          title="Assign Technician"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician</label>
              <select
                onChange={(e) => { if (e.target.value) handleTechnicianAssignment(e.target.value) }}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                defaultValue=""
              >
                <option value="">Choose a technician...</option>
                {technicians?.map((tech: any) => (
                  <option key={tech.id || tech._id} value={tech.id || tech._id}>
                    {tech.first_name && tech.last_name ? `${tech.first_name} ${tech.last_name}` : (tech.name || 'Technician')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => { setShowTechnicianAssign(false); setAssigningJobId(null) }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Job Details Modal */}
      {selectedEvent && !showEditModal && !showTechnicianAssign && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Job #${selectedEvent.job_number || selectedEvent.id.slice(-6)}`}
          size="lg"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Job Actions - Mobile: Bottom, Desktop: Top */}
            <div className="order-last sm:order-first flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 sm:pt-6 border-t sm:border-t border-gray-200 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => handleEditJob(selectedEvent)}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Job
                </button>
                <button
                  onClick={() => handleAssignTechnician(selectedEvent.id)}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Assign Technician
                </button>
                <button
                  onClick={handleCancelJob}
                  className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: statusColors[selectedEvent.status], color: 'white' }}>
                  {selectedEvent.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full sm:w-auto bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Job Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-sm break-words">{selectedEvent.customer_name}</span>
                  </div>
                  {selectedEvent.customer_phone && (
                    <div className="flex items-center">
                      <span className="text-sm ml-6">📞 {selectedEvent.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm break-words">
                      {selectedEvent.address}
                      {selectedEvent.city && `, ${selectedEvent.city}`}
                      {selectedEvent.state && `, ${selectedEvent.state}`}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Job Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {moment(selectedEvent.start_time).format('MMM DD, YYYY')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {moment(selectedEvent.start_time).format('h:mm A')} - {moment(selectedEvent.end_time).format('h:mm A')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
                    <span className="text-sm text-gray-500">Service:</span>
                    <span className="sm:ml-2 text-sm break-words">{selectedEvent.service_type}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
                    <span className="text-sm text-gray-500">Priority:</span>
                    <span className="sm:ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: priorityColors[selectedEvent.priority], color: 'white' }}>
                      {selectedEvent.priority}
                    </span>
                  </div>
                  {selectedEvent.technician_name && (
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0">
                      <span className="text-sm text-gray-500">Technician:</span>
                      <span className="sm:ml-2 text-sm break-words">{selectedEvent.technician_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes and Instructions */}
            {selectedEvent.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md break-words">{selectedEvent.notes}</p>
              </div>
            )}

            {selectedEvent.special_instructions && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Special Instructions</h4>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200 break-words">{selectedEvent.special_instructions}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}