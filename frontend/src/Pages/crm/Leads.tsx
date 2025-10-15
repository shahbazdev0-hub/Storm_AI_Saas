// frontend/src/pages/crm/Leads.tsx - RESPONSIVE VERSION
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
  Bars3Icon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'
import LeadForm from '../../components/forms/LeadForm'

interface LeadNote {
  id: string
  content: string
  note_type: string
  is_important: boolean
  created_by: string
  created_at: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  estimated_value?: number
  priority: number
  ai_score?: number
  created_at: string
  last_contact?: string
  notes?: string | LeadNote[]
  tags: string[]
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800'
}

const priorityColors = {
  1: 'text-red-600',
  2: 'text-orange-600',
  3: 'text-yellow-600',
  4: 'text-blue-600',
  5: 'text-gray-600'
}

// Helper function to safely extract notes text
const getNotesText = (notes?: string | LeadNote[]): string => {
  if (!notes) return ''
  
  if (typeof notes === 'string') {
    return notes
  }
  
  if (Array.isArray(notes) && notes.length > 0) {
    return notes.map(note => note.content).join('. ')
  }
  
  return ''
}

// Helper function to safely calculate percentages
const safePercentage = (numerator: number, denominator: number): number => {
  if (!denominator || denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return 0
  }
  const result = Math.round((numerator / denominator) * 100)
  return Number.isFinite(result) ? result : 0
}

// Helper function to safely calculate averages
const safeAverage = (total: number, count: number): number => {
  if (!count || count === 0 || !Number.isFinite(total) || !Number.isFinite(count)) {
    return 0
  }
  const result = Math.round(total / count)
  return Number.isFinite(result) ? result : 0
}

// Helper function to safely get array length
const safeLength = (arr: any[]): number => {
  return Array.isArray(arr) ? arr.length : 0
}

// Helper function to ensure number display
const safeNumber = (value: any): string => {
  const num = Number(value)
  return Number.isFinite(num) ? num.toString() : '0'
}

export default function Leads() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')

  const queryClient = useQueryClient()

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', searchTerm, statusFilter, sourceFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      params.append('sort_by', sortBy)
      params.append('sort_order', sortOrder)
      
      const response = await api.get(`/leads?${params.toString()}`)
      return Array.isArray(response.data) ? response.data : []
    },
  })

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const response = await api.post('/leads', leadData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setShowCreateModal(false)
      toast.success('Lead created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create lead')
    },
  })

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const response = await api.patch(`/leads/${leadId}`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead status updated!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update lead')
    },
  })

  const handleCreateLead = (leadData: any) => {
    createLeadMutation.mutate(leadData)
  }

  const handleStatusChange = (leadId: string, status: string) => {
    updateLeadStatusMutation.mutate({ leadId, status })
  }

  const getAIScoreColor = (score?: number) => {
    if (!score || !Number.isFinite(score)) return 'text-gray-400'
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const renderStars = (priority: number) => {
    const safePriority = Number.isFinite(priority) && priority >= 1 && priority <= 5 ? priority : 1
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < safePriority ? priorityColors[safePriority as keyof typeof priorityColors] : 'text-gray-300'}`}
        fill={i < safePriority ? 'currentColor' : 'none'}
      />
    ))
  }

  // Calculate stats safely
  const totalLeads = safeLength(leads)
  const newLeads = safeLength(leads.filter((lead: Lead) => lead.status === 'new'))
  const qualifiedLeads = safeLength(leads.filter((lead: Lead) => lead.status === 'qualified'))
  const wonLeads = safeLength(leads.filter((lead: Lead) => lead.status === 'won'))
  const conversionRate = safePercentage(wonLeads, totalLeads)
  
  // Calculate average AI score safely
  const leadsWithScores = leads.filter((lead: Lead) => lead.ai_score && Number.isFinite(lead.ai_score))
  const totalAIScore = leadsWithScores.reduce((sum: number, lead: Lead) => sum + (lead.ai_score || 0), 0)
  const avgAIScore = safeAverage(totalAIScore, leadsWithScores.length)

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and qualify your sales leads with AI-powered insights
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center bg-blue-600 px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto justify-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Lead
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">
                    {safeNumber(newLeads)}
                  </span>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">New Leads</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">This Week</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">
                    {safeNumber(qualifiedLeads)}
                  </span>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Qualified</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">Ready to Close</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">
                    {safeNumber(conversionRate)}%
                  </span>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">This Month</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">
                    {safeNumber(avgAIScore)}
                  </span>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Avg AI Score</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">Quality Rating</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filters & Search
          <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className={`bg-white shadow rounded-lg p-4 sm:p-6 ${!showFilters ? 'hidden lg:block' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="google_ads">Google Ads</option>
            <option value="facebook">Facebook</option>
            <option value="phone_call">Phone Call</option>
            <option value="sms">SMS</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="created_at">Date Created</option>
            <option value="ai_score">AI Score</option>
            <option value="estimated_value">Estimated Value</option>
            <option value="priority">Priority</option>
            <option value="last_contact">Last Contact</option>
          </select>

          {/* Sort Order & View Mode */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
              <span className="sm:hidden">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            </button>
            
            {/* View Mode Toggle (Desktop) */}
            <div className="hidden sm:flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Bars3Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ChartBarIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Display */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-4 sm:p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 sm:h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-6 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your filters or search term.'
                : 'Create your first lead to get started!'}
            </p>
            {!searchTerm && statusFilter === 'all' && sourceFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Lead
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          // List View
          <ul className="divide-y divide-gray-200">
            {leads.map((lead: Lead) => {
              const notesText = getNotesText(lead.notes)
              
              return (
                <li key={lead.id}>
                  <div className="px-4 py-4 sm:px-6">
                    {/* Mobile Layout: Stacked */}
                    <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {lead.first_name?.[0] || 'L'}{lead.last_name?.[0] || 'L'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Lead Info */}
                        <div className="min-w-0 flex-1">
                          {/* Name and Status */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {lead.first_name || 'Unknown'} {lead.last_name || 'Lead'}
                              </p>
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  statusColors[lead.status] || statusColors.new
                                }`}>
                                  {lead.status || 'new'}
                                </span>
                                {lead.ai_score && Number.isFinite(lead.ai_score) && (
                                  <span className={`text-xs font-bold ${getAIScoreColor(lead.ai_score)}`}>
                                    AI: {safeNumber(lead.ai_score)}/10
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact Details */}
                          <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-sm text-gray-500">
                            {lead.phone && (
                              <div className="flex items-center">
                                <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.phone}</span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center">
                                <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.city && (
                              <div className="flex items-center">
                                <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Priority and Source */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-1 sm:space-y-0">
                            <div className="flex items-center">
                              {renderStars(lead.priority)}
                            </div>
                            <span className="text-xs text-gray-500">
                              Source: {(lead.source || 'unknown').replace('_', ' ')}
                            </span>
                            {lead.estimated_value && Number.isFinite(lead.estimated_value) && (
                              <span className="text-xs text-green-600 font-medium">
                                ${lead.estimated_value.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Notes */}
                          {notesText && (
                            <div className="mt-2 text-xs sm:text-sm text-gray-600">
                              <p className="line-clamp-2 sm:line-clamp-1">{notesText}</p>
                            </div>
                          )}
                          
                          {/* Tags */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {lead.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={`${tag}-${index}`}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                              {lead.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{lead.tags.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                        <select
                          value={lead.status || 'new'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="text-xs sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="proposal">Proposal</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          
                          <button className="text-gray-400 hover:text-gray-600 p-1">
                            <EllipsisVerticalIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          // Cards View (Desktop)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
            {leads.map((lead: Lead) => {
              const notesText = getNotesText(lead.notes)
              
              return (
                <div key={lead.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700">
                          {lead.first_name?.[0] || 'L'}{lead.last_name?.[0] || 'L'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {lead.first_name || 'Unknown'} {lead.last_name || 'Lead'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[lead.status] || statusColors.new
                    }`}>
                      {lead.status || 'new'}
                    </span>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-1 mb-3">
                    {lead.phone && (
                      <div className="flex items-center text-xs text-gray-500">
                        <PhoneIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center text-xs text-gray-500">
                        <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {renderStars(lead.priority)}
                      </div>
                      {lead.ai_score && Number.isFinite(lead.ai_score) && (
                        <span className={`text-xs font-bold ${getAIScoreColor(lead.ai_score)}`}>
                          AI: {safeNumber(lead.ai_score)}/10
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Source: {(lead.source || 'unknown').replace('_', ' ')}
                    </div>
                    
                    {lead.estimated_value && Number.isFinite(lead.estimated_value) && (
                      <div className="text-xs text-green-600 font-medium">
                        ${lead.estimated_value.toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  {/* Notes */}
                  {notesText && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 line-clamp-2">{notesText}</p>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {lead.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{lead.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-2">
                    <select
                      value={lead.status || 'new'}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="flex-1 text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                    
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Lead"
        size="lg"
      >
        <LeadForm
          onSubmit={handleCreateLead}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createLeadMutation.isPending}
        />
      </Modal>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`${selectedLead.first_name || 'Unknown'} ${selectedLead.last_name || 'Lead'}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedLead.phone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <a href={`tel:${selectedLead.phone}`} className="text-blue-600 hover:text-blue-800 break-all">
                        {selectedLead.phone}
                      </a>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:text-blue-800 break-all">
                        {selectedLead.email}
                      </a>
                    </div>
                  )}
                  {selectedLead.address && (
                    <div className="flex items-start">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="break-words">
                        {selectedLead.address}
                        {selectedLead.city ? `, ${selectedLead.city}` : ''}
                        {selectedLead.state ? `, ${selectedLead.state}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Lead Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedLead.status] || statusColors.new
                    }`}>
                      {selectedLead.status || 'new'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-2">{(selectedLead.source || 'unknown').replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <div className="ml-2 inline-flex">{renderStars(selectedLead.priority)}</div>
                  </div>
                  {selectedLead.ai_score && Number.isFinite(selectedLead.ai_score) && (
                    <div>
                      <span className="text-gray-500">AI Score:</span>
                      <span className={`ml-2 font-bold ${getAIScoreColor(selectedLead.ai_score)}`}>
                        {safeNumber(selectedLead.ai_score)}/10
                      </span>
                    </div>
                  )}
                  {selectedLead.estimated_value && Number.isFinite(selectedLead.estimated_value) && (
                    <div>
                      <span className="text-gray-500">Estimated Value:</span>
                      <span className="ml-2 text-green-600 font-medium">
                        ${selectedLead.estimated_value.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Handle notes properly in modal */}
            {(() => {
              const notesText = getNotesText(selectedLead.notes)
              if (notesText) {
                return (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 break-words">{notesText}</p>
                  </div>
                )
              }
              return null
            })()}
            
            {/* Tags */}
            {selectedLead.tags && selectedLead.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedLead.tags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full sm:w-auto bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Edit Lead
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}