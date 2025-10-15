// frontend/src/pages/ai-automation/AutomationBuilder.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface AutomationFlow {
  id: string
  name: string
  description: string
  trigger: {
    type: 'lead_created' | 'sms_received' | 'form_submitted' | 'email_opened' | 'schedule_based'
    conditions: any[]
  }
  steps: AutomationStep[]
  status: 'draft' | 'active' | 'paused' | 'archived'
  performance: {
    total_executions: number
    success_rate: number
    avg_completion_time: number
    conversions: number
  }
  created_at: string
  updated_at: string
}

interface AutomationStep {
  id: string
  type: 'send_sms' | 'send_email' | 'wait' | 'condition' | 'assign_to' | 'update_lead_score' | 'create_task' | 'webhook'
  name: string
  config: any
  position: { x: number; y: number }
  connections: string[] // IDs of next steps
}

interface TriggerTemplate {
  id: string
  name: string
  description: string
  type: string
  icon: React.ComponentType<{ className?: string }>
  conditions: any[]
}

interface ActionTemplate {
  id: string
  name: string
  description: string
  type: string
  icon: React.ComponentType<{ className?: string }>
  config_fields: any[]
  category: 'communication' | 'workflow' | 'data' | 'integration'
}

const triggerTemplates: TriggerTemplate[] = [
  {
    id: 'new_lead',
    name: 'New Lead Created',
    description: 'Triggers when a new lead is added to the system',
    type: 'lead_created',
    icon: PlusIcon,
    conditions: []
  },
  {
    id: 'sms_received',
    name: 'SMS Received',
    description: 'Triggers when an SMS message is received from a lead',
    type: 'sms_received',
    icon: CheckCircleIcon,
    conditions: []
  },
  {
    id: 'schedule_based',
    name: 'Schedule Based',
    description: 'Triggers based on a time schedule (daily, weekly, etc.)',
    type: 'schedule_based',
    icon: ClockIcon,
    conditions: []
  }
]

const actionTemplates: ActionTemplate[] = [
  {
    id: 'send_sms',
    name: 'Send SMS',
    description: 'Send an SMS message to the lead',
    type: 'send_sms',
    icon: CheckCircleIcon,
    category: 'communication',
    config_fields: ['message_template', 'delay']
  },
  {
    id: 'send_email',
    name: 'Send Email',
    description: 'Send an email to the lead',
    type: 'send_email',
    icon: CheckCircleIcon,
    category: 'communication',
    config_fields: ['subject', 'email_template', 'delay']
  },
  {
    id: 'wait',
    name: 'Wait',
    description: 'Wait for a specified amount of time',
    type: 'wait',
    icon: ClockIcon,
    category: 'workflow',
    config_fields: ['duration', 'unit']
  },
  {
    id: 'condition',
    name: 'Condition Check',
    description: 'Branch the flow based on conditions',
    type: 'condition',
    icon: ArrowRightIcon,
    category: 'workflow',
    config_fields: ['condition_type', 'operator', 'value']
  },
  {
    id: 'assign_to',
    name: 'Assign to User',
    description: 'Assign the lead to a specific user',
    type: 'assign_to',
    icon: CheckCircleIcon,
    category: 'workflow',
    config_fields: ['user_id', 'assignment_type']
  },
  {
    id: 'update_score',
    name: 'Update Lead Score',
    description: 'Modify the lead score based on actions',
    type: 'update_lead_score',
    icon: CheckCircleIcon,
    category: 'data',
    config_fields: ['score_change', 'reason']
  }
]

export default function AutomationBuilder() {
  const [selectedFlow, setSelectedFlow] = useState<AutomationFlow | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBuilderModal, setShowBuilderModal] = useState(false)
  const [builderFlow, setBuilderFlow] = useState<AutomationFlow | null>(null)
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null)
  const [draggedAction, setDraggedAction] = useState<ActionTemplate | null>(null)

  const queryClient = useQueryClient()

  const { data: automationFlows, isLoading } = useQuery({
    queryKey: ['automation-flows'],
    queryFn: async () => {
      const response = await api.get('/ai-automation/flows')
      return response.data
    },
  })

  const { data: flowStats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      const response = await api.get('/ai-automation/flows/stats')
      return response.data
    },
  })

  const createFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await api.post('/ai-automation/flows', flowData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] })
      setShowCreateModal(false)
      toast.success('Automation flow created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create automation flow')
    },
  })

  const updateFlowMutation = useMutation({
    mutationFn: async ({ flowId, flowData }: { flowId: string; flowData: any }) => {
      const response = await api.put(`/ai-automation/flows/${flowId}`, flowData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] })
      setShowBuilderModal(false)
      toast.success('Automation flow updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update automation flow')
    },
  })

  const updateFlowStatusMutation = useMutation({
    mutationFn: async ({ flowId, status }: { flowId: string; status: string }) => {
      const response = await api.patch(`/ai-automation/flows/${flowId}`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] })
      toast.success('Flow status updated!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update flow status')
    },
  })

  const duplicateFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await api.post(`/ai-automation/flows/${flowId}/duplicate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] })
      toast.success('Automation flow duplicated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to duplicate flow')
    },
  })

  const handleStatusChange = (flowId: string, status: string) => {
    updateFlowStatusMutation.mutate({ flowId, status })
  }

  const handleEditFlow = (flow: AutomationFlow) => {
    setBuilderFlow(flow)
    setShowBuilderModal(true)
  }

  const handleDuplicateFlow = (flowId: string) => {
    duplicateFlowMutation.mutate(flowId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayIcon className="h-4 w-4 text-green-600" />
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-600" />
      case 'archived':
        return <StopIcon className="h-4 w-4 text-gray-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      communication: 'bg-blue-100 text-blue-800',
      workflow: 'bg-green-100 text-green-800',
      data: 'bg-purple-100 text-purple-800',
      integration: 'bg-orange-100 text-orange-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Flow Builder Component
  const FlowBuilder = ({ flow }: { flow: AutomationFlow | null }) => {
    const [flowData, setFlowData] = useState<AutomationFlow | null>(flow)

    const handleAddStep = (actionTemplate: ActionTemplate, position: { x: number; y: number }) => {
      if (!flowData) return

      const newStep: AutomationStep = {
        id: `step_${Date.now()}`,
        type: actionTemplate.type as any,
        name: actionTemplate.name,
        config: {},
        position,
        connections: []
      }

      setFlowData({
        ...flowData,
        steps: [...flowData.steps, newStep]
      })
    }

    const handleDeleteStep = (stepId: string) => {
      if (!flowData) return

      setFlowData({
        ...flowData,
        steps: flowData.steps.filter(step => step.id !== stepId)
      })
    }

    const handleSaveFlow = () => {
      if (!flowData) return

      if (flowData.id) {
        updateFlowMutation.mutate({ flowId: flowData.id, flowData })
      } else {
        createFlowMutation.mutate(flowData)
      }
    }

    return (
      <div className="h-full flex flex-col">
        {/* Builder Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {flowData?.name || 'New Automation Flow'}
              </h3>
              <p className="text-sm text-gray-500">
                Drag actions from the sidebar to build your automation
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBuilderModal(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFlow}
                disabled={updateFlowMutation.isPending || createFlowMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {(updateFlowMutation.isPending || createFlowMutation.isPending) ? 'Saving...' : 'Save Flow'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Action Library Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Actions</h4>
              
              {['communication', 'workflow', 'data', 'integration'].map((category) => (
                <div key={category} className="mb-6">
                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {category}
                  </h5>
                  <div className="space-y-2">
                    {actionTemplates
                      .filter(action => action.category === category)
                      .map((action) => (
                        <div
                          key={action.id}
                          draggable
                          onDragStart={() => setDraggedAction(action)}
                          className="p-3 border border-gray-200 rounded-md cursor-move hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex items-center">
                            <action.icon className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{action.name}</div>
                              <div className="text-xs text-gray-500">{action.description}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getCategoryColor(action.category)}`}>
                            {action.category}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-100 relative overflow-hidden">
            <div 
              className="w-full h-full"
              onDrop={(e) => {
                e.preventDefault()
                if (draggedAction) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const position = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                  handleAddStep(draggedAction, position)
                  setDraggedAction(null)
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {/* Flow Steps */}
              {flowData?.steps.map((step) => (
                <div
                  key={step.id}
                  className="absolute bg-white border border-gray-300 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-48"
                  style={{
                    left: step.position.x,
                    top: step.position.y
                  }}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-primary-600 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">{step.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteStep(step.id)
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {step.type.replace('_', ' ')}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {(!flowData?.steps || flowData.steps.length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Build Your Automation</h3>
                    <p className="text-gray-500 mb-4">
                      Start by dragging actions from the sidebar to create your automation flow
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 max-w-md">
                      <div className="text-sm text-blue-700">
                        <strong>Pro Tip:</strong> Start with a trigger, then add actions like "Send SMS" or "Wait" to create your flow.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step Configuration Panel */}
          {selectedStep && (
            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Configure Step</h4>
                  <button
                    onClick={() => setSelectedStep(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Step Name
                    </label>
                    <input
                      type="text"
                      value={selectedStep.name}
                      onChange={(e) => {
                        setSelectedStep({ ...selectedStep, name: e.target.value })
                        if (flowData) {
                          setFlowData({
                            ...flowData,
                            steps: flowData.steps.map(step =>
                              step.id === selectedStep.id ? { ...step, name: e.target.value } : step
                            )
                          })
                        }
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  {selectedStep.type === 'send_sms' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message Template
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Hi {first_name}, thanks for your interest..."
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  )}

                  {selectedStep.type === 'wait' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="number"
                          placeholder="30"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedStep.type === 'condition' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition Type
                        </label>
                        <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                          <option value="lead_score">Lead Score</option>
                          <option value="response_received">Response Received</option>
                          <option value="time_elapsed">Time Elapsed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Operator
                        </label>
                        <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                          <option value="equals">Equals</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value
                        </label>
                        <input
                          type="text"
                          placeholder="Enter value..."
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Builder</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create powerful automation workflows to streamline your sales process
          </p>
        </div>
        <button
          onClick={() => {
            setBuilderFlow(null)
            setShowBuilderModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Automation
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Flows</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {flowStats?.active_flows || 0}
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
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Executions</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {flowStats?.total_executions?.toLocaleString() || 0}
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
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {flowStats?.avg_success_rate ? `${(flowStats.avg_success_rate * 100).toFixed(1)}%` : 'N/A'}
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
                <CheckCircleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversions</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {flowStats?.total_conversions || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Templates */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Start Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: 'Lead Follow-up',
              description: 'Automatically follow up with new leads via SMS and email',
              steps: 4,
              conversions: '18%'
            },
            {
              name: 'Appointment Reminders',
              description: 'Send SMS reminders before scheduled appointments',
              steps: 3,
              conversions: '94%'
            },
            {
              name: 'Win-back Campaign',
              description: 'Re-engage inactive customers with special offers',
              steps: 5,
              conversions: '12%'
            }
          ].map((template, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{template.name}</h4>
              <p className="text-xs text-gray-500 mb-3">{template.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{template.steps} steps</span>
                <span className="text-green-600 font-medium">{template.conversions} avg conversion</span>
              </div>
              <button className="mt-3 w-full text-xs text-primary-600 hover:text-primary-800 font-medium">
                Use Template
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Automation Flows List */}
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
            {automationFlows?.map((flow: AutomationFlow) => (
              <li key={flow.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(flow.status)}
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">{flow.name}</p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getStatusColor(flow.status)
                              }`}>
                                {flow.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{flow.description}</p>
                            
                            <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                              <span>Trigger: {flow.trigger.type.replace('_', ' ')}</span>
                              <span>Steps: {flow.steps.length}</span>
                              <span>Executions: {flow.performance.total_executions}</span>
                              <span>Success: {(flow.performance.success_rate * 100).toFixed(1)}%</span>
                              <span>Conversions: {flow.performance.conversions}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDuplicateFlow(flow.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Duplicate"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                            
                            {flow.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(flow.id, 'paused')}
                                className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                              >
                                Pause
                              </button>
                            )}
                            {flow.status === 'paused' && (
                              <button
                                onClick={() => handleStatusChange(flow.id, 'active')}
                                className="text-green-600 hover:text-green-900 text-sm font-medium"
                              >
                                Resume
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleEditFlow(flow)}
                              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Flow Builder Modal */}
      <Modal
        isOpen={showBuilderModal}
        onClose={() => setShowBuilderModal(false)}
        title=""
        size="full"
      >
        <FlowBuilder flow={builderFlow} />
      </Modal>

      {/* Empty State */}
      {!isLoading && (!automationFlows || automationFlows.length === 0) && (
        <div className="text-center py-12">
          <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No automation flows yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first automation flow to start streamlining your sales process.
          </p>
          <button
            onClick={() => {
              setBuilderFlow(null)
              setShowBuilderModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Flow
          </button>
        </div>
      )}
    </div>
  )
}