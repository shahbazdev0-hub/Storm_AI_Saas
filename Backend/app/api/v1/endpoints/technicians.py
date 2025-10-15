# backend/app/api/v1/endpoints/technicians.py - NEW FILE
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Request Models
class TechnicianAddress(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class EmergencyContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None

class TechnicianCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8)
    specialty: Optional[str] = None
    hourly_rate: Optional[float] = Field(None, gt=0)
    address: Optional[TechnicianAddress] = None
    emergency_contact: Optional[EmergencyContact] = None

class TechnicianUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    hourly_rate: Optional[float] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern="^(active|inactive|on_leave)$")
    address: Optional[TechnicianAddress] = None
    emergency_contact: Optional[EmergencyContact] = None

def serialize_technician(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable format"""
    if not doc:
        return {}
    
    serialized = dict(doc)
    serialized["id"] = str(serialized.pop("_id"))
    
    # Convert ObjectIds to strings
    for field in ["company_id", "created_by", "updated_by"]:
        if field in serialized and serialized[field]:
            serialized[field] = str(serialized[field])
    
    # Convert datetime to ISO strings
    for field in ["created_at", "updated_at", "last_login", "last_active"]:
        if field in serialized and serialized[field]:
            if hasattr(serialized[field], "isoformat"):
                serialized[field] = serialized[field].isoformat()
    
    # Remove password hash from response
    serialized.pop("password_hash", None)
    
    return serialized

@router.post("/", response_model=Dict[str, Any])
async def create_technician(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    technician_data: TechnicianCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Create a new technician"""
    try:
        # Verify current user is admin/manager
        if current_user.get("role") not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and managers can create technicians"
            )
        
        company_id = ObjectId(current_user["company_id"])
        
        # Check if email already exists
        existing_user = await db.users.find_one({
            "email": technician_data.email.lower(),
            "company_id": company_id
        })
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )
        
        # Hash password
        password_hash = pwd_context.hash(technician_data.password)
        
        # Create technician document
        technician_doc = {
            "company_id": company_id,
            "email": technician_data.email.lower(),
            "password_hash": password_hash,
            "first_name": technician_data.first_name.strip(),
            "last_name": technician_data.last_name.strip(),
            "phone": technician_data.phone.strip(),
            "role": "technician",
            "status": "active",
            
            # Professional info
            "specialty": technician_data.specialty,
            "hourly_rate": technician_data.hourly_rate,
            
            # Address
            "address": technician_data.address.dict() if technician_data.address else None,
            
            # Emergency contact
            "emergency_contact": technician_data.emergency_contact.dict() if technician_data.emergency_contact else None,
            
            # Technician-specific fields
            "is_available": True,
            "skills": [],
            "certifications": [],
            "equipment_assigned": [],
            "service_areas": [],
            
            # Metadata
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": ObjectId(current_user["_id"]),
            "is_verified": False,
            "last_login": None,
            "last_active": None,
        }
        
        # Insert technician
        result = await db.users.insert_one(technician_doc)
        technician_id = result.inserted_id
        
        # Get created technician
        created_technician = await db.users.find_one({"_id": technician_id})
        
        return {
            "message": "Technician created successfully",
            "technician": serialize_technician(created_technician)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create technician: {str(e)}"
        )

@router.get("/", response_model=List[Dict[str, Any]])
async def get_technicians(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    specialty_filter: Optional[str] = Query(None, description="Filter by specialty"),
    available_only: Optional[bool] = Query(False, description="Show only available technicians"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
) -> Any:
    """Get all technicians for the company"""
    try:
        company_id = ObjectId(current_user["company_id"])
        
        # Build query
        query = {
            "company_id": company_id,
            "role": "technician"
        }
        
        if status_filter:
            query["status"] = status_filter
        if specialty_filter:
            query["specialty"] = specialty_filter
        if available_only:
            query["is_available"] = True
        
        # Get technicians
        cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
        technicians = await cursor.to_list(length=limit)
        
        # Serialize for response
        return [serialize_technician(tech) for tech in technicians]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technicians: {str(e)}"
        )

@router.get("/stats", response_model=List[Dict[str, Any]])
async def get_technician_stats(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Get performance stats for all technicians"""
    try:
        company_id = ObjectId(current_user["company_id"])
        
        # Get all technicians
        technicians = await db.users.find({
            "company_id": company_id,
            "role": "technician"
        }).to_list(length=None)
        
        if not technicians:
            return []
        
        # Calculate date ranges
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=7)
        
        stats_list = []
        
        for tech in technicians:
            tech_id = tech["_id"]
            
            # Get active jobs
            active_jobs_count = await db.jobs.count_documents({
                "company_id": company_id,
                "technician_id": tech_id,
                "status": {"$in": ["scheduled", "in_progress"]}
            })
            
            # Get completed jobs this week
            completed_this_week = await db.jobs.count_documents({
                "company_id": company_id,
                "technician_id": tech_id,
                "status": "completed",
                "time_tracking.actual_end": {"$gte": week_start, "$lt": week_end}
            })
            
            # Calculate average rating (mock for now - implement based on your rating system)
            # You would typically aggregate from a reviews/ratings collection
            avg_rating = 4.5  # Mock rating
            
            # Determine availability
            is_available = (
                tech.get("status") == "active" and 
                tech.get("is_available", True) and 
                active_jobs_count < 5  # Max jobs threshold
            )
            
            stats_list.append({
                "id": str(tech_id),
                "activeJobs": active_jobs_count,
                "completedThisWeek": completed_this_week,
                "avgRating": avg_rating,
                "isAvailable": is_available
            })
        
        return stats_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technician stats: {str(e)}"
        )

@router.get("/{technician_id}", response_model=Dict[str, Any])
async def get_technician(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    technician_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Get a specific technician by ID"""
    try:
        if not ObjectId.is_valid(technician_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid technician ID"
            )
        
        company_id = ObjectId(current_user["company_id"])
        
        # Get technician
        technician = await db.users.find_one({
            "_id": ObjectId(technician_id),
            "company_id": company_id,
            "role": "technician"
        })
        
        if not technician:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return serialize_technician(technician)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technician: {str(e)}"
        )

@router.put("/{technician_id}", response_model=Dict[str, Any])
async def update_technician(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    technician_id: str,
    technician_update: TechnicianUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Update a technician"""
    try:
        # Verify permissions
        if current_user.get("role") not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and managers can update technicians"
            )
        
        if not ObjectId.is_valid(technician_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid technician ID"
            )
        
        company_id = ObjectId(current_user["company_id"])
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        
        # Update fields if provided
        update_data = technician_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field in ["address", "emergency_contact"] and isinstance(value, dict):
                    # Handle nested objects
                    update_doc[field] = value
                else:
                    update_doc[field] = value
        
        # Update technician
        result = await db.users.update_one(
            {
                "_id": ObjectId(technician_id),
                "company_id": company_id,
                "role": "technician"
            },
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        # Get updated technician
        updated_technician = await db.users.find_one({
            "_id": ObjectId(technician_id)
        })
        
        return {
            "message": "Technician updated successfully",
            "technician": serialize_technician(updated_technician)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update technician: {str(e)}"
        )

@router.patch("/{technician_id}/availability", response_model=Dict[str, Any])
async def update_technician_availability(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    technician_id: str,
    is_available: bool,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Update technician availability status"""
    try:
        if not ObjectId.is_valid(technician_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid technician ID"
            )
        
        company_id = ObjectId(current_user["company_id"])
        
        # Update availability
        result = await db.users.update_one(
            {
                "_id": ObjectId(technician_id),
                "company_id": company_id,
                "role": "technician"
            },
            {
                "$set": {
                    "is_available": is_available,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return {
            "message": f"Technician availability updated to {'available' if is_available else 'unavailable'}",
            "is_available": is_available
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update availability: {str(e)}"
        )

@router.delete("/{technician_id}")
async def delete_technician(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    technician_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Soft delete a technician (set status to inactive)"""
    try:
        # Verify permissions
        if current_user.get("role") not in ["admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete technicians"
            )
        
        if not ObjectId.is_valid(technician_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid technician ID"
            )
        
        company_id = ObjectId(current_user["company_id"])
        
        # Check for active jobs
        active_jobs = await db.jobs.count_documents({
            "company_id": company_id,
            "technician_id": ObjectId(technician_id),
            "status": {"$in": ["scheduled", "in_progress"]}
        })
        
        if active_jobs > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete technician with {active_jobs} active jobs. Please reassign or complete jobs first."
            )
        
        # Soft delete (set status to inactive)
        result = await db.users.update_one(
            {
                "_id": ObjectId(technician_id),
                "company_id": company_id,
                "role": "technician"
            },
            {
                "$set": {
                    "status": "inactive",
                    "is_available": False,
                    "updated_at": datetime.utcnow(),
                    "deactivated_by": ObjectId(current_user["_id"])
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return {"message": "Technician deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete technician: {str(e)}"
        )
    


# ================================
# TECHNICIAN AVATAR ENDPOINTS
# ================================

# Add these to backend/app/api/v1/endpoints/technicians.py (or create if not exists)
from pathlib import Path
from typing import Optional
import uuid
import aiofiles
from PIL import Image
from datetime import datetime
from fastapi import HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.dependencies.auth import get_current_user, get_current_active_user
from app.core.logger import get_logger


@router.post("/me/avatar", response_model=dict)
async def upload_technician_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Upload avatar for technician user"""
    # Ensure user is technician
    if current_user.get("role") != "technician":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only technician users can use this endpoint"
        )
    
    user_id = str(current_user["_id"])
    
    try:
        # Delete old avatar if exists
        old_avatar = current_user.get("avatar_url")
        if old_avatar:
            await delete_avatar_file(old_avatar)
        
        # Process and save new avatar
        avatar_url = await process_and_save_avatar(file, user_id)
        
        # Update user in database
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar_url": avatar_url, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Avatar uploaded successfully for technician {user_id}")
        return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading technician avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )

@router.delete("/me/avatar", response_model=dict)
async def delete_technician_avatar(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete avatar for technician user"""
    # Ensure user is technician
    if current_user.get("role") != "technician":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only technician users can use this endpoint"
        )
    
    user_id = str(current_user["_id"])
    
    try:
        # Get current avatar
        old_avatar = current_user.get("avatar_url")
        if not old_avatar:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No avatar found to delete"
            )
        
        # Delete file from disk
        await delete_avatar_file(old_avatar)
        
        # Update user in database
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$unset": {"avatar_url": ""},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"Avatar deleted successfully for technician {user_id}")
        return {"message": "Avatar deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting technician avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete avatar"
        )
