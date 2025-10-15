// frontend/src/components/forms/LeadForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  TagIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number is required'),
  secondary_phone: z.string().optional(),
  // Address
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  // Lead details
  source: z.enum(['website', 'referral', 'google_ads', 'facebook', 'phone_call', 'sms', 'door_to_door', 'other']),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  priority: z.number().min(1).max(5),
  estimated_value: z.number().min(0).optional(),
  // Service interest
  service_interest: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']),
  // Notes and tags
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Contact preferences
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'any']),
  best_time_to_contact: z.string().optional(),
  // Referral information
  referral_source: z.string().optional(),
  how_did_you_hear: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<LeadFormData>
}

const leadSources = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'sms', label: 'SMS/Text' },
  { value: 'door_to_door', label: 'Door to Door' },
  { value: 'other', label: 'Other' },
]

const serviceTypes = [
  'Pest Control',
  'Lawn Care',
  'Tree Service',
  'Roof Services',
  'Gutter Services',
  'HVAC',
  'Plumbing',
  'Electrical',
  'General Maintenance',
  'Pressure Washing',
  'Window Cleaning',
]

const commonTags = [
  'Hot Lead',
  'Price Sensitive',
  'Emergency Service',
  'Seasonal Customer',
  'Commercial Prospect',
  'High Value',
  'Quick Decision Maker',
  'Needs Follow-up',
  'Competitor Customer',
  'Referral Lead',
  'Repeat Inquiry',
  'Service Area Edge',
]

const bestTimeOptions = [
  'Morning (8AM-12PM)',
  'Afternoon (12PM-5PM)',
  'Evening (5PM-8PM)',
  'Weekends Only',
  'Anytime',
]

export default function LeadForm({ onSubmit, onCancel, isLoading, initialData }: LeadFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      source: 'website',
      status: 'new',
      priority: 3,
      urgency: 'medium',
      preferred_contact_method: 'any',
      tags: [],
      ...initialData,
    },
  })

  const watchedPriority = watch('priority')

  const handleTagChange = (tag: string, checked: boolean) => {
    let newTags
    if (checked) {
      newTags = [...selectedTags, tag]
    } else {
      newTags = selectedTags.filter(t => t !== tag)
    }
    setSelectedTags(newTags)
    setValue('tags', newTags)
  }

  const renderStars = (priority: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-5 w-5 cursor-pointer ${
          i < priority ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
        onClick={() => setValue('priority', i + 1)}
      />
    ))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-4 w-4 mr-2" />
          Contact Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              {...register('first_name')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="John"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              {...register('last_name')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Doe"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register('phone')}
                type="tel"
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register('email')}
                type="email"
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="john@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Secondary Phone
            </label>
            <input
              {...register('secondary_phone')}
              type="tel"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="(555) 987-6543"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Preferred Contact Method
            </label>
            <select
              {...register('preferred_contact_method')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="any">Any</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="text">Text/SMS</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Best Time to Contact
          </label>
          <select
            {...register('best_time_to_contact')}
            className="mt-1 block w-full md:w-1/2 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="">Select preferred time...</option>
            {bestTimeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
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
              Street Address
            </label>
            <input
              {...register('address')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                {...register('city')}
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Anytown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                {...register('state')}
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                {...register('zip_code')}
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Lead Details</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Lead Source *
            </label>
            <select
              {...register('source')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              {leadSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              {...register('status')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Service Interest
            </label>
            <select
              {...register('service_interest')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Select service...</option>
              {serviceTypes.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Urgency
            </label>
            <select
              {...register('urgency')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority (1 = Highest, 5 = Lowest)
            </label>
            <div className="mt-1 flex items-center space-x-1">
              {renderStars(watchedPriority)}
              <span className="ml-2 text-sm text-gray-500">({watchedPriority}/5)</span>
            </div>
            <input type="hidden" {...register('priority', { valueAsNumber: true })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated Value
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                {...register('estimated_value', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Additional Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Referral Source (if applicable)
            </label>
            <input
              {...register('referral_source')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="John Smith, Google, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              How did you hear about us?
            </label>
            <input
              {...register('how_did_you_hear')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Google search, neighbor referral, etc."
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <TagIcon className="h-4 w-4 mr-2" />
          Tags
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {commonTags.map((tag) => (
            <label key={tag} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={(e) => handleTagChange(tag, e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={4}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder="Additional information about this lead, customer requirements, conversation summary, etc."
        />
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
          {isLoading ? 'Creating Lead...' : 'Create Lead'}
        </button>
      </div>
    </form>
  )
}