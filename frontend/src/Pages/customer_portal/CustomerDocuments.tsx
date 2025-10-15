import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
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
  requires_signature: boolean
  is_signed: boolean
  signed_at?: string
  created_at: string
  updated_at: string
  tags: string[]
}

export default function CustomerDocuments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // ✅ FIXED: Use correct customer documents endpoint
  const { data: documentsData, isLoading: documentsLoading, error: documentsError } = useQuery({
    queryKey: ['customer-documents', searchTerm, selectedType, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (searchTerm) params.append('q', searchTerm)
      if (selectedType !== 'all') params.append('document_type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      
      const response = await api.get(`/documents/customer/my-documents?${params.toString()}`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  const documents = documentsData?.documents || []
  const documentTypes = documentsData?.document_types || []
  const statuses = documentsData?.statuses || []

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Add customer-specific metadata
      formData.append('direction', 'customer_to_admin')
      
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-documents'] })
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
    return direction === 'admin_to_customer' ? 'From Admin' : 'To Admin'
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
          <h1 className="text-2xl font-semibold text-gray-900">My Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your documents shared with admin.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
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
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {documents.map((document: Document) => (
              <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3 mb-3">
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
                  </div>
                </div>

                {document.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {document.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(document.document_type)}`}>
                      {document.document_type}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(document.status)}`}>
                      {document.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getDirectionLabel(document.direction)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {formatDate(document.created_at)}
                  </div>
                  <div>{formatFileSize(document.file_size)}</div>
                </div>

                {/* Signature indicator */}
                {document.requires_signature && (
                  <div className="mb-3">
                    {document.is_signed ? (
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Signed {document.signed_at && `on ${formatDate(document.signed_at)}`}
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-yellow-600">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        Signature Required
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {document.tags && document.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
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

                {/* Actions - Only Download */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleDownload(document)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' 
                ? "No documents match your current filters."
                : "Your documents will appear here once services are completed."}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Upload Document
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
                            <option value="id_card">ID Card</option>
                            <option value="invoice">Invoice</option>
                            <option value="receipt">Receipt</option>
                            <option value="insurance">Insurance Document</option>
                            <option value="permit">Permit</option>
                            <option value="other">Other</option>
                          </select>
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
    </div>
  )
}