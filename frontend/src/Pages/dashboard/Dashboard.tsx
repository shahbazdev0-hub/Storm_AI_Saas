// frontend/src/pages/dashboard/Dashboard.tsx - FIXED ONLY FOR 768PX+ SCREENS
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { 
  CurrencyDollarIcon, 
  UsersIcon, 
  ClipboardDocumentListIcon,
  PhoneIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface DashboardStats {
  monthly_revenue: number
  revenue_change: number
  active_leads: number
  leads_change: number
  total_customers: number
  customers_change: number
  weekly_jobs: number
  jobs_change: number
  revenue_data: Array<{
    month: string
    revenue: number
  }>
}

interface RecentActivity {
  id: string
  description: string
  time: string
  type: string
}

interface QuickStats {
  today_jobs: number
  pending_invoices: number
  overdue_invoices: number
  technicians_on_duty: number
}

// StatsCard component - FIXED for 768px+
const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color
}: {
  title: string
  value: string | number
  change: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) => {
  const isPositive = change >= 0
  
  const colorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200', 
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200'
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
            <div className={`p-1.5 sm:p-2 md:p-3 rounded-lg border flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm md:text-sm font-medium text-gray-600 mb-0.5 sm:mb-1 truncate md:whitespace-normal">{title}</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-1.5 sm:px-2 md:px-3 py-1 rounded-full text-xs sm:text-xs md:text-sm font-medium flex-shrink-0 hidden ${
            isPositive 
              ? 'text-green-700 bg-green-100' 
              : 'text-red-700 bg-red-100'
          }`}>
            {isPositive ? (
              <ArrowTrendingUpIcon className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4" />
            )}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Revenue Chart component
const RevenueChart = ({ 
  data
}: { 
  data: Array<{ month: string; revenue: number }>
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 sm:h-60 md:h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <ChartBarIcon className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No Revenue Data</h3>
          <p className="text-xs sm:text-sm md:text-sm text-gray-500 px-4">Revenue data will appear here once you have invoices</p>
        </div>
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 text-xs sm:text-sm">{`${label}`}</p>
          <p className="text-blue-600 text-xs sm:text-sm">
            Revenue: <span className="font-medium">${payload[0].value.toLocaleString()}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-48 sm:h-60 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6B7280' }}
            interval={data.length > 6 ? 1 : 0}
            angle={data.length > 6 ? -45 : 0}
            textAnchor={data.length > 6 ? "end" : "middle"}
            height={data.length > 6 ? 60 : 30}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6B7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3B82F6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Quick Stats component
const QuickStatsGrid = ({ 
  stats
}: { 
  stats: QuickStats
}) => {
  const quickStatsItems = [
    {
      title: "Today's Jobs",
      value: stats.today_jobs || 0,
      icon: CalendarDaysIcon,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: "Pending Invoices", 
      value: stats.pending_invoices || 0,
      icon: DocumentTextIcon,
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    },
    {
      title: "Overdue Invoices",
      value: stats.overdue_invoices || 0,
      icon: ExclamationTriangleIcon,
      color: (stats.overdue_invoices || 0) > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
    },
    {
      title: "Active Technicians",
      value: stats.technicians_on_duty || 0,
      icon: UserGroupIcon,
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-7 md:mb-8">
      {quickStatsItems.map((item, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-3">
            <div className={`p-1.5 sm:p-2 md:p-2.5 rounded-lg border flex-shrink-0 ${item.color}`}>
              <item.icon className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-xs md:text-sm font-medium text-gray-600 truncate md:whitespace-normal mb-0.5">{item.title}</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Activity type icons and colors
const getActivityConfig = (type: string) => {
  const configs = {
    job_completed: { icon: CheckCircleIcon, color: 'bg-green-100 text-green-600' },
    job_scheduled: { icon: CalendarDaysIcon, color: 'bg-blue-100 text-blue-600' },
    job_started: { icon: ClipboardDocumentListIcon, color: 'bg-orange-100 text-orange-600' },
    job_created: { icon: ClipboardDocumentListIcon, color: 'bg-gray-100 text-gray-600' },
    lead: { icon: PhoneIcon, color: 'bg-purple-100 text-purple-600' },
    payment: { icon: BanknotesIcon, color: 'bg-green-100 text-green-600' },
    estimate_accepted: { icon: CheckCircleIcon, color: 'bg-blue-100 text-blue-600' },
    estimate_sent: { icon: DocumentTextIcon, color: 'bg-orange-100 text-orange-600' },
    estimate_created: { icon: DocumentTextIcon, color: 'bg-gray-100 text-gray-600' }
  }
  
  return configs[type as keyof typeof configs] || configs.job_created
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data as DashboardStats
    },
    retry: 2,
    retryDelay: 1000
  })

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-activity')
      return response.data as RecentActivity[]
    },
    retry: 2,
    retryDelay: 1000
  })

  const { data: quickStats, isLoading: quickStatsLoading, error: quickStatsError } = useQuery({
    queryKey: ['quick-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/quick-stats')
      return response.data as QuickStats
    },
    retry: 2,
    retryDelay: 1000
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-20 md:pb-32">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-6 sm:space-y-7 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-sm text-gray-600">
                Overview of your business performance and key metrics
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm md:text-sm text-gray-500">Last updated</p>
              <p className="text-xs sm:text-sm md:text-sm font-medium text-gray-900">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <QuickStatsGrid stats={quickStats || { today_jobs: 0, pending_invoices: 0, overdue_invoices: 0, technicians_on_duty: 0 }} />

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <StatsCard
              title="Monthly Revenue"
              value={`$${(stats?.monthly_revenue || 0).toLocaleString()}`}
              change={stats?.revenue_change || 0}
              icon={CurrencyDollarIcon}
              color="green"
            />
            <StatsCard
              title="Active Leads"
              value={stats?.active_leads || 0}
              change={stats?.leads_change || 0}
              icon={PhoneIcon}
              color="blue"
            />
            <StatsCard
              title="Total Customers"
              value={stats?.total_customers || 0}
              change={stats?.customers_change || 0}
              icon={UsersIcon}
              color="purple"
            />
            <StatsCard
              title="Weekly Jobs"
              value={stats?.weekly_jobs || 0}
              change={stats?.jobs_change || 0}
              icon={ClipboardDocumentListIcon}
              color="orange"
            />
          </div>

          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 md:gap-8">
            {/* Revenue Chart */}
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <h3 className="text-base sm:text-lg md:text-lg font-semibold text-gray-900">Revenue Trend</h3>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm md:text-sm text-gray-500">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Monthly Revenue</span>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6">
                <RevenueChart data={stats?.revenue_data || []} />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg md:text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-4 sm:p-5 md:p-6">
                <div className="space-y-3 sm:space-y-4 max-h-72 sm:max-h-80 md:max-h-96 overflow-y-auto">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((activity: RecentActivity, index: number) => {
                      const config = getActivityConfig(activity.type)
                      return (
                        <div key={activity.id || index} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${config.color}`}>
                            <config.icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-4 md:w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm md:text-sm font-medium text-gray-900 leading-4 sm:leading-5">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">{activity.time}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 sm:py-10 md:py-12 text-gray-500">
                      <ClipboardDocumentListIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <h4 className="text-xs sm:text-sm md:text-sm font-medium text-gray-900 mb-1 sm:mb-2">No Recent Activity</h4>
                      <p className="text-xs sm:text-xs md:text-xs text-gray-500 px-4">Activity will appear here as you use the system</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}