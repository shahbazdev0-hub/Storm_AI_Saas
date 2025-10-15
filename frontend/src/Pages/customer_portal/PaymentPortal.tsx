// PaymentPortal.tsx - FIXED VERSION

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe('pk_test_51RwltjCcX0FmDNEa1g2pTz0rrbaLJsQ0tyoASLKDPQHnxrgwKRtTMEoGNt9Or3Mpn0okPL1wDmAykDFpv3i5XgL300qyqVGrBt')

export default function PaymentPortal({ invoiceId: propInvoiceId, onBack, onSuccess }) {
  const { invoiceId: urlInvoiceId } = useParams()
  const navigate = useNavigate()
  const finalInvoiceId = propInvoiceId || urlInvoiceId
  const queryClient = useQueryClient()
  
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)

  // Card form state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    billingZip: ''
  })

  // Get invoice details
  const { data: invoiceData, isLoading, error } = useQuery({
    queryKey: ['customer-invoice', finalInvoiceId],
    queryFn: async () => {
      if (!finalInvoiceId) {
        throw new Error('Invoice ID is required')
      }
      const response = await api.get(`/customer-portal/invoices/${finalInvoiceId}`)
      return response.data
    },
    enabled: !!finalInvoiceId,
  })

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      setIsProcessingPayment(true)
      
      // Simulate payment processing delay for demo
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const response = await api.post(`/customer-portal/invoices/${finalInvoiceId}/pay`, paymentData)
      return response.data
    },
    onSuccess: (data) => {
      setPaymentSuccess(true)
      setPaymentResult(data)
      toast.success('Payment processed successfully!')
      queryClient.invalidateQueries(['customer-invoices'])
      queryClient.invalidateQueries(['customer-invoice', finalInvoiceId])
      queryClient.invalidateQueries(['customer-service-history'])
    },
    onError: (error) => {
      console.error('Payment failed:', error)
      const errorMessage = error.response?.data?.detail || 'Payment failed. Please try again.'
      toast.error(errorMessage)
    },
    onSettled: () => {
      setIsProcessingPayment(false)
    }
  })

  // FIXED: Navigation handlers
  const handleBackNavigation = () => {
    if (onBack) {
      // If onBack callback is provided (modal/component usage)
      onBack()
    } else {
      // If no callback (standalone route usage), navigate programmatically
      navigate('/customer-portal/service-history')
    }
  }

  const handleSuccessNavigation = () => {
    if (onSuccess) {
      // If onSuccess callback is provided (modal/component usage)
      onSuccess()
    } else {
      // If no callback (standalone route usage), navigate programmatically
      navigate('/customer-portal/service-history')
    }
  }

  const handleDashboardNavigation = () => {
    navigate('/customer-portal/dashboard')
  }

  const handleInputChange = (field, value) => {
    let formattedValue = value

    // Format card number with spaces
    if (field === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
      if (formattedValue.length > 19) return // Max length with spaces
    }
    
    // Format expiry date MM/YY
    if (field === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.substring(0, 2) + '/' + formattedValue.substring(2, 4)
      }
      if (formattedValue.length > 5) return
    }
    
    // CVV numeric only
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length > 4) return
    }

    // Billing zip
    if (field === 'billingZip') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length > 5) return
    }

    setCardForm(prev => ({
      ...prev,
      [field]: formattedValue
    }))
  }

  const validateForm = () => {
    const { cardNumber, expiryDate, cvv, cardName } = cardForm
    
    if (cardNumber.replace(/\s/g, '').length < 13) {
      toast.error('Please enter a valid card number')
      return false
    }
    
    if (expiryDate.length !== 5 || !expiryDate.includes('/')) {
      toast.error('Please enter a valid expiry date (MM/YY)')
      return false
    }
    
    if (cvv.length < 3) {
      toast.error('Please enter a valid CVV')
      return false
    }
    
    if (!cardName.trim()) {
      toast.error('Please enter the cardholder name')
      return false
    }
    
    return true
  }

  const handlePayment = () => {
    if (!validateForm()) return

    const paymentData = {
      payment_method: paymentMethod,
      amount: invoiceData?.total_amount || invoiceData?.amount_due,
      card_details: {
        number: cardForm.cardNumber.replace(/\s/g, ''),
        expiry: cardForm.expiryDate,
        cvc: cardForm.cvv,
        name: cardForm.cardName
      }
    }
    
    processPaymentMutation.mutate(paymentData)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDueDateStatus = (dueDateString) => {
    if (!dueDateString) return { status: 'normal', text: 'No due date' }
    
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { status: 'overdue', text: 'Overdue' }
    } else if (diffDays <= 7) {
      return { status: 'due-soon', text: 'Due Soon' }
    } else {
      return { status: 'normal', text: 'On Time' }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-4">
              {!finalInvoiceId ? 'Invoice ID is missing' : 'The invoice could not be loaded. It may have been removed or you may not have access to it.'}
            </p>
            <button 
              onClick={handleBackNavigation}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Back to Service History
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your payment of {formatCurrency(invoiceData?.total_amount || invoiceData?.amount_due)} has been processed successfully.
            </p>
            
            {paymentResult && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono">{paymentResult.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="font-mono">{paymentResult.payment_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">{formatCurrency(paymentResult.amount_paid)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleSuccessNavigation}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
              >
                View Service History
              </button>
              <button
                onClick={handleDashboardNavigation}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const dueDateStatus = getDueDateStatus(invoiceData?.due_date)

  // Payment form
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Close button for modal */}
        {onBack && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleBackNavigation}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={handleBackNavigation}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Service History
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Payment</h1>
                <p className="text-gray-600">Invoice #{invoiceData?.invoice_number}</p>
                {invoiceData?.job_details?.service_type && (
                  <p className="text-sm text-gray-500 mt-1">{invoiceData.job_details.service_type}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(invoiceData?.amount_due || invoiceData?.total_amount)}
                </p>
                <div className="flex items-center justify-end mt-1">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    dueDateStatus.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    dueDateStatus.status === 'due-soon' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Due {formatDate(invoiceData?.due_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Payment Details</h2>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  <span>Secure SSL encryption</span>
                </div>
              </div>
              
              <div className="p-6">
                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-3 transition-colors ${
                        paymentMethod === 'card'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <CreditCardIcon className="h-6 w-6" />
                      <span className="font-medium">Credit/Debit Card</span>
                    </button>
                  </div>
                </div>

                {/* Credit Card Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardForm.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      autoComplete="cc-number"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardForm.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV *
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardForm.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardForm.cardName}
                      onChange={(e) => handleInputChange('cardName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      autoComplete="cc-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing ZIP Code
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={cardForm.billingZip}
                      onChange={(e) => handleInputChange('billingZip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoComplete="postal-code"
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={handlePayment}
                      disabled={isProcessingPayment}
                      className={`w-full py-3 px-4 rounded-md font-medium flex items-center justify-center transition-colors ${
                        isProcessingPayment
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="h-5 w-5 mr-2" />
                          Pay {formatCurrency(invoiceData?.amount_due || invoiceData?.total_amount)}
                        </>
                      )}
                    </button>
                    
                    <div className="text-center text-xs text-gray-500 mt-3">
                      <div className="flex items-center justify-center space-x-1">
                        <ShieldCheckIcon className="h-3 w-3" />
                        <span>Demo payment system - No real charges will be made</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Invoice Summary</h3>
              </div>
              
              <div className="p-6">
                {/* Service Details */}
                {invoiceData?.job_details && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Service Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium">{invoiceData.job_details.service_type}</span>
                      </div>
                      {invoiceData.job_details.job_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Job #:</span>
                          <span className="font-medium">{invoiceData.job_details.job_number}</span>
                        </div>
                      )}
                      {invoiceData.job_details.completed_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium">
                            {formatDate(invoiceData.job_details.completed_date)}
                          </span>
                        </div>
                      )}
                      {invoiceData.job_details.technician_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Technician:</span>
                          <span className="font-medium">{invoiceData.job_details.technician_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {invoiceData?.line_items && invoiceData.line_items.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                    <div className="space-y-3">
                      {invoiceData.line_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-gray-500">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <span className="font-medium ml-2">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                {invoiceData?.customer_info && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Bill To</h4>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-900">{invoiceData.customer_info.name}</p>
                      {invoiceData.customer_info.email && (
                        <p>{invoiceData.customer_info.email}</p>
                      )}
                      {invoiceData.customer_info.phone && (
                        <p>{invoiceData.customer_info.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    {invoiceData?.subtotal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>{formatCurrency(invoiceData.subtotal)}</span>
                      </div>
                    )}
                    {invoiceData?.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({invoiceData?.tax_rate}%):</span>
                        <span>{formatCurrency(invoiceData.tax_amount)}</span>
                      </div>
                    )}
                    {invoiceData?.amount_paid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="text-green-600">-{formatCurrency(invoiceData.amount_paid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                      <span>Amount Due:</span>
                      <span className="text-green-600">
                        {formatCurrency(invoiceData?.amount_due || invoiceData?.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                {invoiceData?.payment_terms && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Payment Terms</h4>
                    <p className="text-sm text-gray-600">{invoiceData.payment_terms}</p>
                  </div>
                )}

                {/* Notes */}
                {invoiceData?.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{invoiceData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}