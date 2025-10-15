// frontend/src/services/crm.service.ts - TRAILING SLASH FIX
import api from './api'
import { Contact, ContactFilters, ContactCreateRequest, ContactUpdateRequest, Lead, LeadFilters, LeadCreateRequest, LeadUpdateRequest, PipelineStats } from '../types/crm'

export class CRMService {
  // Contact Management - FIXED with trailing slashes
  static async getContacts(filters?: ContactFilters): Promise<Contact[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    // 🔧 FIX: Add trailing slash
    const response = await api.get(`/contacts/?${params.toString()}`)
    return response.data
  }

  static async getContact(contactId: string): Promise<Contact> {
    const response = await api.get(`/contacts/${contactId}`)
    return response.data
  }

  static async createContact(contactData: ContactCreateRequest): Promise<Contact> {
    // 🔧 FIX: Add trailing slash for POST
    const response = await api.post('/contacts/', contactData)
    return response.data
  }

  static async updateContact(contactId: string, updates: ContactUpdateRequest): Promise<Contact> {
    const response = await api.patch(`/contacts/${contactId}`, updates)
    return response.data
  }

  static async deleteContact(contactId: string): Promise<void> {
    await api.delete(`/contacts/${contactId}`)
  }

  static async searchContacts(query: string): Promise<Contact[]> {
    const response = await api.get(`/contacts/search?q=${encodeURIComponent(query)}`)
    return response.data
  }

  static async getContactActivity(contactId: string): Promise<any[]> {
    const response = await api.get(`/contacts/${contactId}/activity`)
    return response.data
  }

  static async addContactNote(contactId: string, note: string): Promise<any> {
    const response = await api.post(`/contacts/${contactId}/notes`, { note })
    return response.data
  }

  static async addContactTag(contactId: string, tag: string): Promise<Contact> {
    const response = await api.post(`/contacts/${contactId}/tags`, { tag })
    return response.data
  }

  static async removeContactTag(contactId: string, tag: string): Promise<Contact> {
    const response = await api.delete(`/contacts/${contactId}/tags/${tag}`)
    return response.data
  }

  static async mergeContacts(primaryContactId: string, secondaryContactId: string): Promise<Contact> {
    const response = await api.post(`/contacts/${primaryContactId}/merge`, {
      secondary_contact_id: secondaryContactId
    })
    return response.data
  }

  static async exportContacts(filters?: ContactFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('format', format)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get(`/contacts/export?${params.toString()}`, {
      responseType: 'blob'
    })
    return response.data
  }

  // Lead Management - FIXED with trailing slashes
  static async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    // 🔧 FIX: Add trailing slash  
    const response = await api.get(`/leads/?${params.toString()}`)
    return response.data
  }

  static async getLead(leadId: string): Promise<Lead> {
    const response = await api.get(`/leads/${leadId}`)
    return response.data
  }

  static async createLead(leadData: LeadCreateRequest): Promise<Lead> {
    // 🔧 FIX: Add trailing slash for POST
    const response = await api.post('/leads/', leadData)
    return response.data
  }

  static async updateLead(leadId: string, updates: LeadUpdateRequest): Promise<Lead> {
    const response = await api.patch(`/leads/${leadId}`, updates)
    return response.data
  }

  static async updateLeadStatus(leadId: string, status: Lead['status']): Promise<Lead> {
    const response = await api.patch(`/leads/${leadId}`, { status })
    return response.data
  }

  static async deleteLead(leadId: string): Promise<void> {
    await api.delete(`/leads/${leadId}`)
  }

  static async assignLead(leadId: string, userId: string): Promise<Lead> {
    const response = await api.patch(`/leads/${leadId}/assign`, { assigned_to: userId })
    return response.data
  }

  static async convertLeadToContact(leadId: string): Promise<{ contact: Contact; lead: Lead }> {
    const response = await api.post(`/leads/${leadId}/convert`)
    return response.data
  }

  static async getLeadActivity(leadId: string): Promise<any[]> {
    const response = await api.get(`/leads/${leadId}/activity`)
    return response.data
  }

  static async addLeadNote(leadId: string, note: string): Promise<any> {
    const response = await api.post(`/leads/${leadId}/notes`, { note })
    return response.data
  }

  static async scoreLeads(leadIds: string[]): Promise<{ lead_id: string; score: number }[]> {
    const response = await api.post('/leads/score', { lead_ids: leadIds })
    return response.data
  }

  static async bulkUpdateLeads(leadIds: string[], updates: Partial<LeadUpdateRequest>): Promise<Lead[]> {
    const response = await api.patch('/leads/bulk', { lead_ids: leadIds, updates })
    return response.data
  }

  static async exportLeads(filters?: LeadFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('format', format)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get(`/leads/export?${params.toString()}`, {
      responseType: 'blob'
    })
    return response.data
  }

  // Pipeline Management
  static async getPipelineStats(period?: string): Promise<PipelineStats> {
    const params = period ? `?period=${period}` : ''
    const response = await api.get(`/leads/pipeline/stats${params}`)
    return response.data
  }

  static async getPipelineData(period?: string): Promise<any> {
    const params = period ? `?period=${period}` : ''
    const response = await api.get(`/leads/pipeline${params}`)
    return response.data
  }

  static async moveLead(leadId: string, newStatus: Lead['status']): Promise<Lead> {
    return this.updateLeadStatus(leadId, newStatus)
  }

  // Analytics and Reporting
  static async getCRMAnalytics(dateRange?: { start: string; end: string }): Promise<any> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.append('start_date', dateRange.start)
      params.append('end_date', dateRange.end)
    }

    const response = await api.get(`/crm/analytics?${params.toString()}`)
    return response.data
  }

  static async getConversionFunnel(period?: string): Promise<any> {
    const params = period ? `?period=${period}` : ''
    const response = await api.get(`/crm/conversion-funnel${params}`)
    return response.data
  }

  static async getLeadSources(): Promise<{ source: string; count: number; percentage: number }[]> {
    const response = await api.get('/crm/lead-sources')
    return response.data
  }

  static async getPerformanceMetrics(userId?: string, period?: string): Promise<any> {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (period) params.append('period', period)

    const response = await api.get(`/crm/performance?${params.toString()}`)
    return response.data
  }

  // Tags and Custom Fields
  static async getAvailableTags(): Promise<string[]> {
    const response = await api.get('/crm/tags')
    return response.data
  }

  static async createTag(tag: string): Promise<string> {
    const response = await api.post('/crm/tags', { tag })
    return response.data
  }

  static async deleteTag(tag: string): Promise<void> {
    await api.delete(`/crm/tags/${encodeURIComponent(tag)}`)
  }

  static async getCustomFields(): Promise<any[]> {
    const response = await api.get('/crm/custom-fields')
    return response.data
  }

  static async createCustomField(field: any): Promise<any> {
    const response = await api.post('/crm/custom-fields', field)
    return response.data
  }

  static async updateCustomField(fieldId: string, updates: any): Promise<any> {
    const response = await api.patch(`/crm/custom-fields/${fieldId}`, updates)
    return response.data
  }

  static async deleteCustomField(fieldId: string): Promise<void> {
    await api.delete(`/crm/custom-fields/${fieldId}`)
  }

  // Communication History
  static async getCommunicationHistory(contactId?: string, leadId?: string): Promise<any[]> {
    const params = new URLSearchParams()
    if (contactId) params.append('contact_id', contactId)
    if (leadId) params.append('lead_id', leadId)

    const response = await api.get(`/crm/communications?${params.toString()}`)
    return response.data
  }

  static async logCommunication(data: {
    contact_id?: string
    lead_id?: string
    type: 'email' | 'phone' | 'sms' | 'meeting' | 'note'
    subject?: string
    content: string
    direction: 'inbound' | 'outbound'
    duration?: number
    scheduled_at?: string
  }): Promise<any> {
    const response = await api.post('/crm/communications', data)
    return response.data
  }

  // Data Import/Export
  static async importContacts(file: File, options?: {
    skip_duplicates?: boolean
    update_existing?: boolean
    field_mapping?: Record<string, string>
  }): Promise<{ success: number; failed: number; errors: any[] }> {
    const formData = new FormData()
    formData.append('file', file)
    if (options) {
      formData.append('options', JSON.stringify(options))
    }

    const response = await api.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  static async importLeads(file: File, options?: {
    skip_duplicates?: boolean
    update_existing?: boolean
    field_mapping?: Record<string, string>
  }): Promise<{ success: number; failed: number; errors: any[] }> {
    const formData = new FormData()
    formData.append('file', file)
    if (options) {
      formData.append('options', JSON.stringify(options))
    }

    const response = await api.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  // Duplicate Detection
  static async findDuplicateContacts(): Promise<{ duplicates: Contact[][]; count: number }> {
    const response = await api.get('/contacts/duplicates')
    return response.data
  }

  static async findDuplicateLeads(): Promise<{ duplicates: Lead[][]; count: number }> {
    const response = await api.get('/leads/duplicates')
    return response.data
  }

  static async mergeDuplicates(type: 'contacts' | 'leads', primaryId: string, duplicateIds: string[]): Promise<any> {
    const response = await api.post(`/${type}/merge-duplicates`, {
      primary_id: primaryId,
      duplicate_ids: duplicateIds
    })
    return response.data
  }
}