// frontend/src/Pages/technician_portal/TechnicianSchedule.tsx
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

export default function TechnicianSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week') // 'week', 'month'

  // Calculate date range for current view
  const getDateRange = () => {
    if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return { start: startOfWeek, end: endOfWeek }
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      return { start: startOfMonth, end: endOfMonth }
    }
  }

  const { start: startDate, end: endDate } = getDateRange()

  // Fetch calendar data
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['technician-calendar', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      
      const response = await api.get(`/scheduling/technician-calendar?${params.toString()}`)
      return response.data
    },
    refetchInterval: 30000
  })

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7))
    } else {
      newDate.setMonth(currentDate.getMonth() + direction)
    }
    setCurrentDate(newDate)
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'All day'
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 6; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    return slots
  }

  const generateWeekDays = () => {
    const days = []
    const startOfWeek = new Date(startDate)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getJobsForDay = (date) => {
    if (!calendarData?.events) return []
    
    return calendarData.events.filter(job => {
      const jobDate = new Date(job.start)
      return jobDate.toDateString() === date.toDateString()
    })
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
          <p className="text-red-600">Failed to load schedule</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
              <p className="mt-2 text-gray-600">
                View your upcoming jobs and appointments
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  view === 'week'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                  view === 'month'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <h2 className="text-lg font-semibold text-gray-900">
                {view === 'week' ? (
                  `${formatDate(startDate)} - ${formatDate(endDate)}`
                ) : (
                  currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
                )}
              </h2>
              
              <button
                onClick={() => navigateDate(1)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="p-6">
            {view === 'week' ? (
              // Week View
              <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {/* Time column header */}
                <div className="bg-gray-50 p-2">
                  <div className="text-xs font-medium text-gray-500">Time</div>
                </div>
                
                {/* Day headers */}
                {generateWeekDays().map((day, index) => (
                  <div key={index} className="bg-gray-50 p-2">
                    <div className="text-xs font-medium text-gray-500">
                      {day.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {day.getDate()}
                    </div>
                  </div>
                ))}

                {/* Time slots */}
                {generateTimeSlots().map((timeSlot) => (
                  <React.Fragment key={timeSlot}>
                    {/* Time label */}
                    <div className="bg-white p-2 text-xs text-gray-500">
                      {timeSlot}
                    </div>
                    
                    {/* Day columns */}
                    {generateWeekDays().map((day, dayIndex) => (
                      <div key={`${timeSlot}-${dayIndex}`} className="bg-white p-1 min-h-[60px] relative">
                        {/* Jobs for this time slot */}
                        {getJobsForDay(day)
                          .filter(job => {
                            const jobTime = formatTime(job.start)
                            return jobTime.startsWith(timeSlot.split(':')[0])
                          })
                          .map((job) => (
                            <div
                              key={job.id}
                              className={`absolute inset-x-1 top-1 p-1 rounded text-xs border ${getStatusColor(job.status)} cursor-pointer hover:shadow-md transition-shadow`}
                              title={`${job.title} - ${job.customer_name}`}
                            >
                              <div className="font-medium truncate">{job.title}</div>
                              <div className="truncate">{job.customer_name}</div>
                            </div>
                          ))
                        }
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              // Month View - Simple list by day
              <div className="space-y-4">
                {generateWeekDays().map((day) => {
                  const dayJobs = getJobsForDay(day)
                  return (
                    <div key={day.toISOString()} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h3 className="font-medium text-gray-900">
                          {day.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                      </div>
                      <div className="p-4">
                        {dayJobs.length > 0 ? (
                          <div className="space-y-2">
                            {dayJobs.map((job) => (
                              <div
                                key={job.id}
                                className={`p-3 rounded-md border ${getStatusColor(job.status)}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium">{job.title}</div>
                                    <div className="text-sm opacity-75">
                                      <UserIcon className="h-4 w-4 inline mr-1" />
                                      {job.customer_name}
                                    </div>
                                    {job.address && (
                                      <div className="text-sm opacity-75">
                                        <MapPinIcon className="h-4 w-4 inline mr-1" />
                                        {job.address}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm opacity-75">
                                    <ClockIcon className="h-4 w-4 inline mr-1" />
                                    {formatTime(job.start)} - {formatTime(job.end)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No jobs scheduled</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calendarData?.total_count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calendarData?.events?.filter(job => {
                    const jobDate = new Date(job.start)
                    return jobDate >= startDate && jobDate <= endDate
                  }).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getJobsForDay(new Date()).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}