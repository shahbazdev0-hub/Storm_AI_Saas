import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { api } from '../../services/api'

export default function ServiceRequestForm() {
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedRequest, setSubmittedRequest] = useState(null)
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    service_type: '',
    priority: 'medium',
    preferred_date: '',
    preferred_time: '',
    description: '',
    location: '',
    contact_phone: '',
    special_instructions: '',
    attachments: []
  })

  const [errors, setErrors] = useState({})

  const serviceTypes = [
    { value: 'hvac_repair', label: 'HVAC Repair', icon: '🔧' },
    { value: 'hvac_maintenance', label: 'HVAC Maintenance', icon: '⚙️' },
    { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
    { value: 'electrical', label: 'Electrical', icon: '⚡' },
    { value: 'appliance_repair', label: 'Appliance Repair', icon: '🔧' },
    { value: 'cleaning', label: 'Cleaning Service', icon: '🧹' },
    { value: 'inspection', label: 'Inspection', icon: '🔍' },
    { value: 'emergency', label: 'Emergency Service', icon: '🚨' },
    { value: 'other', label: 'Other Service', icon: '📋' }
  ]

  const priorityLevels = [
    { value: 'low', label: 'Low Priority', description: 'Can wait 1-2 weeks', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium Priority', description: 'Within a few days', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High Priority', description: 'Within 24 hours', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', description: 'Same day service needed', color: 'bg-red-100 text-red-800' }
  ]

  const timeSlots = [
    '8:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    'Any Time'
  ]

  const submitRequestMutation = useMutation({
    mutationFn: async (requestData) => {
      const response = await api.post('/customer-portal/service-requests', requestData)
      return response.data
    },
    onSuccess: (data) => {
      setSubmittedRequest(data)
      setIsSubmitted(true)
      queryClient.invalidateQueries(['customer-dashboard'])
      queryClient.invalidateQueries(['service-requests'])
      toast.success('Service request submitted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to submit service request')
    }
  })

  const validateStep = (stepNumber) => {
    const stepErrors = {}

    switch (stepNumber) {
      case 1:
        if (!formData.service_type) stepErrors.service_type = 'Please select a service type'
        if (!formData.priority) stepErrors.priority = 'Please select priority level'
        break
      case 2:
        if (!formData.description.trim()) stepErrors.description = 'Please describe the issue'
        if (formData.description.length < 10) stepErrors.description = 'Please provide more details (at least 10 characters)'
        if (!formData.location.trim()) stepErrors.location = 'Please specify the service location'
        break
      case 3:
        // Optional fields, no validation needed
        break
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    setErrors({})
  }

  const handleSubmit = () => {
    if (validateStep(step)) {
      submitRequestMutation.mutate(formData)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg relative z-10">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your service request has been received and we'll contact you soon.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Request Number:</span>
                <span className="font-mono font-medium">{submittedRequest?.request_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  {submittedRequest?.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service Type:</span>
                <span className="font-medium">
                  {serviceTypes.find(s => s.value === formData.service_type)?.label}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsSubmitted(false)
                setFormData({
                  service_type: '',
                  priority: 'medium',
                  preferred_date: '',
                  preferred_time: '',
                  description: '',
                  location: '',
                  contact_phone: '',
                  special_instructions: '',
                  attachments: []
                })
                setStep(1)
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Submit Another Request
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg ">
      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Request Service</h1>
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`flex items-center ${stepNum < 3 ? 'mr-4' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum <= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      stepNum < step ? 'bg-blue-600' : 'bg-gray-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Service Type & Priority */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                What type of service do you need?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serviceTypes.map((service) => (
                  <label
                    key={service.value}
                    className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      formData.service_type === service.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="service_type"
                      value={service.value}
                      checked={formData.service_type === service.value}
                      onChange={(e) => updateFormData('service_type', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{service.icon}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {service.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.service_type && (
                <p className="mt-2 text-sm text-red-600">{errors.service_type}</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                How urgent is this request?
              </h3>
              <div className="space-y-3">
                {priorityLevels.map((priority) => (
                  <label
                    key={priority.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={(e) => updateFormData('priority', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-gray-900">{priority.label}</div>
                        <div className="text-sm text-gray-600">{priority.description}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priority.color}`}>
                        {priority.label.split(' ')[0]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.priority && (
                <p className="mt-2 text-sm text-red-600">{errors.priority}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Describe the issue or service needed *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide as much detail as possible about what you need..."
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Service Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Living room, Kitchen, Basement, etc."
              />
              {errors.location && (
                <p className="mt-2 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={formData.preferred_date}
                  onChange={(e) => updateFormData('preferred_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  Preferred Time
                </label>
                <select
                  value={formData.preferred_time}
                  onChange={(e) => updateFormData('preferred_time', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Additional Information */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="h-4 w-4 inline mr-1" />
                Contact Phone (if different from account)
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => updateFormData('contact_phone', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional alternative phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => updateFormData('special_instructions', e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special instructions, access codes, or important notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PaperClipIcon className="h-4 w-4 inline mr-1" />
                Attachments (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  Drag files here or click to upload photos or documents
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, PDF up to 10MB each
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div className="text-sm text-yellow-700">
                  <strong>Please note:</strong> This is a service request, not a confirmed appointment. 
                  Our team will review your request and contact you to schedule the service.
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Request Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Type:</span>
                  <span className="font-medium">
                    {serviceTypes.find(s => s.value === formData.service_type)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    priorityLevels.find(p => p.value === formData.priority)?.color
                  }`}>
                    {priorityLevels.find(p => p.value === formData.priority)?.label}
                  </span>
                </div>
                {formData.preferred_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preferred Date:</span>
                    <span className="font-medium">
                      {new Date(formData.preferred_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {formData.preferred_time && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preferred Time:</span>
                    <span className="font-medium">{formData.preferred_time}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-4 py-2 border border-gray-800 rounded-md text-sm font-medium ${
              step === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitRequestMutation.isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-75 disabled:cursor-not-allowed flex items-center"
            >
              {submitRequestMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}