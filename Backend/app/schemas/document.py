# backend/app/schemas/document.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from fastapi import UploadFile

from app.models.document import DocumentType, DocumentStatus, DocumentDirection, DocumentAccessLevel

class DocumentBase(BaseModel):
    """Base document schema"""
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    document_type: DocumentType = Field(..., description="Document type")
    direction: DocumentDirection = Field(..., description="Document direction")
    access_level: DocumentAccessLevel = Field(default=DocumentAccessLevel.PRIVATE)
    expires_at: Optional[datetime] = Field(None, description="Expiration date")
    valid_from: Optional[datetime] = Field(None, description="Valid from date")
    related_job_id: Optional[str] = Field(None, description="Related job ID")
    related_estimate_id: Optional[str] = Field(None, description="Related estimate ID")
    related_invoice_id: Optional[str] = Field(None, description="Related invoice ID")
    tags: List[str] = Field(default_factory=list, description="Document tags")
    requires_signature: bool = Field(default=False, description="Requires signature")
    approval_required: bool = Field(default=False, description="Requires approval")

class DocumentCreate(DocumentBase):
    """Schema for creating documents"""
    customer_id: Optional[str] = Field(None, description="Customer ID for customer documents")

class DocumentUpdate(BaseModel):
    """Schema for updating documents"""
    title: Optional[str] = Field(None, description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    document_type: Optional[DocumentType] = Field(None, description="Document type")
    access_level: Optional[DocumentAccessLevel] = Field(None, description="Access level")
    expires_at: Optional[datetime] = Field(None, description="Expiration date")
    valid_from: Optional[datetime] = Field(None, description="Valid from date")
    tags: Optional[List[str]] = Field(None, description="Document tags")
    status: Optional[DocumentStatus] = Field(None, description="Document status")

class DocumentUpload(BaseModel):
    """Schema for document upload"""
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    document_type: DocumentType = Field(..., description="Document type")
    customer_id: Optional[str] = Field(None, description="Customer ID")
    expires_at: Optional[datetime] = Field(None, description="Expiration date")
    tags: List[str] = Field(default_factory=list, description="Document tags")
    requires_signature: bool = Field(default=False, description="Requires signature")

class DocumentSign(BaseModel):
    """Schema for document signing"""
    signature_data: Dict[str, Any] = Field(..., description="Signature data")

class DocumentApproval(BaseModel):
    """Schema for document approval"""
    status: DocumentStatus = Field(..., description="Approval status")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason if rejected")

class DocumentResponse(BaseModel):
    """Document response schema"""
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    
    id: str = Field(..., description="Document ID")
    company_id: str = Field(..., description="Company ID")
    customer_id: Optional[str] = Field(None, description="Customer ID")
    uploaded_by: str = Field(..., description="Uploaded by user ID")
    
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    document_type: DocumentType = Field(..., description="Document type")
    direction: DocumentDirection = Field(..., description="Document direction")
    
    file_name: str = Field(..., description="File name")
    file_url: Optional[str] = Field(None, description="File URL")
    file_size: int = Field(..., description="File size")
    mime_type: str = Field(..., description="MIME type")
    
    status: DocumentStatus = Field(..., description="Document status")
    access_level: DocumentAccessLevel = Field(..., description="Access level")
    
    expires_at: Optional[datetime] = Field(None, description="Expiration date")
    valid_from: Optional[datetime] = Field(None, description="Valid from date")
    
    related_job_id: Optional[str] = Field(None, description="Related job ID")
    related_estimate_id: Optional[str] = Field(None, description="Related estimate ID")
    related_invoice_id: Optional[str] = Field(None, description="Related invoice ID")
    
    tags: List[str] = Field(default_factory=list, description="Tags")
    
    requires_signature: bool = Field(default=False, description="Requires signature")
    is_signed: bool = Field(default=False, description="Is signed")
    signed_at: Optional[datetime] = Field(None, description="Signed at")
    signed_by: Optional[str] = Field(None, description="Signed by")
    
    approval_required: bool = Field(default=False, description="Requires approval")
    approved_by: Optional[str] = Field(None, description="Approved by")
    approved_at: Optional[datetime] = Field(None, description="Approved at")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason")
    
    version: int = Field(default=1, description="Version")
    parent_document_id: Optional[str] = Field(None, description="Parent document ID")
    
    created_at: datetime = Field(..., description="Created at")
    updated_at: datetime = Field(..., description="Updated at")

class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse]
    total: int
    page: int
    size: int
    pages: int

class DocumentSearch(BaseModel):
    """Document search parameters"""
    q: Optional[str] = Field(None, description="Search query")
    document_type: Optional[DocumentType] = Field(None, description="Document type filter")
    status: Optional[DocumentStatus] = Field(None, description="Status filter")
    direction: Optional[DocumentDirection] = Field(None, description="Direction filter")
    customer_id: Optional[str] = Field(None, description="Customer ID filter")
    uploaded_by: Optional[str] = Field(None, description="Uploaded by filter")
    expires_before: Optional[datetime] = Field(None, description="Expires before date")
    expires_after: Optional[datetime] = Field(None, description="Expires after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    created_after: Optional[datetime] = Field(None, description="Created after date")
    tags: Optional[List[str]] = Field(None, description="Tags filter")
    requires_signature: Optional[bool] = Field(None, description="Requires signature filter")
    is_signed: Optional[bool] = Field(None, description="Is signed filter")
    approval_required: Optional[bool] = Field(None, description="Approval required filter")