# backend/app/api/v1/endpoints/documents.py - CLEAN VERSION

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

router = APIRouter()
logger = get_logger(__name__)

# ================================
# PYDANTIC MODELS
# ================================

class ApprovalRequest(BaseModel):
    status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    description: str
    document_type: str
    direction: str
    file_name: str
    file_url: str
    file_size: int
    mime_type: str
    status: str
    customer_id: Optional[str] = None
    uploaded_by: str
    requires_signature: bool = False
    is_signed: bool = False
    approval_required: bool = False
    tags: List[str] = []
    created_at: str
    updated_at: str

# ================================
# HELPER FUNCTIONS
# ================================

def convert_objectid_to_str(obj):
    """Convert ObjectId to string recursively"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_objectid_to_str(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid_to_str(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat() + "Z"
    return obj

def get_mock_documents():
    """Return mock documents for demo purposes"""
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
            "status": "approved",
            "customer_id": "customer_1",
            "uploaded_by": "admin",
            "requires_signature": False,
            "is_signed": False,
            "approval_required": False,
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
            "status": "pending",
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

# ================================
# MAIN ENDPOINTS
# ================================

@router.get("/")
async def get_documents(
    q: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get documents for admin/staff"""
    try:
        logger.info(f"Getting documents for user {current_user.get('email')}")
        
        # For now, use mock data to avoid DB issues
        documents = get_mock_documents()
        
        # Apply filters
        if q:
            documents = [d for d in documents if q.lower() in d["title"].lower() or q.lower() in d["description"].lower()]
        
        if document_type:
            documents = [d for d in documents if d["document_type"] == document_type]
            
        if status:
            documents = [d for d in documents if d["status"] == status]
            
        if direction:
            documents = [d for d in documents if d["direction"] == direction]
            
        if customer_id:
            documents = [d for d in documents if d.get("customer_id") == customer_id]
        
        # Apply pagination
        total = len(documents)
        paginated_docs = documents[skip:skip + limit]
        
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
    q: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Get customer documents"""
    try:
        logger.info(f"Getting customer documents for user {current_user.get('email')}")
        
        # Filter documents for customer view
        all_documents = get_mock_documents()
        documents = [d for d in all_documents if d.get("customer_id") == "customer_1"]  # Mock customer filter
        
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

@router.get("/{document_id}/file")
async def download_document(
    document_id: str,
    download: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Download document file - mock implementation"""
    try:
        logger.info(f"Serving file for document {document_id}")
        
        # Mock file content
        mock_content = f"Mock file content for document {document_id}".encode()
        file_stream = io.BytesIO(mock_content)
        
        disposition = "attachment" if download else "inline"
        
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'{disposition}; filename="document_{document_id}.pdf"',
                "Content-Length": str(len(mock_content))
            }
        )
        
    except Exception as e:
        logger.error(f"Error serving document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific document"""
    try:
        documents = get_mock_documents()
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
    """Upload a new document - mock implementation"""
    try:
        logger.info(f"Mock upload: {title} by {current_user.get('email')}")
        
        # Read file content (but don't save for mock)
        content = await file.read()
        
        # Create mock document response
        new_document = {
            "id": f"upload_{int(datetime.utcnow().timestamp())}",
            "title": title,
            "description": description,
            "document_type": document_type,
            "direction": direction or "admin_to_customer",
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
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document - mock implementation"""
    try:
        logger.info(f"Mock delete document {document_id}")
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
    """Approve or reject a document - mock implementation"""
    try:
        logger.info(f"Mock approve document {document_id} with status {request.status}")
        
        if request.status not in ["approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
        return {
            "message": f"Document {request.status} successfully",
            "document_id": document_id,
            "status": request.status,
            "approved_by": current_user.get("email"),
            "approved_at": datetime.utcnow().isoformat() + "Z",
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
    signature_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Sign a document - mock implementation"""
    try:
        logger.info(f"Mock sign document {document_id}")
        
        return {
            "message": "Document signed successfully",
            "document_id": document_id,
            "signed_at": datetime.utcnow().isoformat() + "Z",
            "signature": signature_data.get("signature", "")
        }
        
    except Exception as e:
        logger.error(f"Error signing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))