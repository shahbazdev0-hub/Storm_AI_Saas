// frontend/src/services/ai.service.ts
import { api } from './api'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface ConversationResponse {
  response: string
  intent: {
    intent: string
    service_type: string
    urgency: string
    sentiment: string
  }
  conversation_id: string
  should_notify_human: boolean
  lead_score?: number
}

export interface LeadScoreRequest {
  lead_data: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    source: string
    estimated_value?: number
    notes?: string
  }
}

export interface LeadScoreResponse {
  lead_id: string
  score: number
  factors: {
    budget: number
    authority: number
    need: number
    timeline: number
  }
  recommendation: string
  confidence: number
}

export interface AIFlowTemplate {
  id: string
  name: string
  description: string
  trigger_conditions: string[]
  message_templates: Array<{
    step: number
    condition: string
    message: string
    expected_responses: string[]
  }>
  goal: string
  fallback_message: string
}

export interface AIFlowExecution {
  id: string
  flow_id: string
  conversation_id: string
  current_step: number
  status: 'active' | 'completed' | 'failed'
  variables: Record<string, any>
  started_at: string
  completed_at?: string
}

export interface AIAnalytics {
  conversation_metrics: {
    total_conversations: number
    avg_response_time: number
    completion_rate: number
    human_handoff_rate: number
  }
  performance_metrics: {
    lead_qualification_accuracy: number
    appointment_booking_rate: number
    customer_satisfaction: number
    cost_per_conversation: number
  }
  flow_analytics: Array<{
    flow_id: string
    flow_name: string
    executions: number
    success_rate: number
    avg_completion_time: number
    conversion_rate: number
  }>
  top_intents: Array<{
    intent: string
    count: number
    percentage: number
  }>
  sentiment_analysis: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface RouteOptimizationRequest {
  date: string
  technician_id?: string
  jobs: Array<{
    id: string
    address: string
    lat?: number
    lng?: number
    estimated_duration: number
    priority: number
    time_window?: {
      start: string
      end: string
    }
  }>
  constraints?: {
    max_drive_time: number
    lunch_break: boolean
    overtime_allowed: boolean
  }
}

export interface OptimizedRoute {
  technician_id: string
  technician_name: string
  jobs: Array<{
    job_id: string
    order: number
    estimated_arrival: string
    estimated_departure: string
    drive_time_to_next: number
  }>
  total_distance: number
  total_drive_time: number
  total_service_time: number
  efficiency_score: number
  estimated_completion: string
}

export interface PredictiveAnalytics {
  churn_prediction: Array<{
    customer_id: string
    customer_name: string
    churn_probability: number
    risk_factors: string[]
    recommended_actions: string[]
  }>
  demand_forecast: Array<{
    date: string
    service_type: string
    predicted_demand: number
    confidence_interval: {
      lower: number
      upper: number
    }
  }>
  revenue_prediction: {
    next_month: number
    next_quarter: number
    confidence: number
    growth_factors: string[]
  }
  upsell_opportunities: Array<{
    customer_id: string
    customer_name: string
    recommended_service: string
    probability: number
    estimated_value: number
  }>
}

class AIService {
  private baseURL = '/ai/v1'

  // Chat and Conversation Management
  async processMessage(phoneNumber: string, message: string, companyId: string): Promise<ConversationResponse> {
    try {
      const response = await api.post(`${this.baseURL}/chat/process-message`, {
        phone_number: phoneNumber,
        message: message,
        company_id: companyId
      })
      return response.data
    } catch (error) {
      console.error('Error processing message:', error)
      throw new Error('Failed to process message')
    }
  }

  async getConversationHistory(phoneNumber: string, companyId: string): Promise<{
    messages: ChatMessage[]
    lead_info: any
  }> {
    try {
      const response = await api.get(`${this.baseURL}/chat/conversations/${phoneNumber}`, {
        params: { company_id: companyId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching conversation history:', error)
      throw new Error('Failed to fetch conversation history')
    }
  }

  async getActiveConversations(companyId: string): Promise<Array<{
    phone_number: string
    customer_name: string
    last_message: string
    last_activity: string
    status: string
    unread_count: number
  }>> {
    try {
      const response = await api.get(`${this.baseURL}/chat/conversations`, {
        params: { company_id: companyId, status: 'active' }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching active conversations:', error)
      throw new Error('Failed to fetch active conversations')
    }
  }

  // Lead Scoring and Qualification
  async scoreLeads(leadIds: string[]): Promise<LeadScoreResponse[]> {
    try {
      const response = await api.post(`${this.baseURL}/scoring/bulk-score`, {
        lead_ids: leadIds
      })
      return response.data
    } catch (error) {
      console.error('Error scoring leads:', error)
      throw new Error('Failed to score leads')
    }
  }

  async scoreSingleLead(leadData: LeadScoreRequest['lead_data']): Promise<LeadScoreResponse> {
    try {
      const response = await api.post(`${this.baseURL}/scoring/score-lead`, leadData)
      return response.data
    } catch (error) {
      console.error('Error scoring lead:', error)
      throw new Error('Failed to score lead')
    }
  }

  async updateLeadScore(leadId: string, factors: Record<string, any>): Promise<void> {
    try {
      await api.patch(`${this.baseURL}/scoring/leads/${leadId}`, factors)
    } catch (error) {
      console.error('Error updating lead score:', error)
      throw new Error('Failed to update lead score')
    }
  }

  // AI Flow Management
  async getAIFlows(companyId: string): Promise<AIFlowTemplate[]> {
    try {
      const response = await api.get(`${this.baseURL}/flows`, {
        params: { company_id: companyId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching AI flows:', error)
      throw new Error('Failed to fetch AI flows')
    }
  }

  async createAIFlow(flowData: Omit<AIFlowTemplate, 'id'>): Promise<AIFlowTemplate> {
    try {
      const response = await api.post(`${this.baseURL}/flows`, flowData)
      return response.data
    } catch (error) {
      console.error('Error creating AI flow:', error)
      throw new Error('Failed to create AI flow')
    }
  }

  async updateAIFlow(flowId: string, flowData: Partial<AIFlowTemplate>): Promise<AIFlowTemplate> {
    try {
      const response = await api.put(`${this.baseURL}/flows/${flowId}`, flowData)
      return response.data
    } catch (error) {
      console.error('Error updating AI flow:', error)
      throw new Error('Failed to update AI flow')
    }
  }

  async deleteAIFlow(flowId: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/flows/${flowId}`)
    } catch (error) {
      console.error('Error deleting AI flow:', error)
      throw new Error('Failed to delete AI flow')
    }
  }

  async activateAIFlow(flowId: string): Promise<void> {
    try {
      await api.post(`${this.baseURL}/flows/${flowId}/activate`)
    } catch (error) {
      console.error('Error activating AI flow:', error)
      throw new Error('Failed to activate AI flow')
    }
  }

  async deactivateAIFlow(flowId: string): Promise<void> {
    try {
      await api.post(`${this.baseURL}/flows/${flowId}/deactivate`)
    } catch (error) {
      console.error('Error deactivating AI flow:', error)
      throw new Error('Failed to deactivate AI flow')
    }
  }

  // AI Flow Execution
  async getFlowExecutions(flowId: string, limit = 50): Promise<AIFlowExecution[]> {
    try {
      const response = await api.get(`${this.baseURL}/flows/${flowId}/executions`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching flow executions:', error)
      throw new Error('Failed to fetch flow executions')
    }
  }

  async stopFlowExecution(executionId: string): Promise<void> {
    try {
      await api.post(`${this.baseURL}/flows/executions/${executionId}/stop`)
    } catch (error) {
      console.error('Error stopping flow execution:', error)
      throw new Error('Failed to stop flow execution')
    }
  }

  // Route Optimization
  async optimizeRoutes(request: RouteOptimizationRequest): Promise<{
    routes: OptimizedRoute[]
    total_distance: number
    total_time: number
    optimization_savings: {
      distance_saved: number
      time_saved: number
      fuel_cost_saved: number
    }
    unassigned_jobs: any[]
  }> {
    try {
      const response = await api.post(`${this.baseURL}/routing/optimize`, request)
      return response.data
    } catch (error) {
      console.error('Error optimizing routes:', error)
      throw new Error('Failed to optimize routes')
    }
  }

  async applyOptimizedRoutes(routes: OptimizedRoute[], date: string): Promise<void> {
    try {
      await api.post(`${this.baseURL}/routing/apply`, {
        routes,
        date
      })
    } catch (error) {
      console.error('Error applying optimized routes:', error)
      throw new Error('Failed to apply optimized routes')
    }
  }

  // Analytics and Insights
  async getAIAnalytics(companyId: string, dateRange: {
    start: string
    end: string
  }): Promise<AIAnalytics> {
    try {
      const response = await api.get(`${this.baseURL}/analytics`, {
        params: {
          company_id: companyId,
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching AI analytics:', error)
      throw new Error('Failed to fetch AI analytics')
    }
  }

  async getPredictiveAnalytics(companyId: string): Promise<PredictiveAnalytics> {
    try {
      const response = await api.get(`${this.baseURL}/analytics/predictive`, {
        params: { company_id: companyId }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching predictive analytics:', error)
      throw new Error('Failed to fetch predictive analytics')
    }
  }

  // Recommendations
  async getRecommendations(companyId: string, type?: string): Promise<Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
    impact: 'low' | 'medium' | 'high'
    action_required: boolean
    data: any
  }>> {
    try {
      const response = await api.get(`${this.baseURL}/recommendations`, {
        params: { company_id: companyId, type }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw new Error('Failed to fetch recommendations')
    }
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    try {
      await api.post(`${this.baseURL}/recommendations/${recommendationId}/dismiss`)
    } catch (error) {
      console.error('Error dismissing recommendation:', error)
      throw new Error('Failed to dismiss recommendation')
    }
  }

  async implementRecommendation(recommendationId: string, params?: any): Promise<void> {
    try {
      await api.post(`${this.baseURL}/recommendations/${recommendationId}/implement`, params)
    } catch (error) {
      console.error('Error implementing recommendation:', error)
      throw new Error('Failed to implement recommendation')
    }
  }

  // AI Training and Configuration
  async updateAISettings(companyId: string, settings: {
    response_tone?: 'professional' | 'friendly' | 'casual'
    qualification_criteria?: Record<string, any>
    escalation_triggers?: string[]
    business_hours?: {
      timezone: string
      schedule: Record<string, { start: string; end: string }>
    }
  }): Promise<void> {
    try {
      await api.put(`${this.baseURL}/settings/${companyId}`, settings)
    } catch (error) {
      console.error('Error updating AI settings:', error)
      throw new Error('Failed to update AI settings')
    }
  }

  async getAISettings(companyId: string): Promise<any> {
    try {
      const response = await api.get(`${this.baseURL}/settings/${companyId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching AI settings:', error)
      throw new Error('Failed to fetch AI settings')
    }
  }

  async trainAIModel(companyId: string, trainingData: {
    conversations: Array<{
      messages: ChatMessage[]
      outcome: 'success' | 'failure'
      tags: string[]
    }>
  }): Promise<{
    training_id: string
    status: string
    estimated_completion: string
  }> {
    try {
      const response = await api.post(`${this.baseURL}/training/${companyId}`, trainingData)
      return response.data
    } catch (error) {
      console.error('Error training AI model:', error)
      throw new Error('Failed to train AI model')
    }
  }

  async getTrainingStatus(trainingId: string): Promise<{
    id: string
    status: 'pending' | 'training' | 'completed' | 'failed'
    progress: number
    metrics?: {
      accuracy: number
      precision: number
      recall: number
    }
    error?: string
  }> {
    try {
      const response = await api.get(`${this.baseURL}/training/${trainingId}/status`)
      return response.data
    } catch (error) {
      console.error('Error fetching training status:', error)
      throw new Error('Failed to fetch training status')
    }
  }

  // Performance Monitoring
  async getAIPerformanceMetrics(companyId: string, period: '1d' | '7d' | '30d' = '7d'): Promise<{
    response_times: Array<{ timestamp: string; value: number }>
    accuracy_scores: Array<{ timestamp: string; value: number }>
    engagement_rates: Array<{ timestamp: string; value: number }>
    error_rates: Array<{ timestamp: string; value: number }>
    cost_analysis: {
      total_cost: number
      cost_per_conversation: number
      cost_breakdown: Record<string, number>
    }
  }> {
    try {
      const response = await api.get(`${this.baseURL}/performance/${companyId}`, {
        params: { period }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching AI performance metrics:', error)
      throw new Error('Failed to fetch AI performance metrics')
    }
  }

  // Health Check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, 'up' | 'down'>
    response_time: number
  }> {
    try {
      const response = await api.get(`${this.baseURL}/health`)
      return response.data
    } catch (error) {
      console.error('Error checking AI service health:', error)
      throw new Error('Failed to check AI service health')
    }
  }
}

// Export singleton instance
export const aiService = new AIService()