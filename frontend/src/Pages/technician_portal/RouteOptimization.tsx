// src/pages/technician_portal/RouteOptimization.tsx - Cleaned Version
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  MapPinIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  TruckIcon,
  ArrowLongRightIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

export default function RouteOptimization() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('en-US', options)
  }

  // Fetch optimized route data
  const { data, isLoading, error } = useQuery({
    queryKey: ['technician-route', selectedDate],
    queryFn: async () => {
      const response = await api.get(`/technician-portal/route-optimization?date=${selectedDate}`)
      return response.data
    }
  })

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Open navigation for a job
  const openNavigation = (location) => {
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=driving`
      window.open(url, '_blank')
    } else if (location.full_address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.full_address)}`
      window.open(url, '_blank')
    } else {
      // Fallback - search for customer name + city
      const searchQuery = `${location.customer_name || 'Service Location'} Lahore`
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
      window.open(url, '_blank')
    }
  }

  // Open route navigation for all jobs
  const openFullRoute = () => {
    if (!data || !data.route || data.route.length === 0) return

    // Filter jobs with valid addresses
    const validJobs = data.route.filter(job => 
      job.location && (job.location.latitude || job.location.full_address)
    )

    if (validJobs.length === 0) return

    // For Google Maps, we need waypoints
    let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    
    // First location as origin
    const origin = validJobs[0].location
    if (origin.latitude && origin.longitude) {
      url += `&origin=${origin.latitude},${origin.longitude}`
    } else {
      url += `&origin=${encodeURIComponent(origin.full_address)}`
    }
    
    // Last location as destination
    const destination = validJobs[validJobs.length - 1].location
    if (destination.latitude && destination.longitude) {
      url += `&destination=${destination.latitude},${destination.longitude}`
    } else {
      url += `&destination=${encodeURIComponent(destination.full_address)}`
    }

    // Add waypoints for locations in between (Google Maps has a limit of 9 waypoints)
    if (validJobs.length > 2) {
      const waypoints = validJobs.slice(1, -1).slice(0, 9).map(job => {
        if (job.location.latitude && job.location.longitude) {
          return `${job.location.latitude},${job.location.longitude}`
        }
        return encodeURIComponent(job.location.full_address)
      }).join('|')

      url += `&waypoints=${waypoints}`
    }

    window.open(url, '_blank')
  }

  // Get priority color class
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-gray-400',
      medium: 'border-yellow-400',
      high: 'border-orange-400',
      urgent: 'border-red-400',
      emergency: 'border-red-600'
    }
    return colors[priority] || 'border-gray-400'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load route data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const route = data?.route || []
  const totalJobs = route.length
  // Removed totalTime and travelTime since they're dummy data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Route Schedule</h1>
          <p className="text-gray-600">View your scheduled service appointments in order</p>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-medium text-gray-900">
                Schedule for {formatDateForDisplay(selectedDate)}
              </h2>
              <p className="text-sm text-gray-600">
                {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} scheduled
              </p>
            </div>
            {totalJobs > 0 && (
              <button
                onClick={openFullRoute}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                Open Route in Maps
              </button>
            )}
          </div>
        </div>

        {/* Route Display */}
        {totalJobs === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No jobs scheduled for this date</p>
            <p className="text-sm text-gray-400 mt-2">Select a different date or check your schedule</p>
          </div>
        ) : (
          <div className="space-y-6">
            {route.map((job, index) => (
              <div key={job.id} className="relative">
                {/* Connector Line */}
                {index < route.length - 1 && (
                  <div className="absolute left-6 top-24 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                )}
                
                {/* Job Card */}
                <div className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(job.priority)} relative z-10`}>
                  {/* Stop Number */}
                  <div className="absolute -left-4 top-6 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="p-4 pl-8">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {job.title || job.service_type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {job.job_number} • {job.service_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(job.time_window.scheduled_start)} - {formatTime(job.time_window.scheduled_end)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.time_window.estimated_duration} min duration
                        </p>
                      </div>
                    </div>

                    {/* Customer & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm">
                          <span className="text-gray-600">Customer:</span> {job.customer.name}
                          {job.customer.phone && (
                            <a 
                              href={`tel:${job.customer.phone}`}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <PhoneIcon className="h-4 w-4 inline" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div className="text-sm text-gray-600">
                          {job.location.full_address || 'Address to be confirmed'}
                        </div>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    {job.special_instructions && (
                      <div className="mb-3 bg-yellow-50 border border-yellow-100 rounded-md p-3 text-sm text-yellow-800">
                        <strong>Special Instructions:</strong> {job.special_instructions}
                      </div>
                    )}

                    {/* Job Priority */}
                    {job.priority && job.priority !== 'medium' && (
                      <div className="mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.priority === 'urgent' || job.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                          job.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          job.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.priority.toUpperCase()} Priority
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link
                        to={`/technician-portal/jobs/${job.id}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                      
                      <button
                        onClick={() => openNavigation(job.location)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                        Navigate
                      </button>

                      {job.customer.phone && (
                        <a
                          href={`tel:${job.customer.phone}`}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 flex items-center"
                        >
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          Call Customer
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time indicator between jobs */}
                {index < route.length - 1 && (
                  <div className="flex items-center justify-center py-3 relative z-10">
                    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm text-gray-600 border">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <span>Next appointment</span>
                      <ArrowLongRightIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* End of Route */}
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
                <MapPinIcon className="h-6 w-6" />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">Route Complete</p>
              <p className="text-xs text-gray-500">All jobs for {formatDateForDisplay(selectedDate)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}