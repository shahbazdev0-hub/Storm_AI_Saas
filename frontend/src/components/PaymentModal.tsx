import React, { useState } from 'react'

// Mock Stripe Elements (in real app, you'd import from @stripe/react-stripe-js)
const CardNumberElement = ({ onChange, options }: any) => (
  <input 
    type="text" 
    placeholder="1234 1234 1234 1234"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    onChange={(e) => onChange({ complete: e.target.value.length >= 16 })}
  />
)

const CardExpiryElement = ({ onChange }: any) => (
  <input 
    type="text" 
    placeholder="MM/YY"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    onChange={(e) => onChange({ complete: e.target.value.length >= 5 })}
  />
)

const CardCvcElement = ({ onChange }: any) => (
  <input 
    type="text" 
    placeholder="123"
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    onChange={(e) => onChange({ complete: e.target.value.length >= 3 })}
  />
)

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  planId: string
  planName: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  onPaymentSuccess: () => void
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  planId,
  planName,
  price,
  billingCycle,
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState({
    number: false,
    expiry: false,
    cvc: false
  })

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    country: '',
    postalCode: ''
  })

  const isFormValid = cardComplete.number && cardComplete.expiry && cardComplete.cvc && 
                     formData.email && formData.name

  const handleSubmit = async () => {
    if (!isFormValid) {
      setPaymentError('Please fill in all required fields')
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      // In real implementation, this would:
      // 1. Create payment method with Stripe
      // 2. Confirm payment with your backend
      // 3. Handle 3D Secure if needed
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simulate random success/failure for demo
      const success = Math.random() > 0.2 // 80% success rate
      
      if (success) {
        onPaymentSuccess()
        onClose()
      } else {
        throw new Error('Your card was declined. Please try a different payment method.')
      }
      
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Complete Your Purchase</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Plan Summary */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-indigo-900">{planName} Plan</h3>
                <p className="text-sm text-indigo-600">
                  Billed {billingCycle} • Cancel anytime
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-900">${price}</div>
                <div className="text-sm text-indigo-600">/{billingCycle === 'monthly' ? 'month' : 'year'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cardholder Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number *
            </label>
            <CardNumberElement 
              onChange={(event: any) => setCardComplete({...cardComplete, number: event.complete})}
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#374151',
                    '::placeholder': { color: '#9CA3AF' }
                  }
                }
              }}
            />
          </div>

          {/* Card Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date *
              </label>
              <CardExpiryElement 
                onChange={(event: any) => setCardComplete({...cardComplete, expiry: event.complete})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVC *
              </label>
              <CardCvcElement 
                onChange={(event: any) => setCardComplete({...cardComplete, cvc: event.complete})}
              />
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Billing Address</h4>
            
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Address"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="City"
              />
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Postal Code"
              />
            </div>
            
            <select
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="PK">Pakistan</option>
            </select>
          </div>

          {/* Error Message */}
          {paymentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{paymentError}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isProcessing}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
              isFormValid && !isProcessing
                ? 'bg-indigo-600 hover:bg-indigo-700 transform hover:scale-105'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay ${price} • Start ${planName} Plan`
            )}
          </button>

          {/* Trial Info */}
          <div className="text-center text-sm text-gray-500">
            <p>7-day free trial • No charge until {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p>Cancel anytime during trial period</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal