
// # frontend/src/services/serviceManagement.service.ts - FRONTEND SERVICE

import { api } from './api'
// Add these interfaces to your existing serviceManagement.service.ts

export interface FlowNode {
  id: string
  type: string
  x: number
  y: number
  data: {
    title: string
    message?: string
    prompt?: string
    transitions?: string[]
    [key: string]: any
  }
}

export interface FlowConnection {
  id: string
  from: string
  to: string
  transition?: string
}

export interface ConversationFlow {
  id?: string
  name: string
  description?: string
  nodes: FlowNode[]
  connections: FlowConnection[]
  active?: boolean
  company_id?: string
  created_at?: string
  updated_at?: string
}


// export interface ConversationFlow {
//   id?: string
//   name: string
//   description?: string
//   nodes: FlowNode[]
//   connections: FlowConnection[]
//   active?: boolean
//   company_id?: string
//   created_at?: string
//   updated_at?: string
// }

export interface ServicePricing {
  min: number
  max: number
  currency: string
}

export interface ServiceAvailability {
  hours: string
  days: string
}

export interface ServicePromptResponses {
  pricing: string
  booking: string
}

export interface ServicePrompts {
  greeting: string
  questions: string[]
  responses: ServicePromptResponses
}

export interface Service {
  id?: string
  name: string
  category: string
  description: string
  pricing: ServicePricing
  availability: ServiceAvailability
  keywords: string[]
  prompts: ServicePrompts
  active: boolean
  company_id?: string
  created_at?: string
  updated_at?: string
}

export interface ServiceStats {
  total_services: number
  active_services: number
  inactive_services: number
  categories: Array<{
    category: string
    count: number
  }>
}

export interface AIServiceMatch {
  matched: boolean
  service?: {
    id: string
    name: string
    category: string
    greeting: string
    pricing_response: string
    booking_response: string
    pricing: ServicePricing
    availability: ServiceAvailability
  }
  message?: string
  available_services?: string[]
}

class ServiceManagementService {
  private baseURL = '/service-management'

  // Service CRUD Operations
  async getServices(activeOnly: boolean = false): Promise<Service[]> {
    try {
      const response = await api.get(`${this.baseURL}/services`, {
        params: { active_only: activeOnly }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching services:', error)
      throw new Error('Failed to fetch services')
    }
  }

 // Conversation Flow Methods
// ADD THESE METHODS to your ServiceManagementService class

// Conversation Flow Methods
async createFlow(flowData: Omit<ConversationFlow, 'id' | 'created_at' | 'updated_at'>): Promise<{
  success: boolean
  message: string
  flow_id: string
  name: string
  created_at: string
}> {
  try {
    console.log('🚀 ServiceManagementService: Creating conversation flow:', flowData)
    
    const response = await api.post(`${this.baseURL}/flows`, flowData)
    
    console.log('✅ ServiceManagementService: Flow created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ ServiceManagementService: Failed to create flow:', error)
    
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail)
    }
    throw new Error('Failed to create conversation flow')
  }
}

async getFlows(): Promise<ConversationFlow[]> {
  try {
    console.log('📋 ServiceManagementService: Fetching conversation flows')
    
    const response = await api.get(`${this.baseURL}/flows`)
    
    console.log('✅ ServiceManagementService: Flows fetched:', response.data)
    return response.data.flows || []
  } catch (error: any) {
    console.error('❌ ServiceManagementService: Failed to get flows:', error)
    throw new Error('Failed to retrieve conversation flows')
  }
}

async updateFlow(flowId: string, flowData: Omit<ConversationFlow, 'id' | 'created_at' | 'updated_at'>): Promise<{
  success: boolean
  message: string
  flow_id: string
}> {
  try {
    console.log('🔄 ServiceManagementService: Updating flow:', flowId, flowData)
    
    const response = await api.put(`${this.baseURL}/flows/${flowId}`, flowData)
    
    console.log('✅ ServiceManagementService: Flow updated:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ ServiceManagementService: Failed to update flow:', error)
    throw new Error('Failed to update conversation flow')
  }
}

async deleteFlow(flowId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🗑️ ServiceManagementService: Deleting flow:', flowId)
    
    const response = await api.delete(`${this.baseURL}/flows/${flowId}`)
    
    console.log('✅ ServiceManagementService: Flow deleted:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ ServiceManagementService: Failed to delete flow:', error)
    throw new Error('Failed to delete conversation flow')
  }
}

  async createService(serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> {
    try {
      const response = await api.post(`${this.baseURL}/services`, serviceData)
      return response.data
    } catch (error) {
      console.error('Error creating service:', error)
      throw new Error('Failed to create service')
    }
  }

  async updateService(serviceId: string, serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> {
    try {
      const response = await api.put(`${this.baseURL}/services/${serviceId}`, serviceData)
      return response.data
    } catch (error) {
      console.error('Error updating service:', error)
      throw new Error('Failed to update service')
    }
  }

  async deleteService(serviceId: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/services/${serviceId}`)
    } catch (error) {
      console.error('Error deleting service:', error)
      throw new Error('Failed to delete service')
    }
  }

  async toggleServiceStatus(serviceId: string): Promise<void> {
    try {
      await api.patch(`${this.baseURL}/services/${serviceId}/toggle`)
    } catch (error) {
      console.error('Error toggling service status:', error)
      throw new Error('Failed to toggle service status')
    }
  }

  // AI Integration
  async getAvailableServicesForAI(companyId: string): Promise<{
    services: Service[]
    total: number
    company_id: string
  }> {
    try {
      const response = await api.get(`${this.baseURL}/ai/available-services`, {
        params: { company_id: companyId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching AI services:', error)
      throw new Error('Failed to fetch AI services')
    }
  }

  async matchServiceToMessage(companyId: string, message: string): Promise<AIServiceMatch> {
    try {
      const response = await api.post(`${this.baseURL}/ai/match-service`, {
        company_id: companyId,
        message: message
      })
      return response.data
    } catch (error) {
      console.error('Error matching service:', error)
      throw new Error('Failed to match service')
    }
  }

  async getServiceStats(companyId: string): Promise<ServiceStats> {
    try {
      const response = await api.get(`${this.baseURL}/ai/service-stats/${companyId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching service stats:', error)
      throw new Error('Failed to fetch service stats')
    }
  }

  // Validation helpers
  validateService(service: Partial<Service>): string[] {
    const errors: string[] = []

    if (!service.name?.trim()) {
      errors.push('Service name is required')
    }

    if (!service.category?.trim()) {
      errors.push('Service category is required')
    }

    if (!service.description?.trim()) {
      errors.push('Service description is required')
    }

    if (!service.keywords || service.keywords.length === 0) {
      errors.push('At least one keyword is required')
    }

    if (!service.pricing || service.pricing.min < 0 || service.pricing.max < service.pricing.min) {
      errors.push('Valid pricing range is required')
    }

    if (!service.prompts?.greeting?.trim()) {
      errors.push('AI greeting message is required')
    }

    if (!service.prompts?.responses?.pricing?.trim()) {
      errors.push('Pricing response is required')
    }

    if (!service.prompts?.responses?.booking?.trim()) {
      errors.push('Booking response is required')
    }

    return errors
  }

  // Template services for quick setup
  getServiceTemplates(): Partial<Service>[] {
    return [
      {
        name: 'House Cleaning',
        category: 'cleaning',
        description: 'Professional house cleaning services',
        keywords: ['cleaning', 'house', 'home', 'clean'],
        pricing: { min: 2000, max: 5000, currency: 'PKR' },
        availability: { hours: '9 AM - 6 PM', days: 'Mon-Sat' },
        prompts: {
          greeting: 'I can help you with professional house cleaning services.',
          questions: ['What is the size of your house?', 'What type of cleaning do you need?'],
          responses: {
            pricing: 'House cleaning services range from PKR 2,000 to PKR 5,000 depending on the size.',
            booking: 'I can schedule a house cleaning service for you. Please provide your contact details.'
          }
        }
      },
      {
        name: 'Electrical Repair',
        category: 'repair',
        description: 'Professional electrical repair and installation',
        keywords: ['electrical', 'wiring', 'lights', 'power', 'electric'],
        pricing: { min: 1500, max: 8000, currency: 'PKR' },
        availability: { hours: '8 AM - 8 PM', days: 'Mon-Sun' },
        prompts: {
          greeting: 'I can assist you with electrical repairs and installations.',
          questions: ['What type of electrical issue do you have?', 'Is this an emergency?'],
          responses: {
            pricing: 'Electrical services start from PKR 1,500 and can go up to PKR 8,000.',
            booking: 'I can arrange an electrician for you. Please describe the electrical issue.'
          }
        }
      },
      {
        name: 'Plumbing Services',
        category: 'repair',
        description: 'Professional plumbing repair and maintenance',
        keywords: ['plumbing', 'pipes', 'water', 'leak', 'bathroom'],
        pricing: { min: 1800, max: 6000, currency: 'PKR' },
        availability: { hours: '24/7', days: 'Mon-Sun' },
        prompts: {
          greeting: 'I can help you with plumbing services including repairs and installations.',
          questions: ['What type of plumbing issue do you have?', 'Which area needs work?'],
          responses: {
            pricing: 'Plumbing services range from PKR 1,800 to PKR 6,000 depending on the work.',
            booking: 'I can send a plumber to your location. Please provide details about the issue.'
          }
        }
      }
    ]
  }
}

export const serviceManagementService = new ServiceManagementService()
export default serviceManagementService

// ------------------------------------------------------------------
