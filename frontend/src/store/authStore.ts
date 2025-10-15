// frontend/src/store/authStore.ts - FIXED VERSION
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Subscription {
  plan_id: string
  plan_name: string
  status: 'trial' | 'active' | 'pending_payment' | 'payment_failed' | 'cancelled' | 'expired'
  billing_cycle: 'monthly' | 'yearly'
  price: number
  features: string[]
  stripe_subscription_id?: string
  stripe_customer_id?: string
  expires_at: string
  created_at: string
  updated_at?: string
  cancelled_at?: string
}

interface User {
  id: string
  _id?: string
  email: string
  first_name: string
  last_name: string
  name?: string
  role: string
  company_id: string
  avatar?: string | null
  avatar_url?: string | null
  phone?: string
  last_login?: string
  created_at?: string
  updated_at?: string
  status?: 'active' | 'inactive' | 'pending'
  permissions?: string[]
  google_id?: string
  stripe_customer_id?: string
  subscription?: Subscription
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    notifications?: {
      email: boolean
      push: boolean
      sms: boolean
    }
    language?: string
    timezone?: string
  }
  is_email_verified?: boolean
  is_phone_verified?: boolean
  login_count?: number
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Core auth actions
  login: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
  refreshAuthToken: () => Promise<void>
  refreshUserData: () => Promise<void>  // NEW: Fetch latest user data
  
  // Subscription management
  updateSubscription: (subscription: Subscription) => void
  clearSubscription: () => void
  
  // Subscription helper methods
  hasActiveSubscription: () => boolean
  needsPricingSelection: () => boolean
  getSubscriptionStatus: () => string
  getPlanName: () => string
  isTrialUser: () => boolean
  canAccessFeature: (feature: string) => boolean
  getDaysUntilExpiry: () => number | null
  
  // User helper methods
  getFullName: () => string
  getDisplayName: () => string
  getInitials: () => string
  getAvatarUrl: () => string | null
  isAdmin: () => boolean
  isCustomer: () => boolean
  isTechnician: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // ===== CORE AUTH ACTIONS =====
      login: (user, token, refreshToken) => {
        const enhancedUser = {
          ...user,
          name: user.name || `${user.first_name} ${user.last_name}`.trim()
        }
        
        set({ 
          user: enhancedUser, 
          token, 
          refreshToken: refreshToken || null,
          isAuthenticated: true, 
          isLoading: false 
        })
        
        console.log('🎉 User logged in:', enhancedUser.email)
      },

      logout: () => {
        console.log('👋 User logged out')
        
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false 
        })
        
        localStorage.removeItem('auth-storage')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      },

      updateUser: (userData) => {
        set((state) => {
          if (!state.user) return state
          
          const updatedUser = { ...state.user, ...userData }
          
          if (userData.first_name || userData.last_name) {
            updatedUser.name = `${updatedUser.first_name} ${updatedUser.last_name}`.trim()
          }
          
          return { user: updatedUser }
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      refreshAuthToken: async () => {
        const { refreshToken, token } = get()
        
        if (!refreshToken && !token) {
          console.warn('No refresh token available')
          get().logout()
          return
        }

        try {
          set({ isLoading: true })
          
          const response = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
          })

          if (!response.ok) {
            throw new Error('Token refresh failed')
          }

          const data = await response.json()
          
          set({
            user: {
              ...data.user,
              name: data.user.name || `${data.user.first_name} ${data.user.last_name}`.trim()
            },
            token: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          
          console.log('✅ Token refreshed successfully')
        } catch (error) {
          console.error('❌ Token refresh failed:', error)
          get().logout()
        }
      },

      // In authStore.ts - around line 180-200
refreshUserData: async () => {
  const { token } = get()
  
  if (!token) {
    console.warn('⚠️ No token available for refresh')
    return
  }

  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {  // ✅ FIXED PATH
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    const userData = await response.json()  // ✅ The response is the user object directly
    
    set((state) => ({
      user: {
        ...userData,
        name: userData.name || `${userData.first_name} ${userData.last_name}`.trim()
      }
    }))
    
    console.log('✅ User data refreshed, subscription status:', userData.subscription?.status)
  } catch (error) {
    console.error('❌ Failed to refresh user data:', error)
  }
},

      // ===== SUBSCRIPTION MANAGEMENT =====
      updateSubscription: (subscription) => {
        set((state) => ({
          user: state.user ? {
            ...state.user,
            subscription
          } : null
        }))
        console.log('💳 Subscription updated:', subscription.plan_name, subscription.status)
      },

      clearSubscription: () => {
        set((state) => ({
          user: state.user ? {
            ...state.user,
            subscription: undefined
          } : null
        }))
      },

      // ===== SUBSCRIPTION HELPERS (FIXED) =====
     // ===== SUBSCRIPTION HELPERS (FIXED) =====
hasActiveSubscription: () => {
  const user = get().user
  const status = user?.subscription?.status
  
  // ✅ FIX: Accept both 'active', 'trial', 'trialing', and 'pending_payment' as valid
  return status === 'active' || 
         status === 'trial' || 
         status === 'trialing' ||  // ✅ Backend uses 'trialing' from Stripe
         status === 'pending_payment'
},

needsPricingSelection: () => {
  const user = get().user
  const subscription = user?.subscription
  
  // Show pricing only if no subscription or expired/cancelled/failed
  if (!subscription) return true
  
  const invalidStatuses = ['expired', 'cancelled', 'payment_failed']
  return invalidStatuses.includes(subscription.status)
},

getSubscriptionStatus: () => {
  const user = get().user
  return user?.subscription?.status || 'none'
},

getPlanName: () => {
  const user = get().user
  return user?.subscription?.plan_name || 'No Plan'
},

isTrialUser: () => {
  const user = get().user
  return user?.subscription?.status === 'trial' || 
         user?.subscription?.status === 'trialing'  // ✅ ADD THIS
},

canAccessFeature: (feature) => {
  const user = get().user
  const subscription = user?.subscription
  
  if (!subscription) return false
  
  // ✅ Allow features for active, trial, and trialing users
  const validStatuses = ['active', 'trial', 'trialing', 'pending_payment']
  
  if (validStatuses.includes(subscription.status)) {
    return subscription.features.includes(feature) || 
           subscription.features.includes('Everything in Starter')
  }
  
  return false
},

      getDaysUntilExpiry: () => {
        const user = get().user
        const subscription = user?.subscription
        
        if (!subscription?.expires_at) return null
        
        const expiryDate = new Date(subscription.expires_at)
        const now = new Date()
        const diffTime = expiryDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return diffDays > 0 ? diffDays : 0
      },

      // ===== USER HELPERS =====
      getFullName: () => {
        const user = get().user
        if (!user) return 'User'
        return user.name || `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0]
      },

      getDisplayName: () => {
        const user = get().user
        if (!user) return 'User'
        return user.first_name || user.name?.split(' ')[0] || user.email.split('@')[0]
      },

      getInitials: () => {
        const user = get().user
        if (!user) return 'U'
        
        const name = user.name || `${user.first_name} ${user.last_name}`.trim()
        if (!name) return user.email.charAt(0).toUpperCase()
        
        return name
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2)
      },

      getAvatarUrl: () => {
        const user = get().user
        if (!user) return null
        return user.avatar_url || user.avatar || null
      },

      isAdmin: () => {
        const user = get().user
        return user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager'
      },

      isCustomer: () => {
        const user = get().user
        return user?.role === 'customer'
      },

      isTechnician: () => {
        const user = get().user
        return user?.role === 'technician'
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.isAuthenticated) {
          console.log('🔄 Auth state rehydrated for:', state.user?.email)
        }
      },
    }
  )
)

// ===== STANDALONE HELPER FUNCTIONS =====

export const getAvatarColor = (user: User | null): string => {
  if (!user) return 'bg-gray-500'
  
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-lime-500',
    'bg-sky-500'
  ]
  
  const identifier = user.email + (user.id || user._id || '')
  const hash = identifier.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  
  return colors[hash % colors.length]
}

export const getUserInitials = (user: User | null): string => {
  const { getInitials } = useAuthStore.getState()
  return getInitials()
}

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'User'
  return user.first_name || user.name?.split(' ')[0] || user.email.split('@')[0]
}

export const getAvatarUrl = (user: User | null): string | null => {
  if (!user) return null
  return user.avatar_url || user.avatar || null
}

// ===== SUBSCRIPTION STATUS HELPERS =====

export const getSubscriptionBadgeColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'trial':
      return 'bg-blue-100 text-blue-800'
    case 'pending_payment':
      return 'bg-yellow-100 text-yellow-800'
    case 'payment_failed':
      return 'bg-red-100 text-red-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800'
    case 'expired':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export const formatSubscriptionStatus = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'trial':
      return 'Free Trial'
    case 'trialing':  // ✅ ADD THIS
      return 'Free Trial'
    case 'pending_payment':
      return 'Payment Required'
    case 'payment_failed':
      return 'Payment Failed'
    case 'cancelled':
      return 'Cancelled'
    case 'expired':
      return 'Expired'
    default:
      return 'No Plan'
  }
}

export type { User, Subscription, AuthState }