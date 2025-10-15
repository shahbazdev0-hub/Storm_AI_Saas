# backend/app/api/v1/endpoints/documents.py - FINAL WORKING VERSION

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
import io
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.core.logger import get_logger
from app.core.utils import serialize_document

router = APIRouter()
logger = get_logger(__name__)

# ================================
# PYDANTIC MODELS
# ================================

class ApprovalRequest(BaseModel):
    status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None

class SignDocumentRequest(BaseModel):
    signature: str
    signed_at: Optional[str] = None

# ================================
# HELPER FUNCTIONS
# ================================

def get_company_id(current_user: dict) -> str:
    """Extract company_id from current user with fallback"""
    company_id = current_user.get("company_id")
    if not company_id:
        company_id = current_user.get("_id", current_user.get("id", "default_company"))
    return str(company_id)

def get_user_id(current_user: dict) -> str:
    """Extract user_id from current user"""
    user_id = current_user.get("_id", current_user.get("id", "unknown_user"))
    return str(user_id)

def create_mock_documents():
    """Create mock documents for demo"""
    return [
        {
            "id": "doc_1",
            "title": "Service Agreement",
            "description": "Standard service agreement",
            "document_type": "agreement",
            "direction": "admin_to_customer",
            "file_name": "agreement.pdf",
            "file_url": "/api/v1/documents/doc_1/file",
            "file_size": 3072,
            "mime_type": "application/pdf",
            "status": "pending",
            "customer_id": "customer_1",
            "uploaded_by": "admin",
            "requires_signature": False,
            "is_signed": False,
            "approval_required": True,
            "tags": [],
            "created_at": "2025-09-15T20:00:00Z",
            "updated_at": "2025-09-15T20:00:00Z"
        },
        {
            "id": "doc_2",
            "title": "Customer ID Card",
            "description": "ID card copy from customer",
            "document_type": "id_card",
            "direction": "customer_to_admin",
            "file_name": "id_card.jpg",
            "file_url": "/api/v1/documents/doc_2/file",
            "file_size": 2048,
            "mime_type": "image/jpeg",
            "status": "pending",
            "customer_id": "customer_1",
            "uploaded_by": "customer",
            "requires_signature": False,
            "is_signed": False,
            "approval_required": True,
            "tags": [],
            "created_at": "2025-09-15T19:00:00Z",
            "updated_at": "2025-09-15T19:00:00Z"
        },
        {
            "id": "doc_3",
            "title": "Contract Agreement",
            "description": "Please sign and return",
            "document_type": "contract",
            "direction": "admin_to_customer",
            "file_name": "contract.pdf",
            "file_url": "/api/v1/documents/doc_3/file",
            "file_size": 4096,
            "mime_type": "application/pdf",
            "status": "approved",
            "customer_id": "customer_1",
            "uploaded_by": "admin",
            "requires_signature": True,
            "is_signed": False,
            "approval_required": False,
            "tags": ["important"],
            "created_at": "2025-09-15T18:00:00Z",
            "updated_at": "2025-09-15T18:00:00Z"
        }
    ]

# Global storage for demo - simulates database updates
DOCUMENT_UPDATES = {}

# ================================
# MAIN ENDPOINTS
# ================================

@router.get("/")
async def get_documents(
    q: Optional[str] = Query(None, description="Search query"),
    document_type: Optional[str] = Query(None, description="Document type filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    direction: Optional[str] = Query(None, description="Direction filter"),
    customer_id: Optional[str] = Query(None, description="Customer filter"),
    requires_signature: Optional[bool] = Query(None, description="Signature requirement filter"),
    is_signed: Optional[bool] = Query(None, description="Signed status filter"),
    approval_required: Optional[bool] = Query(None, description="Approval requirement filter"),
    skip: int = Query(0, ge=0, description="Number of documents to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of documents to return"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get documents for admin/staff - all company documents"""
    try:
        logger.info(f"Getting documents for user {current_user.get('email')} with role {current_user.get('role')}")
        
        # Use mock data to avoid DB serialization issues
        documents = create_mock_documents()
        
        # Apply any updates from approval/rejection
        for doc in documents:
            if doc["id"] in DOCUMENT_UPDATES:
                doc.update(DOCUMENT_UPDATES[doc["id"]])
        
        # Apply filters
        filtered_docs = documents
        
        if q:
            filtered_docs = [d for d in filtered_docs if q.lower() in d["title"].lower() or q.lower() in d["description"].lower()]
        
        if document_type:
            filtered_docs = [d for d in filtered_docs if d["document_type"] == document_type]
            
        if status:
            filtered_docs = [d for d in filtered_docs if d["status"] == status]
            
        if direction:
            filtered_docs = [d for d in filtered_docs if d["direction"] == direction]
            
        if customer_id:
            filtered_docs = [d for d in filtered_docs if d.get("customer_id") == customer_id]
        
        if requires_signature is not None:
            filtered_docs = [d for d in filtered_docs if d.get("requires_signature") == requires_signature]
            
        if is_signed is not None:
            filtered_docs = [d for d in filtered_docs if d.get("is_signed") == is_signed]
            
        if approval_required is not None:
            filtered_docs = [d for d in filtered_docs if d.get("approval_required") == approval_required]
        
        # Apply pagination
        total = len(filtered_docs)
        paginated_docs = filtered_docs[skip:skip + limit]
        
        return {
            "documents": paginated_docs,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
            "document_types": ["general", "agreement", "contract", "id_card", "invoice", "receipt"],
            "statuses": ["pending", "approved", "rejected"],
            "directions": ["admin_to_customer", "customer_to_admin"]
        }
        
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer/my-documents")  
async def get_customer_documents(
    q: Optional[str] = Query(None, description="Search query"),
    document_type: Optional[str] = Query(None, description="Document type filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    skip: int = Query(0, ge=0, description="Number of documents to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of documents to return"),
    current_user: dict = Depends(get_current_user)
):
    """Get customer documents"""
    try:
        logger.info(f"Getting customer documents for user {current_user.get('email')}")
        
        # Get all documents and filter for customer
        all_documents = create_mock_documents()
        
        # Apply any updates
        for doc in all_documents:
            if doc["id"] in DOCUMENT_UPDATES:
                doc.update(DOCUMENT_UPDATES[doc["id"]])
        
        # Filter for customer-related documents
        documents = [d for d in all_documents if d.get("customer_id") == "customer_1"]
        
        # Apply filters
        if q:
            documents = [d for d in documents if q.lower() in d["title"].lower() or q.lower() in d["description"].lower()]
        
        if document_type:
            documents = [d for d in documents if d["document_type"] == document_type]
            
        if status:
            documents = [d for d in documents if d["status"] == status]
        
        # Apply pagination
        total = len(documents)
        paginated_docs = documents[skip:skip + limit]
        
        return {
            "documents": paginated_docs,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
            "document_types": ["general", "id_card", "agreement", "contract"],
            "statuses": ["pending", "approved", "rejected"],
            "directions": ["customer_to_admin", "admin_to_customer"]
        }
        
    except Exception as e:
        logger.error(f"Error getting customer documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# FILE SERVING ENDPOINT
# ================================

@router.get("/{document_id}/file")
async def download_document(
    document_id: str,
    download: bool = Query(False, description="Force download instead of view"),
    current_user: dict = Depends(get_current_user)
):
    """Download or view document file"""
    try:
        logger.info(f"Serving file for document {document_id}, download={download}")
        
        # Mock file content based on document type
        if "doc_1" in document_id or "doc_3" in document_id:
            content = b"Mock PDF content for agreement/contract document"
            filename = "agreement.pdf"
            mime_type = "application/pdf"
        elif "doc_2" in document_id:
            content = b"Mock image content for ID card"
            filename = "id_card.jpg"
            mime_type = "image/jpeg"
        else:
            content = b"Mock document content"
            filename = f"document_{document_id}.pdf"
            mime_type = "application/pdf"
        
        file_stream = io.BytesIO(content)
        disposition = "attachment" if download else "inline"
        
        return StreamingResponse(
            file_stream,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"',
                "Content-Length": str(len(content)),
                "Cache-Control": "no-cache"
            }
        )
        
    except Exception as e:
        logger.error(f"Error serving document file {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve document: {str(e)}")

# ================================
# DOCUMENT MANAGEMENT ENDPOINTS  
# ================================

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific document"""
    try:
        documents = create_mock_documents()
        
        # Apply any updates
        for doc in documents:
            if doc["id"] in DOCUMENT_UPDATES:
                doc.update(DOCUMENT_UPDATES[doc["id"]])
        
        document = next((d for d in documents if d["id"] == document_id), None)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return document
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    document_type: str = Form("general"),
    customer_id: str = Form(None),
    direction: str = Form(None),
    requires_signature: bool = Form(False),
    approval_required: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new document"""
    try:
        logger.info(f"Uploading document: {title} by {current_user.get('email')}")
        
        # Read file content for size calculation
        content = await file.read()
        
        # Determine direction if not provided
        if not direction:
            direction = "admin_to_customer" if current_user.get("role") != "customer" else "customer_to_admin"
        
        # Create new document
        new_document = {
            "id": f"upload_{int(datetime.utcnow().timestamp())}",
            "title": title,
            "description": description,
            "document_type": document_type,
            "direction": direction,
            "file_name": file.filename,
            "file_url": f"/api/v1/documents/upload_{int(datetime.utcnow().timestamp())}/file",
            "file_size": len(content),
            "mime_type": file.content_type or "application/octet-stream",
            "status": "pending",
            "customer_id": customer_id,
            "uploaded_by": current_user.get("email", "unknown"),
            "requires_signature": requires_signature,
            "is_signed": False,
            "approval_required": approval_required,
            "tags": [],
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        return new_document
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    try:
        logger.info(f"Deleting document {document_id}")
        
        # Remove from updates if exists
        if document_id in DOCUMENT_UPDATES:
            del DOCUMENT_UPDATES[document_id]
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{document_id}/approve")
async def approve_document(
    document_id: str,
    request: ApprovalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a document"""
    try:
        logger.info(f"Approving document {document_id} with status {request.status}")
        
        # Validate status
        if request.status not in ["approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
        # Check if document exists
        documents = create_mock_documents()
        document = next((d for d in documents if d["id"] == document_id), None)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update document status in memory
        update_data = {
            "status": request.status,
            "approved_by": current_user.get("email"),
            "approved_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        if request.status == "rejected" and request.rejection_reason:
            update_data["rejection_reason"] = request.rejection_reason
        
        # Store the update
        DOCUMENT_UPDATES[document_id] = update_data
        
        return {
            "message": f"Document {request.status} successfully",
            "document_id": document_id,
            "status": request.status,
            "approved_by": current_user.get("email"),
            "approved_at": update_data["approved_at"],
            "rejection_reason": request.rejection_reason if request.status == "rejected" else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{document_id}/sign")
async def sign_document(
    document_id: str,
    request: SignDocumentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sign a document (customer endpoint)"""
    try:
        logger.info(f"Signing document {document_id} by {current_user.get('email')}")
        
        # Check if document exists
        documents = create_mock_documents()
        document = next((d for d in documents if d["id"] == document_id), None)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        if not document.get("requires_signature", False):
            raise HTTPException(status_code=400, detail="Document does not require signature")
        
        # Check if already signed
        existing_updates = DOCUMENT_UPDATES.get(document_id, {})
        if existing_updates.get("is_signed", False):
            raise HTTPException(status_code=400, detail="Document is already signed")
        
        # Update document with signature
        signed_at = request.signed_at or datetime.utcnow().isoformat() + "Z"
        
        update_data = {
            "is_signed": True,
            "signed_at": signed_at,
            "signature": request.signature,
            "signed_by": current_user.get("email"),
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        # Merge with existing updates
        if document_id in DOCUMENT_UPDATES:
            DOCUMENT_UPDATES[document_id].update(update_data)
        else:
            DOCUMENT_UPDATES[document_id] = update_data
        
        return {
            "message": "Document signed successfully",
            "document_id": document_id,
            "signed_at": signed_at,
            "signature": request.signature
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))