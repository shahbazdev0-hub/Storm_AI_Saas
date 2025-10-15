// frontend/src/pages/field-service/GPS-Tracking.tsx - WITH OPENSTREETMAP
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

import { api } from '../../services/api'

// Leaflet types
declare global {
  interface Window {
    L: any
  }
}

interface TechnicianLocation {
  id: string
  name: string
  phone: string
  employee_id: string
  current_location: {
    lat: number
    lng: number
    address: string
    accuracy: number
    last_updated: string
    speed: number
    heading: number
    altitude?: number
  }
  status: 'online' | 'offline' | 'idle' | 'driving' | 'on_job'
  current_job?: {
    id: string
    customer_name: string
    address: string
    scheduled_start: string
    estimated_arrival: string
    status: string
    service_type: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
  }
  todays_route: Array<{
    id: string
    customer_name: string
    address: string
    lat: number
    lng: number
    scheduled_time: string
    status: 'pending' | 'en_route' | 'arrived' | 'completed'
    estimated_duration: number
    service_type: string
    distance_from_previous?: number
  }>
  performance: {
    jobs_completed: number
    miles_driven: number
    hours_worked: number
    on_time_percentage: number
    avg_speed: number
    fuel_efficiency?: number
  }
  vehicle_info?: {
    make: string
    model: string
    year: number
    license_plate: string
    fuel_level?: number
  }
}

// OpenStreetMap Component using Leaflet
const OpenStreetMap = ({ technicians, selectedTechnician, onTechnicianClick }: {
  technicians: TechnicianLocation[]
  selectedTechnician: string | null
  onTechnicianClick: (id: string) => void
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())

  const statusColors = {
    online: '#10B981',    // green
    offline: '#EF4444',   // red
    idle: '#F59E0B',      // yellow
    driving: '#3B82F6',   // blue
    on_job: '#8B5CF6'     // purple
  }

  useEffect(() => {
    // Add a flag to prevent double initialization in React strict mode
    let isInitialized = false
    
    // Load Leaflet CSS and JS
    const loadLeaflet = () => {
      if (isInitialized) {
        console.log('Leaflet loading already in progress, skipping...')
        return
      }
      
      isInitialized = true
      
      if (window.L) {
        initializeMap()
        return
      }

      // Check if Leaflet CSS is already loaded
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(cssLink)
      }

      // Check if Leaflet JS is already loaded
      if (!document.querySelector('script[src*="leaflet.js"]')) {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = initializeMap
        document.head.appendChild(script)
      } else {
        initializeMap()
      }
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.L) return

      // Initialize map centered on Lahore, Pakistan
      const map = window.L.map(mapRef.current).setView([31.5497, 74.3436], 12)

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map)

      mapInstanceRef.current = map
      updateMarkers()
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && technicians.length > 0) {
      updateMarkers()
      fitMapToMarkers()
    }
  }, [technicians, selectedTechnician])

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        try {
          if (marker && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(marker)
          }
        } catch (error) {
          console.warn('Error removing marker:', error)
        }
      })
      markersRef.current.clear()

      technicians.forEach(technician => {
        if (!technician.current_location || 
            !technician.current_location.lat || 
            !technician.current_location.lng) return

        try {
          const position = [technician.current_location.lat, technician.current_location.lng]
          const isSelected = selectedTechnician === technician.id

          // Create custom icon
          const iconHtml = `
            <div style="
              width: ${isSelected ? '24px' : '16px'};
              height: ${isSelected ? '24px' : '16px'};
              background-color: ${statusColors[technician.status]};
              border: ${isSelected ? '3px' : '2px'} solid ${isSelected ? '#1F2937' : '#FFFFFF'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ${isSelected ? 'animation: pulse 2s infinite;' : ''}
            ">
              <div style="
                width: 8px;
                height: 8px;
                background-color: white;
                border-radius: 50%;
              "></div>
            </div>
          `

          const customIcon = window.L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [isSelected ? 24 : 16, isSelected ? 24 : 16],
            iconAnchor: [isSelected ? 12 : 8, isSelected ? 12 : 8]
          })

          // Create marker
          const marker = window.L.marker(position, { icon: customIcon }).addTo(mapInstanceRef.current)

          // Create popup content
          const popupContent = createPopupContent(technician)
          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'technician-popup'
          })

          // Add click listener
          marker.on('click', () => {
            onTechnicianClick(technician.id)
            marker.openPopup()
          })

          markersRef.current.set(technician.id, marker)

          // Auto-open popup for selected technician
          if (isSelected) {
            marker.openPopup()
          }
        } catch (error) {
          console.warn('Error creating marker for technician:', technician.name, error)
        }
      })
    } catch (error) {
      console.error('Error updating markers:', error)
    }
  }

  const createPopupContent = (technician: TechnicianLocation) => {
    const lastUpdate = new Date(technician.current_location.last_updated).toLocaleTimeString()
    
    return `
      <div style="font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="
            width: 12px; 
            height: 12px; 
            background-color: ${statusColors[technician.status]}; 
            border-radius: 50%; 
            margin-right: 8px;
          "></div>
          <strong style="font-size: 16px; color: #1F2937;">${technician.name}</strong>
        </div>
        
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
          <strong>ID:</strong> ${technician.employee_id} | 
          <strong>Status:</strong> ${technician.status.replace('_', ' ')}
        </div>
        
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
          <strong>📍 Location:</strong> ${technician.current_location.address}
        </div>
        
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
          <strong>🚗 Speed:</strong> ${technician.current_location.speed} mph |
          <strong>📞 Phone:</strong> ${technician.phone || 'N/A'}
        </div>
        
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">
          <strong>⏰ Updated:</strong> ${lastUpdate}
        </div>
        
        ${technician.current_job ? `
          <div style="
            background: #EBF8FF; 
            padding: 8px; 
            border-radius: 4px; 
            font-size: 12px;
            margin-bottom: 8px;
          ">
            <strong style="color: #1E40AF;">Current Job:</strong><br>
            <span style="color: #1E40AF;">${technician.current_job.customer_name}</span><br>
            <span style="color: #3B82F6;">${technician.current_job.service_type}</span>
          </div>
        ` : ''}
        
        <div style="
          margin-top: 8px; 
          font-size: 11px; 
          color: #9CA3AF;
          display: flex;
          justify-content: space-between;
        ">
          <span><strong>Jobs:</strong> ${technician.performance?.jobs_completed || 0}</span>
          <span><strong>Miles:</strong> ${(technician.performance?.miles_driven || 0).toFixed(1)}</span>
          <span><strong>On-time:</strong> ${technician.performance?.on_time_percentage || 0}%</span>
        </div>
      </div>
    `
  }

  const fitMapToMarkers = () => {
    if (!mapInstanceRef.current || !window.L || technicians.length === 0) return

    const group = new window.L.featureGroup(Array.from(markersRef.current.values()))
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
  }

  const centerOnTechnician = (technicianId: string) => {
    const technician = technicians.find(t => t.id === technicianId)
    if (technician && technician.current_location && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [technician.current_location.lat, technician.current_location.lng], 
        16
      )
    }
  }

  useEffect(() => {
    if (selectedTechnician) {
      centerOnTechnician(selectedTechnician)
    }
  }, [selectedTechnician])

  return (
    <>
      <style>
        {`
          .custom-marker {
            background: transparent !important;
            border: none !important;
          }
          .technician-popup .leaflet-popup-content {
            margin: 8px 12px;
            line-height: 1.4;
          }
          .technician-popup .leaflet-popup-tip {
            background: white;
          }
          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }} 
      />
    </>
  )
}

const statusColors = {
  online: 'bg-green-100 text-green-800',
  offline: 'bg-red-100 text-red-800',
  idle: 'bg-yellow-100 text-yellow-800',
  driving: 'bg-blue-100 text-blue-800',
  on_job: 'bg-purple-100 text-purple-800'
}

const statusIcons = {
  online: SignalIcon,
  offline: ExclamationTriangleIcon,
  idle: PauseIcon,
  driving: TruckIcon,
  on_job: PlayIcon
}

export default function GPSTracking() {
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [showOfflineTechnicians, setShowOfflineTechnicians] = useState(false)

  const { data: technicianLocations, isLoading, refetch, dataUpdatedAt, error } = useQuery({
    queryKey: ['technician-locations'],
    queryFn: async () => {
      console.log('🔍 Fetching technician locations...')
      const response = await api.get('/users/locations')
      console.log('📍 Technician locations response:', response.data)
      return response.data as TechnicianLocation[]
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: 1000,
  })

  // Auto-refresh countdown
  const [countdown, setCountdown] = useState(refreshInterval)

  useEffect(() => {
    if (!autoRefresh) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return refreshInterval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    setCountdown(refreshInterval)
  }, [dataUpdatedAt, refreshInterval])

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || SignalIcon
    return <IconComponent className="h-4 w-4" />
  }

  const formatLastUpdate = (timestamp: string) => {
    const now = new Date()
    const updated = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}m ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getLocationAccuracy = (accuracy: number) => {
    if (accuracy <= 10) return { text: 'High', color: 'text-green-600', bg: 'bg-green-100' }
    if (accuracy <= 50) return { text: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { text: 'Low', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getOverallStats = () => {
    if (!technicianLocations || technicianLocations.length === 0) {
      return { 
        online: 0, 
        driving: 0, 
        onJob: 0, 
        totalMiles: 0, 
        avgSpeed: 0,
        completedJobs: 0
      }
    }
    
    const onlineTechnicians = technicianLocations.filter(tech => tech.status !== 'offline')
    
    return {
      online: onlineTechnicians.length,
      driving: technicianLocations.filter(tech => tech.status === 'driving').length,
      onJob: technicianLocations.filter(tech => tech.status === 'on_job').length,
      totalMiles: technicianLocations.reduce((sum, tech) => sum + (tech.performance?.miles_driven || 0), 0),
      avgSpeed: onlineTechnicians.length > 0 
        ? onlineTechnicians.reduce((sum, tech) => sum + (tech.performance?.avg_speed || 0), 0) / onlineTechnicians.length
        : 0,
      completedJobs: technicianLocations.reduce((sum, tech) => sum + (tech.performance?.jobs_completed || 0), 0)
    }
  }

  const stats = getOverallStats()
  const filteredTechnicians = technicianLocations?.filter(tech => 
    showOfflineTechnicians || tech.status !== 'offline'
  ) || []

  if (isLoading && !technicianLocations) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GPS Tracking</h1>
            <p className="mt-1 text-sm text-gray-500">Loading technician locations...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPS Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time location tracking for {technicianLocations?.length || 0} field technicians
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-700">
              Auto-refresh
            </label>
            {autoRefresh && (
              <span className="text-xs text-gray-500">({countdown}s)</span>
            )}
          </div>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SignalIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Online</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.online}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Driving</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.driving}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">On Job</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.onJob}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Miles Today</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalMiles.toFixed(1)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Speed</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.avgSpeed.toFixed(0)} mph</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Jobs Done</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.completedJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Technicians ({filteredTechnicians.length})
                </h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show-offline"
                    checked={showOfflineTechnicians}
                    onChange={(e) => setShowOfflineTechnicians(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="show-offline" className="ml-2 text-sm text-gray-700">
                    Show offline
                  </label>
                </div>
              </div>
              
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="text-center py-8">
                  <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {technicianLocations?.length === 0 
                      ? 'No technicians found' 
                      : 'No technicians match current filters'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTechnicians.map((technician) => {
                    const accuracy = getLocationAccuracy(technician.current_location?.accuracy || 100)
                    
                    return (
                      <div
                        key={technician.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTechnician === technician.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTechnician(
                          selectedTechnician === technician.id ? null : technician.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-1 rounded-full ${
                              statusColors[technician.status].replace('text-', 'text-white bg-').replace('bg-', 'bg-').replace('-100', '-500')
                            }`}>
                              {getStatusIcon(technician.status)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {technician.name || 'Unknown Technician'}
                              </p>
                              <p className="text-xs text-gray-500">ID: {technician.employee_id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[technician.status]
                            }`}>
                              {technician.status.replace('_', ' ')}
                            </span>
                            {technician.status !== 'offline' && technician.current_location && (
                              <div className={`text-xs mt-1 px-1 py-0.5 rounded ${accuracy.bg} ${accuracy.color}`}>
                                {accuracy.text}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            <span className="truncate">
                              {technician.current_location?.address || 'Location unavailable'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              <span>
                                Updated {technician.current_location?.last_updated 
                                  ? formatLastUpdate(technician.current_location.last_updated)
                                  : 'Never'
                                }
                              </span>
                            </div>
                            {technician.current_location && technician.current_location.speed > 0 && (
                              <span className="text-blue-600">{technician.current_location.speed} mph</span>
                            )}
                          </div>
                        </div>

                        {/* Performance Summary */}
                        {technician.performance && (
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="font-medium text-gray-900">
                                {technician.performance.jobs_completed || 0}
                              </div>
                              <div className="text-gray-500">Jobs</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-gray-900">
                                {(technician.performance.miles_driven || 0).toFixed(1)}
                              </div>
                              <div className="text-gray-500">Miles</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-gray-900">
                                {technician.performance.on_time_percentage || 0}%
                              </div>
                              <div className="text-gray-500">On-time</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OpenStreetMap */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Live Map</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      // Trigger map to fit all markers
                      setSelectedTechnician(null)
                    }}
                    className="text-sm text-primary-600 hover:text-primary-800 px-3 py-1 border border-primary-300 rounded"
                  >
                    Fit All
                  </button>
                </div>
              </div>
              
              {technicianLocations && technicianLocations.length > 0 ? (
                <OpenStreetMap
                  technicians={technicianLocations}
                  selectedTechnician={selectedTechnician}
                  onTechnicianClick={setSelectedTechnician}
                />
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg h-96 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Loading Technician Locations...</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Waiting for GPS data from field technicians
                    </p>
                  </div>
                </div>
              )}

              {/* Map Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Online</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Driving</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span>On Job</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Idle</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>Offline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Alerts */}
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Real-time Alerts</h3>
              
              <div className="space-y-3">
                {/* Speed Alerts */}
                {technicianLocations?.filter(tech => tech.current_location && tech.current_location.speed > 75).map(tech => (
                  <div key={`speed-${tech.id}`} className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Speed Alert</p>
                      <p className="text-sm text-red-700">
                        {tech.name} is driving at {tech.current_location.speed} mph
                      </p>
                    </div>
                    <div className="text-xs text-red-600">
                      {tech.current_location.last_updated ? formatLastUpdate(tech.current_location.last_updated) : 'Now'}
                    </div>
                  </div>
                ))}

                {/* Low Accuracy Alerts */}
                {technicianLocations?.filter(tech => tech.current_location && tech.current_location.accuracy > 100 && tech.status !== 'offline').map(tech => (
                  <div key={`accuracy-${tech.id}`} className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <SignalIcon className="h-5 w-5 text-yellow-600 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">Poor GPS Signal</p>
                      <p className="text-sm text-yellow-700">
                        {tech.name} has low GPS accuracy (±{tech.current_location.accuracy}m)
                      </p>
                    </div>
                  </div>
                ))}

                {/* No Alerts */}
                {(!technicianLocations || technicianLocations.length === 0 || 
                  !technicianLocations.some(tech => 
                    (tech.current_location && tech.current_location.speed > 75) || 
                    (tech.current_location && tech.current_location.accuracy > 100 && tech.status !== 'offline')
                  )) && (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No active alerts</p>
                    <p className="text-xs text-gray-400">All technicians are operating normally</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Emergency Actions</h4>
              <p className="text-sm text-red-700">Use these features only in emergency situations</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
              Panic Alert All
            </button>
            <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
              Emergency Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}