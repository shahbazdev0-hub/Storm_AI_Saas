// frontend/src/components/forms/JobForm.tsx - COMPLETE VERSION
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  WrenchScrewdriverIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

const jobSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  service_type: z.string().min(1, 'Service type is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  estimated_duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  technician_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  special_instructions: z.string().optional(),
  // Address fields
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'ZIP code is required'),
  // Pricing
  estimated_cost: z.number().optional(),
  actual_cost: z.number().optional(),
  // Equipment and materials
  equipment_needed: z.string().optional(),
  materials_needed: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

interface JobFormProps {
  onSubmit: (data: JobFormData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<JobFormData>
  mode?: 'create' | 'edit'
}

const serviceTypes = [
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'lawn_care', label: 'Lawn Care' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'remodeling', label: 'Remodeling' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'pool_service', label: 'Pool Service' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'painting', label: 'Painting' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
]

export default function JobForm({ onSubmit, onCancel, isLoading, initialData, mode = 'create' }: JobFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      priority: 'medium',
      estimated_duration: 60,
      status: 'scheduled',
      ...initialData,
    },
  })

  const watchedCustomerId = watch('customer_id')

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

  // Fetch customer details when customer is selected
  const { data: customerDetails } = useQuery({
    queryKey: ['customer-details', watchedCustomerId],
    queryFn: async () => {
      const response = await api.get(`/contacts/${watchedCustomerId}`)
      return response.data
    },
    enabled: !!watchedCustomerId,
  })

  // Auto-fill address when customer is selected
  useEffect(() => {
    if (customerDetails && mode === 'create') {
      setValue('address', customerDetails.address || '')
      setValue('city', customerDetails.city || '')
      setValue('state', customerDetails.state || '')
      setValue('zip_code', customerDetails.zip_code || '')
    }
  }, [customerDetails, setValue, mode])

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer and Service Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-4 w-4 mr-2" />
          Customer & Service Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer *
            </label>
            <select
              {...register('customer_id')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Select a customer...</option>
              {customers?.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name} - {customer.phone}
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
  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
>
  <option value="">Select service type...</option>
  {serviceTypes.map((service) => (
    <option key={service.value} value={service.value}>
      {service.label}
    </option>
  ))}
</select>
            {errors.service_type && (
              <p className="mt-1 text-sm text-red-600">{errors.service_type.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Scheduling Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Scheduling Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              {...register('scheduled_date')}
              type="date"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Select time...</option>
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
            <select
              {...register('estimated_duration', { valueAsNumber: true })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
            </select>
            {errors.estimated_duration && (
              <p className="mt-1 text-sm text-red-600">{errors.estimated_duration.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Assignment and Priority */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
          Assignment & Priority
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Technician
            </label>
            <select
              {...register('technician_id')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Unassigned</option>
              {technicians?.map((tech: any) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
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
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="h-4 w-4 mr-2" />
          Service Address
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="123 Main Street"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <input
                {...register('city')}
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                placeholder="TX"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                placeholder="75001"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              {errors.zip_code && (
                <p className="mt-1 text-sm text-red-600">{errors.zip_code.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment and Materials */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Equipment & Materials</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Needed
            </label>
            <textarea
              {...register('equipment_needed')}
              rows={3}
              placeholder="List equipment needed for this job..."
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Materials Needed
            </label>
            <textarea
              {...register('materials_needed')}
              rows={3}
              placeholder="List materials needed for this job..."
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="h-4 w-4 mr-2" />
          Pricing Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated Cost
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                {...register('estimated_cost', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Actual Cost
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  {...register('actual_cost', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes and Instructions */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Job Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="General notes about this job..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Special Instructions
          </label>
          <textarea
            {...register('special_instructions')}
            rows={3}
            placeholder="Gate codes, pet warnings, access instructions, customer preferences..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white  py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex bg-black justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading 
            ? (mode === 'create' ? 'Creating Job...' : 'Updating Job...')
            : (mode === 'create' ? 'Create Job' : 'Update Job')
          }
        </button>
      </div>
    </form>
  )
}

