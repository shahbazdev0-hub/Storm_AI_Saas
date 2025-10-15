# backend/app/api/v1/endpoints/contacts.py - FIXED ROUTE ORDER

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
import logging
from pydantic import BaseModel, Field

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple Pydantic schemas for validation
class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    type: str = "customer"
    status: str = "active"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

def convert_objectid_to_str(document):
    """Convert ObjectId fields to strings for JSON serialization"""
    if document:
        if "_id" in document:
            document["id"] = str(document["_id"])
            del document["_id"]
        if "company_id" in document:
            document["company_id"] = str(document["company_id"])
        if "created_by" in document:
            document["created_by"] = str(document["created_by"])
    return document

# ✅ ROUTE ORDER: SPECIFIC ROUTES FIRST, GENERIC ROUTES LAST



# Test endpoint with auth
@router.get("/test-with-auth")
async def test_with_auth(current_user: dict = Depends(get_current_user)):
    """Test endpoint with authentication only"""
    return {
        "message": "Auth works!", 
        "user_id": str(current_user.get("_id", "unknown")),
        "email": current_user.get("email", "unknown"),
        "company_id": str(current_user.get("company_id", "unknown"))
    }

# Statistics endpoint
@router.get("/stats")
async def get_contact_stats(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get contact statistics"""
    try:
        company_id = ObjectId(current_user["company_id"])
        
        # Total contacts
        total_contacts = await db.contacts.count_documents({"company_id": company_id})
        
        # Active vs inactive
        active_contacts = await db.contacts.count_documents({
            "company_id": company_id,
            "status": "active"
        })
        
        # Count contacts by type
        pipeline = [
            {"$match": {"company_id": company_id}},
            {"$group": {
                "_id": "$type",
                "count": {"$sum": 1}
            }}
        ]
        
        contact_types = await db.contacts.aggregate(pipeline).to_list(length=None)
        by_type = {item["_id"] or "unknown": item["count"] for item in contact_types}
        
        # Recent contacts (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_contacts = await db.contacts.count_documents({
            "company_id": company_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        stats = {
            "total_contacts": total_contacts,
            "active_contacts": active_contacts,
            "inactive_contacts": total_contacts - active_contacts,
            "recent_contacts": recent_contacts,
            "by_type": by_type,
            "growth_rate": round((recent_contacts / max(total_contacts, 1)) * 100, 1) if total_contacts > 0 else 0,
        }
        
        return stats
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.stats")
        logger.error(f"📞 Error getting contact stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get contact stats: {str(e)}")

# Search endpoint
@router.get("/search")
async def search_contacts(
    q: str = Query(..., description="Search query"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=10, le=50)
) -> List[dict]:
    """Search contacts"""
    try:
        # Search across multiple fields
        search_filter = {
            "company_id": ObjectId(current_user["company_id"]),
            "$or": [
                {"first_name": {"$regex": q, "$options": "i"}},
                {"last_name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
                {"address": {"$regex": q, "$options": "i"}},
                {"city": {"$regex": q, "$options": "i"}}
            ]
        }
        
        cursor = db.contacts.find(search_filter).limit(limit)
        contacts = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        result = []
        for contact in contacts:
            convert_objectid_to_str(contact)
            result.append(contact)
        
        return result
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.search")
        logger.error(f"📞 Error searching contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search contacts: {str(e)}")

# ✅ MAIN LIST ENDPOINT - MUST COME AFTER SPECIFIC ROUTES
@router.get("/")
async def read_contacts(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    type: Optional[str] = Query(None, description="Filter contacts by type"),
    search: Optional[str] = None,
    tag: Optional[str] = None
) -> List[dict]:
    """Retrieve contacts from database"""
    try:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.read")
        
        logger.info(f"📞 GET /contacts - type: {type}, search: {search}")
        
        # Build query filter
        # query_filter = {"company_id": ObjectId(current_user["company_id"])}
        query_filter = {} # TEMPORARILY DISABLE COMPANY FILTER FOR DEMO PURPOSES
        # Add type filter (this is what JobScheduler.tsx expects)
        if type:
            query_filter["contact_type"] = type  
        
        if search:
            query_filter["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
            
        if tag:
            query_filter["tags"] = {"$in": [tag]}

        # Query database
        cursor = db.contacts.find(query_filter).skip(skip).limit(limit)
        contacts = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        result = []
        for contact in contacts:
            contact_data = {
                "id": str(contact["_id"]),
                "company_id": str(contact["company_id"]),
                "first_name": contact.get("first_name"),
                "last_name": contact.get("last_name"),
                "email": contact.get("email"),
                "phone": contact.get("phone"),
                "type": contact.get("type"),
                "status": contact.get("status", "active"),
                "address": contact.get("address"),
                "city": contact.get("city"),
                "state": contact.get("state"),
                "zip_code": contact.get("zip_code"),
                "created_at": contact.get("created_at"),
                "updated_at": contact.get("updated_at")
            }
            result.append(contact_data)
        
        logger.info(f"📞 Retrieved {len(result)} contacts from database")
        return result
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.read")
        logger.error(f"📞 Error retrieving contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve contacts: {str(e)}")

# Create endpoint
@router.post("/")
async def create_contact(
    contact_in: ContactCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Create new contact in database"""
    try:
        # Prepare contact document
        contact_data = {
            "first_name": contact_in.first_name,
            "last_name": contact_in.last_name,
            "email": contact_in.email,
            "phone": contact_in.phone,
            "secondary_phone": contact_in.secondary_phone,
            "type": contact_in.type,
            "status": contact_in.status,
            "address": contact_in.address,
            "city": contact_in.city,
            "state": contact_in.state,
            "zip_code": contact_in.zip_code,
            "notes": contact_in.notes,
            "tags": contact_in.tags,
            "company_id": ObjectId(current_user["company_id"]),
            "created_by": ObjectId(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        result = await db.contacts.insert_one(contact_data)
        
        # Get the created contact
        created_contact = await db.contacts.find_one({"_id": result.inserted_id})
        
        # Convert ObjectIds to strings
        convert_objectid_to_str(created_contact)
        
        return created_contact
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.create")
        logger.error(f"📞 Error creating contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")

# ✅ PATH PARAMETER ROUTES - MUST COME LAST
@router.get("/{contact_id}")
async def read_contact(
    contact_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Get contact by ID from database"""
    try:
        if not ObjectId.is_valid(contact_id):
            raise HTTPException(status_code=400, detail="Invalid contact ID")
        
        contact = await db.contacts.find_one({
            "_id": ObjectId(contact_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        convert_objectid_to_str(contact)
        return contact
        
    except HTTPException:
        raise
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.read_one")
        logger.error(f"📞 Error retrieving contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve contact: {str(e)}")

@router.put("/{contact_id}")
async def update_contact(
    contact_id: str,
    contact_in: ContactUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Update contact in database"""
    try:
        if not ObjectId.is_valid(contact_id):
            raise HTTPException(status_code=400, detail="Invalid contact ID")
        
        # Prepare update data (only include non-None fields)
        update_data = {}
        for field, value in contact_in.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update in database
        result = await db.contacts.update_one(
            {
                "_id": ObjectId(contact_id),
                "company_id": ObjectId(current_user["company_id"])
            },
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Get updated contact
        updated_contact = await db.contacts.find_one({
            "_id": ObjectId(contact_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        convert_objectid_to_str(updated_contact)
        return updated_contact
        
    except HTTPException:
        raise
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.update")
        logger.error(f"📞 Error updating contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Delete contact from database"""
    try:
        if not ObjectId.is_valid(contact_id):
            raise HTTPException(status_code=400, detail="Invalid contact ID")
        
        result = await db.contacts.delete_one({
            "_id": ObjectId(contact_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        return {"message": "Contact deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.contacts.delete")
        logger.error(f"📞 Error deleting contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete contact: {str(e)}")
    

@router.get("/debug-user")
async def debug_user(current_user: dict = Depends(get_current_user)):
    return {
        "your_company_id": str(current_user["company_id"]),
        "expected_format": "64a7b8c9e4567890abcdef34"
    }