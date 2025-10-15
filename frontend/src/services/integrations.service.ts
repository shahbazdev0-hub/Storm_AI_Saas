// frontend/src/services/integrations.service.ts
import { api } from './api'

// ===============================
// INTEGRATION TYPES & INTERFACES
// ===============================

export interface Integration {
  id: string
  name: string
  type: 'payment' | 'communication' | 'mapping' | 'accounting' | 'crm' | 'marketing' | 'storage'
  provider: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  description: string
  icon_url?: string
  config: Record<string, any>
  last_sync?: string
  created_at: string
  updated_at: string
}

export interface IntegrationProvider {
  id: string
  name: string
  type: string
  description: string
  icon_url: string
  auth_type: 'oauth2' | 'api_key' | 'basic' | 'webhook'
  required_fields: Array<{
    key: string
    label: string
    type: 'text' | 'password' | 'url' | 'email'
    required: boolean
    description?: string
  }>
  webhook_url?: string
  documentation_url?: string
  features: string[]
  pricing_info?: {
    free_tier: boolean
    pricing_url: string
  }
}

export interface IntegrationLog {
  id: string
  integration_id: string
  action: string
  status: 'success' | 'error' | 'warning'
  message: string
  metadata?: Record<string, any>
  created_at: string
}

export interface SyncResult {
  integration_id: string
  status: 'success' | 'error' | 'partial'
  records_synced: number
  errors: string[]
  duration_ms: number
  last_sync: string
}

// ===============================
// TWILIO SMS INTEGRATION
// ===============================

export interface TwilioConfig {
  account_sid: string
  auth_token: string
  phone_number: string
  webhook_url?: string
}

export interface SMSMessage {
  to: string
  body: string
  from?: string
  media_url?: string[]
}

export interface SMSResponse {
  sid: string
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  error_code?: number
  error_message?: string
}

// ===============================
// STRIPE PAYMENT INTEGRATION
// ===============================

export interface StripeConfig {
  publishable_key: string
  secret_key: string
  webhook_secret: string
  default_currency: string
}

export interface PaymentIntent {
  amount: number
  currency: string
  customer_id?: string
  description?: string
  metadata?: Record<string, string>
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account'
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  billing_details?: {
    name: string
    email: string
    address: any
  }
}

// ===============================
// QUICKBOOKS ACCOUNTING INTEGRATION
// ===============================

export interface QuickBooksConfig {
  client_id: string
  client_secret: string
  sandbox: boolean
  company_id: string
  access_token?: string
  refresh_token?: string
}

export interface QBCustomer {
  id?: string
  name: string
  email?: string
  phone?: string
  billing_address?: any
  metadata?: Record<string, any>
}

export interface QBInvoice {
  customer_id: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    item_ref?: string
  }>
  due_date?: string
  terms?: string
  memo?: string
}

// ===============================
// GOOGLE SERVICES INTEGRATION
// ===============================

export interface GoogleConfig {
  client_id: string
  client_secret: string
  api_key: string
  calendar_id?: string
  drive_folder_id?: string
}

export interface CalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  location?: string
}

// ===============================
// ZAPIER WEBHOOK INTEGRATION
// ===============================

export interface ZapierConfig {
  webhook_urls: Array<{
    event: string
    url: string
    active: boolean
  }>
}

export interface WebhookPayload {
  event: string
  data: Record<string, any>
  timestamp: string
  source: string
}

// ===============================
// INTEGRATIONS SERVICE CLASS
// ===============================

class IntegrationsService {
  // ===============================
  // GENERAL INTEGRATION MANAGEMENT
  // ===============================

  async getAvailableProviders(): Promise<IntegrationProvider[]> {
    const response = await api.get('/integrations/providers')
    return response.data
  }

  async getConnectedIntegrations(): Promise<Integration[]> {
    const response = await api.get('/integrations')
    return response.data
  }

  async getIntegration(integrationId: string): Promise<Integration> {
    const response = await api.get(`/integrations/${integrationId}`)
    return response.data
  }

  async connectIntegration(providerId: string, config: Record<string, any>): Promise<Integration> {
    const response = await api.post('/integrations/connect', {
      provider_id: providerId,
      config
    })
    return response.data
  }

  async updateIntegrationConfig(integrationId: string, config: Record<string, any>): Promise<Integration> {
    const response = await api.put(`/integrations/${integrationId}/config`, config)
    return response.data
  }

  async disconnectIntegration(integrationId: string): Promise<void> {
    await api.delete(`/integrations/${integrationId}`)
  }

  async testIntegration(integrationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/integrations/${integrationId}/test`)
    return response.data
  }

  async syncIntegration(integrationId: string): Promise<SyncResult> {
    const response = await api.post(`/integrations/${integrationId}/sync`)
    return response.data
  }

  async getIntegrationLogs(integrationId: string, limit: number = 50): Promise<IntegrationLog[]> {
    const response = await api.get(`/integrations/${integrationId}/logs?limit=${limit}`)
    return response.data
  }

  // ===============================
  // TWILIO SMS INTEGRATION
  // ===============================

  async connectTwilio(config: TwilioConfig): Promise<Integration> {
    return this.connectIntegration('twilio', config)
  }

  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    const response = await api.post('/integrations/twilio/sms/send', message)
    return response.data
  }

  async getSMSHistory(phoneNumber?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams()
    if (phoneNumber) params.append('phone_number', phoneNumber)
    params.append('limit', limit.toString())
    
    const response = await api.get(`/integrations/twilio/sms/history?${params.toString()}`)
    return response.data
  }

  async setupSMSWebhook(webhookUrl: string): Promise<{ success: boolean; webhook_url: string }> {
    const response = await api.post('/integrations/twilio/webhook', { webhook_url: webhookUrl })
    return response.data
  }

  async getTwilioPhoneNumbers(): Promise<Array<{ phone_number: string; friendly_name: string; capabilities: string[] }>> {
    const response = await api.get('/integrations/twilio/phone-numbers')
    return response.data
  }

  // ===============================
  // STRIPE PAYMENT INTEGRATION
  // ===============================

  async connectStripe(config: StripeConfig): Promise<Integration> {
    return this.connectIntegration('stripe', config)
  }

  async createPaymentIntent(paymentIntent: PaymentIntent): Promise<{ client_secret: string; id: string }> {
    const response = await api.post('/integrations/stripe/payment-intents', paymentIntent)
    return response.data
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const response = await api.get(`/integrations/stripe/customers/${customerId}/payment-methods`)
    return response.data
  }

  async createCustomer(customer: { name: string; email: string; phone?: string }): Promise<{ id: string }> {
    const response = await api.post('/integrations/stripe/customers', customer)
    return response.data
  }

  async getPaymentHistory(customerId?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams()
    if (customerId) params.append('customer_id', customerId)
    params.append('limit', limit.toString())
    
    const response = await api.get(`/integrations/stripe/payments?${params.toString()}`)
    return response.data
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<{ id: string; status: string }> {
    const response = await api.post(`/integrations/stripe/refunds`, {
      payment_intent_id: paymentIntentId,
      amount
    })
    return response.data
  }

  // ===============================
  // QUICKBOOKS INTEGRATION
  // ===============================

  async connectQuickBooks(config: QuickBooksConfig): Promise<Integration> {
    return this.connectIntegration('quickbooks', config)
  }

  async syncCustomersToQuickBooks(): Promise<SyncResult> {
    const response = await api.post('/integrations/quickbooks/sync/customers')
    return response.data
  }

  async createQBCustomer(customer: QBCustomer): Promise<{ id: string; qb_id: string }> {
    const response = await api.post('/integrations/quickbooks/customers', customer)
    return response.data
  }

  async createQBInvoice(invoice: QBInvoice): Promise<{ id: string; qb_id: string; invoice_number: string }> {
    const response = await api.post('/integrations/quickbooks/invoices', invoice)
    return response.data
  }

  async getQBCustomers(): Promise<QBCustomer[]> {
    const response = await api.get('/integrations/quickbooks/customers')
    return response.data
  }

  async getQBItems(): Promise<Array<{ id: string; name: string; unit_price: number; type: string }>> {
    const response = await api.get('/integrations/quickbooks/items')
    return response.data
  }

  async syncInvoicesToQuickBooks(): Promise<SyncResult> {
    const response = await api.post('/integrations/quickbooks/sync/invoices')
    return response.data
  }

  // ===============================
  // GOOGLE SERVICES INTEGRATION
  // ===============================

  async connectGoogle(config: GoogleConfig): Promise<Integration> {
    return this.connectIntegration('google', config)
  }

  async createCalendarEvent(event: CalendarEvent): Promise<{ id: string; html_link: string }> {
    const response = await api.post('/integrations/google/calendar/events', event)
    return response.data
  }

  async getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })
    
    const response = await api.get(`/integrations/google/calendar/events?${params.toString()}`)
    return response.data
  }

  async uploadToDrive(file: File, folderId?: string): Promise<{ id: string; web_view_link: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folder_id', folderId)
    
    const response = await api.post('/integrations/google/drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  async getDriveFiles(folderId?: string): Promise<Array<{ id: string; name: string; web_view_link: string; created_time: string }>> {
    const params = new URLSearchParams()
    if (folderId) params.append('folder_id', folderId)
    
    const response = await api.get(`/integrations/google/drive/files?${params.toString()}`)
    return response.data
  }

  async optimizeRoute(waypoints: Array<{ lat: number; lng: number; address: string }>): Promise<{
    optimized_order: number[]
    total_distance: number
    total_duration: number
    routes: any[]
  }> {
    const response = await api.post('/integrations/google/maps/optimize-route', { waypoints })
    return response.data
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted_address: string }> {
    const response = await api.post('/integrations/google/maps/geocode', { address })
    return response.data
  }

  // ===============================
  // ZAPIER WEBHOOK INTEGRATION
  // ===============================

  async connectZapier(config: ZapierConfig): Promise<Integration> {
    return this.connectIntegration('zapier', config)
  }

  async triggerZapierWebhook(event: string, data: Record<string, any>): Promise<{ success: boolean; webhooks_triggered: number }> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      source: 'servicecrm'
    }
    
    const response = await api.post('/integrations/zapier/trigger', payload)
    return response.data
  }

  async testZapierWebhook(webhookUrl: string): Promise<{ success: boolean; response_time_ms: number }> {
    const response = await api.post('/integrations/zapier/test', { webhook_url: webhookUrl })
    return response.data
  }

  async getZapierWebhookLogs(limit: number = 50): Promise<Array<{
    id: string
    event: string
    webhook_url: string
    status: 'success' | 'failed'
    response_time_ms: number
    created_at: string
  }>> {
    const response = await api.get(`/integrations/zapier/logs?limit=${limit}`)
    return response.data
  }

  // ===============================
  // SENDGRID EMAIL INTEGRATION
  // ===============================

  async connectSendGrid(config: { api_key: string; from_email: string; from_name: string }): Promise<Integration> {
    return this.connectIntegration('sendgrid', config)
  }

  async sendEmail(email: {
    to: string | string[]
    subject: string
    html_content?: string
    text_content?: string
    template_id?: string
    template_data?: Record<string, any>
  }): Promise<{ message_id: string; status: string }> {
    const response = await api.post('/integrations/sendgrid/send', email)
    return response.data
  }

  async getEmailTemplates(): Promise<Array<{ id: string; name: string; subject: string; updated_at: string }>> {
    const response = await api.get('/integrations/sendgrid/templates')
    return response.data
  }

  async getEmailStats(startDate: string, endDate: string): Promise<{
    delivered: number
    opens: number
    clicks: number
    bounces: number
    spam_reports: number
  }> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })
    
    const response = await api.get(`/integrations/sendgrid/stats?${params.toString()}`)
    return response.data
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  async validateApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; message: string }> {
    const response = await api.post('/integrations/validate-api-key', {
      provider,
      api_key: apiKey
    })
    return response.data
  }

  async getIntegrationUsage(integrationId: string, period: '7d' | '30d' | '90d' = '30d'): Promise<{
    requests: number
    errors: number
    success_rate: number
    avg_response_time_ms: number
    data_synced: number
  }> {
    const response = await api.get(`/integrations/${integrationId}/usage?period=${period}`)
    return response.data
  }

  async exportIntegrationData(integrationId: string, format: 'csv' | 'json' = 'csv'): Promise<{ download_url: string; expires_at: string }> {
    const response = await api.post(`/integrations/${integrationId}/export`, { format })
    return response.data
  }

  async bulkSync(integrationIds: string[]): Promise<SyncResult[]> {
    const response = await api.post('/integrations/bulk-sync', { integration_ids: integrationIds })
    return response.data
  }

  async getIntegrationHealth(): Promise<Array<{
    integration_id: string
    name: string
    status: 'healthy' | 'degraded' | 'down'
    last_successful_sync: string
    error_rate: number
    avg_response_time: number
  }>> {
    const response = await api.get('/integrations/health')
    return response.data
  }

  // ===============================
  // WEBHOOK MANAGEMENT
  // ===============================

  async registerWebhook(integrationId: string, events: string[], webhookUrl: string): Promise<{ webhook_id: string; secret: string }> {
    const response = await api.post(`/integrations/${integrationId}/webhooks`, {
      events,
      webhook_url: webhookUrl
    })
    return response.data
  }

  async getWebhooks(integrationId: string): Promise<Array<{
    id: string
    events: string[]
    url: string
    active: boolean
    created_at: string
  }>> {
    const response = await api.get(`/integrations/${integrationId}/webhooks`)
    return response.data
  }

  async deleteWebhook(integrationId: string, webhookId: string): Promise<void> {
    await api.delete(`/integrations/${integrationId}/webhooks/${webhookId}`)
  }

  async testWebhook(integrationId: string, webhookId: string): Promise<{ success: boolean; response_time_ms: number; status_code: number }> {
    const response = await api.post(`/integrations/${integrationId}/webhooks/${webhookId}/test`)
    return response.data
  }

  // ===============================
  // BATCH OPERATIONS
  // ===============================

  async batchCreateCustomers(customers: Array<{ name: string; email: string; phone?: string }>): Promise<{
    success_count: number
    error_count: number
    errors: Array<{ index: number; error: string }>
  }> {
    const response = await api.post('/integrations/batch/customers', { customers })
    return response.data
  }

  async batchSendEmails(emails: Array<{
    to: string
    subject: string
    content: string
    template_id?: string
  }>): Promise<{
    success_count: number
    error_count: number
    errors: Array<{ index: number; error: string }>
  }> {
    const response = await api.post('/integrations/batch/emails', { emails })
    return response.data
  }

  async batchSendSMS(messages: SMSMessage[]): Promise<{
    success_count: number
    error_count: number
    errors: Array<{ index: number; error: string }>
  }> {
    const response = await api.post('/integrations/batch/sms', { messages })
    return response.data
  }
}

// ===============================
// EXPORT SERVICE INSTANCE
// ===============================

export const integrationsService = new IntegrationsService()

// ===============================
// INTEGRATION EVENT HELPERS
// ===============================

export const IntegrationEvents = {
  // CRM Events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  LEAD_CREATED: 'lead.created',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  
  // Job Events
  JOB_SCHEDULED: 'job.scheduled',
  JOB_STARTED: 'job.started',
  JOB_COMPLETED: 'job.completed',
  JOB_CANCELLED: 'job.cancelled',
  
  // Estimate/Invoice Events
  ESTIMATE_CREATED: 'estimate.created',
  ESTIMATE_SENT: 'estimate.sent',
  ESTIMATE_ACCEPTED: 'estimate.accepted',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  
  // Payment Events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_PROCESSED: 'refund.processed',
  
  // Communication Events
  SMS_SENT: 'sms.sent',
  SMS_RECEIVED: 'sms.received',
  EMAIL_SENT: 'email.sent',
  EMAIL_OPENED: 'email.opened',
  
  // System Events
  SYNC_COMPLETED: 'sync.completed',
  INTEGRATION_ERROR: 'integration.error',
  WEBHOOK_RECEIVED: 'webhook.received'
} as const

// ===============================
// INTEGRATION STATUS HELPERS
// ===============================

export const getIntegrationStatusColor = (status: Integration['status']) => {
  switch (status) {
    case 'connected':
      return 'text-green-600 bg-green-100'
    case 'disconnected':
      return 'text-gray-600 bg-gray-100'
    case 'error':
      return 'text-red-600 bg-red-100'
    case 'pending':
      return 'text-yellow-600 bg-yellow-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export const getIntegrationTypeIcon = (type: IntegrationProvider['type']) => {
  const iconMap = {
    payment: '💳',
    communication: '📱',
    mapping: '🗺️',
    accounting: '📊',
    crm: '👥',
    marketing: '📧',
    storage: '💾'
  }
  return iconMap[type as keyof typeof iconMap] || '🔌'
}

// ===============================
// COMMON INTEGRATION CONFIGS
// ===============================

export const CommonIntegrations = {
  TWILIO: {
    name: 'Twilio',
    type: 'communication',
    fields: ['account_sid', 'auth_token', 'phone_number']
  },
  STRIPE: {
    name: 'Stripe',
    type: 'payment',
    fields: ['publishable_key', 'secret_key', 'webhook_secret']
  },
  QUICKBOOKS: {
    name: 'QuickBooks',
    type: 'accounting',
    fields: ['client_id', 'client_secret', 'sandbox', 'company_id']
  },
  GOOGLE: {
    name: 'Google Workspace',
    type: 'mapping',
    fields: ['client_id', 'client_secret', 'api_key']
  },
  SENDGRID: {
    name: 'SendGrid',
    type: 'communication',
    fields: ['api_key', 'from_email', 'from_name']
  },
  ZAPIER: {
    name: 'Zapier',
    type: 'automation',
    fields: ['webhook_urls']
  }
} as const