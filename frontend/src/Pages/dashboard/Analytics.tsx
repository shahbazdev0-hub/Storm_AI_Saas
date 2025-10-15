// frontend/src/pages/Analytics.tsx
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts'
import { api } from '../../services/api'

export default function Analytics() {
  const { data, isLoading, error } = useQuery({
  queryKey: ['analytics','overview','30d'],
  queryFn: async () => {
    const res = await api.get('/analytics/overview?period=30d&debug=1'); // temp with debug
    return res.data;
  },
  staleTime: 60_000,
});

console.log('[Analytics payload]', data); // TEMP


  if (isLoading) return <div className="p-6">Loading analytics...</div>
  if (error) return <div className="p-6 text-red-600">Failed to load analytics.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Key metrics and performance over the last {data?.period}
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Revenue" value={`$${data?.totals?.revenue ?? 0}`} />
        <StatCard label="Invoices" value={data?.totals?.invoices ?? 0} />
        <StatCard label="Estimates" value={data?.totals?.estimates ?? 0} />
        <StatCard label="Leads" value={data?.totals?.leads ?? 0} />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.timeseries ?? []}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown by Services */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Service</h3>
        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.breakdown?.services ?? []}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
          <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
        </dl>
      </div>
    </div>
  )
}
