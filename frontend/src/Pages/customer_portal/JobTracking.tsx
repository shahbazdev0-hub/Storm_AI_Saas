import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  UserIcon,
  PhotoIcon,
  CheckCircleIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  StarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

export default function JobTracking({ jobId, onClose }) {
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  
  // Fetch job tracking data with auto-refresh
  const { data: jobData, isLoading, refetch } = useQuery({
    queryKey: ['job-tracking', jobId],
    queryFn: async () => {
      const response = await api.get(`/customer-portal/jobs/tracking/${jobId}`)
      return response.data
    },
    refetchInterval: refreshInterval,
    enabled: !!jobId,
  })

  // Stop auto-refresh when job is completed
  useEffect(() => {
    if (jobData?.job?.status === 'completed') {
      setRefreshInterval(null)
    }
  }, [jobData?.job?.status])

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800', 
      dispatched: 'bg-yellow-100 text-yellow-800',
      on_the_way: 'bg-orange-100 text-orange-800',
      arrived: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return <ClockIcon className="h-5 w-5" />
      case 'dispatched':
      case 'on_the_way':
        return <TruckIcon className="h-5 w-5" />
      case 'arrived':
        return <MapPinIcon className="h-5 w-5" />
      case 'in_progress':
        return <WrenchScrewdriverIcon className="h-5 w-5" />
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5" />
      default:
        return <ClockIcon className="h-5 w-5" />
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(timeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateProgress = (status) => {
    const stages = ['scheduled', 'confirmed', 'dispatched', 'on_the_way', 'arrived', 'in_progress', 'completed']
    const currentIndex = stages.indexOf(status)
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!jobData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-500">Job not found or access denied</p>
        {onClose && (
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        )}
      </div>
    )
  }

  const { job, status_history } = jobData
  const progress = calculateProgress(job.status)

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">Job #{job.job_number}</h2>
            <p className="text-blue-100">{job.service_type}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)} bg-white`}>
              {getStatusIcon(job.status)}
              <span className="ml-2 capitalize">{job.status.replace('_', ' ')}</span>
            </div>
            <div className="text-sm text-blue-100 mt-1">
              {formatDate(job.scheduled_date)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="bg-blue-500 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-100 mt-1">
            {Math.round(progress)}% Complete
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Technician Info */}
        {job.technician.name && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Your Technician
            </h3>
            <div className="flex items-center space-x-4">
              {job.technician.photo && (
                <img 
                  src={job.technician.photo}
                  alt={job.technician.name}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{job.technician.name}</div>
                {job.technician.phone && (
                  <div className="text-sm text-gray-600 flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    <a href={`tel:${job.technician.phone}`} className="hover:text-blue-600">
                      {job.technician.phone}
                    </a>
                  </div>
                )}
              </div>
              {job.technician.location && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      Location updated {formatTime(job.technician.location.updated_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estimated Arrival */}
        {jobData.estimated_arrival && job.status !== 'completed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-yellow-800">
                  Estimated Arrival: {formatTime(jobData.estimated_arrival)}
                </div>
                <div className="text-xs text-yellow-600">
                  Times may vary due to traffic and previous appointments
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Details */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Job Details</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700">Description</div>
              <div className="text-sm text-gray-600">{job.description || 'No description provided'}</div>
            </div>
            
            {job.scheduled_time_start && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Scheduled Time</div>
                  <div className="text-sm text-gray-600">
                    {formatTime(job.scheduled_time_start)} - {formatTime(job.scheduled_time_end)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Estimated Duration</div>
                  <div className="text-sm text-gray-600">{job.estimated_duration} minutes</div>
                </div>
              </div>
            )}

            {job.special_instructions && (
              <div>
                <div className="text-sm font-medium text-gray-700">Special Instructions</div>
                <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                  {job.special_instructions}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Work Progress */}
        {job.work_performed.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Work Performed</h3>
            <div className="space-y-2">
              {job.work_performed.map((work, index) => (
                <div key={index} className="flex items-center text-sm">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">{work}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {job.before_photos.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-1" />
                Before Photos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {job.before_photos.slice(0, 4).map((photo, index) => (
                  <img 
                    key={index}
                    src={photo}
                    alt={`Before photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {job.progress_photos.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-1" />
                Progress Photos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {job.progress_photos.slice(0, 4).map((photo, index) => (
                  <img 
                    key={index}
                    src={photo}
                    alt={`Progress photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {job.after_photos.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-1" />
                After Photos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {job.after_photos.slice(0, 4).map((photo, index) => (
                  <img 
                    key={index}
                    src={photo}
                    alt={`After photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Rating & Feedback */}
        {job.status === 'completed' && (
          <div className="border-t border-gray-200 pt-6">
            {job.customer_rating ? (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Your Rating</h3>
                  <div className="flex items-center">
                    {renderStars(job.customer_rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      {job.customer_rating}/5
                    </span>
                  </div>
                </div>
                {job.customer_feedback && (
                  <div className="text-sm text-gray-700 mt-2">
                    "{job.customer_feedback}"
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600 mb-3">
                  How was your service experience?
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                  Rate This Service
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status History Timeline */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4">Status History</h3>
          <div className="space-y-3">
            {status_history.map((status, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {status.status.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(status.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {status.message}
                  </div>
                  {status.created_by && (
                    <div className="text-xs text-gray-500">
                      Updated by {status.created_by}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        {job.next_steps && job.next_steps.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
            <div className="space-y-1">
              {job.next_steps.map((step, index) => (
                <div key={index} className="text-sm text-blue-800 flex items-start">
                  <span className="font-medium mr-2">{index + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Options */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          {job.technician.phone && (
            <a
              href={`tel:${job.technician.phone}`}
              className="flex-1 bg-green-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
            >
              Call Technician
            </a>
          )}
          <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
            Send Message
          </button>
        </div>

        {/* Auto-refresh indicator */}
        {refreshInterval && job.status !== 'completed' && (
          <div className="text-center pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-2"></div>
              Auto-refreshing every 5 seconds
            </div>
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200"
            >
              Close Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}