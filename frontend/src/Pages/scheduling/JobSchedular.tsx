// frontend/src/pages/scheduling/JobScheduler.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'

const jobSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  service_type: z.string().min(1, 'Service type is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  estimated_duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  technician_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  notes: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'ZIP code is required'),
})

type JobFormData = z.infer<typeof jobSchema>

interface TimeSlot {
  time: string
  available: boolean
  technician_id?: string
  technician_name?: string
}

interface AvailabilityData {
  date: string
  technician_id: string
  slots: TimeSlot[]
}

export default function JobScheduler() {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([])

  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      priority: 'medium',
      estimated_duration: 60
    }
  })

  const watchedDate = watch('scheduled_date')
  const watchedTechnician = watch('technician_id')

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/contacts/?type=customer')  
      return response.data
    },
  })

  // Fetch technicians
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await api.get('/users/?role=technician')  
      return response.data
    },
  })

  // Fetch availability
  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', watchedDate, watchedTechnician],
    queryFn: async () => {
      if (!watchedDate) return null
      
      const params = new URLSearchParams({
        date: watchedDate,
      })
      
      if (watchedTechnician) {
        params.append('technician_id', watchedTechnician)
      }
      
      const response = await api.get(`/scheduling/availability?${params.toString()}`)
      return response.data
    },
    enabled: !!watchedDate,
  })

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: JobFormData) => {
      const response = await api.post('/jobs', {
        ...jobData,
        start_time: `${jobData.scheduled_date}T${jobData.start_time}:00`,
        end_time: new Date(
          new Date(`${jobData.scheduled_date}T${jobData.start_time}:00`).getTime() +
          jobData.estimated_duration * 60000
        ).toISOString()
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      toast.success('Job scheduled successfully!')
      reset()
      setConflictWarnings([])
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        setConflictWarnings(error.response.data.conflicts || ['Scheduling conflict detected'])
      } else {
        toast.error(error.response?.data?.detail || 'Failed to schedule job')
      }
    },
  })

  const onSubmit = (data: JobFormData) => {
    createJobMutation.mutate(data)
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const isSlotAvailable = (time: string) => {
    if (!availability) return true
    
    if (watchedTechnician) {
      const techAvailability = availability.find((a: AvailabilityData) => a.technician_id === watchedTechnician)
      const slot = techAvailability?.slots.find((s: TimeSlot) => s.time === time)
      return slot?.available ?? true
    }
    
    // Check if any technician is available
    return availability.some((a: AvailabilityData) =>
      a.slots.some((s: TimeSlot) => s.time === time && s.available)
    )
  }

  const getAvailableTechnicians = (time: string) => {
    if (!availability) return []
    
    return availability
      .map((a: AvailabilityData) => {
        const slot = a.slots.find((s: TimeSlot) => s.time === time)
        return slot?.available ? { id: a.technician_id, name: slot.technician_name } : null
      })
      .filter(Boolean)
  }

  const serviceTypes = [
    'Pest Control',
    'Lawn Care',
    'Tree Service',
    'Roof Inspection',
    'Roof Repair',
    'Gutter Cleaning',
    'HVAC Service',
    'Plumbing',
    'Electrical',
    'General Maintenance'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Scheduler</h1>
        <p className="mt-1 text-sm text-gray-500">
          Schedule new service appointments with real-time availability checking
        </p>
      </div>

      {/* Conflict Warnings */}
      {conflictWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Scheduling Conflicts Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {conflictWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Schedule New Job</h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer *
                  </label>
                  <select
                    {...register('customer_id')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select customer...</option>
                    {customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </option>
                    ))}
                  </select>
                  {errors.customer_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Service Type *
                  </label>
                  <select
                    {...register('service_type')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select service...</option>
                    {serviceTypes.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  {errors.service_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.service_type.message}</p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    {...register('scheduled_date')}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.scheduled_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.scheduled_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time *
                  </label>
                  <select
                    {...register('start_time')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select time...</option>
                    {generateTimeSlots().map((time) => (
                      <option
                        key={time}
                        value={time}
                        disabled={!isSlotAvailable(time)}
                        className={!isSlotAvailable(time) ? 'text-gray-400' : ''}
                      >
                        {time} {!isSlotAvailable(time) ? '(Unavailable)' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.start_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Duration (minutes) *
                  </label>
                  <select
                    {...register('estimated_duration', { valueAsNumber: true })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                  {errors.estimated_duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.estimated_duration.message}</p>
                  )}
                </div>
              </div>

              {/* Technician and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Technician
                  </label>
                  <select
                    {...register('technician_id')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Auto-assign best available</option>
                    {technicians?.map((tech: any) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority *
                  </label>
                  <select
                    {...register('priority')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Address *
                </label>
                <input
                  {...register('address')}
                  type="text"
                  placeholder="Street address"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    {...register('city')}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <input
                    {...register('state')}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ZIP Code *
                  </label>
                  <input
                    {...register('zip_code')}
                    type="text"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.zip_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.zip_code.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Job Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Special instructions, access codes, customer preferences..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {createJobMutation.isPending ? 'Scheduling...' : 'Schedule Job'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Availability Panel */}
        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Availability</h3>
            
            {!watchedDate ? (
              <p className="text-sm text-gray-500">Select a date to view availability</p>
            ) : loadingAvailability ? (
              <div className="animate-pulse space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  {new Date(watchedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                
                {generateTimeSlots().map((time) => {
                  const available = isSlotAvailable(time)
                  const availableTechs = getAvailableTechnicians(time)
                  
                  return (
                    <div
                      key={time}
                      className={`p-2 rounded-md border text-sm ${
                        available
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{time}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          available ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {available ? 'Available' : 'Busy'}
                        </span>
                      </div>
                      
                      {available && availableTechs.length > 0 && (
                        <div className="mt-1 text-xs">
                          <div className="font-medium">Available technicians:</div>
                          <div className="space-y-1">
                            {availableTechs.map((tech: any) => (
                              <div key={tech.id} className="flex items-center">
                                <UserIcon className="h-3 w-3 mr-1" />
                                {tech.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Jobs</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-medium text-yellow-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-green-600">7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="text-sm font-medium text-red-600">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}