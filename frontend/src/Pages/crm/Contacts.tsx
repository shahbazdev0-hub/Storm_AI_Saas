// frontend/src/pages/crm/Contacts.tsx - RESPONSIVE VERSION

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  TrashIcon,
  Bars3Icon,
  ChevronDownIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'
import ContactForm from '../../components/forms/ContactForm'

// Updated interface to match backend
interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  secondary_phone?: string
  contact_type: 'residential' | 'commercial'
  status: 'active' | 'inactive' | 'prospect'
  address?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
  tags: string[]
  company_id: string
  created_by: string
  created_at: string
  updated_at: string
}

interface ContactCreateData {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  secondary_phone?: string
  contact_type: 'residential' | 'commercial'
  status: 'active' | 'inactive' | 'prospect'
  address?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
  tags: string[]
}

export default function Contacts() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const queryClient = useQueryClient()

  // Get contacts with proper error handling
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('contact_type', typeFilter)
      
      console.log('🔍 Fetching contacts with params:', params.toString())
      const response = await api.get(`/contacts/?${params.toString()}`)
      console.log('📞 Got contacts:', response.data)
      return response.data as Contact[]
    },
    retry: 1
  })

  // Get contact statistics
  const { data: stats } = useQuery({
    queryKey: ['contact-stats'],
    queryFn: async () => {
      const response = await api.get('/contacts/stats')
      return response.data
    }
  })

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (contactData: ContactCreateData) => {
      console.log('📝 Creating contact:', contactData)
      const response = await api.post('/contacts/', contactData)
      console.log('✅ Contact created:', response.data)
      return response.data
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] })
      setShowCreateModal(false)
      toast.success(`Contact ${newContact.first_name} ${newContact.last_name} created successfully!`)
    },
    onError: (error: any) => {
      console.error('❌ Error creating contact:', error)
      toast.error(error.response?.data?.detail || 'Failed to create contact')
    },
  })

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      console.log('🗑️ Deleting contact:', contactId)
      await api.delete(`/contacts/${contactId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] })
      toast.success('Contact deleted successfully!')
    },
    onError: (error: any) => {
      console.error('❌ Error deleting contact:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete contact')
    },
  })

  const handleCreateContact = (contactData: ContactCreateData) => {
    createContactMutation.mutate(contactData)
  }

  const handleDeleteContact = (contactId: string, contactName: string) => {
    if (window.confirm(`Are you sure you want to delete ${contactName}?`)) {
      deleteContactMutation.mutate(contactId)
    }
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading contacts
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load contacts. Please check your connection and try again.</p>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your customer database and contact information.
          </p>
          
          {/* Stats - Mobile: Stacked, Desktop: Inline */}
          {stats && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                Total: {stats.total_contacts}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Active: {stats.active_contacts}
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                Prospects: {stats.prospects}
              </span>
            </div>
          )}
        </div>
        
        {/* Add Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center bg-blue-600 px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto justify-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Contact
        </button>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Filters & Search
          <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className={`bg-white shadow rounded-lg p-4 sm:p-6 ${!showFilters ? 'hidden lg:block' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        {/* View Mode Toggle (Desktop Only) */}
        <div className="hidden sm:flex justify-end mt-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Bars3Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <UserGroupIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Display */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-4 sm:p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : contacts && contacts.length > 0 ? (
          viewMode === 'list' ? (
            // List View
            <ul className="divide-y divide-gray-200">
              {contacts.map((contact: Contact) => (
                <li key={contact.id}>
                  <div className="px-4 py-4 sm:px-6">
                    {/* Mobile Layout: Stacked */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {contact.first_name?.[0]?.toUpperCase() || '?'}{contact.last_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Contact Info */}
                        <div className="min-w-0 flex-1">
                          {/* Name and Badges */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                contact.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : contact.status === 'inactive'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {contact.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                contact.contact_type === 'residential'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {contact.contact_type}
                              </span>
                            </div>
                          </div>
                          
                          {/* Contact Details */}
                          <div className="mt-1 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
                            {contact.email && (
                              <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-sm text-gray-500">{contact.phone}</p>
                            )}
                            {contact.city && contact.state && (
                              <p className="text-sm text-gray-500 truncate">{contact.city}, {contact.state}</p>
                            )}
                          </div>
                          
                          {/* Tags */}
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex items-center mt-2 space-x-1 flex-wrap gap-1">
                              {contact.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{contact.tags.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                        <button
                          onClick={() => setSelectedContact(contact)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id, `${contact.first_name} ${contact.last_name}`)}
                          disabled={deleteContactMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {deleteContactMutation.isPending ? 'Deleting...' : 'Delete'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            // Grid View (Desktop Only)
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
              {contacts.map((contact: Contact) => (
                <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {contact.first_name?.[0]?.toUpperCase() || '?'}{contact.last_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex space-x-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        contact.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : contact.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {contact.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        contact.contact_type === 'residential'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {contact.contact_type}
                      </span>
                    </div>
                    
                    {contact.phone && (
                      <p className="text-xs text-gray-500">{contact.phone}</p>
                    )}
                    
                    {contact.city && contact.state && (
                      <p className="text-xs text-gray-500 truncate">{contact.city}, {contact.state}</p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedContact(contact)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, `${contact.first_name} ${contact.last_name}`)}
                      disabled={deleteContactMutation.isPending}
                      className="inline-flex items-center px-2 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Empty state
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <UserGroupIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters or search term.'
                : 'Get started by creating a new contact.'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Contact"
        size="lg"
      >
        <ContactForm
          onSubmit={handleCreateContact}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createContactMutation.isPending}
        />
      </Modal>

      {/* View Contact Modal */}
      {selectedContact && (
        <Modal
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
          title={`${selectedContact.first_name} ${selectedContact.last_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedContact.first_name} {selectedContact.last_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedContact.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : selectedContact.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedContact.status}
                </span>
              </div>
              {selectedContact.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900 break-words">{selectedContact.email}</p>
                </div>
              )}
              {selectedContact.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedContact.phone}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedContact.contact_type}</p>
              </div>
              {selectedContact.secondary_phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Secondary Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedContact.secondary_phone}</p>
                </div>
              )}
              {selectedContact.address && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900 break-words">
                    {selectedContact.address}
                    {selectedContact.city && `, ${selectedContact.city}`}
                    {selectedContact.state && `, ${selectedContact.state}`}
                    {selectedContact.zip_code && ` ${selectedContact.zip_code}`}
                  </p>
                </div>
              )}
              {selectedContact.notes && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900 break-words">{selectedContact.notes}</p>
                </div>
              )}
              {selectedContact.tags && selectedContact.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedContact.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
              Created: {new Date(selectedContact.created_at).toLocaleDateString()}
              {selectedContact.updated_at !== selectedContact.created_at && (
                <> • Updated: {new Date(selectedContact.updated_at).toLocaleDateString()}</>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}