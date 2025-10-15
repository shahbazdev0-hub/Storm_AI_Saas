// // frontend/src/pages/field-service/MobileWorkflow.tsx
// import { useState } from 'react'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import {
//   DevicePhoneMobileIcon,
//   QrCodeIcon,
//   CameraIcon,
//   DocumentTextIcon,
//   ClockIcon,
//   CheckCircleIcon,
//   ExclamationTriangleIcon,
//   PencilSquareIcon,
//   MapPinIcon,
//   WrenchScrewdriverIcon,
//   PlayIcon,
//   PauseIcon
// } from '@heroicons/react/24/outline'
// import toast from 'react-hot-toast'

// import { api } from '../../services/api'

// interface MobileJob {
//   id: string
//   job_number: string
//   customer_name: string
//   customer_phone: string
//   service_type: string
//   address: string
//   scheduled_start: string
//   estimated_duration: number
//   status: 'pending' | 'in_progress' | 'completed' | 'paused'
//   technician_id: string
//   checklist: Array<{
//     id: string
//     description: string
//     completed: boolean
//     required: boolean
//     photo_required: boolean
//     photos: string[]
//     notes?: string
//   }>
//   materials_used: Array<{
//     id: string
//     name: string
//     quantity: number
//     unit: string
//   }>
//   time_tracking: {
//     start_time?: string
//     end_time?: string
//     break_time: number
//     actual_duration?: number
//   }
//   customer_signature?: string
//   completion_notes?: string
//   before_photos: string[]
//   after_photos: string[]
// }

// interface WorkflowStep {
//   id: string
//   title: string
//   description: string
//   icon: React.ComponentType<{ className?: string }>
//   status: 'pending' | 'active' | 'completed' | 'skipped'
//   required: boolean
// }

// export default function MobileWorkflow() {
//   const [selectedJob, setSelectedJob] = useState<string | null>(null)
//   const [activeStep, setActiveStep] = useState<string | null>(null)
//   const [showQRScanner, setShowQRScanner] = useState(false)

//   const queryClient = useQueryClient()

//   const { data: mobileJobs, isLoading } = useQuery({
//   queryKey: ['mobile-jobs'],
//   queryFn: async () => {
//     // Change from: const response = await api.get('/mobile/jobs/today')
//     const response = await api.get('/jobs/?date=today')
//     return response.data.jobs // Extract jobs array from response
//   },
// })
// const { data: workflowTemplate } = useQuery({
//   queryKey: ['workflow-template'],
//   queryFn: async () => {
//     // For now, return mock data or remove this query
//     return {
//       steps: [
//         { id: 'arrival', title: 'Arrival & Check-in', required: true },
//         { id: 'assessment', title: 'Site Assessment', required: true },
//         { id: 'work_execution', title: 'Work Execution', required: true },
//         { id: 'quality_check', title: 'Quality Check', required: true },
//         { id: 'customer_signoff', title: 'Customer Sign-off', required: true },
//         { id: 'completion', title: 'Job Completion', required: true }
//       ]
//     }
//   },
// })

//   const updateJobStatusMutation = useMutation({
//     mutationFn: async ({ jobId, status, data }: { jobId: string; status: string; data?: any }) => {
//       const response = await api.patch(`/mobile/jobs/${jobId}`, { status, ...data })
//       return response.data
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['mobile-jobs'] })
//       toast.success('Job updated successfully!')
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || 'Failed to update job')
//     },
//   })

//   const updateChecklistMutation = useMutation({
//     mutationFn: async ({ jobId, checklistItemId, completed, notes, photos }: {
//       jobId: string
//       checklistItemId: string
//       completed: boolean
//       notes?: string
//       photos?: string[]
//     }) => {
//       const response = await api.patch(`/mobile/jobs/${jobId}/checklist/${checklistItemId}`, {
//         completed,
//         notes,
//         photos
//       })
//       return response.data
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['mobile-jobs'] })
//     },
//   })

//   // Replace your current getWorkflowSteps with this:
// const getWorkflowSteps = (job?: MobileJob): WorkflowStep[] => {
//   if (!job) return [];

//   // Defensive defaults so undefined never breaks .length/.every
//   const beforePhotos = Array.isArray(job.before_photos) ? job.before_photos : [];
//   const afterPhotos  = Array.isArray(job.after_photos)  ? job.after_photos  : [];
//   const checklist    = Array.isArray(job.checklist)     ? job.checklist     : [];

//   return [
//     {
//       id: 'arrival',
//       title: 'Arrival & Check-in',
//       description: 'Confirm arrival at job site and check in',
//       icon: MapPinIcon,
//       status: job.status === 'pending' ? 'active' : 'completed',
//       required: true
//     },
//     {
//       id: 'assessment',
//       title: 'Site Assessment',
//       description: 'Take before photos and assess the work area',
//       icon: CameraIcon,
//       status: (beforePhotos.length > 0) 
//                 ? 'completed' 
//                 : job.status !== 'pending' ? 'active' : 'pending',
//       required: true
//     },
//     {
//       id: 'work_execution',
//       title: 'Work Execution',
//       description: 'Complete service checklist and document work',
//       icon: WrenchScrewdriverIcon,
//       status: checklist.every(item => !item.required || item.completed)
//                 ? 'completed'
//                 : job.status === 'in_progress' ? 'active' : 'pending',
//       required: true
//     },
//     {
//       id: 'quality_check',
//       title: 'Quality Check',
//       description: 'Verify work completion and take after photos',
//       icon: CheckCircleIcon,
//       status: (afterPhotos.length > 0)
//                 ? 'completed'
//                 : checklist.every(item => !item.required || item.completed) ? 'active' : 'pending',
//       required: true
//     },
//     {
//       id: 'customer_signoff',
//       title: 'Customer Sign-off',
//       description: 'Get customer signature and feedback',
//       icon: PencilSquareIcon,
//       status: job.customer_signature 
//                 ? 'completed' 
//                 : (afterPhotos.length > 0 ? 'active' : 'pending'),
//       required: true
//     },
//     {
//       id: 'completion',
//       title: 'Job Completion',
//       description: 'Finalize job and submit report',
//       icon: DocumentTextIcon,
//       status: job.status === 'completed' 
//                 ? 'completed' 
//                 : job.customer_signature ? 'active' : 'pending',
//       required: true
//     }
//   ];
// };


//   const getStepColor = (status: string) => {
//     switch (status) {
//       case 'completed':
//         return 'bg-green-500 text-white'
//       case 'active':
//         return 'bg-blue-500 text-white'
//       case 'pending':
//         return 'bg-gray-300 text-gray-600'
//       default:
//         return 'bg-gray-300 text-gray-600'
//     }
//   }

//   const getJobProgress = (job: MobileJob) => {
//     const steps = getWorkflowSteps(job)
//     const completedSteps = steps.filter(step => step.status === 'completed').length
//     return Math.round((completedSteps / steps.length) * 100)
//   }

//   const selectedJobData = selectedJob ? mobileJobs?.find((job: MobileJob) => job.id === selectedJob) : null
//   const workflowSteps = getWorkflowSteps(selectedJobData)

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Mobile Workflow</h1>
//           <p className="mt-1 text-sm text-gray-500">
//             Mobile-optimized job management and workflow guidance for field technicians
//           </p>
//         </div>
        
//         <div className="flex items-center space-x-4">
//           <button
//             onClick={() => setShowQRScanner(true)}
//             className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
//           >
//             <QrCodeIcon className="h-4 w-4 mr-2" />
//             Scan QR Code
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Job List */}
//         <div className="lg:col-span-1">
//           <div className="bg-white shadow rounded-lg">
//             <div className="px-4 py-5 sm:p-6">
//               <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Jobs</h3>
              
//               {isLoading ? (
//                 <div className="animate-pulse space-y-4">
//                   {[...Array(3)].map((_, i) => (
//                     <div key={i} className="h-20 bg-gray-200 rounded"></div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {mobileJobs?.map((job: MobileJob) => (
//                     <div
//                       key={job.id}
//                       className={`p-3 rounded-lg border cursor-pointer transition-colors ${
//                         selectedJob === job.id
//                           ? 'border-blue-500 bg-blue-50'
//                           : 'border-gray-200 hover:bg-gray-50'
//                       }`}
//                       onClick={() => setSelectedJob(job.id)}
//                     >
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <p className="text-sm font-medium text-gray-900">
//                             #{job.job_number}
//                           </p>
//                           <p className="text-sm text-gray-600">{job.customer_name}</p>
//                         </div>
//                         <div className="text-right">
//                           <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
//                             job.status === 'completed' 
//                               ? 'bg-green-100 text-green-800'
//                               : job.status === 'in_progress'
//                               ? 'bg-blue-100 text-blue-800'
//                               : 'bg-gray-100 text-gray-800'
//                           }`}>
//                             {job.status.replace('_', ' ')}
//                           </div>
//                         </div>
//                       </div>
                      
//                       <div className="mt-2">
//                         <div className="flex items-center text-xs text-gray-500">
//                           <ClockIcon className="h-3 w-3 mr-1" />
//                           {new Date(job.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                           <span className="mx-2">•</span>
//                           <span>{job.service_type}</span>
//                         </div>
                        
//                         <div className="mt-2">
//                           <div className="flex items-center justify-between text-xs">
//                             <span className="text-gray-500">Progress</span>
//                             <span className="text-gray-700">{getJobProgress(job)}%</span>
//                           </div>
//                           <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
//                             <div
//                               className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
//                               style={{ width: `${getJobProgress(job)}%` }}
//                             ></div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Workflow Steps */}
//         <div className="lg:col-span-2">
//           {selectedJobData ? (
//             <div className="space-y-6">
//               {/* Job Header */}
//               <div className="bg-white shadow rounded-lg p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-lg font-medium text-gray-900">
//                       Job #{selectedJobData.job_number} - {selectedJobData.customer_name}
//                     </h3>
//                     <p className="text-sm text-gray-500">
//                       {selectedJobData.service_type} • {selectedJobData.address}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
//                       selectedJobData.status === 'completed' 
//                         ? 'bg-green-100 text-green-800'
//                         : selectedJobData.status === 'in_progress'
//                         ? 'bg-blue-100 text-blue-800'
//                         : 'bg-gray-100 text-gray-800'
//                     }`}>
//                       {selectedJobData.status.replace('_', ' ')}
//                     </div>
//                     <p className="text-xs text-gray-500 mt-1">
//                       {getJobProgress(selectedJobData)}% Complete
//                     </p>
//                   </div>
//                 </div>

//                 {selectedJobData.status !== 'completed' && (
//                   <div className="mt-4 flex space-x-3">
//                     {selectedJobData.status === 'pending' && (
//                       <button
//                         onClick={() => updateJobStatusMutation.mutate({
//                           jobId: selectedJobData.id,
//                           status: 'in_progress',
//                           data: { start_time: new Date().toISOString() }
//                         })}
//                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
//                       >
//                         <PlayIcon className="h-4 w-4 mr-2" />
//                         Start Job
//                       </button>
//                     )}
                    
//                     {selectedJobData.status === 'in_progress' && (
//                       <>
//                         <button
//                           onClick={() => updateJobStatusMutation.mutate({
//                             jobId: selectedJobData.id,
//                             status: 'paused'
//                           })}
//                           className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
//                         >
//                           <PauseIcon className="h-4 w-4 mr-2" />
//                           Pause
//                         </button>
                        
//                         {workflowSteps.every(step => step.status === 'completed') && (
//                           <button
//                             onClick={() => updateJobStatusMutation.mutate({
//                               jobId: selectedJobData.id,
//                               status: 'completed',
//                               data: { end_time: new Date().toISOString() }
//                             })}
//                             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
//                           >
//                             <CheckCircleIcon className="h-4 w-4 mr-2" />
//                             Complete Job
//                           </button>
//                         )}
//                       </>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Workflow Steps */}
//               <div className="bg-white shadow rounded-lg p-6">
//                 <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Steps</h3>
                
//                 <div className="space-y-4">
//                   {workflowSteps.map((step, index) => (
//                     <div key={step.id} className="flex items-start">
//                       <div className="flex-shrink-0">
//                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.status)}`}>
//                           {step.status === 'completed' ? (
//                             <CheckCircleIcon className="h-5 w-5" />
//                           ) : (
//                             <span className="text-sm font-medium">{index + 1}</span>
//                           )}
//                         </div>
//                       </div>
                      
//                       <div className="ml-4 flex-1">
//                         <div className="flex items-center justify-between">
//                           <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
//                           {step.status === 'active' && (
//                             <button
//                               onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
//                               className="text-blue-600 hover:text-blue-800 text-sm font-medium"
//                             >
//                               {activeStep === step.id ? 'Hide' : 'Show'} Details
//                             </button>
//                           )}
//                         </div>
//                         <p className="text-sm text-gray-500">{step.description}</p>
                        
//                         {activeStep === step.id && step.status === 'active' && (
//                           <div className="mt-3 p-3 bg-gray-50 rounded-md">
//                             {step.id === 'work_execution' && (
//                               <div className="space-y-3">
//                                 <h5 className="text-sm font-medium text-gray-900">Service Checklist</h5>
//                                 {selectedJobData.checklist.map((item) => (
//                                   <div key={item.id} className="flex items-start">
//                                     <input
//                                       type="checkbox"
//                                       checked={item.completed}
//                                       onChange={(e) => updateChecklistMutation.mutate({
//                                         jobId: selectedJobData.id,
//                                         checklistItemId: item.id,
//                                         completed: e.target.checked
//                                       })}
//                                       className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                                     />
//                                     <div className="ml-3 flex-1">
//                                       <label className="text-sm text-gray-700">
//                                         {item.description}
//                                         {item.required && <span className="text-red-500 ml-1">*</span>}
//                                       </label>
//                                       {item.photo_required && (
//                                         <div className="mt-1">
//                                           <button className="text-xs text-blue-600 hover:text-blue-800">
//                                             <CameraIcon className="h-4 w-4 inline mr-1" />
//                                             Add Photo
//                                           </button>
//                                         </div>
//                                       )}
//                                     </div>
//                                   </div>
//                                 ))}
//                               </div>
//                             )}
                            
//                             {step.id === 'assessment' && (
//                               <div>
//                                 <h5 className="text-sm font-medium text-gray-900 mb-2">Before Photos</h5>
//                                 <div className="grid grid-cols-3 gap-2">
//                                   {selectedJobData.before_photos.map((photo: string, index: number) => (
//                                     <div key={index} className="aspect-square bg-gray-200 rounded-md">
//                                       <img src={photo} alt={`Before ${index + 1}`} className="w-full h-full object-cover rounded-md" />
//                                     </div>
//                                   ))}
//                                   <button className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400">
//                                     <CameraIcon className="h-6 w-6 text-gray-400" />
//                                   </button>
//                                 </div>
//                               </div>
//                             )}
                            
//                             {step.id === 'quality_check' && (
//                               <div>
//                                 <h5 className="text-sm font-medium text-gray-900 mb-2">After Photos</h5>
//                                 <div className="grid grid-cols-3 gap-2">
//                                   {selectedJobData.after_photos.map((photo: string, index: number) => (
//                                     <div key={index} className="aspect-square bg-gray-200 rounded-md">
//                                       <img src={photo} alt={`After ${index + 1}`} className="w-full h-full object-cover rounded-md" />
//                                     </div>
//                                   ))}
//                                   <button className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400">
//                                     <CameraIcon className="h-6 w-6 text-gray-400" />
//                                   </button>
//                                 </div>
//                               </div>
//                             )}
                            
//                             {step.id === 'customer_signoff' && (
//                               <div className="space-y-3">
//                                 <div>
//                                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Completion Notes
//                                   </label>
//                                   <textarea
//                                     rows={3}
//                                     className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                                     placeholder="Any additional notes about the completed work..."
//                                   />
//                                 </div>
                                
//                                 <div>
//                                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                                     Customer Signature
//                                   </label>
//                                   <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
//                                     <PencilSquareIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
//                                     <p className="text-sm text-gray-500">Tap to capture signature</p>
//                                   </div>
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Time Tracking */}
//               {selectedJobData.time_tracking.start_time && (
//                 <div className="bg-white shadow rounded-lg p-6">
//                   <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <div>
//                       <div className="text-sm text-gray-500">Start Time</div>
//                       <div className="text-lg font-medium text-gray-900">
//                         {new Date(selectedJobData.time_tracking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                       </div>
//                     </div>
                    
//                     {selectedJobData.time_tracking.end_time && (
//                       <div>
//                         <div className="text-sm text-gray-500">End Time</div>
//                         <div className="text-lg font-medium text-gray-900">
//                           {new Date(selectedJobData.time_tracking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                         </div>
//                       </div>
//                     )}
                    
//                     <div>
//                       <div className="text-sm text-gray-500">
//                         {selectedJobData.time_tracking.end_time ? 'Total Duration' : 'Current Duration'}
//                       </div>
//                       <div className="text-lg font-medium text-gray-900">
//                         {selectedJobData.time_tracking.actual_duration ? 
//                           `${Math.floor(selectedJobData.time_tracking.actual_duration / 60)}h ${selectedJobData.time_tracking.actual_duration % 60}m` :
//                           'In Progress'
//                         }
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Materials Used */}
//               {selectedJobData.materials_used.length > 0 && (
//                 <div className="bg-white shadow rounded-lg p-6">
//                   <h3 className="text-lg font-medium text-gray-900 mb-4">Materials Used</h3>
                  
//                   <div className="overflow-x-auto">
//                     <table className="min-w-full divide-y divide-gray-200">
//                       <thead className="bg-gray-50">
//                         <tr>
//                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
//                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
//                         </tr>
//                       </thead>
//                       <tbody className="bg-white divide-y divide-gray-200">
//                         {selectedJobData.materials_used.map((material) => (
//                           <tr key={material.id}>
//                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                               {material.name}
//                             </td>
//                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {material.quantity}
//                             </td>
//                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                               {material.unit}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <div className="bg-white shadow rounded-lg p-6">
//               <div className="text-center py-12">
//                 <DevicePhoneMobileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job</h3>
//                 <p className="text-gray-500">
//                   Choose a job from the list to view its mobile workflow and manage progress.
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* QR Scanner Modal */}
//       {showQRScanner && (
//         <div className="fixed inset-0 z-50 overflow-y-auto">
//           <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//             <div className="fixed inset-0 transition-opacity" aria-hidden="true">
//               <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowQRScanner(false)}></div>
//             </div>
            
//             <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
//               <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
//                 <div className="sm:flex sm:items-start">
//                   <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
//                     <QrCodeIcon className="h-6 w-6 text-blue-600" />
//                   </div>
//                   <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
//                     <h3 className="text-lg leading-6 font-medium text-gray-900">
//                       QR Code Scanner
//                     </h3>
//                     <div className="mt-2">
//                       <p className="text-sm text-gray-500">
//                         Scan a QR code to quickly access job information or check in to a job site.
//                       </p>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="mt-4">
//                   <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
//                     <div className="text-center">
//                       <QrCodeIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
//                       <p className="text-gray-500">QR Scanner would be integrated here</p>
//                       <p className="text-sm text-gray-400">Camera access required</p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
//                 <button
//                   onClick={() => setShowQRScanner(false)}
//                   className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }




























// frontend/src/pages/field-service/MobileWorkflow.tsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DevicePhoneMobileIcon,
  QrCodeIcon,
  CameraIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  MapPinIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { api } from '../../services/api'

interface MobileJob {
  id: string
  job_number: string
  customer_name: string
  customer_phone: string
  service_type: string
  address: string
  scheduled_start: string
  estimated_duration: number
  status: 'pending' | 'in_progress' | 'completed' | 'paused'
  technician_id: string
  checklist?: Array<{
    id: string
    description: string
    completed: boolean
    required: boolean
    photo_required: boolean
    photos?: string[]
    notes?: string
  }>
  materials_used?: Array<{
    id: string
    name: string
    quantity: number
    unit: string
  }>
  time_tracking?: {
    start_time?: string
    end_time?: string
    break_time?: number
    actual_duration?: number
  }
  customer_signature?: string
  completion_notes?: string
  before_photos?: string[]
  after_photos?: string[]
}

interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'pending' | 'active' | 'completed' | 'skipped'
  required: boolean
}

export default function MobileWorkflow() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)

  // QR state/refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const queryClient = useQueryClient()

  const { data: mobileJobs, isLoading } = useQuery({
    queryKey: ['mobile-jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs/?date=today')
      return response.data.jobs as MobileJob[]
    },
  })

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status, data }: { jobId: string; status: string; data?: any }) => {
      const response = await api.patch(`/mobile/jobs/${jobId}`, { status, ...data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-jobs'] })
      toast.success('Job updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to update job')
    },
  })

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ jobId, checklistItemId, completed, notes, photos }: {
      jobId: string
      checklistItemId: string
      completed: boolean
      notes?: string
      photos?: string[]
    }) => {
      const response = await api.patch(`/mobile/jobs/${jobId}/checklist/${checklistItemId}`, {
        completed,
        notes,
        photos
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-jobs'] })
    },
  })

  const getWorkflowSteps = (job?: MobileJob): WorkflowStep[] => {
    if (!job) return []

    const beforePhotos = Array.isArray(job.before_photos) ? job.before_photos : []
    const afterPhotos  = Array.isArray(job.after_photos)  ? job.after_photos  : []
    const checklist    = Array.isArray(job.checklist)     ? job.checklist     : []

    return [
      {
        id: 'arrival',
        title: 'Arrival & Check-in',
        description: 'Confirm arrival at job site and check in',
        icon: MapPinIcon,
        status: job.status === 'pending' ? 'active' : 'completed',
        required: true
      },
      {
        id: 'assessment',
        title: 'Site Assessment',
        description: 'Take before photos and assess the work area',
        icon: CameraIcon,
        status: (beforePhotos.length > 0)
          ? 'completed'
          : job.status !== 'pending' ? 'active' : 'pending',
        required: true
      },
      {
        id: 'work_execution',
        title: 'Work Execution',
        description: 'Complete service checklist and document work',
        icon: WrenchScrewdriverIcon,
        status: checklist.every(item => !item.required || item.completed)
          ? 'completed'
          : job.status === 'in_progress' ? 'active' : 'pending',
        required: true
      },
      {
        id: 'quality_check',
        title: 'Quality Check',
        description: 'Verify work completion and take after photos',
        icon: CheckCircleIcon,
        status: (afterPhotos.length > 0)
          ? 'completed'
          : checklist.every(item => !item.required || item.completed) ? 'active' : 'pending',
        required: true
      },
      {
        id: 'customer_signoff',
        title: 'Customer Sign-off',
        description: 'Get customer signature and feedback',
        icon: PencilSquareIcon,
        status: job.customer_signature
          ? 'completed'
          : (afterPhotos.length > 0 ? 'active' : 'pending'),
        required: true
      },
      {
        id: 'completion',
        title: 'Job Completion',
        description: 'Finalize job and submit report',
        icon: DocumentTextIcon,
        status: job.status === 'completed'
          ? 'completed'
          : job.customer_signature ? 'active' : 'pending',
        required: true
      }
    ]
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white'
      case 'active':
        return 'bg-blue-500 text-white'
      case 'pending':
      default:
        return 'bg-gray-300 text-gray-600'
    }
  }

  const getJobProgress = (job: MobileJob) => {
    const steps = getWorkflowSteps(job)
    if (steps.length === 0) return 0
    const completedSteps = steps.filter(step => step.status === 'completed').length
    return Math.round((completedSteps / steps.length) * 100)
  }

  const selectedJobData = selectedJob
    ? (mobileJobs ?? []).find((job: MobileJob) => job.id === selectedJob) ?? null
    : null

  const workflowSteps = getWorkflowSteps(selectedJobData ?? undefined)

  // ===== QR Scanner lifecycle (no reset(): use controls.stop + stop tracks) =====
  useEffect(() => {
    if (!showQRScanner) return

    const start = async () => {
      try {
        setIsScanning(true)
        readerRef.current = new BrowserMultiFormatReader()

        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        const preferredDeviceId =
          devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId ||
          devices[0]?.deviceId

        await readerRef.current.decodeFromVideoDevice(
          preferredDeviceId ?? undefined,
          videoRef.current!,
          async (result, err, controls) => {
            if (controls && !controlsRef.current) controlsRef.current = controls

            if (result) {
              const code = result.getText().trim()

              // stop scanning immediately to avoid duplicate reads
              try { controlsRef.current?.stop() } catch {}
              try {
                const stream = videoRef.current?.srcObject as MediaStream | null
                stream?.getTracks().forEach(t => t.stop())
                if (videoRef.current) videoRef.current.srcObject = null
              } catch {}

              setIsScanning(false)
              setShowQRScanner(false)

              try {
                // Resolve QR -> Job via backend (auth-protected)
                const { data } = await api.post('/mobile/jobs/scan', { code })
                const resolvedId = data?.job?.id
                if (resolvedId) {
                  setSelectedJob(resolvedId)
                  queryClient.invalidateQueries({ queryKey: ['mobile-jobs'] })
                  toast.success('QR matched: job loaded')
                } else {
                  toast.error('Scan matched no job')
                }
              } catch (apiErr: any) {
                toast.error(apiErr?.response?.data?.detail || 'Scan match failed')
              }
            }
            // ignore transient decode errors
          }
        )
      } catch (e: any) {
        setIsScanning(false)
        toast.error(
          e?.name === 'NotAllowedError'
            ? 'Camera permission denied'
            : e?.name === 'NotFoundError'
            ? 'No camera device found'
            : 'Unable to start camera'
        )
      }
    }

    start()

    return () => {
      try { controlsRef.current?.stop() } catch {}
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null
        stream?.getTracks().forEach(t => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
      } catch {}
      controlsRef.current = null
      setIsScanning(false)
    }
  }, [showQRScanner, queryClient])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Workflow</h1>
          <p className="mt-1 text-sm text-gray-500">
            Mobile-optimized job management and workflow guidance for field technicians
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowQRScanner(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <QrCodeIcon className="h-4 w-4 mr-2" />
            Scan QR Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Jobs</h3>

              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(mobileJobs ?? []).map((job: MobileJob) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedJob === job.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedJob(job.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            #{job.job_number}
                          </p>
                          <p className="text-sm text-gray-600">{job.customer_name}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : job.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {new Date(job.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="mx-2">•</span>
                          <span>{job.service_type}</span>
                        </div>

                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Progress</span>
                            <span className="text-gray-700">{getJobProgress(job)}%</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${getJobProgress(job)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="lg:col-span-2">
          {selectedJobData ? (
            <div className="space-y-6">
              {/* Job Header */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Job #{selectedJobData.job_number} - {selectedJobData.customer_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedJobData.service_type} • {selectedJobData.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedJobData.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : selectedJobData.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedJobData.status.replace('_', ' ')}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getJobProgress(selectedJobData)}% Complete
                    </p>
                  </div>
                </div>

                {selectedJobData.status !== 'completed' && (
                  <div className="mt-4 flex space-x-3">
                    {selectedJobData.status === 'pending' && (
                      <button
                        onClick={() => updateJobStatusMutation.mutate({
                          jobId: selectedJobData.id,
                          status: 'in_progress',
                          data: { start_time: new Date().toISOString() }
                        })}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Start Job
                      </button>
                    )}

                    {selectedJobData.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => updateJobStatusMutation.mutate({
                            jobId: selectedJobData.id,
                            status: 'paused'
                          })}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <PauseIcon className="h-4 w-4 mr-2" />
                          Pause
                        </button>

                        {workflowSteps.every(step => step.status === 'completed') && (
                          <button
                            onClick={() => updateJobStatusMutation.mutate({
                              jobId: selectedJobData.id,
                              status: 'completed',
                              data: { end_time: new Date().toISOString() }
                            })}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Complete Job
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Workflow Steps */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Steps</h3>

                <div className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.status)}`}>
                          {step.status === 'completed' ? (
                            <CheckCircleIcon className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                          {step.status === 'active' && (
                            <button
                              onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {activeStep === step.id ? 'Hide' : 'Show'} Details
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{step.description}</p>

                        {activeStep === step.id && step.status === 'active' && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            {step.id === 'work_execution' && (
                              <div className="space-y-3">
                                <h5 className="text-sm font-medium text-gray-900">Service Checklist</h5>
                                {(selectedJobData?.checklist ?? []).map((item) => (
                                  <div key={item.id} className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!item.completed}
                                      onChange={(e) => updateChecklistMutation.mutate({
                                        jobId: selectedJobData.id,
                                        checklistItemId: item.id,
                                        completed: e.target.checked
                                      })}
                                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div className="ml-3 flex-1">
                                      <label className="text-sm text-gray-700">
                                        {item.description}
                                        {item.required && <span className="text-red-500 ml-1">*</span>}
                                      </label>
                                      {item.photo_required && (
                                        <div className="mt-1">
                                          <button className="text-xs text-blue-600 hover:text-blue-800">
                                            <CameraIcon className="h-4 w-4 inline mr-1" />
                                            Add Photo
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {step.id === 'assessment' && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Before Photos</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  {(selectedJobData?.before_photos ?? []).map((photo: string, index: number) => (
                                    <div key={index} className="aspect-square bg-gray-200 rounded-md">
                                      <img src={photo} alt={`Before ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    </div>
                                  ))}
                                  <button className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400">
                                    <CameraIcon className="h-6 w-6 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {step.id === 'quality_check' && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">After Photos</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  {(selectedJobData?.after_photos ?? []).map((photo: string, index: number) => (
                                    <div key={index} className="aspect-square bg-gray-200 rounded-md">
                                      <img src={photo} alt={`After ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    </div>
                                  ))}
                                  <button className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400">
                                    <CameraIcon className="h-6 w-6 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {step.id === 'customer_signoff' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Completion Notes
                                  </label>
                                  <textarea
                                    rows={3}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Any additional notes about the completed work..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer Signature
                                  </label>
                                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                                    <PencilSquareIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Tap to capture signature</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Tracking */}
              {selectedJobData?.time_tracking?.start_time && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Start Time</div>
                      <div className="text-lg font-medium text-gray-900">
                        {new Date(selectedJobData.time_tracking!.start_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {selectedJobData.time_tracking?.end_time && (
                      <div>
                        <div className="text-sm text-gray-500">End Time</div>
                        <div className="text-lg font-medium text-gray-900">
                          {new Date(selectedJobData.time_tracking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm text-gray-500">
                        {selectedJobData.time_tracking?.end_time ? 'Total Duration' : 'Current Duration'}
                      </div>
                      <div className="text-lg font-medium text-gray-900">
                        {typeof selectedJobData.time_tracking?.actual_duration === 'number'
                          ? `${Math.floor((selectedJobData.time_tracking!.actual_duration as number) / 60)}h ${(selectedJobData.time_tracking!.actual_duration as number) % 60}m`
                          : 'In Progress'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Materials Used */}
              {(selectedJobData?.materials_used ?? []).length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Materials Used</h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(selectedJobData?.materials_used ?? []).map((material) => (
                          <tr key={material.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {material.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {material.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {material.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-12">
                <DevicePhoneMobileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job</h3>
                <p className="text-gray-500">
                  Choose a job from the list to view its mobile workflow and manage progress.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowQRScanner(false)}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <QrCodeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      QR Code Scanner
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Point the camera at a job QR to load and check in.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="rounded-lg h-64 flex items-center justify-center bg-black overflow-hidden">
                    <video ref={videoRef} className="w-full h-64 object-cover" muted playsInline />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isScanning ? 'Scanning…' : 'Scanner idle'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
