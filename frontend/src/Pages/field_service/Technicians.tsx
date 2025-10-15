// frontend/src/pages/field-service/Technicians.tsx - FIXED API ENDPOINTS
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'
import TechnicianForm from '../../components/forms/TechnicianForm'

type Technician = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  status?: 'active' | 'inactive' | 'on_leave'
  specialty?: string
  hourly_rate?: number
  created_at?: string
  is_available?: boolean
}

interface TechnicianStats {
  id: string
  activeJobs: number
  completedThisWeek: number
  avgRating: number
  isAvailable: boolean
}

const statusColors: Record<'active' | 'inactive' | 'on_leave', string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
}

const availabilityColors = {
  available: 'text-green-600',
  busy: 'text-yellow-600',
  unavailable: 'text-red-600'
}

export default function Technicians() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all')
  const [selected, setSelected] = useState<Technician | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const queryClient = useQueryClient()

  // ✅ FIXED: Use correct backend endpoint /technicians/
  const { data: technicians, isLoading, isError, refetch } = useQuery({
    queryKey: ['technicians', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status_filter', statusFilter)
      }
      
      console.log('🔄 Fetching technicians from /technicians/')
      const resp = await api.get(`/technicians/?${params.toString()}`)
      console.log('✅ Technicians response:', resp.data)
      
      return resp.data as Technician[]
    },
    staleTime: 30000,
  })

  // ✅ FIXED: Use correct endpoint /technicians/stats
  const { data: techStats } = useQuery({
    queryKey: ['technician-stats'],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching technician stats from /technicians/stats')
        const resp = await api.get('/technicians/stats')
        console.log('✅ Stats response:', resp.data)
        return resp.data as TechnicianStats[]
      } catch (error) {
        console.warn('⚠️ Stats endpoint not available, using defaults')
        return []
      }
    },
    enabled: !!technicians && technicians.length > 0,
    staleTime: 60000,
  })

  // ✅ FIXED: Use correct endpoint POST /technicians/
  const createTechnicianMutation = useMutation({
    mutationFn: async (technicianData: any) => {
      console.log('🔄 Creating technician:', technicianData)
      const response = await api.post('/technicians/', technicianData)
      console.log('✅ Technician created:', response.data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] })
      queryClient.invalidateQueries({ queryKey: ['technician-stats'] })
      setShowCreateModal(false)
      toast.success(data.message || 'Technician created successfully!')
    },
    onError: (error: any) => {
      console.error('❌ Create technician error:', error)
      toast.error(error.response?.data?.detail || 'Failed to create technician')
    },
  })

  // Filter and search technicians
  const filteredTechnicians = useMemo(() => {
    if (!technicians) return []
    
    return technicians.filter((t) => {
      const term = searchTerm.toLowerCase()
      const fullName = `${t.first_name || ''} ${t.last_name || ''}`.toLowerCase()
      
      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.phone?.toLowerCase().includes(term) ||
        t.specialty?.toLowerCase().includes(term)
      
      return matchesSearch
    })
  }, [technicians, searchTerm])

  // Get stats for a specific technician
  const getTechnicianStats = (techId: string): TechnicianStats | null => {
    return techStats?.find(stat => stat.id === techId) || null
  }

  const handleCreateTechnician = (data: any) => {
    createTechnicianMutation.mutate(data)
  }

  const getAvailabilityStatus = (tech: Technician) => {
    const stats = getTechnicianStats(tech.id)
    
    if (tech.status !== 'active') {
      return { status: 'unavailable', text: 'Unavailable' }
    }
    
    if (!tech.is_available) {
      return { status: 'unavailable', text: 'Unavailable' }
    }
    
    if (!stats) {
      return { status: 'available', text: 'Available' }
    }
    
    if (stats.activeJobs >= 5) {
      return { status: 'busy', text: 'Busy' }
    }
    
    return { status: 'available', text: 'Available' }
  }

  const getTechnicianName = (tech: Technician) => {
    const name = `${tech.first_name || ''} ${tech.last_name || ''}`.trim()
    return name || tech.email || 'Unknown'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Error loading technicians</h3>
        <p className="text-red-600 text-sm mt-1">
          Please ensure the technicians endpoint is properly configured on the backend.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your field service technicians and track their availability
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center bg-primary-600 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Technician
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Technicians</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{filteredTechnicians.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {filteredTechnicians.filter(t => {
                      const availability = getAvailabilityStatus(t)
                      return availability.status === 'available'
                    }).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Busy</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {filteredTechnicians.filter(t => {
                      const availability = getAvailabilityStatus(t)
                      return availability.status === 'busy'
                    }).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inactive</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {filteredTechnicians.filter(t => t.status === 'inactive' || t.status === 'on_leave').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-3 items-center">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search name, email, phone, specialty"
            className="pl-9 pr-3 py-2 border rounded-md text-sm w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="border rounded-md text-sm py-2 px-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>

        <div className="ml-auto text-sm text-gray-500">
          Showing <b>{filteredTechnicians.length}</b> technician(s)
        </div>
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTechnicians.map((t) => {
          const stats = getTechnicianStats(t.id)
          const availability = getAvailabilityStatus(t)
          const techName = getTechnicianName(t)
          
          return (
            <div key={t.id} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {techName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-lg font-semibold text-gray-900">{techName}</div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status || 'active']}`}>
                        {(t.status || 'active').replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-medium ${availabilityColors[availability.status as keyof typeof availabilityColors]}`}>
                        {availability.text}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(t)}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  View
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-700">
                {t.email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <a href={`mailto:${t.email}`} className="hover:underline truncate">{t.email}</a>
                  </div>
                )}
                {t.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <a href={`tel:${t.phone}`} className="hover:underline">{t.phone}</a>
                  </div>
                )}
                {t.specialty && (
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="capitalize">{t.specialty.replace('_', ' ')}</span>
                  </div>
                )}
                {t.hourly_rate && (
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-2">$</span>
                    <span>${t.hourly_rate}/hr</span>
                  </div>
                )}
              </div>

              {/* Performance Stats */}
              {stats && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{stats.activeJobs}</div>
                      <div className="text-xs text-gray-500">Active Jobs</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{stats.completedThisWeek}</div>
                      <div className="text-xs text-gray-500">This Week</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{stats.avgRating.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">Avg Rating</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Technician Card */}
        <div 
          onClick={() => setShowCreateModal(true)}
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-gray-400 hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <PlusIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add New Technician</h3>
          <p className="text-sm text-gray-500 text-center">
            Create a new technician account to expand your field service team
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`${getTechnicianName(selected)} - Technician Details`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {selected.email && (
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <a href={`mailto:${selected.email}`} className="text-primary-600 hover:underline">
                        {selected.email}
                      </a>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <a href={`tel:${selected.phone}`} className="text-primary-600 hover:underline">
                        {selected.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Professional Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[selected.status || 'active']}`}>
                      {(selected.status || 'active').replace('_', ' ')}
                    </span>
                  </div>
                  {selected.specialty && (
                    <div>
                      <span className="text-gray-500">Specialty:</span>
                      <span className="ml-2 capitalize">{selected.specialty.replace('_', ' ')}</span>
                    </div>
                  )}
                  {selected.hourly_rate && (
                    <div>
                      <span className="text-gray-500">Hourly Rate:</span>
                      <span className="ml-2">${selected.hourly_rate}/hr</span>
                    </div>
                  )}
                  {selected.created_at && (
                    <div>
                      <span className="text-gray-500">Joined:</span>
                      <span className="ml-2">{new Date(selected.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            {(() => {
              const stats = getTechnicianStats(selected.id)
              const availability = getAvailabilityStatus(selected)
              
              return (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Performance & Availability</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xl font-semibold text-gray-900">{stats?.activeJobs || 0}</div>
                      <div className="text-xs text-gray-500">Active Jobs</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xl font-semibold text-gray-900">{stats?.completedThisWeek || 0}</div>
                      <div className="text-xs text-gray-500">Completed This Week</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xl font-semibold text-gray-900">{stats?.avgRating?.toFixed(1) || 'N/A'}</div>
                      <div className="text-xs text-gray-500">Average Rating</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className={`text-xl font-semibold ${availabilityColors[availability.status as keyof typeof availabilityColors]}`}>
                        {availability.text}
                      </div>
                      <div className="text-xs text-gray-500">Current Status</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700">
                Assign Job
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700">
                View Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Technician Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Technician"
        size="xl"
      >
        <TechnicianForm
          onSubmit={handleCreateTechnician}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createTechnicianMutation.isPending}
        />
      </Modal>
    </div>
  )
}