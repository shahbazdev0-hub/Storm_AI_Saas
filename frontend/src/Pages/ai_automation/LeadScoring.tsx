// frontend/src/pages/ai-automation/LeadScoring.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ChartBarIcon, 
  StarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface ScoringFactor {
  id: string
  name: string
  description: string
  weight: number
  category: 'demographic' | 'behavioral' | 'firmographic' | 'engagement'
  enabled: boolean
}

interface LeadScore {
  lead_id: string
  lead_name: string
  email: string
  phone: string
  total_score: number
  score_breakdown: {
    factor_id: string
    factor_name: string
    score: number
    weight: number
    reasoning: string
  }[]
  prediction: {
    conversion_probability: number
    recommended_action: string
    urgency_level: 'low' | 'medium' | 'high' | 'urgent'
  }
  last_updated: string
  score_history: {
    date: string
    score: number
  }[]
}

interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  last_trained: string
  training_data_points: number
  model_version: string
}

const defaultScoringFactors: ScoringFactor[] = [
  {
    id: 'budget_indicators',
    name: 'Budget Indicators',
    description: 'Signals indicating budget availability (keywords like "approved", "ready to spend")',
    weight: 30,
    category: 'behavioral',
    enabled: true
  },
  {
    id: 'urgency_level',
    name: 'Urgency Level',
    description: 'How urgent the customer\'s need is (emergency, ASAP, etc.)',
    weight: 25,
    category: 'behavioral',
    enabled: true
  },
  {
    id: 'decision_authority',
    name: 'Decision Authority',
    description: 'Whether the contact has decision-making power',
    weight: 20,
    category: 'demographic',
    enabled: true
  },
  {
    id: 'previous_customer',
    name: 'Previous Customer',
    description: 'Has been a customer before',
    weight: 15,
    category: 'firmographic',
    enabled: true
  },
  {
    id: 'response_time',
    name: 'Response Time',
    description: 'How quickly they respond to communications',
    weight: 10,
    category: 'engagement',
    enabled: true
  },
  {
    id: 'lead_source',
    name: 'Lead Source Quality',
    description: 'Quality of the lead source (referral > website > ads)',
    weight: 15,
    category: 'firmographic',
    enabled: true
  },
  {
    id: 'service_interest',
    name: 'Service Interest Level',
    description: 'Level of interest in specific services',
    weight: 20,
    category: 'behavioral',
    enabled: true
  },
  {
    id: 'contact_frequency',
    name: 'Contact Frequency',
    description: 'How often they initiate contact',
    weight: 10,
    category: 'engagement',
    enabled: true
  }
]

export default function LeadScoring() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [scoringFactors, setScoringFactors] = useState(defaultScoringFactors)
  const [selectedLead, setSelectedLead] = useState<LeadScore | null>(null)

  const queryClient = useQueryClient()

  const { data: leadScores, isLoading } = useQuery({
    queryKey: ['lead-scores', selectedTimeframe],
    queryFn: async () => {
      const response = await api.get(`/ai-automation/lead-scoring?period=${selectedTimeframe}`)
      return response.data
    },
  })

  const { data: modelPerformance } = useQuery({
    queryKey: ['scoring-model-performance'],
    queryFn: async () => {
      const response = await api.get('/ai-automation/lead-scoring/model-performance')
      return response.data
    },
  })

  const { data: scoringStats } = useQuery({
    queryKey: ['scoring-stats', selectedTimeframe],
    queryFn: async () => {
      const response = await api.get(`/ai-automation/lead-scoring/stats?period=${selectedTimeframe}`)
      return response.data
    },
  })

  const updateScoringFactorsMutation = useMutation({
    mutationFn: async (factors: ScoringFactor[]) => {
      const response = await api.put('/ai-automation/lead-scoring/factors', { factors })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scores'] })
      setShowConfigModal(false)
      toast.success('Scoring factors updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update scoring factors')
    },
  })

  const retrainModelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/ai-automation/lead-scoring/retrain')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-model-performance'] })
      toast.success('Model retraining started! This may take a few minutes.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to start model retraining')
    },
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'text-gray-600 bg-gray-100',
      medium: 'text-blue-600 bg-blue-100',
      high: 'text-yellow-600 bg-yellow-100',
      urgent: 'text-red-600 bg-red-100'
    }
    return colors[urgency as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const renderStars = (score: number) => {
    const stars = Math.round(score / 20) // Convert 0-100 to 0-5 stars
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < stars ? 'text-yellow-400' : 'text-gray-300'}`}
        fill={i < stars ? 'currentColor' : 'none'}
      />
    ))
  }

  const handleFactorWeightChange = (factorId: string, newWeight: number) => {
    setScoringFactors(prev => 
      prev.map(factor => 
        factor.id === factorId ? { ...factor, weight: newWeight } : factor
      )
    )
  }

  const handleFactorToggle = (factorId: string) => {
    setScoringFactors(prev => 
      prev.map(factor => 
        factor.id === factorId ? { ...factor, enabled: !factor.enabled } : factor
      )
    )
  }

  const saveScoringFactors = () => {
    updateScoringFactorsMutation.mutate(scoringFactors)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Lead Scoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered lead qualification and prioritization system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Configure Scoring
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Model Accuracy</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {modelPerformance?.accuracy ? `${(modelPerformance.accuracy * 100).toFixed(1)}%` : 'N/A'}
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
                <ArrowUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High-Score Leads</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {scoringStats?.high_score_count || 0}
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
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Score</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {scoringStats?.average_score ? scoringStats.average_score.toFixed(1) : 'N/A'}
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
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {scoringStats?.conversion_rate ? `${(scoringStats.conversion_rate * 100).toFixed(1)}%` : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance */}
      {modelPerformance && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Model Performance</h3>
            <button
              onClick={() => retrainModelMutation.mutate()}
              disabled={retrainModelMutation.isPending}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {retrainModelMutation.isPending ? 'Retraining...' : 'Retrain Model'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(modelPerformance.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(modelPerformance.precision * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Precision</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {(modelPerformance.recall * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Recall</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {modelPerformance.f1_score.toFixed(3)}
              </div>
              <div className="text-sm text-gray-500">F1 Score</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Last trained: {new Date(modelPerformance.last_trained).toLocaleDateString()}</span>
              <span>Training data: {modelPerformance.training_data_points.toLocaleString()} leads</span>
              <span>Model version: {modelPerformance.model_version}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lead Scores List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Lead Scores</h3>
          
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Probability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Urgency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recommended Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leadScores?.map((score: LeadScore) => (
                    <tr key={score.lead_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{score.lead_name}</div>
                          <div className="text-sm text-gray-500">{score.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(score.total_score)}`}>
                          {score.total_score}/100
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex">
                          {renderStars(score.total_score)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(score.prediction.conversion_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(score.prediction.urgency_level)}`}>
                          {score.prediction.urgency_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.prediction.recommended_action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(score.last_updated).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedLead(score)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configure Lead Scoring"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Adjust the weights for different scoring factors. Higher weights have more impact on the overall score.
                  Total weight should add up to approximately 100-150 for optimal results.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {scoringFactors.map((factor) => (
              <div key={factor.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={factor.enabled}
                      onChange={() => handleFactorToggle(factor.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">{factor.name}</h4>
                      <p className="text-xs text-gray-500">{factor.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    factor.category === 'behavioral' ? 'bg-blue-100 text-blue-800' :
                    factor.category === 'demographic' ? 'bg-green-100 text-green-800' :
                    factor.category === 'firmographic' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {factor.category}
                  </span>
                </div>
                
                {factor.enabled && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Weight: {factor.weight}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={factor.weight}
                      onChange={(e) => handleFactorWeightChange(factor.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Current total weight: {scoringFactors.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)}%
                  {scoringFactors.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0) > 150 && 
                    ' (Warning: Total weight is high, consider reducing some factors)'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfigModal(false)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveScoringFactors}
              disabled={updateScoringFactorsMutation.isPending}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {updateScoringFactorsMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`Lead Score Breakdown - ${selectedLead.lead_name}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Overall Score</h4>
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-2xl font-bold ${getScoreColor(selectedLead.total_score)}`}>
                    {selectedLead.total_score}/100
                  </div>
                  <div className="flex justify-center mt-2">
                    {renderStars(selectedLead.total_score)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">AI Prediction</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Conversion Probability:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {(selectedLead.prediction.conversion_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Urgency Level:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(selectedLead.prediction.urgency_level)}`}>
                      {selectedLead.prediction.urgency_level}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Recommended Action:</span>
                    <span className="ml-2">{selectedLead.prediction.recommended_action}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Score Breakdown</h4>
              <div className="space-y-3">
                {selectedLead.score_breakdown.map((factor) => (
                  <div key={factor.factor_id} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">{factor.factor_name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Weight: {factor.weight}%</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getScoreColor(factor.score * 10)}`}>
                          {factor.score}/10
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{factor.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                Contact Lead
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}