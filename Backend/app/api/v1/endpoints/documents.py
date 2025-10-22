# # backend/app/api/v1/endpoints/documents.py - FIXED VERSION

# from typing import Any, List, Optional
# from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
# from fastapi.responses import StreamingResponse
# from motor.motor_asyncio import AsyncIOMotorDatabase
# from bson import ObjectId
# from datetime import datetime
# from pydantic import BaseModel
# import io
# import logging
# import aiofiles
# import os
# from pathlib import Path

# from app.core.database import get_database
# from app.dependencies.auth import get_current_user
# from app.core.logger import get_logger
# from app.core.utils import serialize_document

# router = APIRouter()
# logger = get_logger(__name__)

# # File upload configuration
# UPLOAD_DIR = Path("uploads/documents")
# UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# # ================================
# # PYDANTIC MODELS
# # ================================

# class ApprovalRequest(BaseModel):
#     status: str  # "approved" or "rejected"
#     rejection_reason: Optional[str] = None

# class SignDocumentRequest(BaseModel):
#     signature: str
#     signed_at: Optional[str] = None

# # ================================
# # HELPER FUNCTIONS
# # ================================

# def get_company_id(current_user: dict) -> str:
#     """Extract company_id from current user with fallback"""
#     company_id = current_user.get("company_id")
#     if not company_id:
#         company_id = current_user.get("_id", current_user.get("id", "default_company"))
#     return str(company_id)

# def get_user_id(current_user: dict) -> str:
#     """Extract user_id from current user"""
#     user_id = current_user.get("_id", current_user.get("id", "unknown_user"))
#     return str(user_id)

# async def save_upload_file(file: UploadFile, filename: str) -> str:
#     """Save uploaded file and return file path"""
#     file_path = UPLOAD_DIR / filename
    
#     async with aiofiles.open(file_path, 'wb') as f:
#         content = await file.read()
#         await f.write(content)
    
#     return str(file_path)

# # ================================
# # MAIN ENDPOINTS
# # ================================

# @router.get("/")
# async def get_documents(
#     q: Optional[str] = Query(None, description="Search query"),
#     document_type: Optional[str] = Query(None, description="Document type filter"),
#     status: Optional[str] = Query(None, description="Status filter"),
#     direction: Optional[str] = Query(None, description="Direction filter"),
#     customer_id: Optional[str] = Query(None, description="Customer filter"),
#     requires_signature: Optional[bool] = Query(None, description="Signature requirement filter"),
#     is_signed: Optional[bool] = Query(None, description="Signed status filter"),
#     approval_required: Optional[bool] = Query(None, description="Approval requirement filter"),
#     skip: int = Query(0, ge=0, description="Number of documents to skip"),
#     limit: int = Query(100, ge=1, le=1000, description="Number of documents to return"),
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Get documents for admin/staff - all company documents"""
#     try:
#         logger.info(f"Getting documents for user {current_user.get('email')} with role {current_user.get('role')}")
        
#         company_id = get_company_id(current_user)
        
#         # Build query
#         query = {"company_id": company_id}
        
#         if q:
#             query["$or"] = [
#                 {"title": {"$regex": q, "$options": "i"}},
#                 {"description": {"$regex": q, "$options": "i"}},
#                 {"file_name": {"$regex": q, "$options": "i"}}
#             ]
        
#         if document_type:
#             query["document_type"] = document_type
            
#         if status:
#             query["status"] = status
            
#         if direction:
#             query["direction"] = direction
            
#         if customer_id:
#             query["customer_id"] = customer_id
        
#         if requires_signature is not None:
#             query["requires_signature"] = requires_signature
            
#         if is_signed is not None:
#             query["is_signed"] = is_signed
            
#         if approval_required is not None:
#             query["approval_required"] = approval_required
        
#         # Get total count
#         total = await db.documents.count_documents(query)
        
#         # Get documents with pagination
#         cursor = db.documents.find(query).skip(skip).limit(limit).sort("created_at", -1)
#         documents = await cursor.to_list(length=limit)
        
#         # Serialize documents
#         serialized_docs = [serialize_document(doc) for doc in documents]
        
#         # Get distinct values for filters
#         document_types = await db.documents.distinct("document_type", {"company_id": company_id})
#         statuses = await db.documents.distinct("status", {"company_id": company_id})
#         directions = ["admin_to_customer", "customer_to_admin"]
        
#         # ✅ FIXED: Get customers from users collection with role="customer"
#         customers_cursor = db.users.find({
#             "company_id": company_id,
#             "role": "customer",
#             "status": "active"
#         }).sort("first_name", 1)
        
#         customers_list = await customers_cursor.to_list(length=None)
#         customers = [serialize_document(customer) for customer in customers_list]
        
#         return {
#             "documents": serialized_docs,
#             "total": total,
#             "page": (skip // limit) + 1,
#             "size": limit,
#             "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
#             "document_types": document_types,
#             "statuses": statuses,
#             "directions": directions,
#             "customers": customers  # ✅ Return customers list for filter dropdown
#         }
        
#     except Exception as e:
#         logger.error(f"Error getting documents: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/customer/my-documents")  
# async def get_customer_documents(
#     q: Optional[str] = Query(None, description="Search query"),
#     document_type: Optional[str] = Query(None, description="Document type filter"),
#     status: Optional[str] = Query(None, description="Status filter"),
#     skip: int = Query(0, ge=0, description="Number of documents to skip"),
#     limit: int = Query(100, ge=1, le=1000, description="Number of documents to return"),
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Get customer documents"""
#     try:
#         logger.info(f"Getting customer documents for user {current_user.get('email')}")
        
#         company_id = get_company_id(current_user)
#         user_id = get_user_id(current_user)
        
#         # Build query - get documents where user is the customer
#         query = {
#             "company_id": company_id,
#             "$or": [
#                 {"customer_id": user_id},
#                 {"uploaded_by": user_id}
#             ]
#         }
        
#         if q:
#             query["$and"] = [
#                 query,
#                 {
#                     "$or": [
#                         {"title": {"$regex": q, "$options": "i"}},
#                         {"description": {"$regex": q, "$options": "i"}},
#                         {"file_name": {"$regex": q, "$options": "i"}}
#                     ]
#                 }
#             ]
        
#         if document_type:
#             query["document_type"] = document_type
            
#         if status:
#             query["status"] = status
        
#         # Get total count
#         total = await db.documents.count_documents(query)
        
#         # Get documents with pagination
#         cursor = db.documents.find(query).skip(skip).limit(limit).sort("created_at", -1)
#         documents = await cursor.to_list(length=limit)
        
#         # Serialize documents
#         serialized_docs = [serialize_document(doc) for doc in documents]
        
#         # Get distinct values for filters
#         document_types = await db.documents.distinct("document_type", query)
#         statuses = await db.documents.distinct("status", query)
        
#         return {
#             "documents": serialized_docs,
#             "total": total,
#             "page": (skip // limit) + 1,
#             "size": limit,
#             "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
#             "document_types": document_types if document_types else ["general", "id_card", "invoice", "receipt"],
#             "statuses": statuses if statuses else ["pending", "approved", "rejected"],
#             "directions": ["customer_to_admin", "admin_to_customer"]
#         }
        
#     except Exception as e:
#         logger.error(f"Error getting customer documents: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# # ================================
# # FILE SERVING ENDPOINT
# # ================================

# @router.get("/{document_id}/file")
# async def download_document(
#     document_id: str,
#     download: bool = Query(False, description="Force download instead of view"),
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Download or view document file"""
#     try:
#         logger.info(f"Serving file for document {document_id}, download={download}")
        
#         # Get document from database
#         document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
#         if not document:
#             raise HTTPException(status_code=404, detail="Document not found")
        
#         # Check if file exists
#         file_path = document.get("file_path")
#         if not file_path or not os.path.exists(file_path):
#             raise HTTPException(status_code=404, detail="File not found")
        
#         # Read file
#         async with aiofiles.open(file_path, 'rb') as f:
#             content = await f.read()
        
#         file_stream = io.BytesIO(content)
#         disposition = "attachment" if download else "inline"
#         filename = document.get("file_name", "document")
#         mime_type = document.get("mime_type", "application/octet-stream")
        
#         return StreamingResponse(
#             file_stream,
#             media_type=mime_type,
#             headers={
#                 "Content-Disposition": f'{disposition}; filename="{filename}"',
#                 "Content-Length": str(len(content)),
#                 "Cache-Control": "no-cache"
#             }
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error serving document file {document_id}: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to serve document: {str(e)}")

# # ================================
# # DOCUMENT MANAGEMENT ENDPOINTS  
# # ================================

# @router.get("/{document_id}")
# async def get_document(
#     document_id: str,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Get a specific document"""
#     try:
#         document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
#         if not document:
#             raise HTTPException(status_code=404, detail="Document not found")
        
#         return serialize_document(document)
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting document {document_id}: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/upload")
# async def upload_document(
#     file: UploadFile = File(...),
#     title: str = Form(...),
#     description: str = Form(""),
#     document_type: str = Form("general"),
#     customer_id: str = Form(None),
#     direction: str = Form(None),
#     requires_signature: bool = Form(False),
#     approval_required: bool = Form(False),
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Upload a new document"""
#     try:
#         logger.info(f"Uploading document: {title} by {current_user.get('email')}")
        
#         company_id = get_company_id(current_user)
#         user_id = get_user_id(current_user)
        
#         # Generate unique filename
#         timestamp = int(datetime.utcnow().timestamp())
#         file_extension = os.path.splitext(file.filename)[1]
#         unique_filename = f"{timestamp}_{file.filename}"
        
#         # Save file
#         file_path = await save_upload_file(file, unique_filename)
        
#         # Get file size
#         file_size = os.path.getsize(file_path)
        
#         # Determine direction if not provided
#         if not direction:
#             direction = "customer_to_admin" if current_user.get("role") == "customer" else "admin_to_customer"
        
#         # If uploaded by customer and no customer_id provided, use their own ID
#         if not customer_id and current_user.get("role") == "customer":
#             customer_id = user_id
        
#         # Create document record
#         document_data = {
#             "company_id": company_id,
#             "title": title,
#             "description": description,
#             "document_type": document_type,
#             "direction": direction,
#             "file_name": file.filename,
#             "file_path": file_path,
#             "file_url": f"/api/v1/documents/{{doc_id}}/file",  # Will be updated with actual ID
#             "file_size": file_size,
#             "mime_type": file.content_type or "application/octet-stream",
#             "status": "pending",
#             "customer_id": customer_id,
#             "uploaded_by": user_id,
#             "uploaded_by_email": current_user.get("email", "unknown"),
#             "requires_signature": requires_signature,
#             "is_signed": False,
#             "approval_required": approval_required,
#             "tags": [],
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
        
#         # Insert into database
#         result = await db.documents.insert_one(document_data)
#         document_id = str(result.inserted_id)
        
#         # Update file_url with actual document ID
#         await db.documents.update_one(
#             {"_id": result.inserted_id},
#             {"$set": {"file_url": f"/api/v1/documents/{document_id}/file"}}
#         )
        
#         # Get the created document
#         created_document = await db.documents.find_one({"_id": result.inserted_id})
        
#         logger.info(f"Document uploaded successfully: {document_id}")
        
#         return serialize_document(created_document)
        
#     except Exception as e:
#         logger.error(f"Error uploading document: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

# @router.delete("/{document_id}")
# async def delete_document(
#     document_id: str,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Delete a document"""
#     try:
#         logger.info(f"Deleting document {document_id}")
        
#         # Get document first
#         document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
#         if not document:
#             raise HTTPException(status_code=404, detail="Document not found")
        
#         # Delete file from filesystem
#         file_path = document.get("file_path")
#         if file_path and os.path.exists(file_path):
#             os.remove(file_path)
        
#         # Delete from database
#         await db.documents.delete_one({"_id": ObjectId(document_id)})
        
#         return {"message": "Document deleted successfully"}
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error deleting document {document_id}: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.put("/{document_id}/approve")
# async def approve_document(
#     document_id: str,
#     request: ApprovalRequest,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Approve or reject a document"""
#     try:
#         logger.info(f"Approving document {document_id} with status {request.status}")
        
#         # Validate status
#         if request.status not in ["approved", "rejected"]:
#             raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
#         # Check if document exists
#         document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
#         if not document:
#             raise HTTPException(status_code=404, detail="Document not found")
        
#         # Update document status
#         update_data = {
#             "status": request.status,
#             "approved_by": get_user_id(current_user),
#             "approved_by_email": current_user.get("email"),
#             "approved_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
        
#         if request.status == "rejected" and request.rejection_reason:
#             update_data["rejection_reason"] = request.rejection_reason
        
#         await db.documents.update_one(
#             {"_id": ObjectId(document_id)},
#             {"$set": update_data}
#         )
        
#         return {
#             "message": f"Document {request.status} successfully",
#             "document_id": document_id,
#             "status": request.status,
#             "approved_by": current_user.get("email"),
#             "approved_at": update_data["approved_at"].isoformat() + "Z",
#             "rejection_reason": request.rejection_reason if request.status == "rejected" else None
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error approving document {document_id}: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/{document_id}/sign")
# async def sign_document(
#     document_id: str,
#     request: SignDocumentRequest,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ):
#     """Sign a document (customer endpoint)"""
#     try:
#         logger.info(f"Signing document {document_id} by {current_user.get('email')}")
        
#         # Check if document exists
#         document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
#         if not document:
#             raise HTTPException(status_code=404, detail="Document not found")
            
#         if not document.get("requires_signature", False):
#             raise HTTPException(status_code=400, detail="Document does not require signature")
        
#         # Check if already signed
#         if document.get("is_signed", False):
#             raise HTTPException(status_code=400, detail="Document is already signed")
        
#         # Update document with signature
#         signed_at = datetime.fromisoformat(request.signed_at.replace('Z', '+00:00')) if request.signed_at else datetime.utcnow()
        
#         update_data = {
#             "is_signed": True,
#             "signed_at": signed_at,
#             "signature": request.signature,
#             "signed_by": get_user_id(current_user),
#             "signed_by_email": current_user.get("email"),
#             "updated_at": datetime.utcnow()
#         }
        
#         await db.documents.update_one(
#             {"_id": ObjectId(document_id)},
#             {"$set": update_data}
#         )
        
#         return {
#             "message": "Document signed successfully",
#             "document_id": document_id,
#             "signed_at": signed_at.isoformat() + "Z",
#             "signature": request.signature
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error signing document {document_id}: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


































































# backend/app/api/v1/endpoints/documents.py - SIMPLIFIED VERSION

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
import io
import logging
import aiofiles
import os
from pathlib import Path

from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.core.logger import get_logger
from app.core.utils import serialize_document

router = APIRouter()
logger = get_logger(__name__)

# File upload configuration
UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ================================
# PYDANTIC MODELS
# ================================

class ApprovalRequest(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

class SignDocumentRequest(BaseModel):
    signature: str
    signed_at: Optional[str] = None

# ================================
# HELPER FUNCTIONS
# ================================

def get_company_id(current_user: dict) -> str:
    """Extract company_id from current user - ALWAYS returns string"""
    company_id = current_user.get("company_id")
    
    # Handle ObjectId type
    if isinstance(company_id, ObjectId):
        return str(company_id)
    
    # Handle string type
    if isinstance(company_id, str):
        return company_id
    
    # Fallback: use user's own ID as company (for standalone users)
    user_id = current_user.get("_id", current_user.get("id"))
    if user_id:
        return str(user_id)
    
    # This should never happen if auth is working
    logger.error(f"User {current_user.get('email')} has no company_id!")
    raise HTTPException(status_code=400, detail="User has no company assigned")

def get_user_id(current_user: dict) -> str:
    """Extract user_id from current user"""
    user_id = current_user.get("_id", current_user.get("id", "unknown_user"))
    return str(user_id)

async def save_upload_file(file: UploadFile, filename: str) -> str:
    """Save uploaded file and return file path"""
    file_path = UPLOAD_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return str(file_path)

# ================================
# MAIN ENDPOINTS
# ================================

@router.get("/")
async def get_documents(
    q: Optional[str] = Query(None, description="Search query"),
    document_type: Optional[str] = Query(None, description="Document type filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    direction: Optional[str] = Query(None, description="Direction filter"),
    customer_email: Optional[str] = Query(None, description="Customer email filter"),
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
        
        company_id = get_company_id(current_user)
        
        # Build query
        query = {"company_id": company_id}
        
        if q:
            query["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"file_name": {"$regex": q, "$options": "i"}},
                {"uploaded_by_email": {"$regex": q, "$options": "i"}}
            ]
        
        if document_type:
            query["document_type"] = document_type
            
        if status:
            query["status"] = status
            
        if direction:
            query["direction"] = direction
            
        if customer_email:
            query["uploaded_by_email"] = customer_email
        
        if requires_signature is not None:
            query["requires_signature"] = requires_signature
            
        if is_signed is not None:
            query["is_signed"] = is_signed
            
        if approval_required is not None:
            query["approval_required"] = approval_required
        
        # Get total count
        total = await db.documents.count_documents(query)
        
        # Get documents with pagination
        cursor = db.documents.find(query).skip(skip).limit(limit).sort("created_at", -1)
        documents = await cursor.to_list(length=limit)
        
        # Serialize documents
        serialized_docs = [serialize_document(doc) for doc in documents]
        
        # Get distinct values for filters
        document_types = await db.documents.distinct("document_type", {"company_id": company_id})
        statuses = await db.documents.distinct("status", {"company_id": company_id})
        directions = ["admin_to_customer", "customer_to_admin"]
        
        # ✅ SIMPLE: Get unique customer emails directly from documents
        customer_emails = await db.documents.distinct("uploaded_by_email", {"company_id": company_id})
        
        # Create simple customer list from emails
        customers = [
            {
                "id": email,  # Use email as ID
                "email": email,
                "name": email.split('@')[0].capitalize()  # Simple name from email
            }
            for email in customer_emails if email
        ]
        
        return {
            "documents": serialized_docs,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
            "document_types": document_types,
            "statuses": statuses,
            "directions": directions,
            "customers": customers
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
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get customer documents"""
    try:
        logger.info(f"Getting customer documents for user {current_user.get('email')}")
        
        company_id = get_company_id(current_user)
        user_email = current_user.get("email")
        
        # Build query - get documents uploaded by this user
        query = {
            "company_id": company_id,
            "uploaded_by_email": user_email
        }
        
        if q:
            query["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"file_name": {"$regex": q, "$options": "i"}}
            ]
        
        if document_type:
            query["document_type"] = document_type
            
        if status:
            query["status"] = status
        
        # Get total count
        total = await db.documents.count_documents(query)
        
        # Get documents with pagination
        cursor = db.documents.find(query).skip(skip).limit(limit).sort("created_at", -1)
        documents = await cursor.to_list(length=limit)
        
        # Serialize documents
        serialized_docs = [serialize_document(doc) for doc in documents]
        
        # Get distinct values for filters
        document_types = await db.documents.distinct("document_type", query)
        statuses = await db.documents.distinct("status", query)
        
        return {
            "documents": serialized_docs,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
            "document_types": document_types if document_types else ["general", "id_card", "invoice", "receipt"],
            "statuses": statuses if statuses else ["pending", "approved", "rejected"],
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
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Download or view document file"""
    try:
        logger.info(f"Serving file for document {document_id}, download={download}")
        
        # Get document from database
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if file exists
        file_path = document.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read file
        async with aiofiles.open(file_path, 'rb') as f:
            content = await f.read()
        
        file_stream = io.BytesIO(content)
        disposition = "attachment" if download else "inline"
        filename = document.get("file_name", "document")
        mime_type = document.get("mime_type", "application/octet-stream")
        
        return StreamingResponse(
            file_stream,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"',
                "Content-Length": str(len(content)),
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving document file {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve document: {str(e)}")

# ================================
# DOCUMENT MANAGEMENT ENDPOINTS  
# ================================

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific document"""
    try:
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return serialize_document(document)
            
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
    customer_email: str = Form(None),
    direction: str = Form(None),
    requires_signature: bool = Form(False),
    approval_required: bool = Form(False),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Upload a new document"""
    try:
        logger.info(f"Uploading document: {title} by {current_user.get('email')}")
        
        # ✅ FIXED: Always use uploader's company_id (from JWT token)
        # This ensures documents are automatically in the right company
        user_company_id = current_user.get("company_id")
        
        # Convert ObjectId to string if needed
        if isinstance(user_company_id, ObjectId):
            company_id = str(user_company_id)
        else:
            company_id = str(user_company_id) if user_company_id else None
        
        if not company_id:
            logger.error(f"User {current_user.get('email')} has no company_id!")
            raise HTTPException(status_code=400, detail="User has no company assigned")
        
        user_id = get_user_id(current_user)
        user_email = current_user.get("email")
        
        logger.info(f"📂 Document will be saved to company_id: {company_id}")
        
        # Generate unique filename
        timestamp = int(datetime.utcnow().timestamp())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{file.filename}"
        
        # Save file
        file_path = await save_upload_file(file, unique_filename)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Determine direction if not provided
        if not direction:
            direction = "customer_to_admin" if current_user.get("role") == "customer" else "admin_to_customer"
        
        # Create document record
        document_data = {
            "company_id": company_id,  # ✅ Always from current user's company
            "title": title,
            "description": description,
            "document_type": document_type,
            "direction": direction,
            "file_name": file.filename,
            "file_path": file_path,
            "file_url": f"/api/v1/documents/{{doc_id}}/file",
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "status": "pending",
            "customer_id": user_id,
            "customer_email": customer_email or user_email,
            "uploaded_by": user_id,
            "uploaded_by_email": user_email,
            "uploaded_by_role": current_user.get("role"),  # Track who uploaded
            "requires_signature": requires_signature,
            "is_signed": False,
            "approval_required": approval_required,
            "tags": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        result = await db.documents.insert_one(document_data)
        document_id = str(result.inserted_id)
        
        # Update file_url with actual document ID
        await db.documents.update_one(
            {"_id": result.inserted_id},
            {"$set": {"file_url": f"/api/v1/documents/{document_id}/file"}}
        )
        
        # Get the created document
        created_document = await db.documents.find_one({"_id": result.inserted_id})
        
        logger.info(f"✅ Document uploaded successfully: {document_id} to company {company_id}")
        
        return serialize_document(created_document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a document"""
    try:
        logger.info(f"Deleting document {document_id}")
        
        # Get document first
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file from filesystem
        file_path = document.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        await db.documents.delete_one({"_id": ObjectId(document_id)})
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{document_id}/approve")
async def approve_document(
    document_id: str,
    request: ApprovalRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Approve or reject a document"""
    try:
        logger.info(f"Approving document {document_id} with status {request.status}")
        
        # Validate status
        if request.status not in ["approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
        # Check if document exists
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update document status
        update_data = {
            "status": request.status,
            "approved_by": get_user_id(current_user),
            "approved_by_email": current_user.get("email"),
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if request.status == "rejected" and request.rejection_reason:
            update_data["rejection_reason"] = request.rejection_reason
        
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": update_data}
        )
        
        return {
            "message": f"Document {request.status} successfully",
            "document_id": document_id,
            "status": request.status,
            "approved_by": current_user.get("email"),
            "approved_at": update_data["approved_at"].isoformat() + "Z",
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
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Sign a document (customer endpoint)"""
    try:
        logger.info(f"Signing document {document_id} by {current_user.get('email')}")
        
        # Check if document exists
        document = await db.documents.find_one({"_id": ObjectId(document_id)})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        if not document.get("requires_signature", False):
            raise HTTPException(status_code=400, detail="Document does not require signature")
        
        # Check if already signed
        if document.get("is_signed", False):
            raise HTTPException(status_code=400, detail="Document is already signed")
        
        # Update document with signature
        signed_at = datetime.fromisoformat(request.signed_at.replace('Z', '+00:00')) if request.signed_at else datetime.utcnow()
        
        update_data = {
            "is_signed": True,
            "signed_at": signed_at,
            "signature": request.signature,
            "signed_by": get_user_id(current_user),
            "signed_by_email": current_user.get("email"),
            "updated_at": datetime.utcnow()
        }
        
        await db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": update_data}
        )
        
        return {
            "message": "Document signed successfully",
            "document_id": document_id,
            "signed_at": signed_at.isoformat() + "Z",
            "signature": request.signature
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))