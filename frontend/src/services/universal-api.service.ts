// frontend/src/services/universal-api.service.ts
// Universal service that handles both trailing slash and no trailing slash

import { api } from './api'

/**
 * Universal API service that automatically handles trailing slash issues
 * Tries both with and without trailing slash if the first request fails
 */
class UniversalApiService {
  /**
   * Try API request with automatic trailing slash fallback
   */
  private async requestWithFallback(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    data?: any,
    options?: any
  ): Promise<any> {
    try {
      // Try original endpoint first
      const response = await api[method](endpoint, data, options)
      return response
    } catch (error: any) {
      // If we get a 404 or 405, try with different trailing slash
      if (error.response?.status === 404 || error.response?.status === 405) {
        let fallbackEndpoint: string
        
        if (endpoint.endsWith('/')) {
          // Try without trailing slash
          fallbackEndpoint = endpoint.slice(0, -1)
        } else {
          // Try with trailing slash
          fallbackEndpoint = endpoint + '/'
        }
        
        console.log(`🔄 Retrying with fallback endpoint: ${fallbackEndpoint}`)
        
        try {
          const fallbackResponse = await api[method](fallbackEndpoint, data, options)
          return fallbackResponse
        } catch (fallbackError) {
          // If both fail, throw the original error
          throw error
        }
      }
      
      // If it's not a routing issue, throw the original error
      throw error
    }
  }

  // Contacts endpoints
  async getContacts(params?: URLSearchParams): Promise<any> {
    const endpoint = params ? `/contacts?${params.toString()}` : '/contacts'
    return this.requestWithFallback('get', endpoint)
  }

  async createContact(contactData: any): Promise<any> {
    return this.requestWithFallback('post', '/contacts', contactData)
  }

  async getContact(contactId: string): Promise<any> {
    return this.requestWithFallback('get', `/contacts/${contactId}`)
  }

  async updateContact(contactId: string, updates: any): Promise<any> {
    return this.requestWithFallback('patch', `/contacts/${contactId}`, updates)
  }

  async deleteContact(contactId: string): Promise<any> {
    return this.requestWithFallback('delete', `/contacts/${contactId}`)
  }

  async getContactStats(): Promise<any> {
    return this.requestWithFallback('get', '/contacts/stats')
  }

  // Leads endpoints
  async getLeads(params?: URLSearchParams): Promise<any> {
    const endpoint = params ? `/leads?${params.toString()}` : '/leads'
    return this.requestWithFallback('get', endpoint)
  }

  async createLead(leadData: any): Promise<any> {
    return this.requestWithFallback('post', '/leads', leadData)
  }

  async getLead(leadId: string): Promise<any> {
    return this.requestWithFallback('get', `/leads/${leadId}`)
  }

  async updateLead(leadId: string, updates: any): Promise<any> {
    return this.requestWithFallback('patch', `/leads/${leadId}`, updates)
  }

  async deleteLead(leadId: string): Promise<any> {
    return this.requestWithFallback('delete', `/leads/${leadId}`)
  }

  async getLeadStats(): Promise<any> {
    return this.requestWithFallback('get', '/leads/stats')
  }

  // Jobs endpoints
  async getJobs(params?: URLSearchParams): Promise<any> {
    const endpoint = params ? `/jobs?${params.toString()}` : '/jobs'
    return this.requestWithFallback('get', endpoint)
  }

  async createJob(jobData: any): Promise<any> {
    return this.requestWithFallback('post', '/jobs', jobData)
  }

  async getJob(jobId: string): Promise<any> {
    return this.requestWithFallback('get', `/jobs/${jobId}`)
  }

  async updateJob(jobId: string, updates: any): Promise<any> {
    return this.requestWithFallback('patch', `/jobs/${jobId}`, updates)
  }

  // Estimates endpoints
  async getEstimates(params?: URLSearchParams): Promise<any> {
    const endpoint = params ? `/estimates?${params.toString()}` : '/estimates'
    return this.requestWithFallback('get', endpoint)
  }

  async createEstimate(estimateData: any): Promise<any> {
    return this.requestWithFallback('post', '/estimates', estimateData)
  }

  // Invoices endpoints
  async getInvoices(params?: URLSearchParams): Promise<any> {
    const endpoint = params ? `/invoices?${params.toString()}` : '/invoices'
    return this.requestWithFallback('get', endpoint)
  }

  async createInvoice(invoiceData: any): Promise<any> {
    return this.requestWithFallback('post', '/invoices', invoiceData)
  }
}

// Export singleton instance
export const universalApi = new UniversalApiService()

// Convenience wrapper functions for easy migration
export const apiRequest = {
  // Contacts
  getContacts: (filters?: any) => {
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
    return universalApi.getContacts(params)
  },

  createContact: (data: any) => universalApi.createContact(data),
  updateContact: (id: string, data: any) => universalApi.updateContact(id, data),
  deleteContact: (id: string) => universalApi.deleteContact(id),
  getContactStats: () => universalApi.getContactStats(),

  // Leads
  getLeads: (filters?: any) => {
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
    return universalApi.getLeads(params)
  },

  createLead: (data: any) => universalApi.createLead(data),
  updateLead: (id: string, data: any) => universalApi.updateLead(id, data),
  deleteLead: (id: string) => universalApi.deleteLead(id),
  getLeadStats: () => universalApi.getLeadStats(),

  // Jobs
  getJobs: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })
    }
    return universalApi.getJobs(params)
  },

  createJob: (data: any) => universalApi.createJob(data),
  updateJob: (id: string, data: any) => universalApi.updateJob(id, data),

  // Estimates
  getEstimates: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })
    }
    return universalApi.getEstimates(params)
  },

  createEstimate: (data: any) => universalApi.createEstimate(data),

  // Invoices
  getInvoices: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })
    }
    return universalApi.getInvoices(params)
  },

  createInvoice: (data: any) => universalApi.createInvoice(data)
}

export default universalApi