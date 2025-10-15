// frontend/src/pages/ai-automation/SMSCampaigns.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface SMSCampaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  target_audience: {
    criteria: string[]
    count: number
  }
  message_template: string
  schedule: {
    start_date: string
    end_date?: string
    send_times: string[]
    timezone: string
  }
  performance: {
    sent: number
    delivered: number
    replied: number
    conversion_rate: number
    opt_outs: number
  }
  ai_config: {
    auto_respond: boolean
    qualification_flow: string
    escalation_rules: string[]
  }
  created_at: string
  created_by: string
}

interface CampaignTemplate {
  id: string
  name: string
  category: string
  message: string
  conversion_rate: number
  industry: string[]
}

const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'follow-up-1',
    name: 'New Lead Follow-up',
    category: 'Lead Nurturing',
    message: "Hi {first_name}! Thanks for your interest in our {service_type} services. I'm {agent_name} and I'd love to help you get started. When would be a good time for a quick 10-minute call to discuss your needs?",
    conversion_rate: 18.5,
    industry: ['pest_control', 'lawn_care', 'roofing']
  },
  {
    id: 'seasonal-1',
    name: 'Spring Lawn Care Reminder',
    category: 'Seasonal',
    message: "🌱 Spring is here! Time to get your lawn ready for the growing season. We're offering 20% off our spring lawn treatment packages this month. Reply YES to learn more or schedule your service.",
    conversion_rate: 12.3,
    industry: ['lawn_care']
  },
  {
    id: 'reactivation-1',
    name: 'Customer Reactivation',
    category: 'Retention',
    message: "Hi {first_name}, we miss you! It's been a while since your last {service_type} service. We'd love to help you again with a special 15% discount. Reply to reactivate your service or call us at {phone}.",
    conversion_rate: 8.7,
    industry: ['pest_control', 'lawn_care', 'cleaning']
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    category: 'Operations',
    message: "⏰ Reminder: Your {service_type} appointment is scheduled for tomorrow at {appointment_time}. Our technician will arrive within a 2-hour window. Reply CONFIRM to acknowledge or RESCHEDULE if you need to change.",
    conversion_rate: 94.2,
    industry: ['all']
  }
]

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function SMSCampaigns() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const queryClient = useQueryClient()

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['sms-campaigns', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await api.get(`/ai-automation/sms-campaigns?${params.toString()}`)
      return response.data
    },
  })

  const { data: campaignStats } = useQuery({
    queryKey: ['sms-campaign-stats'],
    queryFn: async () => {
      const response = await api.get('/ai-automation/sms-campaigns/stats')
      return response.data
    },
  })

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await api.post('/ai-automation/sms-campaigns', campaignData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] })
      setShowCreateModal(false)
      toast.success('SMS campaign created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create campaign')
    },
  })

  const updateCampaignStatusMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const response = await api.patch(`/ai-automation/sms-campaigns/${campaignId}`, { status })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-campaigns'] })
      toast.success('Campaign status updated!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update campaign')
    },
  })

  const handleStatusChange = (campaignId: string, status: string) => {
    updateCampaignStatusMutation.mutate({ campaignId, status })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayIcon className="h-4 w-4 text-green-600" />
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-600" />
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-blue-600" />
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage automated SMS marketing campaigns with AI-powered responses
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Campaign
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Messages Sent</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaignStats?.total_sent?.toLocaleString() || 0}
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
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Responses</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaignStats?.total_responses?.toLocaleString() || 0}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Rate</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {formatPercentage(campaignStats?.avg_response_rate || 0)}
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
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Campaigns</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaigns?.filter((c: SMSCampaign) => c.status === 'active').length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Campaigns</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Campaign Templates */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {campaignTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {template.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.message}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {formatPercentage(template.conversion_rate)} avg conversion
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Use template logic here
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
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
            {campaigns?.map((campaign: SMSCampaign) => (
              <li key={campaign.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(campaign.status)}
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[campaign.status]
                              }`}>
                                {campaign.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                            
                            <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                              <span>Target: {campaign.target_audience.count} contacts</span>
                              <span>Sent: {campaign.performance.sent}</span>
                              <span>Delivered: {campaign.performance.delivered}</span>
                              <span>Replied: {campaign.performance.replied}</span>
                              <span>Conversion: {formatPercentage(campaign.performance.conversion_rate)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {campaign.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'paused')}
                                className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                              >
                                Pause
                              </button>
                            )}
                            {campaign.status === 'paused' && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'active')}
                                className="text-green-600 hover:text-green-900 text-sm font-medium"
                              >
                                Resume
                              </button>
                            )}
                            {(campaign.status === 'active' || campaign.status === 'paused') && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'cancelled')}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Stop
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedCampaign(campaign)}
                              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                            >
                              View Details
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

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          title={selectedCampaign.name}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedCampaign.status]
                    }`}>
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Target Audience:</span>
                    <span className="ml-2">{selectedCampaign.target_audience.count} contacts</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Schedule:</span>
                    <span className="ml-2">
                      {new Date(selectedCampaign.schedule.start_date).toLocaleDateString()}
                      {selectedCampaign.schedule.end_date && ` - ${new Date(selectedCampaign.schedule.end_date).toLocaleDateString()}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">AI Auto-respond:</span>
                    <span className={`ml-2 ${selectedCampaign.ai_config.auto_respond ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedCampaign.ai_config.auto_respond ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Messages Sent:</span>
                    <span>{selectedCampaign.performance.sent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivered:</span>
                    <span>{selectedCampaign.performance.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Replied:</span>
                    <span>{selectedCampaign.performance.replied}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conversion Rate:</span>
                    <span className="text-green-600 font-medium">
                      {formatPercentage(selectedCampaign.performance.conversion_rate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Opt-outs:</span>
                    <span className="text-red-600">{selectedCampaign.performance.opt_outs}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Message Template</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">{selectedCampaign.message_template}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                Edit Campaign
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create SMS Campaign"
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  SMS Campaign Builder
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Our full campaign builder is coming soon! For now, you can create campaigns using our templates or contact support for custom campaign setup.
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