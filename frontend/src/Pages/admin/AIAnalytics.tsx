// // 1. frontend/src/pages/admin/AIAnalytics.tsx - Analytics dashboard for AI services
// import React from 'react'
// import { useServiceAnalytics } from '../../hooks/useServiceManagement'
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
// import { TrendingUp, MessageSquare, Users, Target } from 'lucide-react'

// const AIAnalytics: React.FC = () => {
//   const { data: analytics, isLoading } = useServiceAnalytics(30)

//   const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

//   if (isLoading) {
//     return <div className="flex justify-center items-center h-64">Loading analytics...</div>
//   }

//   return (
//     <div className="space-y-6">
//       <div className="sm:flex sm:items-center">
//         <div className="sm:flex-auto">
//           <h1 className="text-2xl font-semibold text-gray-900">AI Service Analytics</h1>
//           <p className="mt-2 text-sm text-gray-700">
//             Monitor your AI assistant's performance and service usage patterns.
//           </p>
//         </div>
//       </div>

//       {/* Stats Overview */}
//       <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
//         <div className="bg-white overflow-hidden shadow rounded-lg">
//           <div className="p-5">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <MessageSquare className="h-6 w-6 text-gray-400" />
//               </div>
//               <div className="ml-5 w-0 flex-1">
//                 <dl>
//                   <dt className="text-sm font-medium text-gray-500 truncate">Total Interactions</dt>
//                   <dd className="text-lg font-medium text-gray-900">{analytics?.total_interactions || 0}</dd>
//                 </dl>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white overflow-hidden shadow rounded-lg">
//           <div className="p-5">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <Target className="h-6 w-6 text-gray-400" />
//               </div>
//               <div className="ml-5 w-0 flex-1">
//                 <dl>
//                   <dt className="text-sm font-medium text-gray-500 truncate">Service Matches</dt>
//                   <dd className="text-lg font-medium text-gray-900">
//                     {analytics?.service_usage?.reduce((acc, curr) => acc + curr.count, 0) || 0}
//                   </dd>
//                 </dl>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white overflow-hidden shadow rounded-lg">
//           <div className="p-5">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <TrendingUp className="h-6 w-6 text-gray-400" />
//               </div>
//               <div className="ml-5 w-0 flex-1">
//                 <dl>
//                   <dt className="text-sm font-medium text-gray-500 truncate">Match Rate</dt>
//                   <dd className="text-lg font-medium text-gray-900">
//                     {analytics?.total_interactions > 0 
//                       ? Math.round((analytics.service_usage.reduce((acc, curr) => acc + curr.count, 0) / analytics.total_interactions) * 100)
//                       : 0
//                     }%
//                   </dd>
//                 </dl>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white overflow-hidden shadow rounded-lg">
//           <div className="p-5">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <Users className="h-6 w-6 text-gray-400" />
//               </div>
//               <div className="ml-5 w-0 flex-1">
//                 <dl>
//                   <dt className="text-sm font-medium text-gray-500 truncate">Top Intent</dt>
//                   <dd className="text-lg font-medium text-gray-900">
//                     {analytics?.intent_distribution?.[0]?.intent || 'N/A'}
//                   </dd>
//                 </dl>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Charts */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Service Usage Chart */}
//         <div className="bg-white shadow rounded-lg p-6">
//           <h3 className="text-lg font-medium text-gray-900 mb-4">Service Usage</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={analytics?.service_usage || []}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="service_id" />
//               <YAxis />
//               <Tooltip />
//               <Bar dataKey="count" fill="#3B82F6" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Intent Distribution */}
//         <div className="bg-white shadow rounded-lg p-6">
//           <h3 className="text-lg font-medium text-gray-900 mb-4">Intent Distribution</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={analytics?.intent_distribution || []}
//                 cx="50%"
//                 cy="50%"
//                 labelLine={false}
//                 label={({ intent, percent }) => `${intent} ${(percent * 100).toFixed(0)}%`}
//                 outerRadius={80}
//                 fill="#8884d8"
//                 dataKey="count"
//               >
//                 {analytics?.intent_distribution?.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default AIAnalytics