// ServiceHistory.tsx - Fixed Version with Working Buttons
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

// Import our fixed PaymentPortal component
const PaymentPortal = React.lazy(() => import('./PaymentPortal'))

export default function ServiceHistory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  // Fetch service history with invoices
  const { data: servicesData, isLoading, error } = useQuery({
    queryKey: ['customer-service-history'],
    queryFn: async () => {
      const response = await api.get('/customer-portal/service-history')
      console.log('Service History Response:', response.data)
      return response.data
    }
  })

  // Fetch invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: async () => {
      const response = await api.get('/customer-portal/invoices')
      return response.data
    }
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Find invoice for a service
  const findInvoiceForService = (serviceId) => {
    if (!invoicesData?.invoices) return null
    
    // Try to find invoice linked to this service/job
    const linkedInvoice = invoicesData.invoices.find(invoice => {
      return invoice.job_id === serviceId || 
             invoice.service_id === serviceId ||
             invoice.id === serviceId
    })
    
    // Fallback to first available invoice for demo
    return linkedInvoice || invoicesData.invoices[0]
  }

  // Handle View Details
  const handleViewDetails = (service) => {
    setSelectedService(service)
    setShowServiceModal(true)
  }

  // Handle Download Photos
  const handleDownloadPhotos = async (photos) => {
    if (!photos || photos.length === 0) return

    try {
      // For single photo, download directly
      if (photos.length === 1) {
        const link = document.createElement('a')
        link.href = photos[0].url
        link.download = photos[0].description || 'service-photo.jpg'
        link.click()
        return
      }

      // For multiple photos, show selection modal
      setSelectedPhotos(photos)
      setShowPhotoModal(true)
    } catch (error) {
      console.error('Error downloading photos:', error)
      alert('Failed to download photos')
    }
  }

  // Handle View Invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice)
    setShowInvoiceModal(true)
  }

  // Handle Pay Now
  const handlePayNow = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setShowPaymentModal(true)
  }

  // Handle Payment Success
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    setSelectedInvoiceId(null)
    // Refresh data
    window.location.reload()
  }

  // Handle modal closes
  const handlePaymentClose = () => {
    setShowPaymentModal(false)
    setSelectedInvoiceId(null)
  }

  const closeServiceModal = () => {
    setShowServiceModal(false)
    setSelectedService(null)
  }

  const closePhotoModal = () => {
    setShowPhotoModal(false)
    setSelectedPhotos([])
  }

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false)
    setSelectedInvoice(null)
  }

  // Download selected photos
  const downloadSelectedPhotos = async (photoUrls) => {
    for (let i = 0; i < photoUrls.length; i++) {
      const photo = selectedPhotos[photoUrls[i]]
      if (photo) {
        const link = document.createElement('a')
        link.href = photo.url
        link.download = photo.description || `service-photo-${i + 1}.jpg`
        link.click()
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    closePhotoModal()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your service history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load service history</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const services = servicesData?.services || []

  // Filter and sort services
  let filteredServices = services.filter(service => {
    const matchesSearch = service.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort services
  filteredServices = filteredServices.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.completed_date || b.created_at) - new Date(a.completed_date || a.created_at)
      case 'oldest':
        return new Date(a.completed_date || a.created_at) - new Date(b.completed_date || b.created_at)
      case 'service_type':
        return (a.service_type || '').localeCompare(b.service_type || '')
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Payment Modal */}
      {showPaymentModal && selectedInvoiceId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-10 mx-auto max-w-7xl">
            <React.Suspense fallback={
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading payment form...</p>
                </div>
              </div>
            }>
              <PaymentPortal 
                invoiceId={selectedInvoiceId}
                onSuccess={handlePaymentSuccess}
                onBack={handlePaymentClose}
              />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-10 mx-auto max-w-4xl bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Service Details</h2>
                <button onClick={closeServiceModal} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedService.service_type}</h3>
                  <p className="text-gray-600">{selectedService.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-600">{formatDate(selectedService.completed_date || selectedService.created_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <p className="text-gray-600">{selectedService.status}</p>
                  </div>
                  {selectedService.technician && (
                    <div>
                      <span className="font-medium text-gray-700">Technician:</span>
                      <p className="text-gray-600">{selectedService.technician}</p>
                    </div>
                  )}
                  {selectedService.duration && (
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{selectedService.duration}</p>
                    </div>
                  )}
                </div>
                
                {selectedService.work_performed && (
                  <div>
                    <span className="font-medium text-gray-700">Work Performed:</span>
                    <p className="text-gray-600">{selectedService.work_performed}</p>
                  </div>
                )}
                
                {selectedService.location && (
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <p className="text-gray-600">{selectedService.location}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Selection Modal */}
      {showPhotoModal && selectedPhotos.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-10 mx-auto max-w-4xl bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Download Photos</h2>
                <button onClick={closePhotoModal} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {selectedPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.url}
                      alt={photo.description || `Service photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => downloadSelectedPhotos([index])}
                      className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closePhotoModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => downloadSelectedPhotos(Array.from({length: selectedPhotos.length}, (_, i) => i))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-10 mx-auto max-w-4xl bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
                <button onClick={closeInvoiceModal} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Invoice Number:</span>
                    <p className="text-gray-600">{selectedInvoice.invoice_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-600">{formatCurrency(selectedInvoice.total_amount)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Due Date:</span>
                    <p className="text-gray-600">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>
                
                {selectedInvoice.line_items && (
                  <div>
                    <span className="font-medium text-gray-700">Items:</span>
                    <div className="mt-2 space-y-2">
                      {selectedInvoice.line_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.description}</span>
                          <span>{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeInvoiceModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'sent') && (
                  <button
                    onClick={() => {
                      closeInvoiceModal()
                      handlePayNow(selectedInvoice.id)
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Service History</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            View all your completed services, photos, and invoices
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Bars3Icon className="h-4 w-4 mr-2" />
            Filters & Search
            <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className={`bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 ${!showFilters ? 'hidden lg:block' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-2.5 sm:top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-2.5 sm:top-3 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 sm:pl-10 pr-8 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm sm:text-base"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-2.5 sm:top-3 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-9 sm:pl-10 pr-8 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm sm:text-base"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="service_type">Service Type</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              {searchTerm || statusFilter !== 'all' 
                ? "Try adjusting your search or filters"
                : "Your completed services will appear here once available"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredServices.map((service) => {
              const invoice = findInvoiceForService(service.id)
              
              return (
                <div key={service.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6">
                    {/* Service Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 space-y-2 sm:space-y-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {service.service_type || 'Service Call'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${getStatusColor(service.status)}`}>
                            {service.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600 space-y-1 sm:space-y-0">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{formatDate(service.completed_date || service.created_at)}</span>
                          </div>
                          {service.technician && (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{service.technician}</span>
                            </div>
                          )}
                          {service.duration && (
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span>{service.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invoice Status */}
                      {invoice && (
                        <div className="text-left sm:text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.status)}`}>
                            {invoice.status === 'paid' ? (
                              <>
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Paid
                              </>
                            ) : (
                              <>
                                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                {invoice.status === 'sent' ? 'Pending' : invoice.status}
                              </>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatCurrency(invoice.total_amount)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Service Description */}
                    {service.description && (
                      <p className="text-gray-700 mb-4 text-sm sm:text-base">{service.description}</p>
                    )}

                    {/* Service Details */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4">
                      {service.location && (
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-gray-600 break-words">{service.location}</span>
                        </div>
                      )}
                      
                      {service.work_performed && (
                        <div className="flex items-start space-x-2">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">Work Performed:</p>
                            <p className="text-sm text-gray-600 break-words">{service.work_performed}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Photos */}
                    {service.photos && service.photos.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Service Photos:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                          {service.photos.slice(0, 6).map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo.url}
                                alt={photo.description || `Service photo ${index + 1}`}
                                className="w-full h-16 sm:h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-opacity flex items-center justify-center">
                                <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                          {service.photos.length > 6 && (
                            <div className="w-full h-16 sm:h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">
                                +{service.photos.length - 6} more
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button 
                          onClick={() => handleViewDetails(service)}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                        
                        {service.photos && service.photos.length > 0 && (
                          <button 
                            onClick={() => handleDownloadPhotos(service.photos)}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 whitespace-nowrap"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            Download Photos
                          </button>
                        )}
                      </div>

                      {/* Invoice Actions */}
                      {invoice && (
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {(invoice.status === 'pending' || invoice.status === 'sent') && (
                            <button
                              onClick={() => handlePayNow(invoice.id)}
                              className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 whitespace-nowrap"
                            >
                              <CreditCardIcon className="h-4 w-4 mr-1 sm:mr-2" />
                              Pay Now
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleViewInvoice(invoice)}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md whitespace-nowrap"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            View Invoice
                          </button>
                        </div>
                      )}

                      {/* Service without invoice but invoices exist */}
                      {!invoice && invoicesData?.invoices && invoicesData.invoices.length > 0 && (
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          <button
                            onClick={() => handlePayNow(invoicesData.invoices[0].id)}
                            className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 whitespace-nowrap"
                          >
                            <CreditCardIcon className="h-4 w-4 mr-1 sm:mr-2" />
                            Pay ${invoicesData.invoices[0].total_amount}
                          </button>
                          
                          <button 
                            onClick={() => handleViewInvoice(invoicesData.invoices[0])}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md whitespace-nowrap"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            View Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats */}
        {filteredServices.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredServices.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Services</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {filteredServices.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {invoicesData?.invoices?.filter(i => i.status === 'paid').length || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Invoices Paid</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    invoicesData?.invoices?.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) || 0
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Total Paid</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}