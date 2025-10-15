# backend/app/services/document_service.py
import os
import uuid
import aiofiles
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from fastapi import HTTPException, status, UploadFile
import mimetypes
from pathlib import Path

from app.core.logger import get_logger
from app.core.config import settings
from app.models.document import Document, DocumentType, DocumentStatus, DocumentDirection
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentSearch, DocumentResponse,
    DocumentUpload, DocumentSign, DocumentApproval
)

logger = get_logger("services.document")

class DocumentService:
    """Document management service"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.documents_collection = database.documents
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.upload_dir / "documents").mkdir(exist_ok=True)
        (self.upload_dir / "temp").mkdir(exist_ok=True)
    
    def _serialize_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize document for API response"""
        if not doc:
            return None
            
        # Convert ObjectIds to strings
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        
        for field in ["company_id", "customer_id", "uploaded_by", "approved_by", "signed_by", 
                     "related_job_id", "related_estimate_id", "related_invoice_id", "parent_document_id"]:
            if field in doc and doc[field]:
                doc[field] = str(doc[field])
        
        return doc
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        return Path(filename).suffix.lower()
    
    def _generate_file_path(self, company_id: str, filename: str) -> str:
        """Generate secure file path"""
        ext = self._get_file_extension(filename)
        unique_filename = f"{uuid.uuid4()}{ext}"
        company_dir = self.upload_dir / "documents" / company_id
        company_dir.mkdir(parents=True, exist_ok=True)
        return str(company_dir / unique_filename)
    
    def _validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        """Validate uploaded file"""
        # Check file size
        MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE
        if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
            return False, f"File size exceeds {settings.get_max_file_size_mb()}MB limit"
        
        # Check file type
        ext = self._get_file_extension(file.filename or "")
        if ext not in settings.ALLOWED_DOCUMENT_EXTENSIONS:
            return False, f"File type {ext} not allowed"
        
        # Check for restricted file types
        if ext in settings.RESTRICTED_FILE_TYPES:
            return False, f"File type {ext} is not allowed for security reasons"
        
        return True, "Valid file"
    
    async def upload_document(
        self, 
        file: UploadFile, 
        document_data: DocumentUpload,
        company_id: str,
        uploaded_by: str
    ) -> DocumentResponse:
        """Upload a new document"""
        try:
            # Validate file
            is_valid, message = self._validate_file(file)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=message
                )
            
            # Generate file path
            file_path = self._generate_file_path(company_id, file.filename or "document")
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Get file info
            file_size = len(content)
            mime_type = mimetypes.guess_type(file.filename or "")[0] or 'application/octet-stream'
            
            # Determine direction based on user role and customer_id
            direction = DocumentDirection.ADMIN_TO_CUSTOMER if document_data.customer_id else DocumentDirection.CUSTOMER_TO_ADMIN
            
            # Create document record
            document = Document(
                company_id=company_id,
                customer_id=document_data.customer_id,
                uploaded_by=uploaded_by,
                title=document_data.title,
                description=document_data.description,
                document_type=document_data.document_type,
                direction=direction,
                file_name=file.filename or "document",
                file_path=file_path,
                file_url="",  # Will be updated with document ID
                file_size=file_size,
                mime_type=mime_type,
                tags=document_data.tags,
                expires_at=document_data.expires_at,
                requires_signature=document_data.requires_signature
            )
            
            # Insert document
            document_dict = document.dict(exclude={"id"})
            # Convert string IDs to ObjectIds for database
            if document_dict.get("company_id"):
                document_dict["company_id"] = ObjectId(document_dict["company_id"])
            if document_dict.get("customer_id"):
                document_dict["customer_id"] = ObjectId(document_dict["customer_id"])
            if document_dict.get("uploaded_by"):
                document_dict["uploaded_by"] = ObjectId(document_dict["uploaded_by"])
            
            result = await self.documents_collection.insert_one(document_dict)
            document_id = str(result.inserted_id)
            
            # Update file URL with document ID
            await self.documents_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"file_url": f"/api/v1/documents/{document_id}/file"}}
            )
            
            # Get the created document
            created_doc = await self.documents_collection.find_one({"_id": result.inserted_id})
            
            logger.info(f"Document uploaded successfully: {document_id}")
            return DocumentResponse(**self._serialize_document(created_doc))
            
        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            # Clean up file if it was created
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document: {str(e)}"
            )
    
    async def get_documents(
        self, 
        company_id: str, 
        user_id: str,
        user_role: str,
        search: DocumentSearch = None,
        skip: int = 0, 
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get documents with filtering"""
        try:
            # Build base query
            query = {"company_id": ObjectId(company_id)}
            
            # Role-based filtering
            if user_role == "customer":
                # Customers can only see their own documents or documents sent to them
                query["$or"] = [
                    {"customer_id": ObjectId(user_id)},
                    {"direction": DocumentDirection.ADMIN_TO_CUSTOMER, "customer_id": ObjectId(user_id)}
                ]
            
            # Apply search filters
            if search:
                if search.q:
                    text_search = {
                        "$or": [
                            {"title": {"$regex": search.q, "$options": "i"}},
                            {"description": {"$regex": search.q, "$options": "i"}},
                            {"file_name": {"$regex": search.q, "$options": "i"}},
                            {"tags": {"$regex": search.q, "$options": "i"}}
                        ]
                    }
                    if "$or" in query:
                        # Combine with existing $or
                        query = {"$and": [query, text_search]}
                    else:
                        query.update(text_search)
                
                if search.document_type:
                    query["document_type"] = search.document_type
                if search.status:
                    query["status"] = search.status
                if search.direction:
                    query["direction"] = search.direction
                if search.customer_id:
                    query["customer_id"] = ObjectId(search.customer_id)
                if search.uploaded_by:
                    query["uploaded_by"] = ObjectId(search.uploaded_by)
                if search.expires_before:
                    query["expires_at"] = {"$lt": search.expires_before}
                if search.expires_after:
                    query["expires_at"] = {"$gt": search.expires_after}
                if search.tags:
                    query["tags"] = {"$in": search.tags}
                if search.requires_signature is not None:
                    query["requires_signature"] = search.requires_signature
                if search.is_signed is not None:
                    query["is_signed"] = search.is_signed
                if search.approval_required is not None:
                    query["approval_required"] = search.approval_required
            
            # Get total count
            total = await self.documents_collection.count_documents(query)
            
            # Get documents
            cursor = self.documents_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Serialize documents
            serialized_docs = [self._serialize_document(doc) for doc in documents]
            
            # Get document types for filtering
            document_types = await self.documents_collection.distinct("document_type", {"company_id": ObjectId(company_id)})
            
            return {
                "documents": serialized_docs,
                "total": total,
                "page": (skip // limit) + 1,
                "size": limit,
                "pages": (total + limit - 1) // limit,
                "document_types": document_types
            }
            
        except Exception as e:
            logger.error(f"Error getting documents: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get documents: {str(e)}"
            )
    
    async def get_document(self, document_id: str, company_id: str, user_id: str, user_role: str) -> DocumentResponse:
        """Get a specific document"""
        try:
            query = {"_id": ObjectId(document_id), "company_id": ObjectId(company_id)}
            
            # Role-based access control
            if user_role == "customer":
                query["$or"] = [
                    {"customer_id": ObjectId(user_id)},
                    {"direction": DocumentDirection.ADMIN_TO_CUSTOMER, "customer_id": ObjectId(user_id)}
                ]
            
            document = await self.documents_collection.find_one(query)
            
            if not document:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            return DocumentResponse(**self._serialize_document(document))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get document: {str(e)}"
            )
    
    async def update_document(
        self, 
        document_id: str, 
        company_id: str, 
        user_id: str,
        document_data: DocumentUpdate
    ) -> DocumentResponse:
        """Update document metadata"""
        try:
            # Check if document exists and user has permission
            existing_doc = await self.get_document(document_id, company_id, user_id, "admin")
            
            # Prepare update data
            update_data = {k: v for k, v in document_data.dict(exclude_unset=True).items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            
            # Update document
            result = await self.documents_collection.update_one(
                {"_id": ObjectId(document_id), "company_id": ObjectId(company_id)},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            # Get updated document
            updated_doc = await self.documents_collection.find_one({"_id": ObjectId(document_id)})
            
            logger.info(f"Document updated: {document_id}")
            return DocumentResponse(**self._serialize_document(updated_doc))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update document: {str(e)}"
            )
    
    async def sign_document(
        self, 
        document_id: str, 
        company_id: str, 
        user_id: str,
        signature_data: DocumentSign
    ) -> DocumentResponse:
        """Sign a document"""
        try:
            # Get document
            document = await self.get_document(document_id, company_id, user_id, "customer")
            
            if not document.requires_signature:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document does not require signature"
                )
            
            if document.is_signed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document is already signed"
                )
            
            # Update document with signature
            update_data = {
                "is_signed": True,
                "signed_at": datetime.utcnow(),
                "signed_by": ObjectId(user_id),
                "signature_data": signature_data.signature_data,
                "updated_at": datetime.utcnow()
            }
            
            await self.documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": update_data}
            )
            
            # Get updated document
            updated_doc = await self.documents_collection.find_one({"_id": ObjectId(document_id)})
            
            logger.info(f"Document signed: {document_id} by user: {user_id}")
            return DocumentResponse(**self._serialize_document(updated_doc))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error signing document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sign document: {str(e)}"
            )
    
    async def approve_document(
        self, 
        document_id: str, 
        company_id: str, 
        user_id: str,
        approval_data: DocumentApproval
    ) -> DocumentResponse:
        """Approve or reject a document"""
        try:
            # Check if document exists
            document = await self.get_document(document_id, company_id, user_id, "admin")
            
            if not document.approval_required:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document does not require approval"
                )
            
            # Update document with approval status
            update_data = {
                "status": approval_data.status,
                "updated_at": datetime.utcnow()
            }
            
            if approval_data.status == DocumentStatus.APPROVED:
                update_data.update({
                    "approved_by": ObjectId(user_id),
                    "approved_at": datetime.utcnow()
                })
            elif approval_data.status == DocumentStatus.REJECTED:
                update_data["rejection_reason"] = approval_data.rejection_reason
            
            await self.documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": update_data}
            )
            
            # Get updated document
            updated_doc = await self.documents_collection.find_one({"_id": ObjectId(document_id)})
            
            logger.info(f"Document {approval_data.status}: {document_id} by user: {user_id}")
            return DocumentResponse(**self._serialize_document(updated_doc))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error approving document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to approve document: {str(e)}"
            )
    
    async def delete_document(self, document_id: str, company_id: str, user_id: str) -> bool:
        """Delete a document"""
        try:
            # Get document to check permissions and get file path
            document = await self.get_document(document_id, company_id, user_id, "admin")
            
            # Delete file from filesystem
            if hasattr(document, 'file_path') and os.path.exists(document.file_path):
                os.remove(document.file_path)
            
            # Delete document record
            result = await self.documents_collection.delete_one(
                {"_id": ObjectId(document_id), "company_id": ObjectId(company_id)}
            )
            
            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found"
                )
            
            logger.info(f"Document deleted: {document_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete document: {str(e)}"
            )
    
    async def get_file_content(self, document_id: str, company_id: str, user_id: str, user_role: str) -> Tuple[bytes, str, str]:
        """Get document file content"""
        try:
            # Get document with access control
            document = await self.get_document(document_id, company_id, user_id, user_role)
            
            # Check if file exists
            if not hasattr(document, 'file_path') or not os.path.exists(document.file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found"
                )
            
            # Read file content
            async with aiofiles.open(document.file_path, 'rb') as f:
                content = await f.read()
            
            return content, document.file_name, document.mime_type
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting file content: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get file content: {str(e)}"
            )