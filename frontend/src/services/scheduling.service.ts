// frontend/src/services/scheduling.service.ts
import { api } from './api'

export interface TimeSlot {
  time: string
  available: boolean
  technician_id?: string
  technician_name?: string
  conflicts?: string[]
}

export interface Availability {
  date: string
  technician_id: string
  technician_name: string
  slots: TimeSlot[]
  total_available_hours: number
  break_times: Array<{
    start: string
    end: string
    reason: string
  }>
}

export interface Job {
  id: string
  job_number: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  scheduled_date: string
  start_time: string
  end_time: string
  estimated_duration: number
  actual_duration?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  technician_id?: string
  technician_name?: string
  notes?: string
  special_instructions?: string
  equipment_needed: string[]
  materials_needed: string[]
  created_at: string
  updated_at: string
}

export interface CreateJobRequest {
  customer_id: string
  service_type: string
  description?: string
  scheduled_date: string
  start_time: string
  estimated_duration: number
  technician_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string
  special_instructions?: string
  equipment_needed?: string[]
  materials_needed?: string[]
  address: string
  city: string
  state: string
  zip_code: string
}

export interface UpdateJobRequest {
  scheduled_date?: string
  start_time?: string
  estimated_duration?: number
  technician_id?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  notes?: string
  special_instructions?: string
  equipment_needed?: string[]
  materials_needed?: string[]
}

export interface Technician {
  id: string
  name: string
  email: string
  phone: string
  skills: string[]
  availability: {
    [key: string]: {
      start: string
      end: string
      available: boolean
    }
  }
  current_location?: {
    lat: number
    lng: number
    address: string
  }
  status: 'available' | 'busy' | 'offline'
}

export interface RouteOptimization {
  technician_id: string
  technician_name: string
  optimized_route: Array<{
    job_id: string
    customer_name: string
    address: string
    scheduled_time: string
    estimated_duration: number
    travel_time_to_next?: number
    distance_to_next?: number
  }>
  total_distance: number
  total_travel_time: number
  total_service_time: number
  efficiency_score: number
  estimated_completion: string
}

export interface ConflictCheck {
  has_conflicts: boolean
  conflicts: Array<{
    type: 'technician_busy' | 'double_booking' | 'travel_time' | 'unavailable'
    message: string
    affected_job_id?: string
    suggested_times?: string[]
  }>
}

export class SchedulingService {
  // Availability Methods
  static async getAvailability(params: {
    date: string
    technician_id?: string
    service_type?: string
  }): Promise<Availability[]> {
    const searchParams = new URLSearchParams()
    searchParams.append('date', params.date)
    if (params.technician_id) searchParams.append('technician_id', params.technician_id)
    if (params.service_type) searchParams.append('service_type', params.service_type)

    const response = await api.get(`/scheduling/availability?${searchParams.toString()}`)
    return response.data
  }

  static async getTimeSlots(params: {
    date: string
    duration: number
    technician_id?: string
  }): Promise<TimeSlot[]> {
    const searchParams = new URLSearchParams()
    searchParams.append('date', params.date)
    searchParams.append('duration', params.duration.toString())
    if (params.technician_id) searchParams.append('technician_id', params.technician_id)

    const response = await api.get(`/scheduling/time-slots?${searchParams.toString()}`)
    return response.data
  }

  static async checkAvailability(params: {
    technician_id: string
    date: string
    start_time: string
    duration: number
  }): Promise<{ available: boolean; conflicts?: string[] }> {
    const response = await api.post('/scheduling/check-availability', params)
    return response.data
  }

  // Job Management Methods
  static async getJobs(params?: {
    date?: string
    technician_id?: string
    status?: string
    customer_id?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ jobs: Job[]; total: number; page: number; limit: number }> {
    const searchParams = new URLSearchParams()
    if (params?.date) searchParams.append('date', params.date)
    if (params?.technician_id) searchParams.append('technician_id', params.technician_id)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.customer_id) searchParams.append('customer_id', params.customer_id)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const response = await api.get(`/jobs?${searchParams.toString()}`)
    return response.data
  }

  static async getJob(jobId: string): Promise<Job> {
    const response = await api.get(`/jobs/${jobId}`)
    return response.data
  }

  static async createJob(jobData: CreateJobRequest): Promise<Job> {
    const response = await api.post('/jobs', jobData)
    return response.data
  }

  static async updateJob(jobId: string, updates: UpdateJobRequest): Promise<Job> {
    const response = await api.patch(`/jobs/${jobId}`, updates)
    return response.data
  }

  static async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`)
  }

  static async duplicateJob(jobId: string, newDate?: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/duplicate`, { new_date: newDate })
    return response.data
  }

  // Job Status Management
  static async startJob(jobId: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/start`)
    return response.data
  }

  static async completeJob(jobId: string, completionData?: {
    actual_duration?: number
    completion_notes?: string
    photos?: string[]
    customer_signature?: string
  }): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/complete`, completionData)
    return response.data
  }

  static async cancelJob(jobId: string, reason: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/cancel`, { reason })
    return response.data
  }

  static async pauseJob(jobId: string, reason?: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/pause`, { reason })
    return response.data
  }

  static async resumeJob(jobId: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/resume`)
    return response.data
  }

  // Technician Methods
  static async getTechnicians(params?: {
    available_on?: string
    skills?: string[]
    status?: string
  }): Promise<Technician[]> {
    const searchParams = new URLSearchParams()
    if (params?.available_on) searchParams.append('available_on', params.available_on)
    if (params?.skills) params.skills.forEach(skill => searchParams.append('skills', skill))
    if (params?.status) searchParams.append('status', params.status)

    const response = await api.get(`/technicians?${searchParams.toString()}`)
    return response.data
  }

  static async getOptimalTechnician(params: {
    service_type: string
    location: { lat: number; lng: number }
    scheduled_time: string
    duration: number
  }): Promise<{
    technician: Technician
    travel_time: number
    distance: number
    confidence_score: number
  }> {
    const response = await api.post('/scheduling/optimal-technician', params)
    return response.data
  }

  static async assignTechnician(jobId: string, technicianId: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/assign`, { technician_id: technicianId })
    return response.data
  }

  static async unassignTechnician(jobId: string): Promise<Job> {
    const response = await api.post(`/jobs/${jobId}/unassign`)
    return response.data
  }

  // Route Optimization
  static async optimizeRoutes(params: {
    date: string
    technician_ids?: string[]
    max_jobs_per_technician?: number
    prioritize_urgency?: boolean
  }): Promise<RouteOptimization[]> {
    const response = await api.post('/scheduling/optimize-routes', params)
    return response.data
  }

  static async applyOptimizedRoutes(routes: RouteOptimization[]): Promise<{ updated_jobs: number }> {
    const response = await api.post('/scheduling/apply-routes', { routes })
    return response.data
  }

  static async getRoutePreview(params: {
    technician_id: string
    date: string
    job_ids: string[]
  }): Promise<{
    route: RouteOptimization
    map_url: string
    estimated_fuel_cost: number
  }> {
    const response = await api.post('/scheduling/route-preview', params)
    return response.data
  }

  // Conflict Detection
  static async checkConflicts(params: {
    job_id?: string
    technician_id: string
    date: string
    start_time: string
    duration: number
    address?: string
  }): Promise<ConflictCheck> {
    const response = await api.post('/scheduling/check-conflicts', params)
    return response.data
  }

  static async resolveConflicts(params: {
    job_id: string
    resolution_type: 'reschedule' | 'reassign' | 'split'
    new_time?: string
    new_technician_id?: string
    split_duration?: number
  }): Promise<{ updated_jobs: Job[] }> {
    const response = await api.post('/scheduling/resolve-conflicts', params)
    return response.data
  }

  // Calendar and Scheduling Views
  static async getCalendarEvents(params: {
    start_date: string
    end_date: string
    technician_id?: string
    view_type?: 'month' | 'week' | 'day'
  }): Promise<Array<{
    id: string
    title: string
    start: string
    end: string
    technician_id: string
    technician_name: string
    customer_name: string
    status: string
    priority: string
    color: string
  }>> {
    const searchParams = new URLSearchParams()
    searchParams.append('start_date', params.start_date)
    searchParams.append('end_date', params.end_date)
    if (params.technician_id) searchParams.append('technician_id', params.technician_id)
    if (params.view_type) searchParams.append('view_type', params.view_type)

    const response = await api.get(`/scheduling/calendar-events?${searchParams.toString()}`)
    return response.data
  }

  static async getWorkloadAnalysis(params: {
    start_date: string
    end_date: string
    technician_id?: string
  }): Promise<{
    total_jobs: number
    total_hours: number
    utilization_percentage: number
    overtime_hours: number
    revenue_potential: number
    efficiency_score: number
    daily_breakdown: Array<{
      date: string
      jobs: number
      hours: number
      utilization: number
    }>
  }> {
    const searchParams = new URLSearchParams()
    searchParams.append('start_date', params.start_date)
    searchParams.append('end_date', params.end_date)
    if (params.technician_id) searchParams.append('technician_id', params.technician_id)

    const response = await api.get(`/scheduling/workload-analysis?${searchParams.toString()}`)
    return response.data
  }

  // Recurring Jobs
  static async createRecurringJob(params: {
    job_template: Omit<CreateJobRequest, 'scheduled_date' | 'start_time'>
    recurrence_pattern: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
      interval: number
      days_of_week?: number[]
      day_of_month?: number
      end_date?: string
      max_occurrences?: number
    }
    start_date: string
    start_time: string
  }): Promise<{ created_jobs: Job[]; job_series_id: string }> {
    const response = await api.post('/scheduling/recurring-jobs', params)
    return response.data
  }

  static async updateRecurringJobSeries(
    seriesId: string,
    updates: {
      update_type: 'this_only' | 'this_and_future' | 'all'
      job_updates?: UpdateJobRequest
      recurrence_updates?: {
        frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
        interval?: number
        end_date?: string
      }
    }
  ): Promise<{ updated_jobs: Job[] }> {
    const response = await api.patch(`/scheduling/recurring-jobs/${seriesId}`, updates)
    return response.data
  }

  static async deleteRecurringJobSeries(
    seriesId: string,
    deleteType: 'this_only' | 'this_and_future' | 'all'
  ): Promise<{ deleted_jobs: number }> {
    const response = await api.delete(`/scheduling/recurring-jobs/${seriesId}`, {
      data: { delete_type: deleteType }
    })
    return response.data
  }

  // Emergency Scheduling
  static async createEmergencyJob(params: CreateJobRequest & {
    emergency_level: 'low' | 'medium' | 'high' | 'critical'
    max_response_time: number // in minutes
    contact_customer_immediately: boolean
  }): Promise<{
    job: Job
    assigned_technician: Technician
    estimated_arrival: string
    emergency_protocols_triggered: string[]
  }> {
    const response = await api.post('/scheduling/emergency-job', params)
    return response.data
  }

  static async findEmergencySlot(params: {
    duration: number
    location: { lat: number; lng: number }
    max_travel_time: number
    urgency_level: 'low' | 'medium' | 'high' | 'critical'
  }): Promise<{
    available_slots: Array<{
      technician_id: string
      technician_name: string
      start_time: string
      travel_time: number
      confidence: number
    }>
    recommendations: Array<{
      action: string
      impact: string
      priority: number
    }>
  }> {
    const response = await api.post('/scheduling/emergency-slot', params)
    return response.data
  }

  // Scheduling Analytics
  static async getSchedulingMetrics(params: {
    start_date: string
    end_date: string
    technician_id?: string
  }): Promise<{
    total_jobs_scheduled: number
    jobs_completed_on_time: number
    average_job_duration: number
    scheduling_efficiency: number
    customer_satisfaction_score: number
    technician_utilization: number
    revenue_per_hour: number
    no_show_rate: number
    cancellation_rate: number
    overtime_percentage: number
  }> {
    const searchParams = new URLSearchParams()
    searchParams.append('start_date', params.start_date)
    searchParams.append('end_date', params.end_date)
    if (params.technician_id) searchParams.append('technician_id', params.technician_id)

    const response = await api.get(`/scheduling/metrics?${searchParams.toString()}`)
    return response.data
  }

  // Notifications and Reminders
  static async scheduleReminder(params: {
    job_id: string
    reminder_type: 'sms' | 'email' | 'push' | 'call'
    send_time: string
    message_template?: string
    recipient: 'customer' | 'technician' | 'both'
  }): Promise<{ reminder_id: string; scheduled_time: string }> {
    const response = await api.post('/scheduling/reminders', params)
    return response.data
  }

  static async cancelReminder(reminderId: string): Promise<void> {
    await api.delete(`/scheduling/reminders/${reminderId}`)
  }

  static async getUpcomingReminders(params?: {
    start_date?: string
    end_date?: string
    type?: string
  }): Promise<Array<{
    id: string
    job_id: string
    type: string
    recipient: string
    scheduled_time: string
    status: 'pending' | 'sent' | 'failed'
    message: string
  }>> {
    const searchParams = new URLSearchParams()
    if (params?.start_date) searchParams.append('start_date', params.start_date)
    if (params?.end_date) searchParams.append('end_date', params.end_date)
    if (params?.type) searchParams.append('type', params.type)

    const response = await api.get(`/scheduling/reminders?${searchParams.toString()}`)
    return response.data
  }
}

export default SchedulingService