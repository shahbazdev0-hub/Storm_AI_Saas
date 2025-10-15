// frontend/src/services/document.service.ts
import api from './api'
export interface Document {
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
  tags: string[]
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  size: number
  pages: number
  document_types: string[]
}

export interface DocumentSearchParams {
  q?: string
  document_type?: string
  status?: string
  direction?: string
  customer_id?: string
  uploaded_by?: string
  requires_signature?: boolean
  is_signed?: boolean
  approval_required?: boolean
  skip?: number
  limit?: number
}

export interface DocumentUploadData {
  title: string
  description?: string
  document_type: string
  customer_id?: string
  expires_at?: string
  tags?: string
  requires_signature?: boolean
}

export interface DocumentUpdateData {
  title?: string
  description?: string
  document_type?: string
  access_level?: string
  expires_at?: string
  tags?: string[]
  status?: string
}

export interface DocumentSignatureData {
  signature_data: {
    signature: string
    timestamp: string
  }
}

export interface DocumentApprovalData {
  status: string
  rejection_reason?: string
}

class DocumentService {
  // Admin document methods
  async getDocuments(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
    }

    const response = await api.get(`/documents?${searchParams.toString()}`)
    return response.data
  }

  async getDocument(documentId: string): Promise<Document> {
    const response = await api.get(`/documents/${documentId}`)
    return response.data
  }

  async uploadDocument(file: File, data: DocumentUploadData): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    formData.append('document_type', data.document_type)
    if (data.customer_id) formData.append('customer_id', data.customer_id)
    if (data.expires_at) formData.append('expires_at', data.expires_at)
    if (data.tags) formData.append('tags', data.tags)
    if (data.requires_signature !== undefined) {
      formData.append('requires_signature', data.requires_signature.toString())
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async updateDocument(documentId: string, data: DocumentUpdateData): Promise<Document> {
    const response = await api.put(`/documents/${documentId}`, data)
    return response.data
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`)
  }

  async downloadDocument(documentId: string): Promise<void> {
    const response = await api.get(`/documents/${documentId}/file`, {
      responseType: 'blob',
    })
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let filename = `document_${documentId}`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  async signDocument(documentId: string, signature: string): Promise<Document> {
    const response = await api.post(`/documents/${documentId}/sign`, {
      signature_data: {
        signature,
        timestamp: new Date().toISOString()
      }
    })
    return response.data
  }

  async approveDocument(documentId: string, status: string, rejectionReason?: string): Promise<Document> {
    const response = await api.post(`/documents/${documentId}/approve`, {
      status,
      rejection_reason: rejectionReason
    })
    return response.data
  }

  // Customer portal document methods
  async getCustomerDocuments(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
    }

    const response = await api.get(`/documents/customer/my-documents?${searchParams.toString()}`)
    return response.data
  }

  async uploadCustomerDocument(file: File, data: Omit<DocumentUploadData, 'customer_id' | 'requires_signature'>): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    formData.append('document_type', data.document_type)
    if (data.tags) formData.append('tags', data.tags)

    const response = await api.post('/documents/customer/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // Utility methods
  getFileIcon(mimeType: string, documentType: string): string {
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType?.startsWith('video/')) return '🎥'
    if (mimeType?.includes('pdf')) return '📄'
    
    switch (documentType) {
      case 'invoice': return '🧾'
      case 'receipt': return '🧾'
      case 'warranty': return '🛡️'
      case 'service_report': return '📋'
      case 'contract':
      case 'agreement': return '📜'
      case 'id_card': return '🆔'
      case 'certificate': return '🏆'
      default: return '📄'
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      invoice: 'Invoice',
      receipt: 'Receipt',
      warranty: 'Warranty',
      service_report: 'Service Report',
      photo: 'Photo',
      contract: 'Contract',
      agreement: 'Agreement',
      id_card: 'ID Card',
      certificate: 'Certificate'
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  isExpiringSoon(expiresAt?: string): boolean {
    if (!expiresAt) return false
    const expiry = new Date(expiresAt)
    const today = new Date()
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays >= 0
  }

  isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false
    const expiry = new Date(expiresAt)
    const today = new Date()
    return expiry < today
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      expired: 'gray',
      archived: 'gray'
    }
    return colors[status] || 'gray'
  }

  getDirectionColor(direction: string): string {
    return direction === 'admin_to_customer' ? 'blue' : 'purple'
  }
}

export const documentService = new DocumentService()


// frontend/src/services/api.ts - Update base API configuration
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api


// frontend/src/types/document.ts - Type definitions
export interface Document {
  id: string
  title: string
  description?: string
  document_type: DocumentType
  direction: DocumentDirection
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  status: DocumentStatus
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
  tags: string[]
  created_at: string
  updated_at: string
}

export type DocumentType = 
  | 'invoice'
  | 'receipt' 
  | 'warranty'
  | 'service_report'
  | 'contract'
  | 'agreement'
  | 'id_card'
  | 'certificate'
  | 'photo'
  | 'video'
  | 'other'

export type DocumentStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'archived'

export type DocumentDirection = 
  | 'admin_to_customer'
  | 'customer_to_admin'

export interface DocumentUploadRequest {
  file: File
  title: string
  description?: string
  document_type: DocumentType
  customer_id?: string
  expires_at?: string
  tags?: string
  requires_signature?: boolean
}