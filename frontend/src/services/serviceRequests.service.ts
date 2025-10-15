// frontend/src/services/serviceRequests.service.ts - NEW FILE
import { api } from './api'

export interface ServiceRequest {
  id: string
  request_number: string
  customer_name: string
  customer_email: string
  service_type: string
  description: string
  location: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'converted_to_lead'
  preferred_date?: string
  preferred_time?: string
  contact_phone?: string
  special_instructions?: string
  admin_notes?: string
  estimated_cost?: number
  estimated_duration?: number
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
    email: string
    phone: string
    addresses?: any[]
  }
  assigned_user?: {
    id: string
    name: string
    email: string
    role: string
  }
  related_jobs?: any[]
  related_estimates?: any[]
}

export interface ServiceRequestsResponse {
  service_requests: ServiceRequest[]
  total: number
  page: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

export interface ServiceRequestStats {
  total_requests: number
  pending_requests: number
  assigned_requests: number
  completed_requests: number
  recent_requests: number
  completion_rate: number
  priority_breakdown: Record<string, number>
  status_breakdown: Record<string, number>
}

export interface UpdateServiceRequestData {
  status?: string
  priority?: string
  assigned_to?: string
  admin_notes?: string
  estimated_cost?: number
  estimated_duration?: number
}

export interface AssignServiceRequestData {
  assigned_to: string
  notes?: string
}

export const serviceRequestsService = {
  // Get all service requests (admin)
  async getServiceRequests(params?: {
    status?: string
    priority?: string
    assigned_to?: string
    search?: string
    limit?: number
    offset?: number
    sort_by?: string
    sort_order?: string
  }): Promise<ServiceRequestsResponse> {
    const response = await api.get('/service-requests', { params })
    return response.data
  },

  // Get single service request with full details
  async getServiceRequest(id: string): Promise<{ service_request: ServiceRequest }> {
    const response = await api.get(`/service-requests/${id}`)
    return response.data
  },

  // Update service request
  async updateServiceRequest(id: string, data: UpdateServiceRequestData): Promise<{ service_request: ServiceRequest }> {
    const response = await api.put(`/service-requests/${id}`, data)
    return response.data
  },

  // Assign service request to user
  async assignServiceRequest(id: string, data: AssignServiceRequestData): Promise<{ message: string; assigned_to: string }> {
    const response = await api.post(`/service-requests/${id}/assign`, data)
    return response.data
  },

  // Convert service request to lead
  async convertToLead(id: string): Promise<{ message: string; lead_id: string; lead_number: string }> {
    const response = await api.post(`/service-requests/${id}/convert-to-lead`)
    return response.data
  },

  // Delete (cancel) service request
  async deleteServiceRequest(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/service-requests/${id}`)
    return response.data
  },

  // Get service requests statistics
  async getServiceRequestsStats(days: number = 30): Promise<ServiceRequestStats> {
    const response = await api.get('/service-requests/stats/overview', { params: { days } })
    return response.data
  }
}