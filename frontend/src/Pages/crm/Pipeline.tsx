// frontend/src/pages/crm/Pipeline.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'

interface PipelineStage {
  id: string
  name: string
  color: string
  leads: Lead[]
  total_value: number
  count: number
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  estimated_value?: number
  ai_score?: number
  created_at: string
  last_contact?: string
  priority: number
}

interface PipelineData {
  stages: PipelineStage[]
  summary: {
    total_value: number
    total_leads: number
    average_deal_size: number
    period: string
  }
}

const defaultStages = [
  { id: 'new', name: 'New Leads', color: 'bg-blue-500' },
  { id: 'contacted', name: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-purple-500' },
  { id: 'proposal', name: 'Proposal Sent', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' }
]

const getEmptyPipelineData = (period: string): PipelineData => ({
  stages: defaultStages.map(stage => ({
    ...stage,
    leads: [],
    total_value: 0,
    count: 0
  })),
  summary: {
    total_value: 0,
    total_leads: 0,
    average_deal_size: 0,
    period
  }
})

export default function Pipeline() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')
  
  const queryClient = useQueryClient()

  const { data: pipelineData, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['pipeline', selectedPeriod],
    queryFn: async (): Promise<PipelineData> => {
      try {
        console.log(`Fetching pipeline data for period: ${selectedPeriod}`)
        const response = await api.get(`/pipeline?period=${selectedPeriod}`)
        console.log('Pipeline API response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('Pipeline API Error:', error)
        
        // Handle different error types
        if (error.response?.status === 400) {
          console.warn('Got 400 error, returning empty pipeline structure')
          toast.error('Unable to load pipeline data. Showing empty view.')
          return getEmptyPipelineData(selectedPeriod)
        }
        
        if (error.response?.status === 401) {
          console.warn('Authentication error')
          toast.error('Authentication failed. Please log in again.')
          // Could redirect to login here
        }
        
        if (error.response?.status === 403) {
          console.warn('Permission denied')
          toast.error('You do not have permission to view pipeline data.')
          return getEmptyPipelineData(selectedPeriod)
        }
        
        if (error.response?.status >= 500) {
          console.warn('Server error')
          toast.error('Server error. Please try again later.')
        }
        
        // For network errors or other issues, still return empty data
        if (!error.response) {
          console.warn('Network error or no response')
          toast.error('Network error. Please check your connection.')
          return getEmptyPipelineData(selectedPeriod)
        }
        
        // Re-throw for other errors to trigger React Query error handling
        throw error
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (400-499)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false
      }
      // Retry on server errors and network issues
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const response = await api.patch(`/leads/${leadId}`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      toast.success('Lead moved successfully!')
    },
    onError: (error: any) => {
      console.error('Error updating lead status:', error)
      toast.error(error.response?.data?.detail || 'Failed to update lead')
    },
  })

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStatus = destination.droppableId

    // Optimistic update
    const sourceStage = result.source.droppableId
    if (sourceStage !== newStatus) {
      updateLeadStatusMutation.mutate({
        leadId: draggableId,
        status: newStatus
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAIScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400'
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Use fallback data if we have an error but no data
  const displayData = pipelineData || getEmptyPipelineData(selectedPeriod)
  const totalValue = displayData.summary?.total_value || 0
  const totalLeads = displayData.summary?.total_leads || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visual pipeline management with drag-and-drop functionality
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
          
          {isError && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Pipeline Data Issue
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Unable to load current pipeline data. Showing empty pipeline. 
                  This might be due to authentication issues or server problems.
                </p>
                <button 
                  onClick={handleRetry}
                  className="mt-2 text-yellow-800 underline hover:text-yellow-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pipeline Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(totalValue)}
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
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {totalLeads}
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
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Deal Size</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {totalLeads > 0 ? formatCurrency(totalValue / totalLeads) : '$0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="flex space-x-6 min-w-max">
            {defaultStages.map((stage) => {
              const stageData = displayData.stages?.find((s: PipelineStage) => s.id === stage.id) || {
                id: stage.id,
                name: stage.name,
                color: stage.color,
                leads: [],
                total_value: 0,
                count: 0
              }

              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className="bg-gray-50 rounded-lg p-4">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${stage.color} mr-2`}></div>
                        <h3 className="text-sm font-medium text-gray-900">{stage.name}</h3>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stageData.count} • {formatCurrency(stageData.total_value)}
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[200px] p-2 rounded-md transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                          }`}
                        >
                          {stageData.leads?.map((lead: Lead, index: number) => (
                            <Draggable
                              key={lead.id}
                              draggableId={lead.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white p-3 rounded-md shadow-sm border transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {lead.first_name} {lead.last_name}
                                      </h4>
                                      
                                      <div className="mt-1 space-y-1">
                                        {lead.phone && (
                                          <div className="flex items-center text-xs text-gray-500">
                                            <PhoneIcon className="h-3 w-3 mr-1" />
                                            {lead.phone}
                                          </div>
                                        )}
                                        {lead.email && (
                                          <div className="flex items-center text-xs text-gray-500">
                                            <EnvelopeIcon className="h-3 w-3 mr-1" />
                                            {lead.email}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {lead.estimated_value && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                          {formatCurrency(lead.estimated_value)}
                                        </div>
                                      )}
                                      
                                      <div className="mt-2 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                                          {new Date(lead.created_at).toLocaleDateString()}
                                        </div>
                                        {lead.ai_score && (
                                          <div className={`text-xs font-bold ${getAIScoreColor(lead.ai_score)}`}>
                                            AI: {lead.ai_score}/10
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {(!stageData.leads || stageData.leads.length === 0) && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              {isError ? 'No data available' : 'No leads in this stage'}
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}