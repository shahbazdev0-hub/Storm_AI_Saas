// frontend/src/components/forms/EstimateForm.tsx
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { 
  DocumentTextIcon, 
  PlusIcon, 
  TrashIcon, 
  CalculatorIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

const estimateItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be 0 or greater'),
  total: z.number().min(0, 'Total must be 0 or greater'),
})

const estimateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  // Service details
  service_type: z.string().min(1, 'Service type is required'),
  service_date: z.string().optional(),
  // Address
  service_address: z.string().min(1, 'Service address is required'),
  service_city: z.string().min(1, 'City is required'),
  service_state: z.string().min(1, 'State is required'),
  service_zip: z.string().min(1, 'ZIP code is required'),
  // Line items
  items: z.array(estimateItemSchema).min(1, 'At least one item is required'),
  // Pricing
  subtotal: z.number().min(0, 'Subtotal must be 0 or greater'),
  tax_rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  tax_amount: z.number().min(0, 'Tax amount must be 0 or greater'),
  discount_amount: z.number().min(0, 'Discount must be 0 or greater'),
  total_amount: z.number().min(0, 'Total must be 0 or greater'),
  // Terms
  valid_until: z.string().min(1, 'Valid until date is required'),
  terms_and_conditions: z.string().optional(),
  notes: z.string().optional(),
  // Status
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']).optional(),
})

type EstimateFormData = z.infer<typeof estimateSchema>

interface EstimateFormProps {
  onSubmit: (data: EstimateFormData) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<EstimateFormData>
  mode?: 'create' | 'edit'
}

const serviceTypes = [
  'Pest Control - General Treatment',
  'Pest Control - Termite Treatment',
  'Pest Control - Quarterly Service',
  'Lawn Care - Basic Package',
  'Lawn Care - Premium Package',
  'Lawn Care - One-time Service',
  'Tree Service - Trimming',
  'Tree Service - Removal',
  'Tree Service - Stump Grinding',
  'Roof Inspection',
  'Roof Repair',
  'Roof Replacement',
  'Gutter Cleaning',
  'Gutter Installation',
  'HVAC Maintenance',
  'HVAC Repair',
  'HVAC Installation',
  'Plumbing - General Repair',
  'Plumbing - Installation',
  'Electrical - General',
  'Electrical - Installation',
  'Pressure Washing',
  'Window Cleaning',
  'General Maintenance',
]

const commonItems = [
  { description: 'Initial Service Call', unit_price: 150 },
  { description: 'General Pest Control Treatment', unit_price: 200 },
  { description: 'Termite Treatment', unit_price: 500 },
  { description: 'Lawn Fertilization', unit_price: 80 },
  { description: 'Weed Control Treatment', unit_price: 60 },
  { description: 'Tree Trimming (per hour)', unit_price: 75 },
  { description: 'Roof Inspection', unit_price: 200 },
  { description: 'Gutter Cleaning', unit_price: 150 },
  { description: 'Pressure Washing (per sq ft)', unit_price: 0.25 },
  { description: 'Labor (per hour)', unit_price: 65 },
  { description: 'Materials', unit_price: 0 },
  { description: 'Travel Time', unit_price: 50 },
]

export default function EstimateForm({ onSubmit, onCancel, isLoading, initialData, mode = 'create' }: EstimateFormProps) {
  const [selectedCommonItem, setSelectedCommonItem] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control
  } = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      tax_rate: 8.5,
      discount_amount: 0,
      status: 'draft',
      items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      ...initialData,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedItems = watch('items')
  const watchedTaxRate = watch('tax_rate')
  const watchedDiscount = watch('discount_amount')
  const watchedCustomerId = watch('customer_id')

  // Fetch customers
// Fetch customers (no ?type filter; normalize to array)
// Fetch customers from users collection with role=customer
const { data: customers = [] } = useQuery({
  queryKey: ['customers'],
  queryFn: async () => {
    const res = await api.get('/users/?role=customer')
    return res?.data || []
  },
  staleTime: 300_000,
})


  // Fetch customer details when customer is selected
 // Fetch customer details when customer is selected
const { data: customerDetails } = useQuery({
  queryKey: ['customer-details', watchedCustomerId],
  queryFn: async () => {
    const response = await api.get(`/users/${watchedCustomerId}`)
    return response.data
  },
  enabled: !!watchedCustomerId,
})
  // Auto-fill address when customer is selected
  useEffect(() => {
    if (customerDetails && mode === 'create') {
      setValue('service_address', customerDetails.address || '')
      setValue('service_city', customerDetails.city || '')
      setValue('service_state', customerDetails.state || '')
      setValue('service_zip', customerDetails.zip_code || '')
    }
  }, [customerDetails, setValue, mode])

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = watchedItems?.reduce((sum, item, index) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0)
      setValue(`items.${index}.total`, itemTotal)
      return sum + itemTotal
    }, 0) || 0

    const taxAmount = (subtotal * (watchedTaxRate || 0)) / 100
    const discountAmount = watchedDiscount || 0
    const total = subtotal + taxAmount - discountAmount

    setValue('subtotal', subtotal)
    setValue('tax_amount', taxAmount)
    setValue('total_amount', Math.max(0, total))
  }, [watchedItems, watchedTaxRate, watchedDiscount, setValue])

  const addCommonItem = () => {
    const commonItem = commonItems.find(item => item.description === selectedCommonItem)
    if (commonItem) {
      append({
        description: commonItem.description,
        quantity: 1,
        unit_price: commonItem.unit_price,
        total: commonItem.unit_price
      })
      setSelectedCommonItem('')
    }
  }

  const addEmptyItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Estimate Information
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
              <option value="">Select customer...</option>
              {customers?.map((customer: any) => (
  <option key={customer.id} value={customer.id}>
    {customer.name || `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || customer.email || customer.id}
  </option>
))}
            </select>
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimate Title *
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="Pest Control Service Estimate"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Proposed Service Date
            </label>
            <input
              {...register('service_date')}
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Brief description of the work to be performed..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Service Address */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="h-4 w-4 mr-2" />
          Service Address
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Street Address *
            </label>
            <input
              {...register('service_address')}
              type="text"
              placeholder="123 Main Street"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            {errors.service_address && (
              <p className="mt-1 text-sm text-red-600">{errors.service_address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <input
                {...register('service_city')}
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              {errors.service_city && (
                <p className="mt-1 text-sm text-red-600">{errors.service_city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                State *
              </label>
              <input
                {...register('service_state')}
                type="text"
                placeholder="CA"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              {errors.service_state && (
                <p className="mt-1 text-sm text-red-600">{errors.service_state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ZIP Code *
              </label>
              <input
                {...register('service_zip')}
                type="text"
                placeholder="12345"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              {errors.service_zip && (
                <p className="mt-1 text-sm text-red-600">{errors.service_zip.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Line Items
          </h4>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCommonItem}
              onChange={(e) => setSelectedCommonItem(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Add common item...</option>
              {commonItems.map((item) => (
                <option key={item.description} value={item.description}>
                  {item.description} - ${item.unit_price}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCommonItem}
              disabled={!selectedCommonItem}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <input
                  {...register(`items.${index}.description`)}
                  type="text"
                  placeholder="Description"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.items?.[index]?.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <input
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.items?.[index]?.quantity && (
                  <p className="mt-1 text-xs text-red-600">{errors.items[index]?.quantity?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                  <input
                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-6 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                {errors.items?.[index]?.unit_price && (
                  <p className="mt-1 text-xs text-red-600">{errors.items[index]?.unit_price?.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <div className="flex items-center h-9 px-3 bg-gray-100 border border-gray-300 rounded-md">
                  <span className="text-sm text-gray-900">
                    ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="col-span-1 flex justify-center">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {errors.items?.root && (
            <p className="text-sm text-red-600">{errors.items.root.message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={addEmptyItem}
          className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Line Item
        </button>
      </div>

      {/* Pricing Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <CurrencyDollarIcon className="h-4 w-4 mr-2" />
          Pricing Summary
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax Rate (%)
            </label>
            <input
              {...register('tax_rate', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="8.5"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Discount Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                {...register('discount_amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Valid Until *
            </label>
            <input
              {...register('valid_until')}
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
            {errors.valid_until && (
              <p className="mt-1 text-sm text-red-600">{errors.valid_until.message}</p>
            )}
          </div>
        </div>

        {/* Totals Display */}
        <div className="mt-6 bg-white p-4 rounded-md border">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${watch('subtotal')?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({watch('tax_rate') || 0}%):</span>
              <span>${watch('tax_amount')?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span>-${watch('discount_amount')?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${watch('total_amount')?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Notes */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Terms and Conditions
          </label>
          <textarea
            {...register('terms_and_conditions')}
            rows={4}
            placeholder="Payment terms, warranty information, etc..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Additional notes for this estimate..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Status (for edit mode) */}
      {mode === 'edit' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Status</h4>
          <select
            {...register('status')}
            className="block w-full md:w-1/3 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="text-black  py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex bg-black justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading 
            ? (mode === 'create' ? 'Creating Estimate...' : 'Updating Estimate...')
            : (mode === 'create' ? 'Create Estimate' : 'Update Estimate')
          }
        </button>
        
        {mode === 'edit' && (
          <button
            type="button"
            className="inline-flex bg-black justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Send to Customer
          </button>
        )}
      </div>
    </form>
  )
}