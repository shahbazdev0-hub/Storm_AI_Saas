// frontend/src/pages/scheduling/JobScheduler.tsx
import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const navigate = useNavigate()
  const jobToEdit = location.state?.job

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


// ✅ ADD THIS: Load job data if editing
useEffect(() => {
  if (jobToEdit) {
    console.log('📝 Editing job:', jobToEdit)
    setValue('customer_id', jobToEdit.customer_id || '')
    setValue('service_type', jobToEdit.service_type || '')
    setValue('scheduled_date', jobToEdit.scheduled_date || '')
    setValue('start_time', jobToEdit.start_time || '')
    setValue('estimated_duration', jobToEdit.estimated_duration || 60)
    setValue('technician_id', jobToEdit.technician_id || '')
    setValue('priority', jobToEdit.priority || 'medium')
    setValue('notes', jobToEdit.notes || '')
    setValue('address', jobToEdit.address || '')
    setValue('city', jobToEdit.city || '')
    setValue('state', jobToEdit.state || '')
    setValue('zip_code', jobToEdit.zip_code || '')
  }
}, [jobToEdit, setValue])

  const watchedDate = watch('scheduled_date')
  const watchedTechnician = watch('technician_id')

  // Fetch customers (from users with role=customer)
  const { data: allCustomers, isLoading: loadingCustomers, error: customersError } = useQuery({
    queryKey: ['customers-for-jobs'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching customers from: /users?role=customer')
        const response = await api.get('/users?role=customer')
        console.log('✅ Customers API response:', response.data)
        console.log('✅ Total returned:', response.data?.length || 0)
        
        return response.data || []
      } catch (error) {
        console.error('❌ Error fetching customers:', error)
        toast.error('Failed to load customers')
        return []
      }
    },
  })

  // ✅ BACKUP: Filter customers on frontend in case backend doesn't filter
  const customers = useMemo(() => {
    if (!allCustomers) return []
    
    const filtered = allCustomers.filter((user: any) => user.role === 'customer')
    
    console.log(`📊 Customers filtering: ${allCustomers.length} total → ${filtered.length} customers`)
    
    if (filtered.length > 0) {
      console.log('✅ Customers available:')
      filtered.forEach((customer: any, index: number) => {
        console.log(`  ${index + 1}. ${customer.name || customer.email} (ID: ${customer.id})`)
      })
    } else {
      console.warn('⚠️ No customers found after filtering!')
    }
    
    return filtered
  }, [allCustomers])

  // ✅ Fetch only technicians
  const { data: allUsers, isLoading: loadingTechnicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        // Try to fetch with role filter
        const url = '/users?role=technician'
        console.log('🔍 Fetching:', url)
        
        const response = await api.get(url)
        
        console.log('✅ API Response:', response.data)
        console.log('✅ Total returned:', response.data?.length || 0)
        
        return response.data || []
      } catch (error) {
        console.error('❌ Error fetching technicians:', error)
        toast.error('Failed to load technicians')
        return []
      }
    },
  })

  // ✅ BACKUP: Filter technicians on frontend in case backend doesn't filter
  const technicians = useMemo(() => {
    if (!allUsers) return []
    
    console.log('🔍 Filtering users:')
    allUsers.forEach((user: any, index: number) => {
      console.log(`  User ${index + 1}: ${user.name} - Role: "${user.role}" - Is Technician: ${user.role === 'technician'}`)
    })
    
    const filtered = allUsers.filter((user: any) => {
      const isTechnician = user.role === 'technician'
      return isTechnician
    })
    
    console.log(`📊 Result: ${allUsers.length} total users → ${filtered.length} technicians`)
    
    if (allUsers.length !== filtered.length) {
      console.warn('⚠️ Backend not filtering! Using frontend filter.')
    }
    
    return filtered
  }, [allUsers])

  // Fetch availability
  const { data: availability, isLoading: loadingAvailability, error: availabilityError } = useQuery({
    queryKey: ['availability', watchedDate, watchedTechnician],
    queryFn: async () => {
      if (!watchedDate) return null
      
      const params = new URLSearchParams({
        date: watchedDate,
      })
      
      if (watchedTechnician) {
        params.append('technician_id', watchedTechnician)
      }
      
      console.log('🔍 Fetching availability:', `/scheduling/availability?${params.toString()}`)
      
      try {
        const response = await api.get(`/scheduling/availability?${params.toString()}`)
        console.log('✅ Availability response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('❌ Availability error:', error)
        console.error('❌ Error response:', error.response?.data)
        
        // Don't throw error, just return null to show "no data" state
        if (error.response?.status === 422) {
          console.warn('⚠️ Availability endpoint validation error - using fallback')
          toast.error('Could not load availability - please check date format')
        }
        return null
      }
    },
    enabled: !!watchedDate,
    retry: false, // Don't retry on 422 errors
  })

  // Create job mutation
  const createJobMutation = useMutation({
  mutationFn: async (jobData: JobFormData) => {
    console.log(jobToEdit ? '📝 Updating job' : '📝 Creating job', jobData)
    
    const payload = {
      ...jobData,
      start_time: `${jobData.scheduled_date}T${jobData.start_time}:00`,
      end_time: new Date(
        new Date(`${jobData.scheduled_date}T${jobData.start_time}:00`).getTime() +
        jobData.estimated_duration * 60000
      ).toISOString()
    }
    
    // ✅ If editing, use PATCH; if creating, use POST
    if (jobToEdit) {
      const response = await api.patch(`/jobs/${jobToEdit.id}`, payload)
      return response.data
    } else {
      const response = await api.post('/jobs', payload)
      return response.data
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['field-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['availability'] })
    toast.success(jobToEdit ? 'Job updated successfully!' : 'Job scheduled successfully!')
    navigate('/jobs') // ✅ Navigate back to jobs list
  },
  onError: (error: any) => {
    console.error('❌ Error:', error)
    toast.error(error.response?.data?.detail || `Failed to ${jobToEdit ? 'update' : 'schedule'} job`)
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
  if (!availability || !availability.slots) return true
  
  const slot = availability.slots.find((s: TimeSlot) => s.time === time)
  return slot?.available ?? true
}

const getAvailableTechnicians = (time: string) => {
  if (!availability || !availability.slots) return []
  
  const slot = availability.slots.find((s: TimeSlot) => s.time === time)
  
  // If slot is available and has technician info, return it
  if (slot?.available && slot.technician_id && slot.technician_name) {
    return [{ id: slot.technician_id, name: slot.technician_name }]
  }
  
  return []
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
  <h1 className="text-2xl font-bold text-gray-900">
    {jobToEdit ? 'Edit Job' : 'Job Scheduler'}
  </h1>
  <p className="mt-1 text-sm text-gray-500">
    {jobToEdit 
      ? `Editing Job #${jobToEdit.job_number}` 
      : 'Schedule new service appointments with real-time availability checking'
    }
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
            <h2 className="text-lg font-medium text-gray-900 mb-6">Schedule New Job</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer & Service Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer *
                  </label>
                  <select
                    {...register('customer_id')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    disabled={loadingCustomers}
                  >
                    <option value="">
                      {loadingCustomers ? 'Loading customers...' : 'Select a customer'}
                    </option>
                    {customers && customers.length > 0 ? (
                      customers.map((customer: any) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name || customer.email || 'Unnamed Customer'}
                        </option>
                      ))
                    ) : (
                      !loadingCustomers && (
                        <option value="" disabled>No customers found</option>
                      )
                    )}
                  </select>
                  {errors.customer_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
                  )}
                  {!loadingCustomers && customers && customers.length === 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      ⚠️ No customers found. Please create customer users first in the Users page.
                    </p>
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
                    <option value="">Select service type</option>
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.service_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.service_type.message}</p>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
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
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    Start Time *
                  </label>
                  <select
                    {...register('start_time')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select time</option>
                    {generateTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
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
                  <input
                    {...register('estimated_duration', { valueAsNumber: true })}
                    type="number"
                    min="15"
                    step="15"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.estimated_duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.estimated_duration.message}</p>
                  )}
                </div>
              </div>

              {/* Technician & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Assign Technician
                  </label>
                  <select
                    {...register('technician_id')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    disabled={loadingTechnicians}
                  >
                    <option value="">
                      {loadingTechnicians ? 'Loading technicians...' : 'Auto-assign best available'}
                    </option>
                    {technicians && technicians.length > 0 ? (
                      technicians.map((tech: any) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name || `${tech.first_name} ${tech.last_name}` || tech.email}
                        </option>
                      ))
                    ) : (
                      !loadingTechnicians && (
                        <option value="" disabled>No technicians available</option>
                      )
                    )}
                  </select>
                  {!loadingTechnicians && technicians && technicians.length === 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      ⚠️ No technicians found. Please create technician users first.
                    </p>
                  )}
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
                  <MapPinIcon className="h-4 w-4 inline mr-1" />
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
  {createJobMutation.isPending 
    ? (jobToEdit ? 'Updating...' : 'Scheduling...') 
    : (jobToEdit ? 'Update Job' : 'Schedule Job')
  }
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
            ) : availabilityError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ Could not load availability data. The availability feature may not be configured yet.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  You can still schedule jobs - they will be assigned based on technician selection.
                </p>
              </div>
            ) : !availability || (Array.isArray(availability) && availability.length === 0) ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ No availability data for this date.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  All time slots are available for scheduling.
                </p>
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