import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

interface Document {
  id: string
  title: string
  description?: string
  document_type: string
  direction: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  status: string
  customer_id?: string
  uploaded_by: string
  requires_signature: boolean
  is_signed: boolean
  signed_at?: string
  approval_required: boolean
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  expires_at?: string
  created_at: string
  updated_at: string
  tags: string[]
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email?: string
}

export default function AdminDocuments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDirection, setSelectedDirection] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState<Document | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // ✅ FIXED: Use /documents endpoint instead of /customers
  const { data: documentsData, isLoading: documentsLoading, error: documentsError } = useQuery({
    queryKey: ['admin-documents', searchTerm, selectedType, selectedStatus, selectedDirection, selectedCustomer],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (searchTerm) params.append('q', searchTerm)
      if (selectedType !== 'all') params.append('document_type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedDirection !== 'all') params.append('direction', selectedDirection)
      if (selectedCustomer !== 'all') params.append('customer_id', selectedCustomer)
      
      const response = await api.get(`/documents?${params.toString()}`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  // ✅ FIXED: Use correct endpoint for customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/contacts/')
      return Array.isArray(res.data) ? res.data : res.data?.contacts || []
    },
    refetchOnWindowFocus: false,
  })

  const documents = documentsData?.documents || []
  const documentTypes = documentsData?.document_types || []
  const statuses = documentsData?.statuses || []
  const directions = documentsData?.directions || []

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setShowUploadModal(false)
      toast.success('Document uploaded successfully!')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload document')
    },
  })

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ documentId, status, rejectionReason }: {
      documentId: string
      status: string
      rejectionReason?: string
    }) => {
      const response = await api.put(`/documents/${documentId}/approve`, {
        status,
        rejection_reason: rejectionReason
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setShowApprovalModal(null)
      setRejectionReason('')
      toast.success(`Document ${data.status} successfully!`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update document')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/documents/${documentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      toast.success('Document deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete document')
    },
  })

  // Helper functions
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    return type === 'agreement' || type === 'contract' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800'
  }

  const getDirectionLabel = (direction: string) => {
    return direction === 'admin_to_customer' ? 'To Customer' : 'From Customer'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'N/A'
    const customer = customers.find((c: Customer) => c.id === customerId)
    return customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'
  }

  // ✅ FIXED: Proper file URL handling without double /v1
  const getFileUrl = (doc: Document, download: boolean = false): string => {
    if (!doc.file_url) return '';
    
    // If it's already a full URL, use it directly
    if (doc.file_url.startsWith('http')) {
      return download ? `${doc.file_url}?download=true` : doc.file_url;
    }
    
    // Remove any leading slashes to avoid double slashes
    const cleanUrl = doc.file_url.replace(/^\//, '');
    
    // Construct the proper URL
    let url = '';
    if (cleanUrl.startsWith('api/')) {
      // If it already starts with api/, use it directly
      url = `/${cleanUrl}`;
    } else {
      // Otherwise, construct the proper API path
      url = `/api/v1/${cleanUrl}`;
    }
    
    return download ? `${url}?download=true` : url;
  };

  // ✅ FIXED: Proper download handling
  const handleDownload = async (doc: Document) => {
    try {
      const downloadUrl = getFileUrl(doc, true);
      
      if (!downloadUrl) {
        toast.error('No file available for download');
        return;
      }
      
      // Create a temporary anchor element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.file_name || `document_${doc.id}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    uploadMutation.mutate(formData)
  }

  const handleApproval = (status: string, rejectionReason?: string) => {
    if (!showApprovalModal) return
    
    approvalMutation.mutate({
      documentId: showApprovalModal.id,
      status,
      rejectionReason
    })
  }

  const handleDelete = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(documentId)
    }
  }

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expDate = new Date(expiresAt)
    const now = new Date()
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  }

  if (documentsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (documentsError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600">
            Failed to load documents. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Document Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all documents exchanged between admin and customers.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Document Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {documentTypes.map((type: string) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {statuses.map((status: string) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div>
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Directions</option>
              {directions.map((direction: string) => (
                <option key={direction} value={direction}>
                  {getDirectionLabel(direction)}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Customers</option>
              {customers.map((customer: Customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((document: Document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {document.mime_type?.startsWith('image/') ? (
                            <PhotoIcon className="h-8 w-8 text-green-500" />
                          ) : document.mime_type?.includes('pdf') ? (
                            <DocumentIcon className="h-8 w-8 text-red-500" />
                          ) : (
                            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {document.file_name}
                          </p>
                          {document.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {document.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {getCustomerName(document.customer_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(document.document_type)}`}>
                          {document.document_type}
                        </span>
                        <div className="text-xs text-gray-500">
                          {getDirectionLabel(document.direction)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(document.status)}`}>
                          {document.status}
                        </span>
                        {document.requires_signature && (
                          <div className="flex items-center text-xs text-yellow-600">
                            <PencilIcon className="h-3 w-3 mr-1" />
                            {document.is_signed ? 'Signed' : 'Signature Required'}
                          </div>
                        )}
                        {document.expires_at && isExpiringSoon(document.expires_at) && (
                          <div className="flex items-center text-xs text-red-600">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{formatFileSize(document.file_size)}</div>
                        <div className="text-xs">{document.uploaded_by}</div>
                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {document.tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="inline-flex px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                            {document.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{document.tags.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <div>
                          <div>{formatDate(document.created_at)}</div>
                          {document.approved_at && (
                            <div className="text-xs text-green-600">
                              Approved: {formatDate(document.approved_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        {document.approval_required && document.status === 'pending' && (
                          <button
                            onClick={() => setShowApprovalModal(document)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Approve/Reject"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || selectedDirection !== 'all' || selectedCustomer !== 'all'
                ? "No documents match your current filters."
                : "No documents have been uploaded yet."}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Upload First Document
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowUploadModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpload}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Upload Document
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            File
                          </label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            name="file"
                            required
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            required
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Document title"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            name="description"
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Optional description"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Document Type
                          </label>
                          <select
                            name="document_type"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="general">General</option>
                            <option value="agreement">Agreement</option>
                            <option value="contract">Contract</option>
                            <option value="invoice">Invoice</option>
                            <option value="receipt">Receipt</option>
                            <option value="id_card">ID Card</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer
                          </label>
                          <select
                            name="customer_id"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Customer (Optional)</option>
                            {customers.map((customer: Customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.first_name} {customer.last_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="requires_signature"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Requires Signature</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="approval_required"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Requires Approval</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowApprovalModal(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Approve Document: {showApprovalModal.title}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          Review this document and choose to approve or reject it.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rejection Reason (if rejecting)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Provide a reason if rejecting this document..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleApproval('approved')}
                  disabled={approvalMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {approvalMutation.isPending ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleApproval('rejected', rejectionReason)}
                  disabled={approvalMutation.isPending || (!rejectionReason.trim())}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {approvalMutation.isPending ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => setShowApprovalModal(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}