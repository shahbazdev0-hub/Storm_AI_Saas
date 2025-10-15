// frontend/src/pages/estimates/EstimateBuilder.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import EstimateForm from '../../components/forms/EstimateForm'

type Customer = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  full_name?: string
}

export default function EstimateBuilder() {
  const [showPreview, setShowPreview] = useState(true)
  const qc = useQueryClient()
  const navigate = useNavigate()

  // Load customers from users collection (role="customer")
// frontend/src/pages/estimates/EstimateBuilder.tsx
// Change the customers query to use your existing users endpoint with role filter:

const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
  queryKey: ['customers'],
  queryFn: async () => {
    // Use your existing users endpoint with role=customer filter
    const res = await api.get('/users/?role=customer')
    const users = res?.data || []
    
    // Transform the user data to match what the estimate form expects
    return users.map((user: any) => ({
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      full_name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }))
  },
  staleTime: 300_000,
})

  // Create estimate mutation
  const createEstimate = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/estimates/', payload)
      return res.data
    },
    onSuccess: (data: any) => {
      // Try to print something friendly from backend
      const label = data?.estimate_number || data?.id || 'Estimate'
      toast.success(`${label} created and sent successfully!`)
      // refresh lists / details that depend on estimates
      qc.invalidateQueries({ queryKey: ['estimates'] })
      // navigate to list
      navigate('/estimates')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Failed to create estimate'
      toast.error(msg)
      // keep console for dev
      console.error('Create estimate error:', err)
    },
  })

  // Map form values -> backend payload
  const handleCreate = (values: any) => {
    const line_items = (values.items || []).map((it: any) => ({
      description: it.description,
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.unit_price || 0),
    }))

    // Compute valid_days from valid_until (if provided)
    let valid_days = 30
    if (values.valid_until) {
      const today = new Date()
      const until = new Date(values.valid_until)
      const ms = until.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      valid_days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    }

    const payload = {
      customer_id: values.customer_id, // now using customer_id instead of contact_id
      service_type: values.service_type || 'Service',
      description: values.description || '',
      line_items,
      tax_rate: Number(values.tax_rate || 0),
      discount_amount: Number(values.discount_amount || 0),
      terms_and_conditions: values.terms_and_conditions || '',
      notes: values.notes || '',
      valid_days,
    }

    createEstimate.mutate(payload)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Estimate</h1>
          <p className="mt-1 text-sm text-gray-500">
            Build professional estimates that will be automatically sent to customers via email
          </p>
        </div>
        <button
          onClick={() => setShowPreview(v => !v)}
          className="inline-flex items-center px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
        >
          {showPreview ? (
            <>
              <EyeSlashIcon className="h-4 w-4 mr-2" /> Hide Preview
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4 mr-2" /> Show Preview
            </>
          )}
        </button>
      </div>

      {/* Customer status check */}
      <div className="p-4 border rounded-lg bg-white shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            Available customers: <strong className="text-green-600">{customers.length}</strong>
          </div>
          {customersLoading && (
            <div className="text-xs text-blue-600">Loading customers...</div>
          )}
        </div>
        
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Quick Preview</label>
        <select className="block w-full border-gray-300 rounded-md" disabled={!customers.length}>
          <option value="">{customersLoading ? 'Loading customers...' : 'Select customer to preview'}</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || c.id} 
              {c.email ? ` (${c.email})` : ''}
            </option>
          ))}
        </select>
        
        {customers.length === 0 && !customersLoading && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>No customers found.</strong> Make sure you have customers with role="customer" in your database.
            </p>
          </div>
        )}
      </div>

      {/* Full form */}
      <div className="bg-white rounded-lg shadow p-6">
        <EstimateForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => navigate('/estimates')}
          isLoading={createEstimate.isPending}
          customers={customers} // Pass customers to form
        />
      </div>
      
      {/* Info box about auto-send */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Automatic Email Delivery
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                When you create this estimate, it will be automatically sent to the customer's email address. 
                The estimate will include all line items, pricing details, and your company branding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}