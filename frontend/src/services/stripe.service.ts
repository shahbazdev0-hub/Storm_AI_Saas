// frontend/src/services/stripe.service.ts
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js'

// Initialize Stripe (you'll need to install @stripe/stripe-js)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export class StripeService {
  private stripe: Stripe | null = null
  private elements: StripeElements | null = null

  async initialize(): Promise<void> {
    this.stripe = await stripePromise
    if (!this.stripe) {
      throw new Error('Failed to initialize Stripe')
    }
  }

  async createPaymentMethod(cardElement: any, billingDetails: any) {
    if (!this.stripe) await this.initialize()
    
    const { error, paymentMethod } = await this.stripe!.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: billingDetails
    })

    if (error) {
      throw new Error(error.message)
    }

    return paymentMethod
  }

  async confirmCardPayment(clientSecret: string, paymentMethod: any) {
    if (!this.stripe) await this.initialize()

    const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod.id
    })

    if (error) {
      throw new Error(error.message)
    }

    return paymentIntent
  }

  // Create Elements instance for card input
  createElements() {
    if (!this.stripe) throw new Error('Stripe not initialized')
    
    this.elements = this.stripe.elements()
    return this.elements
  }

  // Create card element
  createCardElement() {
    if (!this.elements) throw new Error('Elements not created')
    
    return this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#374151',
          '::placeholder': {
            color: '#9CA3AF',
          },
        },
        invalid: {
          color: '#EF4444',
        },
      },
    })
  }
}

export const stripeService = new StripeService()

// Payment processing utility
export const processSubscriptionPayment = async (
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  cardElement: any,
  billingDetails: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Create subscription with backend
    const response = await fetch('/api/v1/auth/subscription/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: billingCycle
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to create subscription')
    }

    // 2. If payment is required, process with Stripe
    if (data.requires_payment && data.client_secret) {
      // Create payment method
      const paymentMethod = await stripeService.createPaymentMethod(cardElement, billingDetails)
      
      // Confirm payment
      const paymentIntent = await stripeService.confirmCardPayment(
        data.client_secret,
        paymentMethod
      )

      // 3. Confirm payment with backend
      if (paymentIntent.status === 'succeeded') {
        const confirmResponse = await fetch('/api/v1/auth/subscription/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id
          })
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm payment')
        }

        return { success: true }
      } else {
        throw new Error('Payment not completed')
      }
    } else {
      // No payment required (trial period)
      return { success: true }
    }

  } catch (error: any) {
    console.error('❌ Payment processing failed:', error)
    return { 
      success: false, 
      error: error.message || 'Payment failed'
    }
  }
}