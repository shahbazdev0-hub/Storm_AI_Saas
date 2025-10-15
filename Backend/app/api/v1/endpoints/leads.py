# app/api/v1/endpoints/leads.py - COMPLETE FIXED VERSION
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()

# Helper functions
def oid(i: Any) -> ObjectId:
    """Convert string to ObjectId safely"""
    if i is None:
        return None
    if isinstance(i, ObjectId):
        return i
    try:
        return ObjectId(str(i))
    except Exception:
        return None

def serialize_document(doc: Dict) -> Dict:
    """Convert MongoDB document ObjectIds to strings for JSON serialization"""
    if not doc:
        return doc
    
    # Create a copy to avoid modifying the original
    serialized = dict(doc)
    
    # Convert _id to id and string
    if "_id" in serialized:
        serialized["id"] = str(serialized["_id"])
        del serialized["_id"]
    
    # Convert other ObjectId fields to strings
    objectid_fields = [
        "company_id", "contact_id", "assigned_to", "created_by", 
        "updated_by", "converted_by", "owner_id", "service_request_id"
    ]
    
    for field in objectid_fields:
        if field in serialized and serialized[field]:
            if isinstance(serialized[field], ObjectId):
                serialized[field] = str(serialized[field])
            else:
                serialized[field] = str(serialized[field])
    
    # Handle nested ObjectIds in arrays
    if "notes" in serialized and isinstance(serialized["notes"], list):
        for note in serialized["notes"]:
            if isinstance(note, dict) and "created_by" in note:
                if isinstance(note["created_by"], ObjectId):
                    note["created_by"] = str(note["created_by"])
    
    if "interactions" in serialized and isinstance(serialized["interactions"], list):
        for interaction in serialized["interactions"]:
            if isinstance(interaction, dict):
                if "created_by" in interaction and isinstance(interaction["created_by"], ObjectId):
                    interaction["created_by"] = str(interaction["created_by"])
                if "attended_by" in interaction and isinstance(interaction["attended_by"], list):
                    interaction["attended_by"] = [
                        str(oid_val) if isinstance(oid_val, ObjectId) else str(oid_val) 
                        for oid_val in interaction["attended_by"]
                    ]
    
    # Convert datetime objects to ISO strings
    for field in ["created_at", "updated_at", "last_contacted", "next_follow_up"]:
        if field in serialized and serialized[field]:
            if hasattr(serialized[field], "isoformat"):
                serialized[field] = serialized[field].isoformat()
    
    return serialized

def get_empty_pipeline_response(period: str = "this_month") -> Dict[str, Any]:
    """Return empty pipeline structure for frontend"""
    return {
        "stages": [
            {"id": "new", "name": "New Leads", "color": "bg-blue-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "contacted", "name": "Contacted", "color": "bg-yellow-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "qualified", "name": "Qualified", "color": "bg-purple-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "proposal", "name": "Proposal Sent", "color": "bg-orange-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "won", "name": "Won", "color": "bg-green-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "lost", "name": "Lost", "color": "bg-red-500", "leads": [], "total_value": 0, "count": 0}
        ],
        "summary": {
            "total_value": 0,
            "total_leads": 0,
            "average_deal_size": 0,
            "period": period
        }
    }

# Frontend data schema
class FrontendLeadCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: str = Field(..., min_length=10)
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    source: str = "website"
    status: str = "new"
    priority: int = Field(default=3, ge=1, le=5)
    estimated_value: Optional[float] = None
    service_interest: Optional[str] = None
    urgency: str = "medium"
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    preferred_contact_method: str = "any"
    best_time_to_contact: Optional[str] = None
    referral_source: Optional[str] = None
    how_did_you_hear: Optional[str] = None


# CRUD Operations - Standard endpoints
@router.get("/")
async def read_leads(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    source: Optional[str] = None,
    sort_by: Optional[str] = Query(default="created_at"),
    sort_order: Optional[str] = Query(default="desc")
) -> List[Dict[str, Any]]:
    """Retrieve leads with pagination"""
    try:
        print(f"Getting leads for user: {current_user}")
        
        # Validate and get company ID
        company_id = oid(current_user.get("company_id"))
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company ID")
        
        # Build query
        query = {"company_id": company_id}
        
        # Add filters only if they have values
        if status and status.strip():
            query["status"] = status.strip()
        if assigned_to and assigned_to.strip():
            assigned_oid = oid(assigned_to)
            if assigned_oid:
                query["assigned_to"] = assigned_oid
        if source and source.strip():
            query["source"] = source.strip()
        
        print(f"Query: {query}")
        
        # Get total count first
        try:
            total = await db.leads.count_documents(query)
            print(f"Total leads found: {total}")
        except Exception as e:
            print(f"Error counting documents: {e}")
            return []
        
        if total == 0:
            return []
        
        # Build sort
        sort_direction = -1 if sort_order == "desc" else 1
        
        # Get leads with error handling
        try:
            leads = await db.leads.find(query)\
                .sort(sort_by, sort_direction)\
                .skip(skip)\
                .limit(limit)\
                .to_list(length=limit)
            print(f"Retrieved {len(leads)} leads from database")
        except Exception as e:
            print(f"Error fetching leads: {e}")
            return []
        
        # Process each lead safely
        serialized_leads = []
        for lead in leads:
            try:
                # Start with basic serialization
                serialized_lead = serialize_document(lead)
                
                # Add contact information if available
                if lead.get("contact_id"):
                    try:
                        contact_id = lead["contact_id"]
                        # Handle both ObjectId and string contact IDs
                        if isinstance(contact_id, str):
                            contact_obj_id = oid(contact_id)
                        else:
                            contact_obj_id = contact_id
                        
                        if contact_obj_id:
                            contact = await db.contacts.find_one({"_id": contact_obj_id})
                            if contact:
                                serialized_lead["contact_name"] = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
                                serialized_lead["contact_email"] = contact.get("email")
                                serialized_lead["contact_phone"] = contact.get("phone")
                                serialized_lead["first_name"] = contact.get("first_name", "")
                                serialized_lead["last_name"] = contact.get("last_name", "")
                                serialized_lead["email"] = contact.get("email")
                                serialized_lead["phone"] = contact.get("phone")
                                
                                # Add address info if available
                                if contact.get("addresses") and len(contact["addresses"]) > 0:
                                    primary_addr = contact["addresses"][0]
                                    serialized_lead["address"] = primary_addr.get("street", "")
                                    serialized_lead["city"] = primary_addr.get("city", "")
                                    serialized_lead["state"] = primary_addr.get("state", "")
                            else:
                                # Contact not found, set defaults
                                serialized_lead["contact_name"] = "Unknown Contact"
                                serialized_lead["first_name"] = "Unknown"
                                serialized_lead["last_name"] = "Contact"
                    except Exception as contact_error:
                        print(f"Error fetching contact for lead {lead.get('_id')}: {contact_error}")
                        serialized_lead["contact_name"] = "Unknown Contact"
                        serialized_lead["first_name"] = "Unknown"
                        serialized_lead["last_name"] = "Contact"
                
                # Add computed fields with safe defaults
                serialized_lead["is_active"] = serialized_lead.get("status", "new") not in ["won", "lost"]
                
                # Calculate days in pipeline safely
                created_at = lead.get("created_at")
                if created_at and hasattr(created_at, "date"):
                    serialized_lead["days_in_pipeline"] = (datetime.utcnow() - created_at).days
                else:
                    serialized_lead["days_in_pipeline"] = 0
                
                # Add AI score safely
                scoring = lead.get("scoring", {})
                if isinstance(scoring, dict):
                    serialized_lead["total_score"] = scoring.get("ai_score", 0) or 0
                else:
                    serialized_lead["total_score"] = 0
                
                # Ensure required fields exist with defaults
                serialized_lead.setdefault("status", "new")
                serialized_lead.setdefault("priority", 3)
                serialized_lead.setdefault("source", "unknown")
                serialized_lead.setdefault("estimated_value", None)
                
                serialized_leads.append(serialized_lead)
                
            except Exception as lead_error:
                print(f"Error processing lead {lead.get('_id')}: {lead_error}")
                # Still try to include a minimal version of the lead
                try:
                    minimal_lead = {
                        "id": str(lead.get("_id", "")),
                        "contact_name": "Error Loading Contact",
                        "first_name": "Error",
                        "last_name": "Loading",
                        "status": lead.get("status", "new"),
                        "priority": lead.get("priority", 3),
                        "source": lead.get("source", "unknown"),
                        "created_at": lead.get("created_at", datetime.utcnow()).isoformat() if hasattr(lead.get("created_at"), "isoformat") else datetime.utcnow().isoformat(),
                        "is_active": True,
                        "days_in_pipeline": 0,
                        "total_score": 0
                    }
                    serialized_leads.append(minimal_lead)
                except Exception:
                    # If even minimal processing fails, skip this lead
                    continue
        
        print(f"Successfully processed {len(serialized_leads)} leads")
        return serialized_leads
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Critical error in read_leads: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to retrieve leads: {str(e)}")

# Handle both with and without trailing slash
@router.get("")
async def read_leads_no_slash(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    source: Optional[str] = None,
    sort_by: Optional[str] = Query(default="created_at"),
    sort_order: Optional[str] = Query(default="desc")
) -> List[Dict[str, Any]]:
    """Retrieve leads with pagination - no trailing slash version"""
    return await read_leads(db, current_user, skip, limit, status, assigned_to, source, sort_by, sort_order)

@router.post("/")
async def create_lead(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_data: FrontendLeadCreate,
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """Create new lead from frontend form data"""
    try:
        print(f"Creating lead with data: {lead_data.model_dump()}")
        
        company_id = oid(current_user.get("company_id"))
        user_id = oid(current_user.get("_id"))
        
        if not company_id or not user_id:
            raise HTTPException(status_code=400, detail="Invalid user session data")
        
        # Create contact first
        contact_doc = {
            "company_id": company_id,
            "first_name": lead_data.first_name,
            "last_name": lead_data.last_name,
            "email": lead_data.email if lead_data.email else None,
            "phone": lead_data.phone,
            "phone_mobile": lead_data.secondary_phone if lead_data.secondary_phone else None,
            "type": "lead",
            "status": "active",
            "preferred_contact_method": lead_data.preferred_contact_method,
            "addresses": [{
                "type": "service",
                "street": lead_data.address or "",
                "city": lead_data.city or "",
                "state": lead_data.state or "",
                "zip_code": lead_data.zip_code or "",
                "is_primary": True
            }] if lead_data.address else [],
            "tags": [],
            "custom_fields": {
                "best_time_to_contact": lead_data.best_time_to_contact,
                "how_did_you_hear": lead_data.how_did_you_hear,
                "referral_source": lead_data.referral_source
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        contact_result = await db.contacts.insert_one(contact_doc)
        contact_id = contact_result.inserted_id
        print(f"Contact created with ID: {contact_id}")
        
        # Create lead document
        lead_number = f"LEAD-{datetime.now().strftime('%Y%m%d')}-{str(ObjectId())[-4:]}"
        
        lead_doc = {
            "company_id": company_id,
            "contact_id": contact_id,
            "lead_number": lead_number,
            "status": lead_data.status,
            "priority": lead_data.priority,
            "source": lead_data.source,
            "estimated_value": lead_data.estimated_value,
            "service_type": "other",
            "service_details": lead_data.service_interest,
            "urgency_level": lead_data.urgency,
            "tags": lead_data.tags or [],
            "notes": [
                {
                    "id": str(ObjectId()),
                    "content": lead_data.notes,
                    "note_type": "general",
                    "is_important": False,
                    "is_private": False,
                    "created_by": user_id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            ] if lead_data.notes else [],
            "scoring": {
                "ai_score": None,
                "ai_confidence": None,
                "total_score": None,
                "quality_grade": None,
                "last_calculated": None
            },
            "interactions": [],
            "custom_fields": {
                "urgency": lead_data.urgency,
                "service_interest": lead_data.service_interest,
                "best_time_to_contact": lead_data.best_time_to_contact,
                "preferred_contact_method": lead_data.preferred_contact_method
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": user_id
        }
        
        lead_result = await db.leads.insert_one(lead_doc)
        lead_id = lead_result.inserted_id
        print(f"Lead created with ID: {lead_id}")
        
        # Format response for frontend
        response_data = {
            "id": str(lead_id),
            "contact_id": str(contact_id),
            "lead_number": lead_number,
            "first_name": lead_data.first_name,
            "last_name": lead_data.last_name,
            "email": lead_data.email,
            "phone": lead_data.phone,
            "address": lead_data.address,
            "city": lead_data.city,
            "state": lead_data.state,
            "source": lead_data.source,
            "status": lead_data.status,
            "priority": lead_data.priority,
            "estimated_value": lead_data.estimated_value,
            "notes": lead_data.notes,
            "tags": lead_data.tags or [],
            "created_at": datetime.utcnow().isoformat(),
            "ai_score": None
        }
        
        # Schedule AI scoring in background
        background_tasks.add_task(score_lead_background, db, str(lead_id), response_data)
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating lead: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")

@router.post("")
async def create_lead_no_slash(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_data: FrontendLeadCreate,
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """Create new lead - no trailing slash version"""
    return await create_lead(db=db, lead_data=lead_data, current_user=current_user, background_tasks=background_tasks)

async def score_lead_background(db: AsyncIOMotorDatabase, lead_id: str, lead_data: dict):
    """Background task to score lead with AI"""
    try:
        print(f"Scoring lead {lead_id} in background")
        
        # Mock AI scoring
        import random
        score = round(random.uniform(5.0, 9.5), 1)
        
        # Update lead with AI score
        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "scoring.ai_score": score,
                    "scoring.ai_last_scored": datetime.utcnow(),
                    "scoring.quality_grade": "A" if score >= 8 else "B" if score >= 6 else "C",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        print(f"Updated lead {lead_id} with AI score: {score}")
        
    except Exception as e:
        print(f"Error scoring lead {lead_id}: {e}")

@router.patch("/{lead_id}")
async def patch_lead(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_id: str,
    update_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update lead with PATCH method (partial updates)"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    try:
        company_id = oid(current_user.get("company_id"))
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company ID")
        
        print(f"Updating lead {lead_id} with data: {update_data}")
        
        # Prepare update document
        update_doc = {"updated_at": datetime.utcnow()}
        
        # Handle common update fields
        allowed_fields = [
            "status", "priority", "source", "estimated_value", 
            "service_details", "notes", "tags", "urgency_level"
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                update_doc[field] = value
        
        # Special handling for ObjectId fields
        if "assigned_to" in update_data and update_data["assigned_to"]:
            assigned_oid = oid(update_data["assigned_to"])
            if assigned_oid:
                update_doc["assigned_to"] = assigned_oid
        
        # Update the lead
        result = await db.leads.update_one(
            {"_id": ObjectId(lead_id), "company_id": company_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Get updated lead
        updated_lead = await db.leads.find_one({
            "_id": ObjectId(lead_id),
            "company_id": company_id
        })
        
        if not updated_lead:
            raise HTTPException(status_code=404, detail="Lead not found after update")
        
        # Get contact information
        if updated_lead.get("contact_id"):
            try:
                contact = await db.contacts.find_one({"_id": updated_lead["contact_id"]})
                if contact:
                    updated_lead["first_name"] = contact.get("first_name", "")
                    updated_lead["last_name"] = contact.get("last_name", "")
                    updated_lead["email"] = contact.get("email")
                    updated_lead["phone"] = contact.get("phone")
                    updated_lead["contact_name"] = f"{contact.get('first_name', '')} {contact.get('last_name', '')}"
            except Exception:
                pass
        
        return serialize_document(updated_lead)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating lead {lead_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update lead: {str(e)}")

@router.delete("/{lead_id}")
async def delete_lead(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete lead"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    try:
        company_id = oid(current_user.get("company_id"))
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company ID")
        
        result = await db.leads.delete_one({
            "_id": ObjectId(lead_id),
            "company_id": company_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return {"message": "Lead deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting lead {lead_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete lead: {str(e)}")

# ============================================================================
# CRITICAL: {lead_id} endpoint MUST come LAST to avoid route conflicts
# ============================================================================

@router.get("/{lead_id}")
async def read_lead(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_id: str,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get lead by ID - THIS MUST BE LAST"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    try:
        company_id = oid(current_user.get("company_id"))
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company ID")
        
        lead = await db.leads.find_one({
            "_id": ObjectId(lead_id),
            "company_id": company_id
        })
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return serialize_document(lead)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting lead {lead_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve lead: {str(e)}")

