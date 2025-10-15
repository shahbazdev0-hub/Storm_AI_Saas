// frontend/src/pages/invoices/InvoiceGenerator.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

type Customer = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  name?: string
}

type LineItem = {
  description: string
  quantity: number
  unit_price: number
}

export default function InvoiceGenerator() {
  const [customerId, setCustomerId] = useState('')
  const navigate = useNavigate()
  const [title, setTitle] = useState('Service Invoice')
  const [description, setDescription] = useState('')
  const [taxRate, setTaxRate] = useState<number>(8.5)
  const [discount, setDiscount] = useState<number>(0)
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load customers from users collection (role="customer")
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers-for-invoice'],
    queryFn: async () => {
      const res = await api.get('/users/?role=customer')
      return res?.data || []
    },
    staleTime: 300_000,
  })

  // totals
  const { subtotal, taxAmount, total } = useMemo(() => {
    const st = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0)
    const taxable = Math.max(0, st - Number(discount || 0))
    const tax = (taxable * Number(taxRate || 0)) / 100
    return {
      subtotal: st,
      taxAmount: tax,
      total: Math.max(0, taxable + tax)
    }
  }, [items, taxRate, discount])

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, key: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [key]: key === 'description' ? String(value) : Number(value) } : it))
  }

  const createInvoice = async () => {
    try {
      if (!customerId) {
        toast.error('Please select a customer')
        return
      }
      if (!items.length || !items[0].description) {
        toast.error('Please add at least one line item with a description')
        return
      }
      setSubmitting(true)

      const payload = {
        customer_id: customerId, // Changed from contact_id to customer_id
        title: title || 'Service Invoice',
        description: description || '',
        tax_rate: Number(taxRate || 0),
        discount_amount: Number(discount || 0),
        line_items: items.map(it => ({
          description: it.description,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
        })),
        terms_and_conditions: terms || '',
        notes: notes || '',
        payment_terms_days: 30,
      }

      const res = await api.post('/invoices/', payload)
      toast.success(`Invoice created #${res.data?.invoice_number || res.data?.id || ''}`)
      navigate('/invoices')
      
      // Clear form
      setItems([{ description: '', quantity: 1, unit_price: 0 }])
      setDiscount(0)
      setTaxRate(8.5)
      setDescription('')
      setTitle('Service Invoice')
      setTerms('')
      setNotes('')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create invoice'
      toast.error(msg)
      console.error('Create invoice error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-select first customer when loaded
  useEffect(() => {
    if (!customerId && customers.length > 0) {
      setCustomerId(customers[0].id)
    }
  }, [customers, customerId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate an invoice with payment portal link for your customer.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Customer Status */}
        <div className="p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-blue-800">
              Available customers: <strong className="text-blue-900">{customers.length}</strong>
            </div>
            {loadingCustomers && (
              <div className="text-xs text-blue-600">Loading customers...</div>
            )}
          </div>
          
          {customers.length === 0 && !loadingCustomers && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>No customers found.</strong> Make sure you have customers with role="customer" in your database.
              </p>
            </div>
          )}
        </div>

        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={loadingCustomers || !customers.length}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="">{loadingCustomers ? 'Loading…' : 'Select customer'}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || c.id}
                {c.email ? ` (${c.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Title / Tax Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Service Invoice"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Optional description…"
          />
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Line Items</h4>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                    placeholder="Unit Price"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <div className="text-sm text-gray-900">
                    {(Number(it.quantity || 0) * Number(it.unit_price || 0)).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discount / Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="md:col-span-2 bg-gray-50 border rounded-md p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({taxRate || 0}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Payment Portal Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Customer Payment Portal
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  When you create this invoice, a secure payment portal link will be generated 
                  and sent to the customer via email. They can pay online with credit cards, 
                  bank transfers, or other payment methods.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={createInvoice}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Invoice & Send Payment Link'}
          </button>
        </div>
      </div>
    </div>
  )
}