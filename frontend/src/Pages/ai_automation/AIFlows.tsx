// frontend/src/pages/ai-automation/AIFlows.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PlayIcon, PauseIcon, CogIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
// Add missing imports
import { ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface AIFlow {
  id: string
  name: string
  description: string
  trigger: string
  status: 'active' | 'inactive'
  conversations_count: number
  conversion_rate: number
  created_at: string
}

export default function AIFlows() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<AIFlow | null>(null)

  const queryClient = useQueryClient()

  const { data: flows, isLoading } = useQuery({
    queryKey: ['ai-flows'],
    queryFn: async () => {
      const response = await api.get('/ai/flows')
      return response.data
    },
  })

  const toggleFlowMutation = useMutation({
    mutationFn: async ({ flowId, status }: { flowId: string; status: 'active' | 'inactive' }) => {
      const response = await api.patch(`/ai/flows/${flowId}`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
      toast.success('Flow status updated!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update flow')
    },
  })

  const handleToggleFlow = (flow: AIFlow) => {
    const newStatus = flow.status === 'active' ? 'inactive' : 'active'
    toggleFlowMutation.mutate({ flowId: flow.id, status: newStatus })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Automation Flows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage automated conversation flows for lead qualification.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Flow
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Active Flows</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {flows?.filter((flow: AIFlow) => flow.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Conversations</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {flows?.reduce((total: number, flow: AIFlow) => total + flow.conversations_count, 0) || 0}
                </p>
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
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Avg Conversion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {flows?.length ? 
                    Math.round(flows.reduce((total: number, flow: AIFlow) => total + flow.conversion_rate, 0) / flows.length) : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flows List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {flows?.map((flow: AIFlow) => (
              <li key={flow.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          flow.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {flow.status === 'active' ? (
                            <PlayIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <PauseIcon className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{flow.name}</p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            flow.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {flow.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{flow.description}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span>Trigger: {flow.trigger}</span>
                          <span className="mx-2">•</span>
                          <span>{flow.conversations_count} conversations</span>
                          <span className="mx-2">•</span>
                          <span>{flow.conversion_rate}% conversion</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleFlow(flow)}
                        className={`text-sm font-medium ${
                          flow.status === 'active'
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {flow.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setSelectedFlow(flow)}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        <CogIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Flow Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create AI Flow"
        size="xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Create a new automated conversation flow to engage with leads via SMS.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  AI Flow Builder Coming Soon!
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Our visual flow builder is currently in development. For now, you can create 
                    basic flows using our predefined templates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}