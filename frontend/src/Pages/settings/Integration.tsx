// frontend/src/pages/settings/Integrations.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

const integrationConfigSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
  api_secret: z.string().optional(),
  webhook_url: z.string().url('Please enter a valid webhook URL').optional(),
  settings: z.record(z.any()).optional(),
})

const webhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required'),
  url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Please select at least one event'),
  is_active: z.boolean().default(true),
})

type IntegrationConfigData = z.infer<typeof integrationConfigSchema>
type WebhookFormData = z.infer<typeof webhookSchema>

interface Integration {
  id: string
  name: string
  description: string
  category: string
  logo_url: string
  status: 'connected' | 'disconnected' | 'error'
  is_enabled: boolean
  last_sync?: string
  config?: Record<string, any>
  features: string[]
  documentation_url: string
  setup_url?: string
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered?: string
  created_at: string
}

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  created_at: string
  last_used?: string
  rate_limit: string
}

const availableIntegrations: Integration[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Sync invoices, payments, and financial data with QuickBooks',
    category: 'Accounting',
    logo_url: '/logos/quickbooks.png',
    status: 'disconnected',
    is_enabled: false,
    features: ['Invoice sync', 'Payment tracking', 'Customer sync', 'Financial reporting'],
    documentation_url: 'https://docs.STORM AI.com/integrations/quickbooks',
    setup_url: 'https://appcenter.intuit.com/connect/oauth2'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept online payments and manage subscriptions',
    category: 'Payments',
    logo_url: '/logos/stripe.png',
    status: 'connected',
    is_enabled: true,
    last_sync: '2024-01-15T10:30:00Z',
    features: ['Online payments', 'Recurring billing', 'Payment processing', 'Fraud protection'],
    documentation_url: 'https://docs.STORM AI.com/integrations/stripe'
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS notifications and automate conversations',
    category: 'Communications',
    logo_url: '/logos/twilio.png',
    status: 'connected',
    is_enabled: true,
    last_sync: '2024-01-15T09:15:00Z',
    features: ['SMS messaging', 'Voice calls', 'Conversation AI', 'Phone verification'],
    documentation_url: 'https://docs.STORM AI.com/integrations/twilio'
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and schedules with Google Calendar',
    category: 'Productivity',
    logo_url: '/logos/google-calendar.png',
    status: 'disconnected',
    is_enabled: false,
    features: ['Calendar sync', 'Appointment scheduling', 'Reminder notifications'],
    documentation_url: 'https://docs.STORM AI.com/integrations/google-calendar',
    setup_url: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync customer data and automate email marketing',
    category: 'Marketing',
    logo_url: '/logos/mailchimp.png',
    status: 'error',
    is_enabled: false,
    last_sync: '2024-01-14T15:45:00Z',
    features: ['Email campaigns', 'Customer segmentation', 'Automation workflows'],
    documentation_url: 'https://docs.STORM AI.com/integrations/mailchimp'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps through automated workflows',
    category: 'Automation',
    logo_url: '/logos/zapier.png',
    status: 'connected',
    is_enabled: true,
    last_sync: '2024-01-15T11:20:00Z',
    features: ['Workflow automation', 'App connections', 'Data sync', 'Trigger actions'],
    documentation_url: 'https://docs.STORM AI.com/integrations/zapier'
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    description: 'Route optimization and location services',
    category: 'Location',
    logo_url: '/logos/google-maps.png',
    status: 'connected',
    is_enabled: true,
    last_sync: '2024-01-15T08:30:00Z',
    features: ['Route optimization', 'Geocoding', 'Distance calculation', 'Map display'],
    documentation_url: 'https://docs.STORM AI.com/integrations/google-maps'
  }
]

const mockApiKeys: ApiKey[] = [
  {
    id: 'sk_live_123',
    name: 'Production API Key',
    key: 'sk_live_abcd1234efgh5678ijkl9012mnop3456',
    permissions: ['read', 'write'],
    created_at: '2024-01-01T00:00:00Z',
    last_used: '2024-01-15T10:30:00Z',
    rate_limit: '1000 requests/hour'
  },
  {
    id: 'sk_test_456',
    name: 'Test API Key',
    key: 'sk_test_wxyz7890abcd1234efgh5678ijkl9012',
    permissions: ['read'],
    created_at: '2024-01-05T00:00:00Z',
    last_used: '2024-01-14T15:45:00Z',
    rate_limit: '500 requests/hour'
  },
  {
    id: 'sk_dev_789',
    name: 'Development API Key',
    key: 'sk_dev_nopq3456rstu7890vwxy1234zabc5678',
    permissions: ['read', 'write', 'admin'],
    created_at: '2024-01-10T00:00:00Z',
    rate_limit: '100 requests/hour'
  }
]

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('integrations')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})

  const queryClient = useQueryClient()

  const configForm = useForm<IntegrationConfigData>({
    resolver: zodResolver(integrationConfigSchema),
  })

  const webhookForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
  })

  // Fetch integration configurations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await api.get('/integrations')
      return response.data
    },
  })

  // Fetch webhooks
  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const response = await api.get('/webhooks')
      return response.data || []
    },
  })

  // Configure integration mutation
  const configureIntegrationMutation = useMutation({
    mutationFn: async ({ integrationId, config }: { integrationId: string; config: IntegrationConfigData }) => {
      const response = await api.post(`/integrations/${integrationId}/configure`, config)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      setShowConfigModal(false)
      setSelectedIntegration(null)
      configForm.reset()
      toast.success('Integration configured successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to configure integration')
    },
  })

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: WebhookFormData) => {
      const response = await api.post('/webhooks', webhook)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowWebhookModal(false)
      webhookForm.reset()
      toast.success('Webhook created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create webhook')
    },
  })

  // Disconnect integration mutation
  const disconnectIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      await api.delete(`/integrations/${integrationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Integration disconnected successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to disconnect integration')
    },
  })

  // Test integration mutation
  const testIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await api.post(`/integrations/${integrationId}/test`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Integration test successful!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Integration test failed')
    },
  })

  // Sync integration mutation
  const syncIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await api.post(`/integrations/${integrationId}/sync`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Integration sync completed!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Integration sync failed')
    },
  })

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    const existingConfig = integrations?.find((i: any) => i.integration_id === integration.id)
    if (existingConfig) {
      configForm.setValue('api_key', existingConfig.config?.api_key || '')
      configForm.setValue('api_secret', existingConfig.config?.api_secret || '')
      configForm.setValue('webhook_url', existingConfig.config?.webhook_url || '')
    }
    setShowConfigModal(true)
  }

  const handleSubmitConfig = (data: IntegrationConfigData) => {
    if (!selectedIntegration) return
    configureIntegrationMutation.mutate({
      integrationId: selectedIntegration.id,
      config: data
    })
  }

  const handleSubmitWebhook = (data: WebhookFormData) => {
    createWebhookMutation.mutate(data)
  }

  const handleDisconnect = (integrationId: string, integrationName: string) => {
    if (window.confirm(`Are you sure you want to disconnect ${integrationName}?`)) {
      disconnectIntegrationMutation.mutate(integrationId)
    }
  }

  const handleTest = (integrationId: string) => {
    testIntegrationMutation.mutate(integrationId)
  }

  const handleSync = (integrationId: string) => {
    syncIntegrationMutation.mutate(integrationId)
  }

  const toggleApiKeyVisibility = (integrationId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const categories = ['all', 'Accounting', 'Payments', 'Communications', 'Productivity', 'Marketing', 'Automation', 'Location']

  const filteredIntegrations = availableIntegrations.filter(integration => 
    selectedCategory === 'all' || integration.category === selectedCategory
  )

  const tabs = [
    { id: 'integrations', name: 'Integrations', count: availableIntegrations.length },
    { id: 'webhooks', name: 'Webhooks', count: webhooks?.length || 0 },
    { id: 'api', name: 'API Keys', count: mockApiKeys.length },
  ]

  const availableEvents = [
    'lead.created',
    'lead.updated',
    'job.scheduled',
    'job.completed',
    'invoice.paid',
    'customer.created'
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect STORM AI with your favorite tools and services
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-900'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => {
              const connectedIntegration = integrations?.find((i: any) => i.integration_id === integration.id)
              const isConnected = connectedIntegration?.status === 'connected'
              const hasError = connectedIntegration?.status === 'error'

              return (
                <div key={integration.id} className="bg-white rounded-lg shadow border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img
                          src={integration.logo_url}
                          alt={integration.name}
                          className="h-8 w-8"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logos/default.png'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-500">{integration.category}</p>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(isConnected ? 'connected' : hasError ? 'error' : 'disconnected')}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(isConnected ? 'connected' : hasError ? 'error' : 'disconnected')
                      }`}>
                        {isConnected ? 'Connected' : hasError ? 'Error' : 'Not Connected'}
                      </span>
                      {integration.last_sync && (
                        <span className="text-xs text-gray-500">
                          Last sync: {formatDate(integration.last_sync)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {feature}
                          </span>
                        ))}
                        {integration.features.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{integration.features.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleConfigureIntegration(integration)}
                            className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Cog6ToothIcon className="h-4 w-4 inline mr-1" />
                            Configure
                          </button>
                          <button
                            onClick={() => handleTest(integration.id)}
                            disabled={testIntegrationMutation.isPending}
                            className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => handleSync(integration.id)}
                            disabled={syncIntegrationMutation.isPending}
                            className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Sync
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration.id, integration.name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConfigureIntegration(integration)}
                          className="flex-1 bg-primary-600 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-700"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Webhooks</h2>
              <p className="text-sm text-gray-500">
                Receive real-time notifications when events occur in STORM AI
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Add Webhook
            </button>
          </div>

          {webhooks && webhooks.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {webhooks.map((webhook: Webhook) => (
                  <li key={webhook.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{webhook.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{webhook.url}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              webhook.is_active 
                                ? 'text-green-600 bg-green-100' 
                                : 'text-gray-600 bg-gray-100'
                            }`}>
                              {webhook.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {webhook.events.length} events
                            </span>
                            {webhook.last_triggered && (
                              <span className="text-xs text-gray-500">
                                Last triggered: {formatDate(webhook.last_triggered)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {webhook.events.map((event) => (
                              <span
                                key={event}
                                className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Cog6ToothIcon className="h-5 w-5" />
                          </button>
                          <button className="text-red-400 hover:text-red-600">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new webhook.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
              <p className="text-sm text-gray-500">
                Manage API keys for programmatic access to STORM AI
              </p>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700">
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Generate New Key
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {mockApiKeys.map((apiKey) => (
                <li key={apiKey.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {showApiKeys[apiKey.id] ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleApiKeyVisibility(apiKey.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {showApiKeys[apiKey.id] ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(apiKey.key)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-600">Rate limit: {apiKey.rate_limit}</span>
                          <span className="text-sm text-gray-600">
                            Permissions: {apiKey.permissions.join(', ')}
                          </span>
                          {apiKey.last_used && (
                            <span className="text-sm text-gray-500">
                              Last used: {formatDate(apiKey.last_used)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                          Configure
                        </button>
                        <button className="text-red-400 hover:text-red-600">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  API Security Best Practices
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Keep your API keys secure and never share them publicly</li>
                    <li>Use environment variables to store API keys in your applications</li>
                    <li>Rotate your API keys regularly for enhanced security</li>
                    <li>Monitor API usage and set up alerts for unusual activity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Integration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setSelectedIntegration(null)
          configForm.reset()
        }}
        title={`Configure ${selectedIntegration?.name}`}
        size="lg"
      >
        {selectedIntegration && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <img
                  src={selectedIntegration.logo_url}
                  alt={selectedIntegration.name}
                  className="h-6 w-6"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logos/default.png'
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedIntegration.name}</h3>
                <p className="text-sm text-gray-500">{selectedIntegration.description}</p>
              </div>
            </div>

            <form onSubmit={configForm.handleSubmit(handleSubmitConfig)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API Key *
                </label>
                <div className="mt-1 relative">
                  <input
                    {...configForm.register('api_key')}
                    type={showApiKeys['config'] ? 'text' : 'password'}
                    className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your API key"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => toggleApiKeyVisibility('config')}
                  >
                    {showApiKeys['config'] ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {configForm.formState.errors.api_key && (
                  <p className="mt-1 text-sm text-red-600">{configForm.formState.errors.api_key.message}</p>
                )}
              </div>

              {selectedIntegration.id !== 'google_calendar' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    API Secret
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...configForm.register('api_secret')}
                      type={showApiKeys['secret'] ? 'text' : 'password'}
                      className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your API secret (if required)"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => toggleApiKeyVisibility('secret')}
                    >
                      {showApiKeys['secret'] ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL (optional)
                </label>
                <input
                  {...configForm.register('webhook_url')}
                  type="url"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://your-domain.com/webhooks/STORM AI"
                />
                {configForm.formState.errors.webhook_url && (
                  <p className="mt-1 text-sm text-red-600">{configForm.formState.errors.webhook_url.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  STORM AI will send webhook notifications to this URL
                </p>
              </div>

              {selectedIntegration.setup_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <LinkIcon className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Setup Instructions
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p className="mb-2">To get your API credentials:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Visit the {selectedIntegration.name} developer console</li>
                          <li>Create a new application or API key</li>
                          <li>Copy the credentials and paste them above</li>
                        </ol>
                        <a
                          href={selectedIntegration.setup_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                        >
                          Open {selectedIntegration.name} Console
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Features Enabled</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedIntegration.features.map((feature) => (
                    <div key={feature} className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigModal(false)
                    setSelectedIntegration(null)
                    configForm.reset()
                  }}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configureIntegrationMutation.isPending}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {configureIntegrationMutation.isPending ? 'Configuring...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Add Webhook Modal */}
      <Modal
        isOpen={showWebhookModal}
        onClose={() => {
          setShowWebhookModal(false)
          webhookForm.reset()
        }}
        title="Add Webhook"
        size="lg"
      >
        <form onSubmit={webhookForm.handleSubmit(handleSubmitWebhook)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Webhook Name *
            </label>
            <input
              {...webhookForm.register('name')}
              type="text"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="My Webhook"
            />
            {webhookForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{webhookForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Endpoint URL *
            </label>
            <input
              {...webhookForm.register('url')}
              type="url"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://your-domain.com/webhooks/STORM AI"
            />
            {webhookForm.formState.errors.url && (
              <p className="mt-1 text-sm text-red-600">{webhookForm.formState.errors.url.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Events to Listen For *
            </label>
            <div className="space-y-2">
              {availableEvents.map((event) => (
                <div key={event} className="flex items-center">
                  <input
                    {...webhookForm.register('events')}
                    type="checkbox"
                    value={event}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    {event}
                  </label>
                </div>
              ))}
            </div>
            {webhookForm.formState.errors.events && (
              <p className="mt-1 text-sm text-red-600">{webhookForm.formState.errors.events.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              {...webhookForm.register('is_active')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              defaultChecked
            />
            <label className="ml-2 block text-sm text-gray-900">
              Active webhook
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowWebhookModal(false)
                webhookForm.reset()
              }}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWebhookMutation.isPending}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {createWebhookMutation.isPending ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}