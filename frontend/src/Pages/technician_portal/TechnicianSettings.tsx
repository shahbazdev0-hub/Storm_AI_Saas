// src/pages/technician_portal/TechnicianSettings.tsx
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserIcon,
  CogIcon,
  BellIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../services/api'

export default function TechnicianSettings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // Profile settings
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    emergency_contact: user?.emergency_contact || ''
  })
  
  // App settings
  const [appSettings, setAppSettings] = useState({
    theme: 'light',
    notifications_enabled: true,
    location_tracking_enabled: true,
    show_customer_contacts: true,
    offline_mode: false,
    auto_start_tracking: true
  })
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: true,
    new_job_assigned: true,
    job_changed: true,
    customer_message: true,
    reminder_before_job: true
  })
  
  // Active settings tab
  const [activeTab, setActiveTab] = useState('profile')
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' })
  
  // Fetch technician settings data
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['technician-settings'],
    queryFn: async () => {
      // In a real app, this would fetch from the backend
      // For this demo, we'll use the state values
      return {
        profile: profileForm,
        app_settings: appSettings,
        notification_settings: notificationSettings
      }
    },
    enabled: false // Disable auto-fetch since we're using mock data
  })
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // In a real app, this would send to the backend
      // For this demo, we'll just simulate a success
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      setStatusMessage({ 
        type: 'success', 
        message: 'Profile updated successfully' 
      })
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000)
    },
    onError: (error) => {
      setStatusMessage({ 
        type: 'error', 
        message: 'Failed to update profile' 
      })
    }
  })
  
  // Update app settings mutation
  const updateAppSettingsMutation = useMutation({
    mutationFn: async (data) => {
      // In a real app, this would send to the backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      setStatusMessage({ 
        type: 'success', 
        message: 'App settings updated successfully' 
      })
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000)
    },
    onError: (error) => {
      setStatusMessage({ 
        type: 'error', 
        message: 'Failed to update app settings' 
      })
    }
  })
  
  // Update notification settings mutation
  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (data) => {
      // In a real app, this would send to the backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      setStatusMessage({ 
        type: 'success', 
        message: 'Notification settings updated successfully' 
      })
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000)
    },
    onError: (error) => {
      setStatusMessage({ 
        type: 'error', 
        message: 'Failed to update notification settings' 
      })
    }
  })
  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle app settings changes
  const handleAppSettingChange = (name, value) => {
    setAppSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle notification settings changes
  const handleNotificationSettingChange = (name, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Submit profile form
  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileForm)
  }
  
  // Submit app settings
  const handleAppSettingsSubmit = (e) => {
    e.preventDefault()
    updateAppSettingsMutation.mutate(appSettings)
  }
  
  // Submit notification settings
  const handleNotificationSettingsSubmit = (e) => {
    e.preventDefault()
    updateNotificationSettingsMutation.mutate(notificationSettings)
  }
  
  // Toggle component
  const Toggle = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        className={`${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`${
            enabled ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        >
          <span
            className={`${
              enabled ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'
            } absolute inset-0 flex h-full w-full items-center justify-center transition-opacity`}
            aria-hidden="true"
          >
            <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
              <path
                d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className={`${
              enabled ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
            } absolute inset-0 flex h-full w-full items-center justify-center transition-opacity`}
            aria-hidden="true"
          >
            <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
              <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your profile and application settings</p>
        </div>

        {/* Status Message */}
        {statusMessage.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-green-50 text-green-800' : 
            statusMessage.type === 'error' ? 'bg-red-50 text-red-800' : 
            'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex items-center">
              {statusMessage.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : statusMessage.type === 'error' ? (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              ) : (
                <BellIcon className="h-5 w-5 mr-2" />
              )}
              {statusMessage.message}
            </div>
          </div>
        )}

        {/* Settings Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserIcon className="h-5 w-5 inline-block mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('app')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'app'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CogIcon className="h-5 w-5 inline-block mr-2" />
                App Settings
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BellIcon className="h-5 w-5 inline-block mr-2" />
                Notifications
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit}>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                        {profileForm.first_name.charAt(0)}{profileForm.last_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-900">{profileForm.first_name} {profileForm.last_name}</h3>
                        <p className="text-sm text-gray-600">{user?.role || 'Technician'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={profileForm.first_name}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={profileForm.last_name}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Home Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={profileForm.address}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        id="emergency_contact"
                        name="emergency_contact"
                        value={profileForm.emergency_contact}
                        onChange={handleProfileChange}
                        className="block w-full border border-gray-300 rounded-md p-2"
                        placeholder="Name and phone number"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateProfileMutation.isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* App Settings */}
            {activeTab === 'app' && (
              <form onSubmit={handleAppSettingsSubmit}>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Application Preferences</h3>
                    <p className="text-sm text-gray-600">
                      Configure how the application works for your specific needs
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Toggle
                      label="Enable GPS Location Tracking"
                      enabled={appSettings.location_tracking_enabled}
                      onChange={(value) => handleAppSettingChange('location_tracking_enabled', value)}
                    />
                    <div className="text-xs text-gray-500 ml-8 -mt-1">
                      Allows the app to track your location during work hours for job navigation and updates
                    </div>

                    <Toggle
                      label="Automatically Start Job Tracking"
                      enabled={appSettings.auto_start_tracking}
                      onChange={(value) => handleAppSettingChange('auto_start_tracking', value)}
                    />
                    <div className="text-xs text-gray-500 ml-8 -mt-1">
                      Start time tracking automatically when you arrive at a job location
                    </div>

                    <Toggle
                      label="Show Customer Contact Information"
                      enabled={appSettings.show_customer_contacts}
                      onChange={(value) => handleAppSettingChange('show_customer_contacts', value)}
                    />

                    <Toggle
                      label="Enable Offline Mode"
                      enabled={appSettings.offline_mode}
                      onChange={(value) => handleAppSettingChange('offline_mode', value)}
                    />
                    <div className="text-xs text-gray-500 ml-8 -mt-1">
                      Cache job data for offline access when network connection is unavailable
                    </div>

                    <div className="pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Theme
                      </label>
                      <div className="flex space-x-4">
                        <label className={`relative border rounded-md p-3 flex items-center cursor-pointer ${
                          appSettings.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="theme"
                            value="light"
                            checked={appSettings.theme === 'light'}
                            onChange={() => handleAppSettingChange('theme', 'light')}
                            className="sr-only"
                          />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow mr-2">
                            <span className="text-yellow-500">☀️</span>
                          </span>
                          <span className="text-sm font-medium">Light Mode</span>
                        </label>

                        <label className={`relative border rounded-md p-3 flex items-center cursor-pointer ${
                          appSettings.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="theme"
                            value="dark"
                            checked={appSettings.theme === 'dark'}
                            onChange={() => handleAppSettingChange('theme', 'dark')}
                            className="sr-only"
                          />
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 shadow mr-2">
                            <span>🌙</span>
                          </span>
                          <span className="text-sm font-medium">Dark Mode</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="submit"
                      disabled={updateAppSettingsMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateAppSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleNotificationSettingsSubmit}>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Notification Preferences</h3>
                    <p className="text-sm text-gray-600">
                      Choose how and when you want to receive notifications
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Notification Channels</h4>
                      <div className="space-y-4">
                        <Toggle
                          label="Push Notifications"
                          enabled={notificationSettings.push_enabled}
                          onChange={(value) => handleNotificationSettingChange('push_enabled', value)}
                        />
                        <Toggle
                          label="Email Notifications"
                          enabled={notificationSettings.email_enabled}
                          onChange={(value) => handleNotificationSettingChange('email_enabled', value)}
                        />
                        <Toggle
                          label="SMS Notifications"
                          enabled={notificationSettings.sms_enabled}
                          onChange={(value) => handleNotificationSettingChange('sms_enabled', value)}
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
                      <div className="space-y-4">
                        <Toggle
                          label="New Job Assignment"
                          enabled={notificationSettings.new_job_assigned}
                          onChange={(value) => handleNotificationSettingChange('new_job_assigned', value)}
                        />
                        <Toggle
                          label="Job Changed or Rescheduled"
                          enabled={notificationSettings.job_changed}
                          onChange={(value) => handleNotificationSettingChange('job_changed', value)}
                        />
                        <Toggle
                          label="Customer Message"
                          enabled={notificationSettings.customer_message}
                          onChange={(value) => handleNotificationSettingChange('customer_message', value)}
                        />
                        <Toggle
                          label="Job Reminder (1 hour before)"
                          enabled={notificationSettings.reminder_before_job}
                          onChange={(value) => handleNotificationSettingChange('reminder_before_job', value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="submit"
                      disabled={updateNotificationSettingsMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateNotificationSettingsMutation.isLoading ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* App Info Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Technician Mobile App</h3>
              <p className="text-sm text-gray-600">Version 1.0.0</p>
            </div>
            <div className="flex space-x-2">
              <DevicePhoneMobileIcon className="h-6 w-6 text-gray-400" />
              <ShieldCheckIcon className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>© 2025 STORM AI. All rights reserved.</p>
            <div className="mt-2 flex space-x-4">
              <button className="text-blue-600 hover:text-blue-800">Privacy Policy</button>
              <button className="text-blue-600 hover:text-blue-800">Terms of Service</button>
              <button className="text-blue-600 hover:text-blue-800">Help & Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}