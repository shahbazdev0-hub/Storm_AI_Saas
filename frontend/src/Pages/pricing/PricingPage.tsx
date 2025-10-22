import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore' 
interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  cta: string
  popular?: boolean
  additionalInfo?: string
}

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, planId, planName, price, billingCycle, onPaymentSuccess }: any) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    address: '',
    city: '',
    country: '',
    postalCode: ''
  })
  
  if (!isOpen) return null
  
  const isFormValid = formData.email && formData.name && formData.cardNumber && formData.expiry && formData.cvc
  
  const handlePayment = async () => {
    if (!isFormValid) {
      setPaymentError('Please fill in all required fields')
      return
    }

    setIsProcessing(true)
    setPaymentError(null)
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simulate success (90% success rate)
      const success = Math.random() > 0.1
      
      if (success) {
        setIsProcessing(false)
        onPaymentSuccess()
        onClose()
      } else {
        throw new Error('Your card was declined. Please try a different payment method.')
      }
      
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }
  
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
            <input
              type="text"
              value={formData.cardNumber}
              onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
            />
          </div>

          {/* Card Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="text"
                value={formData.expiry}
                onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVC *
              </label>
              <input
                type="text"
                value={formData.cvc}
                onChange={(e) => setFormData({...formData, cvc: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123"
                maxLength={4}
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
            onClick={handlePayment}
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
              `Pay $${price} • Start ${planName} Plan`
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

const PricingPage = () => {
  const { token, user, refreshUserData, hasActiveSubscription } = useAuthStore()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  // const { refreshUserData, hasActiveSubscription, user } = useAuthStore()
  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    planId: '',
    planName: '',
    price: 0
  })

  // Animate in on mount
  useEffect(() => {
    setIsVisible(true)
  }, [])

  const plans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for solo operators and new businesses getting off the ground.',
      monthlyPrice: 39,
      yearlyPrice: 375,
      features: [
        'Contact & Lead Management',
        'Estimate & Invoice Builder', 
        'Sales Dashboard & Conversion Reports',
        'QuickBooks + Google Calendar Sync',
        'Job Scheduling Calendar',
        'Customer Notes & History',
        'Customer Portal Access',
        'Zapier Hooks + Custom AI Workflows',
        'Email Notifications'
      ],
      cta: 'Start 7 Day Free Trial'
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'Ideal for teams that need automation, scheduling, and field tools.',
      monthlyPrice: 79,
      yearlyPrice: 759,
      popular: true,
      features: [
        'Everything in Starter',
        'AI-Powered SMS Assistant',
        'Route Optimization',
        'Technician Assignment',
        'Role-Based User Permissions',
        'Document Review & Management',
        'Team & Department Reporting'
      ],
      additionalInfo: 'Additional Users: $5/user/month (Renews Monthly or at yearly rate $60)',
      cta: 'Start 7 Day Free Trial'
    }
  ]

  const handleSelectPlan = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice

    // Open payment modal instead of direct API call
    setPaymentModal({
      isOpen: true,
      planId: planId,
      planName: plan.name,
      price: price
    })
  }
// ✅ CORRECT: Now use the token that was extracted at component level
  const handlePaymentSuccess = async () => {
    setLoading(paymentModal.planId)
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      // ✅ token is already available from the hook at the top
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }
      
      console.log('💳 Creating subscription in backend...')
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token')
      
      const response = await fetch(`${API_URL}/api/v1/auth/subscription/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // ✅ Use token from component scope
        },
        body: JSON.stringify({
          plan_id: paymentModal.planId,
          billing_cycle: billingCycle
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Subscription created:', data)
      
      // Refresh user data
      console.log('🔄 Refreshing user data...')
      await refreshUserData()  // ✅ This is also from the hook at top
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Check subscription status
      if (hasActiveSubscription()) {  // ✅ This too is from the hook at top
        console.log('✅ Subscription verified!')
        alert(`🎉 Welcome to ${paymentModal.planName}!`)
        window.location.href = '/customer-portal/dashboard'
      } else {
        console.error('❌ Subscription not active')
        console.log('Current subscription:', user?.subscription)
        alert('Payment successful but subscription not activated. Please refresh.')
      }
      
    } catch (error: any) {
      console.error('❌ Subscription activation failed:', error)
      alert(`Failed to activate subscription: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }
  // const handlePaymentSuccess = async () => {
  //   setLoading(paymentModal.planId)
    
  //   try {
  //     // Call your backend to create subscription after successful payment
  //     const response = await fetch('http://localhost:8000/api/v1/auth/subscription/update', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify({
  //         plan_id: paymentModal.planId,
  //         billing_cycle: billingCycle
  //       })
  //     })
      
  //     if (!response.ok) {
  //       const errorText = await response.text()
  //       console.error('Response error:', response.status, errorText)
  //       throw new Error(`HTTP ${response.status}: ${errorText}`)
  //     }
      
  //     const data = await response.json()
      
  //     // Success! Navigate to customer dashboard
  //     console.log(`✅ Payment successful! Subscription activated for ${paymentModal.planName}`)
      
  //     // Show success message
  //     setTimeout(() => {
  //       alert(`🎉 Welcome to ${paymentModal.planName}! Taking you to your dashboard...`)
        
  //       // Navigate to customer dashboard
  //       // In real app: navigate('/customer-portal/dashboard', { replace: true })
  //       console.log('🎯 Navigating to customer dashboard...')
  //     }, 1000)
      
  //   } catch (error: any) {
  //     console.error('❌ Subscription activation failed:', error)
  //     alert(`Failed to activate subscription: ${error.message}`)
  //   } finally {
  //     setLoading(null)
  //   }
  // }

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      planId: '',
      planName: '',
      price: 0
    })
  }

  const getSavingsPercentage = () => {
    return 20 // 20% savings as mentioned in your document
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-br from-pink-400/10 to-rose-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Section with Staggered Animation */}
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
              <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
                Simple Pricing.
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Scales With Your Business.
                </span>
              </h1>
            </div>
            
            <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                No contracts. No hidden fees. Just powerful tools built to grow your service business.
              </p>
            </div>
            
            {/* Enhanced Billing Toggle */}
            <div className={`flex items-center justify-center mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      billingCycle === 'monthly' 
                        ? 'bg-white text-gray-900 shadow-md transform scale-105' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly billing
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      billingCycle === 'yearly' 
                        ? 'bg-white text-gray-900 shadow-md transform scale-105' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annual billing
                  </button>
                </div>
              </div>
              
              {billingCycle === 'yearly' && (
                <div className="ml-4 animate-bounce">
                  <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg transform hover:scale-110 transition-transform duration-200">
                    💰 {getSavingsPercentage()}% OFF
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Cards with Enhanced Animations */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative transition-all duration-700 delay-${(index + 1) * 200} ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                }`}
                onMouseEnter={() => setHoveredCard(plan.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div
                  className={`relative rounded-3xl overflow-hidden backdrop-blur-sm transition-all duration-500 group ${
                    plan.popular
                      ? 'bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/80 border-2 border-indigo-300 transform hover:scale-105 hover:-translate-y-2 shadow-2xl hover:shadow-indigo-500/25'
                      : 'bg-white/80 border border-gray-200/50 hover:border-gray-300 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-2xl'
                  }`}
                  style={{
                    boxShadow: hoveredCard === plan.id 
                      ? plan.popular 
                        ? '0 25px 50px -12px rgba(99, 102, 241, 0.4)' 
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                      : undefined
                  }}
                >
                  {/* Animated Background Gradient */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    plan.popular 
                      ? 'bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-blue-600/5'
                      : 'bg-gradient-to-br from-gray-600/5 via-slate-600/5 to-gray-600/5'
                  }`}></div>

                  {/* Enhanced Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-center py-3 px-4 animate-gradient-x">
                      <div className="flex items-center justify-center group-hover:animate-pulse">
                        <svg className="w-5 h-5 mr-2 fill-current animate-spin" style={{animationDuration: '3s'}} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span className="font-bold tracking-wide">✨ Most Popular ✨</span>
                      </div>
                    </div>
                  )}
                  
                  <div className={`relative z-10 px-8 py-8 ${plan.popular ? 'pt-20' : 'pt-8'}`}>
                    {/* Plan Header with Hover Effects */}
                    <div className="text-center mb-8">
                      <div className="group-hover:transform group-hover:scale-110 transition-transform duration-300">
                        <h3 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors duration-300">
                          {plan.name}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-base mb-8 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                        {plan.description}
                      </p>
                      
                      {/* Animated Price Display */}
                      <div className="mb-8 group-hover:transform group-hover:scale-110 transition-all duration-300">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className={`text-6xl font-bold transition-all duration-500 ${
                            plan.popular ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent' : 'text-gray-900'
                          }`}>
                            ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                          </span>
                          <span className="text-gray-500 ml-3 text-lg">
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <div className="animate-bounce">
                            <p className="text-sm font-semibold text-green-600 bg-green-50 py-1 px-3 rounded-full inline-block">
                              💚 Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}/year
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced CTA Button */}
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={loading === plan.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${
                          plan.popular
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-2xl focus:ring-indigo-300'
                            : 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 shadow-lg hover:shadow-2xl focus:ring-gray-300'
                        } ${loading === plan.id ? 'opacity-50 cursor-not-allowed transform-none' : 'hover:-translate-y-1'}`}
                      >
                        {loading === plan.id ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            <span className="animate-pulse">Processing...</span>
                          </div>
                        ) : (
                          <span className="flex items-center justify-center">
                            {plan.cta}
                            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </div>
                    
                    {/* Enhanced Features List */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 text-center mb-6 text-lg">
                        {plan.name} includes:
                      </h4>
                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div 
                            key={featureIndex} 
                            className={`flex items-start transition-all duration-300 delay-${featureIndex * 100} hover:transform hover:translate-x-2 hover:scale-105 ${
                              hoveredCard === plan.id ? 'translate-x-1' : ''
                            }`}
                          >
                            <div className="relative mr-4 mt-0.5">
                              <svg className="w-6 h-6 text-green-500 group-hover:text-green-400 transition-colors duration-200 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-gray-800 transition-colors duration-200 leading-relaxed">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Additional Info with Animation */}
                      {plan.additionalInfo && (
                        <div className="mt-8 pt-6 border-t border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                          <div className="bg-blue-50 group-hover:bg-blue-100 transition-colors duration-300 rounded-xl p-4 transform hover:scale-105">
                            <p className="text-sm text-blue-800 font-medium leading-relaxed">
                              💡 {plan.additionalInfo}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                    plan.popular ? 'bg-gradient-to-r from-indigo-600/10 to-purple-600/10' : 'bg-gradient-to-r from-gray-600/5 to-slate-600/5'
                  } rounded-3xl`}></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Footer Section */}
          <div className={`text-center mt-20 transition-all duration-1000 delay-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 max-w-2xl mx-auto">
              <div className="mb-6">
                <p className="text-lg text-gray-700 font-medium mb-2 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No long-term contracts
                </p>
                <p className="text-lg text-gray-700 font-medium flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cancel anytime
                </p>
              </div>
              <p className="text-gray-600">
                Questions about pricing?{' '}
                <a href="#" className="text-indigo-600 hover:text-indigo-500 font-semibold transition-colors duration-200 hover:underline">
                  Contact our sales team
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={closePaymentModal}
        planId={paymentModal.planId}
        planName={paymentModal.planName}
        price={paymentModal.price}
        billingCycle={billingCycle}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-gradient-x {
          background-size: 400% 400%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  )
}

export default PricingPage