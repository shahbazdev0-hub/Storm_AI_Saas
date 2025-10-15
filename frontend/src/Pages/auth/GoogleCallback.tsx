
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/auth.service'
import toast from 'react-hot-toast'

const GoogleCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Check for error parameters
        const errorParam = searchParams.get('error')
        if (errorParam) {
          let errorMessage = 'Google authentication failed'
          switch (errorParam) {
            case 'token_verification_failed':
              errorMessage = 'Failed to verify Google token'
              break
            case 'no_email':
              errorMessage = 'Email not provided by Google'
              break
            case 'server_error':
              errorMessage = 'Server error during authentication'
              break
            default:
              errorMessage = 'Authentication failed'
          }
          setError(errorMessage)
          setStatus('error')
          toast.error(errorMessage)
          return
        }

        // Check for success parameters
        const success = searchParams.get('success')
        const token = searchParams.get('token')
        const refreshToken = searchParams.get('refresh_token')
        const userDataEncoded = searchParams.get('user_data')

        if (success === 'true' && token && userDataEncoded) {
          console.log('🎉 Google OAuth successful, processing tokens...')

          // Decode user data from URL parameter
          const userDataJson = atob(userDataEncoded) // Base64 decode
          const userData = JSON.parse(userDataJson)
          
          // Prepare auth response format
          const authResponse = {
            user: userData,
            access_token: token,
            refresh_token: refreshToken || '',
            token_type: 'bearer',
            expires_in: 86400 // 24 hours
          }

          // Store tokens and user data properly
          authService.setAuthData(authResponse)
          login(userData, token)

          setStatus('success')
          toast.success(`Welcome ${userData.first_name}!`)

          // 🎯 NEW: Check if user needs to select a pricing plan
          setTimeout(() => {
            const userRole = userData.role?.toLowerCase()
            const hasActiveSubscription = userData.subscription?.status === 'active'
            
            console.log('📊 User role:', userRole)
            console.log('💳 Has active subscription:', hasActiveSubscription)
            
            // If new user or no active subscription, show pricing
            if (!hasActiveSubscription) {
              console.log('🏷️ Redirecting to pricing page...')
              navigate('/pricing', { replace: true })
              return
            }
            
            // If existing user with subscription, go to appropriate dashboard
            switch (userRole) {
              case 'customer':
                navigate('/customer-portal/dashboard', { replace: true })
                break
              case 'technician':
                navigate('/technician-portal/dashboard', { replace: true })
                break
              case 'admin':
              case 'manager':
              case 'owner':
              case 'user':
              default:
                navigate('/dashboard', { replace: true })
                break
            }
          }, 1500)

        } else {
          setError('Invalid callback parameters')
          setStatus('error')
          toast.error('Invalid authentication response')
        }

      } catch (error: any) {
        console.error('Google callback failed:', error)
        setError(error.response?.data?.detail || error.message || 'Authentication failed')
        setStatus('error')
        toast.error('Authentication failed')
      }
    }

    handleGoogleCallback()
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-gray-900 px-2">
                Completing Google Sign In
              </h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                Please wait while we set up your account...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-100 mx-auto flex items-center justify-center">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-gray-900 px-2">
                Authentication Successful!
              </h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                Taking you to the next step...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-red-100 mx-auto flex items-center justify-center">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-gray-900 px-2">
                Authentication Failed
              </h2>
              <p className="mt-2 text-sm sm:text-base text-red-600 px-4 leading-relaxed break-words">
                {error}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 sm:mt-6 w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 sm:py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 min-h-[44px] touch-manipulation"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GoogleCallback