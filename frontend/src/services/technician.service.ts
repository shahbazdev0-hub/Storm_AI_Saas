// frontend/src/services/technician.service.ts - NEW FILE
import { api } from './api'

export interface TechnicianJob {
  id: string
  title: string
  job_number: string
  service_type: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'emergency'
  description?: string
  customer?: {
    name: string
    phone?: string
    address?: string
  }
  scheduled_start?: string
  scheduled_end?: string
  estimated_duration?: number
  special_instructions?: string
}

export interface TechnicianDashboard {
  technician: {
    id: string
    name: string
    phone?: string
    status: string
  }
  today_jobs: TechnicianJob[]
  stats: {
    today_total: number
    week_stats: {
      scheduled: number
      in_progress: number
      completed: number
      cancelled: number
    }
    total_this_week: number
  }
  notifications: any[]
}

export interface JobStatusUpdate {
  status: string
  notes?: string
  actual_start_time?: string
  actual_end_time?: string
}

export interface LocationUpdate {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: string
}

export class TechnicianService {
  /**
   * Get technician dashboard data
   */
  static async getDashboard(): Promise<TechnicianDashboard> {
    const response = await api.get('/technician-portal/dashboard')
    return response.data
  }

  /**
   * Get technician jobs with optional filters
   */
  static async getJobs(params?: {
    date_filter?: string
    status_filter?: string
  }): Promise<{ jobs: TechnicianJob[] }> {
    const searchParams = new URLSearchParams()
    if (params?.date_filter) searchParams.append('date_filter', params.date_filter)
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter)
    
    const response = await api.get(`/technician-portal/jobs?${searchParams.toString()}`)
    return response.data
  }

  /**
   * Get single job details
   */
  static async getJob(jobId: string): Promise<TechnicianJob> {
    const response = await api.get(`/technician-portal/jobs/${jobId}`)
    return response.data
  }

  /**
   * Update job status
   */
  static async updateJobStatus(jobId: string, update: JobStatusUpdate): Promise<any> {
    const response = await api.patch(`/technician-portal/jobs/${jobId}/status`, update)
    return response.data
  }

  /**
   * Complete a job
   */
  static async completeJob(jobId: string, data: {
    completion_notes?: string
    work_performed?: string
    materials_used?: Array<{ name: string; quantity: number; cost?: number }>
    customer_signature?: string
    recommendations?: string[]
    follow_up_required?: boolean
    follow_up_date?: string
  }): Promise<any> {
    const response = await api.post(`/technician-portal/jobs/${jobId}/complete`, data)
    return response.data
  }

  /**
   * Add note to job
   */
  static async addJobNote(jobId: string, note: {
    content: string
    note_type?: string
    is_customer_visible?: boolean
  }): Promise<any> {
    const response = await api.post(`/technician-portal/jobs/${jobId}/notes`, note)
    return response.data
  }

  /**
   * Upload photo for job
   */
  static async uploadJobPhoto(jobId: string, file: File, metadata: {
    category: string
    description?: string
  }): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', metadata.category)
    if (metadata.description) {
      formData.append('description', metadata.description)
    }

    const response = await api.post(`/technician-portal/jobs/${jobId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  /**
   * Update technician location
   */
  static async updateLocation(location: LocationUpdate): Promise<any> {
    const response = await api.post('/technician-portal/location/update', location)
    return response.data
  }

  /**
   * Get technician calendar
   */
  static async getCalendar(startDate: string, endDate: string): Promise<{
    events: Array<{
      id: string
      title: string
      start: string
      end?: string
      customer_name: string
      address?: string
      status: string
      priority: string
    }>
    total_count: number
  }> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })
    
    const response = await api.get(`/scheduling/technician-calendar?${params.toString()}`)
    return response.data
  }

  /**
   * Get technician statistics
   */
  static async getStats(period: string = 'week'): Promise<{
    period: string
    date_range: { start: string; end: string }
    jobs: {
      total: number
      completed: number
      in_progress: number
      scheduled: number
      cancelled: number
    }
    time: {
      total_hours: number
      avg_job_duration: number
      efficiency_score: number
    }
    revenue: {
      total: number
      avg_per_job: number
    }
  }> {
    const response = await api.get(`/technician-portal/stats?period=${period}`)
    return response.data
  }

  /**
   * Get technician settings
   */
  static async getSettings(): Promise<{
    profile: any
    notifications: any
    app_preferences: any
  }> {
    const response = await api.get('/technician-portal/settings')
    return response.data
  }

  /**
   * Update technician settings
   */
  static async updateSettings(settings: {
    profile?: any
    notifications?: any
    app_preferences?: any
  }): Promise<any> {
    const response = await api.patch('/technician-portal/settings', settings)
    return response.data
  }

  /**
   * Clock in/out for time tracking
   */
  static async clockInOut(data: {
    job_id?: string
    entry_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
    timestamp: string
    location?: { latitude: number; longitude: number }
    notes?: string
  }): Promise<any> {
    const response = await api.post('/technician-portal/time-tracking', data)
    return response.data
  }

  /**
   * Get debug information (for troubleshooting)
   */
  static async getDebugInfo(): Promise<any> {
    const response = await api.get('/technician-portal/debug')
    return response.data
  }
}

// Export the service as default
export default TechnicianService