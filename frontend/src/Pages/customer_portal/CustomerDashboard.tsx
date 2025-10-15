import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BellIcon,
  Cog6ToothIcon,
  StarIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import ChatbotWidget from '../../components/chatbot/ChatbotWidget'
import { useAuthStore } from '../../store/authStore'

// Welcome Popup Component for New Customers
function WelcomePopup({ customer, onClose, onDontShowAgain }) {
  const [currentStep, setCurrentStep] = useState(0)

  const welcomeSteps = [
    {
      title: "Welcome to Your Customer Portal!",
      subtitle: `Hi ${customer?.first_name || 'there'}! Let's show you around`,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-600">
            Your personalized dashboard makes managing services easy. Let us show you the key features that will save you time and keep you informed.
          </p>
        </div>
      )
    },
    {
      title: "Meet Your AI Assistant",
      subtitle: "Available 24/7 to help you",
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">AI-Powered Support</h4>
              <p className="text-sm text-gray-600">Get instant answers and assistance</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Your AI assistant can help with:</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Schedule service appointments
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Answer questions about your services
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Help with billing and payments
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Track job progress and updates
              </li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Try it now:</strong> Look for the chat widget in the bottom-right corner!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Quick Service Booking",
      subtitle: "Schedule services in just a few clicks",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Easy Scheduling</h4>
              <p className="text-xs text-gray-600">Book appointments that fit your schedule</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <WrenchScrewdriverIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Service Requests</h4>
              <p className="text-xs text-gray-600">Submit detailed service requests</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Available Services:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>🔧 HVAC Repair</div>
              <div>🔧 Plumbing</div>
              <div>⚡ Electrical</div>
              <div>🧹 Cleaning</div>
              <div>🏠 Maintenance</div>
              <div>📋 Custom Services</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Stay Connected & Informed",
      subtitle: "Multiple ways to stay in touch",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Real-time Messages</h4>
                <p className="text-sm text-gray-600">Get updates on your service requests</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <PhoneIcon className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Direct Contact</h4>
                <p className="text-sm text-gray-600">Call your assigned technician directly</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Easy Payments</h4>
                <p className="text-sm text-gray-600">Secure online invoice payments</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 text-center">
            <h4 className="font-medium text-gray-900 mb-2">Ready to get started?</h4>
            <p className="text-sm text-gray-600">
              Everything you need is right here in your dashboard. Welcome aboard!
            </p>
          </div>
        </div>
      )
    }
  ]

  const currentWelcomeStep = welcomeSteps[currentStep]
  const isLastStep = currentStep === welcomeSteps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity">
          <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{currentWelcomeStep.title}</h3>
                <p className="text-blue-100 text-sm">{currentWelcomeStep.subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {currentWelcomeStep.content}
          </div>

          {/* Progress indicator */}
          <div className="px-6 pb-2">
            <div className="flex space-x-2">
              {welcomeSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
            <div className="flex space-x-3">
              {!isLastStep ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                >
                  Get Started!
                </button>
              )}
              
              {!isFirstStep && !isLastStep && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex-1">
              <button
                onClick={onDontShowAgain}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Don't show this again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal Components (existing components remain the same)
function ServiceRequestModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    service_type: '',
    priority: 'medium',
    description: '',
    location: '',
    preferred_date: '',
    preferred_time: ''
  })

  const serviceTypes = [
    { value: 'hvac_repair', label: 'HVAC Repair', icon: '🔧' },
    { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
    { value: 'electrical', label: 'Electrical', icon: '⚡' },
    { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { value: 'other', label: 'Other', icon: '📋' }
  ]

  const handleSubmit = async () => {
    try {
      const response = await api.post('/customer-portal/service-requests', formData)
      alert('Service request submitted successfully!')
      onClose()
    } catch (error) {
      alert('Error submitting request')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Request Service</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Service Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceTypes.map((service) => (
                <label
                  key={service.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    formData.service_type === service.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="service_type"
                    value={service.value}
                    checked={formData.service_type === service.value}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="sr-only"
                  />
                  <span className="text-2xl mr-3">{service.icon}</span>
                  <span className="text-sm font-medium">{service.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.service_type}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe the issue or service needed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Lahore, US, London"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                value={formData.preferred_date}
                onChange={(e) => setFormData({...formData, preferred_date: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time
              </label>
              <select
                value={formData.preferred_time}
                onChange={(e) => setFormData({...formData, preferred_time: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Any time</option>
                <option value="morning">Morning (8AM-12PM)</option>
                <option value="afternoon">Afternoon (12PM-6PM)</option>
                <option value="evening">Evening (6PM-8PM)</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.description || !formData.location}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Job Tracking Modal with better messaging
function JobTrackingModal({ appointment, onClose }) {
  const { data: jobData, isLoading, error } = useQuery({
    queryKey: ['job-tracking', appointment?.id],
    queryFn: async () => {
      const response = await api.get(`/customer-portal/jobs/tracking/${appointment.id}`)
      return response.data
    },
    refetchInterval: 5000,
    enabled: !!appointment?.id,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Job Tracking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  // If no detailed job data is available yet, show appointment details
  const job = jobData?.job || appointment
  const status_history = jobData?.status_history || []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Job Tracking</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Job Overview */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-blue-900">
              {job.job_number ? `Job #${job.job_number}` : `Appointment #${job.id}`}
            </h3>
            <p className="text-blue-700">{job.service_type}</p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            {job.status?.replace('_', ' ').toUpperCase() || 'CONFIRMED'}
          </span>
        </div>
        
        {/* Scheduled Time Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-blue-700">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>
              {new Date(job.scheduled_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center text-blue-700">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>
              {job.start_time && job.end_time 
                ? `${new Date(`2000-01-01T${job.start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(`2000-01-01T${job.end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                : 'Time will be confirmed soon'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Technician Assignment */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-gray-600" />
          Technician Assignment
        </h4>
        
        {(job.technician && job.technician.name) || job.technician_name ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {job.technician?.name || job.technician_name}
                </div>
                <div className="text-sm text-gray-600">Professional Technician</div>
                {(job.technician?.phone || job.technician_phone) && (
                  <div className="text-sm text-gray-600">
                    📞 {job.technician?.phone || job.technician_phone}
                  </div>
                )}
              </div>
            </div>
            {(job.technician?.phone || job.technician_phone) && (
              <a
                href={`tel:${job.technician?.phone || job.technician_phone}`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center"
              >
                <PhoneIcon className="h-4 w-4 mr-1" />
                Call
              </a>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TruckIcon className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h5 className="font-medium text-yellow-800">Technician Assignment in Progress</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  We're currently assigning the best available technician for your service. 
                  You'll receive an update with technician details within the next few hours.
                </p>
                <div className="mt-3 text-xs text-yellow-600">
                  <div className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Expected assignment: Within 2-4 hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Status and Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Job Progress</h4>
        
        {status_history && status_history.length > 0 ? (
          <div className="space-y-4">
            {status_history.map((status, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                  index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 capitalize">
                      {status.status.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(status.created_at).toLocaleString()}
                    </div>
                  </div>
                  {status.message && (
                    <div className="text-sm text-gray-600 mt-1">{status.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Default status for new appointments */}
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 bg-green-500 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">Appointment Confirmed</div>
                  <div className="text-sm text-gray-500">
                    {new Date(job.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Your service appointment has been confirmed and is being processed.
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 bg-yellow-400 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Technician Assignment</div>
                <div className="text-sm text-gray-600 mt-1">
                  {(job.technician && job.technician.name) || job.technician_name 
                    ? `Assigned to ${job.technician?.name || job.technician_name}`
                    : 'Our team is assigning the best technician for your service'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 bg-gray-300 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-medium text-gray-500">Service Scheduled</div>
                <div className="text-sm text-gray-500 mt-1">
                  Technician will arrive as scheduled on {new Date(job.scheduled_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">What to expect:</p>
            <ul className="mt-2 text-blue-700 space-y-1">
              <li>• You'll receive SMS/email updates about technician arrival</li>
              <li>• Our technician will call you 30 minutes before arrival</li>
              <li>• All work will be explained before we begin</li>
              <li>• Payment can be processed on-site or through your portal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function CustomerDashboard() {
  const [activeModal, setActiveModal] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)
  const { user } = useAuthStore()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const response = await api.get('/customer-portal/dashboard')
      return response.data
    },
  })

  // Check if customer is new and should see welcome popup
  useEffect(() => {
    const checkIfNewCustomer = () => {
      // Check if user has seen welcome popup before
      const hasSeenWelcome = localStorage.getItem(`welcome-popup-seen-${user?.id}`)
      
      if (!hasSeenWelcome && dashboardData?.customer) {
        const customer = dashboardData.customer
        const customerSince = new Date(customer.customer_since)
        const now = new Date()
        const daysSinceRegistered = (now - customerSince) / (1000 * 60 * 60 * 24)
        
        // Show popup for customers registered within last 7 days
        if (daysSinceRegistered <= 7) {
          setShowWelcomePopup(true)
        }
      }
    }

    if (dashboardData && user) {
      checkIfNewCustomer()
    }
  }, [dashboardData, user])

  const handleWelcomePopupClose = () => {
    setShowWelcomePopup(false)
    // Mark as seen for this session
    localStorage.setItem(`welcome-popup-seen-${user?.id}`, 'true')
  }

  const handleDontShowAgain = () => {
    setShowWelcomePopup(false)
    // Permanently mark as seen
    localStorage.setItem(`welcome-popup-seen-${user?.id}`, 'permanent')
  }

  const handleTrackJob = (appointment) => {
    setSelectedAppointment(appointment)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      sent: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const customer = dashboardData?.customer || {}
  const stats = dashboardData?.stats || {}
  const upcomingAppointments = dashboardData?.upcoming_appointments || []
  const recentServices = dashboardData?.recent_services || []
  const outstandingInvoices = dashboardData?.outstanding_invoices || []
  const serviceRequests = dashboardData?.service_requests || []
  const recentMessages = dashboardData?.recent_messages || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Popup for New Customers */}
      {showWelcomePopup && (
        <WelcomePopup
          customer={customer}
          onClose={handleWelcomePopupClose}
          onDontShowAgain={handleDontShowAgain}
        />
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {customer.first_name || 'Customer'}!
              </h1>
              <p className="text-sm text-gray-600">
                Customer since {customer.customer_since ? new Date(customer.customer_since).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <BellIcon className="h-6 w-6" />
                {stats.unread_messages > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.unread_messages}
                  </span>
                )}
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Next Appointment</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {upcomingAppointments[0] ? 
                      formatDate(upcomingAppointments[0].scheduled_date) : 
                      'No upcoming'
                    }
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <CreditCardIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Outstanding Balance</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.outstanding_balance || 0)}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <ChartBarIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Services</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.total_jobs || 0}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-orange-600 flex-shrink-0" />
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pending_requests || 0}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveModal('service-request')}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Request Service
              </button>
              
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <ClockIcon className="h-5 w-5 mr-2" />
                View Service History
              </button>
              
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Appointments */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
              </div>
              <div className="p-6">
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {appointment.service_type}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                {appointment.status}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {formatDate(appointment.scheduled_date)}
                              </div>
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-2" />
                                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                              </div>
                              {appointment.technician_name && (
                                <div className="flex items-center">
                                  <UserIcon className="h-4 w-4 mr-2" />
                                  <span className="font-medium text-blue-600">{appointment.technician_name}</span>
                                  {appointment.technician_phone && (
                                    <span className="ml-2 text-gray-500">• {appointment.technician_phone}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => handleTrackJob(appointment)}
                            className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 flex items-center"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            Track Job
                          </button>
                          {appointment.technician_phone && (
                            <a
                              href={`tel:${appointment.technician_phone}`}
                              className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200 flex items-center"
                            >
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              Call
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No upcoming appointments scheduled</p>
                    <button 
                      onClick={() => setActiveModal('service-request')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Schedule Service
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Services */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Services</h3>
              </div>
              <div className="p-6">
                {recentServices.length > 0 ? (
                  <div className="space-y-4">
                    {recentServices.slice(0, 3).map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {service.service_type}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                                {service.status}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Completed: {formatDate(service.completed_date)}
                              </div>
                              {service.technician_name && (
                                <div className="flex items-center">
                                  <UserIcon className="h-4 w-4 mr-2" />
                                  {service.technician_name}
                                </div>
                              )}
                              {service.total_amount && (
                                <div className="flex items-center">
                                  <CreditCardIcon className="h-4 w-4 mr-2" />
                                  {formatCurrency(service.total_amount)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {service.rating && (
                          <div className="mt-3 flex items-center">
                            <span className="text-sm text-gray-600 mr-2">Your rating:</span>
                            <div className="flex">{renderStars(service.rating)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent services</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Messages */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Messages</h3>
              </div>
              <div className="p-6">
                {recentMessages.length > 0 ? (
                  <div className="space-y-4">
                    {recentMessages.slice(0, 3).map((message) => (
                      <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {message.subject || 'Service Update'}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {message.message}
                        </p>
                        {!message.read && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                            New
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Customer Info */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-gray-600">Customer</div>
                  </div>
                </div>
                
                {customer.email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-sm text-gray-900">{customer.email}</div>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-sm text-gray-900">{customer.phone}</div>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="text-sm text-gray-900">{customer.address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Outstanding Invoices */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Outstanding Invoices</h3>
              </div>
              <div className="p-6">
                {outstandingInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Invoice #{invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-600">
                              Due: {formatDate(invoice.due_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.total_amount)}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                        {invoice.status === 'overdue' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                            This invoice is overdue
                          </div>
                        )}
                        <button className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                          Pay Now
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-500">All invoices are paid!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Service Requests */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Service Requests</h3>
              </div>
              <div className="p-6">
                {serviceRequests.length > 0 ? (
                  <div className="space-y-4">
                    {serviceRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {request.service_type}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {request.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          Submitted: {formatDate(request.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No pending requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Request Modal */}
      {activeModal === 'service-request' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setActiveModal(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <ServiceRequestModal onClose={() => setActiveModal(null)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Job Tracking Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setSelectedAppointment(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <JobTrackingModal appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Widget */}
      <ChatbotWidget 
        companyId="68af46dab1355f0072ad6fa1" 
        position="bottom-right"
        theme="light"
      />
    </div>
  )
}