// // frontend/src/pages/settings/Profile.tsx - Updated with Enhanced Profile Picture Upload
// import { useState, useRef } from 'react'
// import { useForm } from 'react-hook-form'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { z } from 'zod'
// import { useMutation, useQueryClient } from '@tanstack/react-query'
// import { 
//   UserCircleIcon, 
//   CameraIcon,
//   KeyIcon,
//   BellIcon,
//   ShieldCheckIcon,
//   EyeIcon,
//   EyeSlashIcon,
//   PhotoIcon,
//   TrashIcon
// } from '@heroicons/react/24/outline'
// import toast from 'react-hot-toast'

// import { api } from '../../services/api'
// import { useAuthStore } from '../../store/authStore'
// import { getStaticAssetUrl } from '../../services/api'
// const profileSchema = z.object({
//   name: z.string().min(2, 'Name must be at least 2 characters'),
//   email: z.string().email('Please enter a valid email'),
//   phone: z.string().optional(),
//   title: z.string().optional(),
//   bio: z.string().optional(),
//   timezone: z.string(),
//   language: z.string(),
// })

// const passwordSchema = z.object({
//   current_password: z.string().min(1, 'Current password is required'),
//   new_password: z.string().min(8, 'Password must be at least 8 characters'),
//   confirm_password: z.string(),
// }).refine((data) => data.new_password === data.confirm_password, {
//   message: "Passwords don't match",
//   path: ["confirm_password"],
// })

// const notificationSchema = z.object({
//   email_notifications: z.boolean(),
//   sms_notifications: z.boolean(),
//   push_notifications: z.boolean(),
//   new_leads: z.boolean(),
//   job_reminders: z.boolean(),
//   payment_updates: z.boolean(),
//   system_updates: z.boolean(),
//   marketing_emails: z.boolean(),
// })

// type ProfileFormData = z.infer<typeof profileSchema>
// type PasswordFormData = z.infer<typeof passwordSchema>
// type NotificationFormData = z.infer<typeof notificationSchema>

// export default function Profile() {
//   const { user, updateUser } = useAuthStore()
//   const [activeTab, setActiveTab] = useState('profile')
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false)
//   const [showNewPassword, setShowNewPassword] = useState(false)
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false)
//   const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
//   const [isUploading, setIsUploading] = useState(false)
  
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const queryClient = useQueryClient()

//   // Profile form
//   const profileForm = useForm<ProfileFormData>({
//     resolver: zodResolver(profileSchema),
//     defaultValues: {
//       name: user?.name || '',
//       email: user?.email || '',
//       phone: user?.phone || '',
//       title: user?.title || '',
//       bio: user?.bio || '',
//       timezone: user?.timezone || 'America/New_York',
//       language: user?.language || 'en',
//     },
//   })

//   // Password form
//   const passwordForm = useForm<PasswordFormData>({
//     resolver: zodResolver(passwordSchema),
//   })

//   // Notification form
//   const notificationForm = useForm<NotificationFormData>({
//     defaultValues: {
//       email_notifications: user?.preferences?.email_notifications ?? true,
//       sms_notifications: user?.preferences?.sms_notifications ?? true,
//       push_notifications: user?.preferences?.push_notifications ?? true,
//       new_leads: user?.preferences?.new_leads ?? true,
//       job_reminders: user?.preferences?.job_reminders ?? true,
//       payment_updates: user?.preferences?.payment_updates ?? true,
//       system_updates: user?.preferences?.system_updates ?? true,
//       marketing_emails: user?.preferences?.marketing_emails ?? false,
//     },
//   })

//   // Update profile mutation
//   const updateProfileMutation = useMutation({
//     mutationFn: async (data: ProfileFormData) => {
//       const response = await api.patch('/users/me', data)
//       return response.data
//     },
//     onSuccess: (data) => {
//       updateUser(data)
//       toast.success('Profile updated successfully!')
//       queryClient.invalidateQueries({ queryKey: ['user'] })
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || 'Failed to update profile')
//     },
//   })

//   // Change password mutation
//   const changePasswordMutation = useMutation({
//     mutationFn: async (data: PasswordFormData) => {
//       const response = await api.post('/auth/change-password', data)
//       return response.data
//     },
//     onSuccess: () => {
//       toast.success('Password changed successfully!')
//       passwordForm.reset()
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || 'Failed to change password')
//     },
//   })

//   // Update notifications mutation
//   const updateNotificationsMutation = useMutation({
//     mutationFn: async (data: NotificationFormData) => {
//       const response = await api.patch('/users/me/notifications', data)
//       return response.data
//     },
//     onSuccess: () => {
//       toast.success('Notification preferences updated!')
//       queryClient.invalidateQueries({ queryKey: ['user'] })
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || 'Failed to update notifications')
//     },
//   })

//   // Upload avatar mutation
//   // Upload avatar mutation - FIXED VERSION
// const uploadAvatarMutation = useMutation({
//   mutationFn: async (file: File) => {
//     const formData = new FormData()
//     formData.append('file', file)
    
//     try {
//       // Get token from your auth store
//       const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}')
//       const token = authData.state?.token
      
//       const response = await fetch('http://localhost:8000/api/v1/users/me/avatar', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`
//           // Don't set Content-Type - browser will set it with boundary
//         },
//         body: formData
//       })
      
//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.detail || 'Upload failed')
//       }
      
//       return await response.json()
//     } catch (error) {
//       console.error('Upload error details:', error)
//       throw error
//     }
//   },
//   onSuccess: (data) => {
//     updateUser({ avatar_url: data.avatar_url })
//     toast.success('Profile picture updated successfully!')
//     setAvatarPreview(null)
//     setIsUploading(false)
//     queryClient.invalidateQueries({ queryKey: ['user'] })
//   },
//   onError: (error: any) => {
//     console.error('Upload error:', error.response?.data)
//     toast.error(error.response?.data?.detail || 'Failed to upload profile picture')
//     setIsUploading(false)
//   },
// })

//   // Remove avatar mutation
//   const removeAvatarMutation = useMutation({
//     mutationFn: async () => {
//       const response = await api.delete('/users/me/avatar')
//       return response.data
//     },
//     onSuccess: () => {
//       updateUser({ avatar_url: null })
//       toast.success('Profile picture removed successfully!')
//       setAvatarPreview(null)
//       queryClient.invalidateQueries({ queryKey: ['user'] })
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || 'Failed to remove profile picture')
//     },
//   })

//   // Handle avatar upload
//   const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0]
//     if (file) {
//       // Validate file size (5MB max)
//       if (file.size > 5 * 1024 * 1024) {
//         toast.error('Profile picture must be less than 5MB')
//         return
//       }

//       // Validate file type
//       if (!file.type.startsWith('image/')) {
//         toast.error('Please select an image file')
//         return
//       }

//       setIsUploading(true)
      
//       const reader = new FileReader()
//       reader.onloadend = () => {
//         setAvatarPreview(reader.result as string)
//       }
//       reader.readAsDataURL(file)
      
//       uploadAvatarMutation.mutate(file)
//     }
//   }

//   const triggerFileInput = () => {
//     fileInputRef.current?.click()
//   }

//   const handleRemoveAvatar = () => {
//     if (user?.avatar_url || avatarPreview) {
//       removeAvatarMutation.mutate()
//     }
//   }

//   // Generate user initials
//   const getUserInitials = () => {
//     if (user?.name) {
//       return user.name
//         .split(' ')
//         .map((n: string) => n[0])
//         .join('')
//         .toUpperCase()
//     }
//     return user?.email?.[0]?.toUpperCase() || 'U'
//   }

//   const onProfileSubmit = (data: ProfileFormData) => {
//     updateProfileMutation.mutate(data)
//   }

//   const onPasswordSubmit = (data: PasswordFormData) => {
//     changePasswordMutation.mutate(data)
//   }

//   const onNotificationSubmit = (data: NotificationFormData) => {
//     updateNotificationsMutation.mutate(data)
//   }

//   const tabs = [
//     { id: 'profile', name: 'Profile', icon: UserCircleIcon },
//     { id: 'security', name: 'Security', icon: ShieldCheckIcon },
//     { id: 'notifications', name: 'Notifications', icon: BellIcon },
//   ]

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div>
//         <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
//         <p className="mt-1 text-sm text-gray-500">
//           Manage your account settings and preferences
//         </p>
//       </div>

//       <div className="flex flex-col lg:flex-row gap-6">
//         {/* Sidebar */}
//         <div className="lg:w-64">
//           <nav className="space-y-1">
//             {tabs.map((tab) => {
//               const Icon = tab.icon
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id)}
//                   className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
//                     activeTab === tab.id
//                       ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
//                       : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
//                   }`}
//                 >
//                   <Icon className="h-5 w-5 mr-3" />
//                   {tab.name}
//                 </button>
//               )
//             })}
//           </nav>
//         </div>

//         {/* Content */}
//         <div className="flex-1">
//           {activeTab === 'profile' && (
//             <div className="bg-white shadow rounded-lg">
//               <div className="px-4 py-5 sm:p-6">
//                 <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
                
//                 {/* Enhanced Profile Picture Section */}
//                 <div className="mb-8">
//                   <div className="flex items-center space-x-6">
//                     <div className="relative">
//                       <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
//                       {/* // Then update your avatar display code */}
// {avatarPreview || user?.avatar_url ? (
//   <img
//     src={avatarPreview || getStaticAssetUrl(user.avatar_url)}
//     alt="Profile Picture"
//     className="h-full w-full object-cover"
//   />
// ) : (
//   <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
//     <span className="text-white text-2xl font-semibold">
//       {getUserInitials()}
//     </span>
//   </div>
// )}
//                         {isUploading && (
//                           <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
//                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
//                           </div>
//                         )}
//                       </div>
//                     </div>
                    
//                     <div className="flex-1">
//                       <h4 className="text-sm font-medium text-gray-900 mb-2">Profile Picture</h4>
//                       <p className="text-sm text-gray-500 mb-4">
//                         JPG, PNG or GIF. Max size of 5MB. Recommended size: 400x400px.
//                       </p>
                      
//                       <div className="flex items-center space-x-3">
//                         <button
//                           onClick={triggerFileInput}
//                           disabled={isUploading}
//                           className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                         >
//                           <PhotoIcon className="h-4 w-4 mr-2" />
//                           {isUploading ? 'Uploading...' : 'Upload Photo'}
//                         </button>
                        
//                         {(user?.avatar_url || avatarPreview) && (
//                           <button
//                             onClick={handleRemoveAvatar}
//                             disabled={isUploading}
//                             className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                           >
//                             <TrashIcon className="h-4 w-4 mr-2" />
//                             Remove
//                           </button>
//                         )}
//                       </div>
                      
//                       <input
//                         ref={fileInputRef}
//                         type="file"
//                         accept="image/*"
//                         onChange={handleAvatarChange}
//                         className="hidden"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Full Name *
//                       </label>
//                       <input
//                         {...profileForm.register('name')}
//                         type="text"
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       {profileForm.formState.errors.name && (
//                         <p className="mt-1 text-sm text-red-600">
//                           {profileForm.formState.errors.name.message}
//                         </p>
//                       )}
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Email Address *
//                       </label>
//                       <input
//                         {...profileForm.register('email')}
//                         type="email"
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       {profileForm.formState.errors.email && (
//                         <p className="mt-1 text-sm text-red-600">
//                           {profileForm.formState.errors.email.message}
//                         </p>
//                       )}
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Phone Number
//                       </label>
//                       <input
//                         {...profileForm.register('phone')}
//                         type="tel"
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Job Title
//                       </label>
//                       <input
//                         {...profileForm.register('title')}
//                         type="text"
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                         placeholder="e.g., Operations Manager"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Timezone
//                       </label>
//                       <select
//                         {...profileForm.register('timezone')}
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       >
//                         <option value="America/New_York">Eastern Time</option>
//                         <option value="America/Chicago">Central Time</option>
//                         <option value="America/Denver">Mountain Time</option>
//                         <option value="America/Los_Angeles">Pacific Time</option>
//                         <option value="America/Anchorage">Alaska Time</option>
//                         <option value="Pacific/Honolulu">Hawaii Time</option>
//                       </select>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Language
//                       </label>
//                       <select
//                         {...profileForm.register('language')}
//                         className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       >
//                         <option value="en">English</option>
//                         <option value="es">Spanish</option>
//                         <option value="fr">French</option>
//                         <option value="de">German</option>
//                       </select>
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Bio
//                     </label>
//                     <textarea
//                       {...profileForm.register('bio')}
//                       rows={4}
//                       className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       placeholder="Tell us a little about yourself..."
//                     />
//                   </div>

//                   <div className="flex justify-end">
//                     <button
//                       type="submit"
//                       disabled={updateProfileMutation.isPending}
//                       className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                     >
//                       {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             </div>
//           )}

//           {activeTab === 'security' && (
//             <div className="bg-white shadow rounded-lg">
//               <div className="px-4 py-5 sm:p-6">
//                 <h3 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h3>
                
//                 <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Current Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         {...passwordForm.register('current_password')}
//                         type={showCurrentPassword ? 'text' : 'password'}
//                         className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         type="button"
//                         className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                         onClick={() => setShowCurrentPassword(!showCurrentPassword)}
//                       >
//                         {showCurrentPassword ? (
//                           <EyeSlashIcon className="h-4 w-4 text-gray-400" />
//                         ) : (
//                           <EyeIcon className="h-4 w-4 text-gray-400" />
//                         )}
//                       </button>
//                     </div>
//                     {passwordForm.formState.errors.current_password && (
//                       <p className="mt-1 text-sm text-red-600">
//                         {passwordForm.formState.errors.current_password.message}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       New Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         {...passwordForm.register('new_password')}
//                         type={showNewPassword ? 'text' : 'password'}
//                         className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         type="button"
//                         className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                         onClick={() => setShowNewPassword(!showNewPassword)}
//                       >
//                         {showNewPassword ? (
//                           <EyeSlashIcon className="h-4 w-4 text-gray-400" />
//                         ) : (
//                           <EyeIcon className="h-4 w-4 text-gray-400" />
//                         )}
//                       </button>
//                     </div>
//                     {passwordForm.formState.errors.new_password && (
//                       <p className="mt-1 text-sm text-red-600">
//                         {passwordForm.formState.errors.new_password.message}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Confirm New Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         {...passwordForm.register('confirm_password')}
//                         type={showConfirmPassword ? 'text' : 'password'}
//                         className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         type="button"
//                         className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                         onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                       >
//                         {showConfirmPassword ? (
//                           <EyeSlashIcon className="h-4 w-4 text-gray-400" />
//                         ) : (
//                           <EyeIcon className="h-4 w-4 text-gray-400" />
//                         )}
//                       </button>
//                     </div>
//                     {passwordForm.formState.errors.confirm_password && (
//                       <p className="mt-1 text-sm text-red-600">
//                         {passwordForm.formState.errors.confirm_password.message}
//                       </p>
//                     )}
//                   </div>

//                   <div className="bg-gray-50 p-4 rounded-md">
//                     <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
//                     <ul className="text-sm text-gray-600 space-y-1">
//                       <li>• At least 8 characters long</li>
//                       <li>• Include at least one uppercase letter</li>
//                       <li>• Include at least one lowercase letter</li>
//                       <li>• Include at least one number</li>
//                       <li>• Include at least one special character</li>
//                     </ul>
//                   </div>

//                   <div className="flex justify-end">
//                     <button
//                       type="submit"
//                       disabled={changePasswordMutation.isPending}
//                       className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                     >
//                       {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
//                     </button>
//                   </div>
//                 </form>

//                 {/* Two-Factor Authentication */}
//                 <div className="mt-8 pt-8 border-t border-gray-200">
//                   <h4 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
//                   <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
//                     <div className="flex">
//                       <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
//                       <div className="ml-3">
//                         <h3 className="text-sm font-medium text-blue-800">
//                           Enhanced Security Available
//                         </h3>
//                         <div className="mt-2 text-sm text-blue-700">
//                           <p>
//                             Add an extra layer of security to your account with two-factor authentication.
//                           </p>
//                         </div>
//                         <div className="mt-4">
//                           <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium py-2 px-4 rounded-md transition-colors">
//                             Enable 2FA
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeTab === 'notifications' && (
//             <div className="bg-white shadow rounded-lg">
//               <div className="px-4 py-5 sm:p-6">
//                 <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
                
//                 <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
//                   <div>
//                     <h4 className="text-sm font-medium text-gray-900 mb-4">Communication Preferences</h4>
//                     <div className="space-y-4">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">Email Notifications</label>
//                           <p className="text-sm text-gray-500">Receive notifications via email</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('email_notifications')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
//                           <p className="text-sm text-gray-500">Receive notifications via text message</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('sms_notifications')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">Push Notifications</label>
//                           <p className="text-sm text-gray-500">Receive notifications in your browser</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('push_notifications')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   <div className="border-t border-gray-200 pt-4">
//                     <h4 className="text-sm font-medium text-gray-900 mb-4">Activity Notifications</h4>
//                     <div className="space-y-4">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">New Leads</label>
//                           <p className="text-sm text-gray-500">Get notified when new leads are created</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('new_leads')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">Job Reminders</label>
//                           <p className="text-sm text-gray-500">Reminders for upcoming jobs and appointments</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('job_reminders')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">Payment Updates</label>
//                           <p className="text-sm text-gray-500">Notifications about payments and invoices</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('payment_updates')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">System Updates</label>
//                           <p className="text-sm text-gray-500">Important system updates and maintenance</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('system_updates')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>

//                       <div className="flex items-center justify-between">
//                         <div>
//                           <label className="text-sm font-medium text-gray-700">Marketing Emails</label>
//                           <p className="text-sm text-gray-500">Product updates, tips, and promotional content</p>
//                         </div>
//                         <input
//                           {...notificationForm.register('marketing_emails')}
//                           type="checkbox"
//                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex justify-end">
//                     <button
//                       type="submit"
//                       disabled={updateNotificationsMutation.isPending}
//                       className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                     >
//                       {updateNotificationsMutation.isPending ? 'Saving...' : 'Save Preferences'}
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

























// frontend/src/pages/settings/Profile.tsx
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  UserCircleIcon, 
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api, getStaticAssetUrl } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  timezone: z.string(),
  language: z.string(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function Profile() {
  const { user, updateUser, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isMobileTabView, setIsMobileTabView] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      title: user?.title || '',
      bio: user?.bio || '',
      timezone: user?.timezone || 'America/New_York',
      language: user?.language || 'en',
    },
  })

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await api.patch('/users/me', data)
      return response.data
    },
    onSuccess: (data) => {
      updateUser(data)
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || error.message || 'Failed to update profile')
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await api.post('/users/me/change-password', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      passwordForm.reset()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || error.message || 'Failed to change password')
    },
  })

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

     const response = await fetch(`${import.meta.env.VITE_API_URL || "https://storm-ai.decodersdigital.net"}/api/v1/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      return await response.json()
    },
    onSuccess: (data) => {
      updateUser({ avatar_url: data.avatar_url })
      toast.success('Profile picture updated successfully!')
      setAvatarPreview(null)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload profile picture')
    },
  })

  // Remove avatar mutation
  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/users/me/avatar')
      return response.data
    },
    onSuccess: () => {
      updateUser({ avatar_url: null })
      toast.success('Profile picture removed successfully!')
      setAvatarPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || error.message || 'Failed to remove profile picture')
    },
  })

  // Handle avatar upload
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Profile picture must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)

      uploadAvatarMutation.mutate(file)
    }
  }

  const triggerFileInput = () => fileInputRef.current?.click()
  const handleRemoveAvatar = () => {
    if (user?.avatar_url || avatarPreview) {
      removeAvatarMutation.mutate()
    }
  }

  // Generate user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data)
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ]

  // Mobile tab navigation
  const handleMobileTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setIsMobileTabView(true)
  }

  const handleBackToTabs = () => {
    setIsMobileTabView(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center">
          {isMobileTabView && (
            <button
              onClick={handleBackToTabs}
              className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {isMobileTabView 
              ? tabs.find(tab => tab.id === activeTab)?.name 
              : 'Profile Settings'
            }
          </h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:mt-6">
        {/* Mobile Tab List View */}
        {!isMobileTabView && (
          <div className="lg:hidden">
            <div className="bg-white">
              {tabs.map((tab, index) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMobileTabChange(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                      index !== tabs.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-base font-medium text-gray-900">{tab.name}</span>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:gap-6">
          {/* Desktop Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Desktop Content */}
          <div className="flex-1">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'security' && renderSecurityTab()}
          </div>
        </div>

        {/* Mobile Content */}
        {isMobileTabView && (
          <div className="lg:hidden">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'security' && renderSecurityTab()}
          </div>
        )}
      </div>
    </div>
  )

  // Profile Tab Content
  function renderProfileTab() {
    return (
      <div className="bg-white lg:shadow lg:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="hidden lg:block text-lg font-medium text-gray-900 mb-6">
            Profile Information
          </h3>
          
          {/* Profile Picture Section */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
              <div className="flex justify-center sm:justify-start">
                <div className="relative">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                    {avatarPreview || user?.avatar_url ? (
                      <img
                        src={
                          avatarPreview ||
                          (user?.avatar_url ? getStaticAssetUrl(user.avatar_url) : undefined)
                        }
                        alt="Profile Picture"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                        <span className="text-white text-xl sm:text-2xl font-semibold">
                          {getUserInitials()}
                        </span>
                      </div>
                    )}
                    {uploadAvatarMutation.isPending && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Profile Picture</h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                  JPG, PNG or GIF. Max size of 5MB. Recommended size: 400x400px.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={triggerFileInput}
                    disabled={uploadAvatarMutation.isPending}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    {uploadAvatarMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  
                  {(user?.avatar_url || avatarPreview) && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={removeAvatarMutation.isPending}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Remove
                    </button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  {...profileForm.register('name')}
                  type="text"
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  {...profileForm.register('email')}
                  type="email"
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
                {profileForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  {...profileForm.register('phone')}
                  type="tel"
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  {...profileForm.register('title')}
                  type="text"
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                  placeholder="e.g., Operations Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  {...profileForm.register('timezone')}
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Anchorage">Alaska Time</option>
                  <option value="Pacific/Honolulu">Hawaii Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  {...profileForm.register('language')}
                  className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                {...profileForm.register('bio')}
                rows={4}
                className="block w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm resize-none"
                placeholder="Tell us a little about yourself..."
              />
            </div>

            {/* Submit Button */}
            <div className="pb-20 lg:pb-0">
              <div className="fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto bg-white border-t lg:border-t-0 border-gray-200 p-4 lg:p-0 lg:flex lg:justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full lg:w-auto inline-flex justify-center py-3 lg:py-2 px-6 border border-transparent shadow-sm text-base lg:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Security Tab Content
  function renderSecurityTab() {
    return (
      <div className="bg-white lg:shadow lg:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="hidden lg:block text-lg font-medium text-gray-900 mb-6">
            Security Settings
          </h3>
          
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 lg:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password *
              </label>
              <div className="relative">
                <input
                  {...passwordForm.register('current_password')}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="block w-full px-3 py-3 lg:py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.current_password && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  {...passwordForm.register('new_password')}
                  type={showNewPassword ? 'text' : 'password'}
                  className="block w-full px-3 py-3 lg:py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.new_password && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  {...passwordForm.register('confirm_password')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="block w-full px-3 py-3 lg:py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base lg:text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordForm.formState.errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
              <ul className="text-xs lg:text-sm text-gray-600 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Include at least one uppercase letter</li>
                <li>• Include at least one lowercase letter</li>
                <li>• Include at least one number</li>
                <li>• Include at least one special character</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="pb-20 lg:pb-0">
              <div className="fixed bottom-0 left-0 right-0 lg:relative lg:bottom-auto lg:left-auto lg:right-auto bg-white border-t lg:border-t-0 border-gray-200 p-4 lg:p-0 lg:flex lg:justify-end">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full lg:w-auto inline-flex justify-center py-3 lg:py-2 px-6 border border-transparent shadow-sm text-base lg:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>

          {/* Two-Factor Authentication */}
          <div className="mt-8 pt-8 border-t border-gray-200 pb-24 lg:pb-0">
            <h4 className="text-base lg:text-lg font-medium text-gray-900 mb-4">
              Two-Factor Authentication
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <ShieldCheckIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Enhanced Security Available
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Add an extra layer of security to your account with two-factor authentication.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button className="w-full sm:w-auto bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium py-2 px-4 rounded-md transition-colors">
                      <div className="flex items-center justify-center sm:justify-start">
                        <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
                        Enable 2FA
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}