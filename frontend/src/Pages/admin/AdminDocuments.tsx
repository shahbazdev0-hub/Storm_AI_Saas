import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
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
  customer_email?: string
  uploaded_by_email: string
  requires_signature: boolean
  is_signed: boolean
  signed_at?: string
  approval_required: boolean
  approved_by_email?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  tags: string[]
}

interface Customer {
  id: string
  email: string
  name: string
}

export default function AdminDocuments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDirection, setSelectedDirection] = useState<string>('all')
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState<Document | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // ✅ SIMPLE: Fetch documents with customer emails from documents
  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['admin-documents', searchTerm, selectedType, selectedStatus, selectedDirection, selectedCustomerEmail],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (searchTerm) params.append('q', searchTerm)
      if (selectedType !== 'all') params.append('document_type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedDirection !== 'all') params.append('direction', selectedDirection)
      if (selectedCustomerEmail !== 'all') params.append('customer_email', selectedCustomerEmail)
      
      const response = await api.get(`/documents?${params.toString()}`)
      return response.data
    },
  })

  const documents = documentsData?.documents || []
  const documentTypes = documentsData?.document_types || []
  const statuses = documentsData?.statuses || []
  const directions = documentsData?.directions || []
  const customers = documentsData?.customers || [] // Simple list with emails

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      setShowUploadModal(false)
      toast.success('Document uploaded successfully!')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload document')
    },
  })

  const approvalMutation = useMutation({
    mutationFn: async ({ documentId, status, rejectionReason }: any) => {
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const handleDownload = async (doc: Document) => {
    try {
      const link = document.createElement('a')
      link.href = `/api/v1/documents/${doc.id}/file?download=true`
      link.download = doc.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      toast.error('Failed to download document')
    }
  }

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    uploadMutation.mutate(formData)
  }

  const handleApproval = (status: string) => {
    if (!showApprovalModal) return
    approvalMutation.mutate({
      documentId: showApprovalModal.id,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined
    })
  }

  const handleDelete = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(documentId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600">Failed to load documents. Please try again later.</p>
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
            Manage all documents exchanged with customers.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Types</option>
            {documentTypes.map((type: string) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status: string) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedCustomerEmail}
            onChange={(e) => setSelectedCustomerEmail(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Customers</option>
            {customers.map((customer: Customer) => (
              <option key={customer.email} value={customer.email}>
                {customer.name} ({customer.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc: Document) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {doc.mime_type?.startsWith('image/') ? (
                          <PhotoIcon className="h-8 w-8 text-green-500" />
                        ) : doc.mime_type?.includes('pdf') ? (
                          <DocumentIcon className="h-8 w-8 text-red-500" />
                        ) : (
                          <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">{doc.file_name}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-400 mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{doc.uploaded_by_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(doc.document_type)}`}>
                        {doc.document_type}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {getDirectionLabel(doc.direction)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(doc.status)}`}>
                        {doc.status}
                      </span>
                      {doc.requires_signature && (
                        <div className="flex items-center text-xs text-yellow-600 mt-1">
                          <PencilIcon className="h-3 w-3 mr-1" />
                          {doc.is_signed ? 'Signed' : 'Needs Signature'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>{formatDate(doc.created_at)}</div>
                        <div className="text-xs">{formatFileSize(doc.file_size)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        {doc.approval_required && doc.status === 'pending' && (
                          <button
                            onClick={() => setShowApprovalModal(doc)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Approve/Reject"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
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
          <div className="p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' ? "No documents match your filters." : "No documents uploaded yet."}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowUploadModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <form onSubmit={handleUpload}>
                <div className="px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="file"
                        required
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Document title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select name="document_type" className="block w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="general">General</option>
                        <option value="agreement">Agreement</option>
                        <option value="contract">Contract</option>
                        <option value="invoice">Invoice</option>
                        <option value="receipt">Receipt</option>
                        <option value="id_card">ID Card</option>
                        <option value="permit">Permit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email (Optional)</label>
                      <input
                        type="email"
                        name="customer_email"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="customer@email.com"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input type="checkbox" name="requires_signature" className="h-4 w-4 text-blue-600 rounded" />
                        <span className="ml-2 text-sm text-gray-700">Requires Signature</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" name="approval_required" className="h-4 w-4 text-blue-600 rounded" />
                        <span className="ml-2 text-sm text-gray-700">Requires Approval</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
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
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowApprovalModal(null)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Approve Document: {showApprovalModal.title}
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Review this document and approve or reject it.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Provide a reason if rejecting..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproval('rejected')}
                  disabled={approvalMutation.isPending || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {approvalMutation.isPending ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleApproval('approved')}
                  disabled={approvalMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {approvalMutation.isPending ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}