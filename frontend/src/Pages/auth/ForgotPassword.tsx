// frontend/src/pages/auth/ForgotPassword.tsx - MOBILE RESPONSIVE FIX
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authService } from '../../services/auth.service'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: () => {
      setEmailSent(true)
      toast.success('Password reset email sent! Check your inbox.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to send reset email')
    },
  })

  const onSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data.email)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        {/* Left Side - Success Message */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-20 xl:px-24 py-8 sm:py-12 lg:py-16">
          
          {/* Logo Section - Top Left (Hidden on small screens) */}
          <div className="hidden sm:block absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8">
            <div className="flex items-center">
              <img 
                src="/rlogo.png" 
                alt="STORM AI Logo" 
                className="h-5 w-5 sm:h-6 sm:w-6 object-contain mr-2"
              />
              <span className="text-sm sm:text-base font-bold text-gray-900">STORM AI</span>
            </div>
          </div>
          
          {/* Form Container */}
          <div className="mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm">
            
            {/* Check your email */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 sm:h-10 sm:w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                Check your email
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                We've sent a password reset link to{' '}
                <span className="font-medium text-gray-900">{getValues('email')}</span>
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <h3 className="text-xs sm:text-sm font-medium text-green-800">
                    Email sent successfully!
                  </h3>
                  <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-green-700">
                    <p>
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-center text-xs sm:text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  try again
                </button>
              </p>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Back to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - CRM Dashboard Preview (Hidden on mobile and tablet) */}
        <div className="hidden xl:block relative w-0 flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-center items-center px-12 py-16">
            <div className="text-center text-white mb-12 max-w-xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 leading-tight">
                Secure password recovery made simple.
              </h2>
              <p className="text-lg opacity-90">
                We'll help you get back into your account quickly and securely.
              </p>
            </div>
            
            {/* Dashboard Preview */}
            <div className="w-full max-w-3xl mx-auto">
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <img 
                  src="/dashboard.png" 
                  alt="STORM AI Dashboard Preview" 
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
          
          {/* Privacy Policy Link */}
          <div className="absolute bottom-6 right-6">
            <Link
              to="/privacy-policy"
              className="text-white/70 hover:text-white text-sm underline transition-colors duration-200"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Forgot Password Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-20 xl:px-24 py-8 sm:py-12 lg:py-16">
        
        {/* Logo Section - Top Left (Hidden on small screens) */}
        <div className="hidden sm:block absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8">
          <div className="flex items-center">
            <img 
              src="/rlogo.png" 
              alt="STORM AI Logo" 
              className="h-5 w-5 sm:h-6 sm:w-6 object-contain mr-2"
            />
            <span className="text-sm sm:text-base lg:text-xl font-bold text-gray-900">STORM AI</span>
          </div>
        </div>
        
        {/* Form Container */}
        <div className="mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm">
          
          {/* Reset Password Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center">
                <img 
                  src="/rlogow.png" 
                  alt="Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Reset Your Password
            </h2>
          </div>

          {/* Reset Form */}
          <div className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm sm:text-base outline-none"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={forgotPasswordMutation.isPending}
              className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {forgotPasswordMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-sm">Sending...</span>
                </div>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>

          <div className="mt-5 sm:mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Back to sign in
            </Link>
          </div>

          <div className="mt-4 sm:mt-5 border-t border-gray-200 pt-4 sm:pt-5">
            <p className="text-center text-xs sm:text-sm text-gray-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - CRM Dashboard Preview (Hidden on mobile and tablet) */}
      <div className="hidden xl:block relative w-0 flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-center items-center px-12 py-16">
          <div className="text-center text-white mb-12 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 leading-tight">
              Reset your password securely.
            </h2>
            <p className="text-lg opacity-90">
              We'll send you a secure link to reset your password and get you back to managing your business.
            </p>
          </div>
          
          {/* Dashboard Preview */}
          <div className="w-full max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <img 
                src="/dashboard.png" 
                alt="STORM AI Dashboard Preview" 
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}