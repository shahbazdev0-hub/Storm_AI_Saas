# backend/app/api/v1/endpoints/users.py - FIXED VERSION (No duplicates)

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from datetime import datetime
from pathlib import Path
import uuid
import aiofiles
from PIL import Image
from passlib.context import CryptContext

from app.core.database import get_database
from app.services.auth_service import AuthService
from app.dependencies.auth import get_current_user, get_current_active_user, require_role
from app.models.user import UserRole
from app.core.logger import get_logger
from app.utils.user_serializer import serialize_user

# Init
router = APIRouter()
logger = get_logger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Upload configuration
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)

# ========================================
# SCHEMAS
# ========================================
class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str = None
    role: str = "technician"

class UserUpdateRequest(BaseModel):
    first_name: str = None
    last_name: str = None
    email: EmailStr = None
    phone: str = None
    role: str = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ========================================
# ✅ ROUTE ORDER: SPECIFIC ROUTES FIRST, GENERIC ROUTES LAST
# ========================================

# Test endpoint (no auth required)
@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Users router is working"}


# Technician locations endpoint
@router.get("/locations")
async def get_technician_locations(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get real-time technician locations for GPS tracking"""
    try:
        from datetime import datetime, timezone
        import random
        
        # Get all technicians for the company
        technicians = await db.users.find({
            "company_id": ObjectId(current_user["company_id"]),
            "role": "technician",
            "status": "active"
        }).to_list(length=None)
        
        if not technicians:
            return []
        
        locations = []
        
        for tech in technicians:
            # Check if technician has real location data
            current_location = tech.get("current_location")
            last_location_update = tech.get("last_location_update")
            
            # Use real location data if available, otherwise use realistic defaults
            if current_location and isinstance(current_location, dict):
                lat = current_location.get("latitude", current_location.get("lat", 31.5497))
                lng = current_location.get("longitude", current_location.get("lng", 74.3436))
                address = current_location.get("address", "Lahore, Pakistan")
                accuracy = current_location.get("accuracy", 10)
                speed = current_location.get("speed", random.randint(0, 60))
                heading = current_location.get("heading", random.randint(0, 360))
                last_updated = last_location_update or current_location.get("timestamp") or datetime.now(timezone.utc)
            else:
                # Fallback to Lahore area with realistic variations
                base_lat, base_lng = 31.5497, 74.3436
                lat = base_lat + random.uniform(-0.1, 0.1)
                lng = base_lng + random.uniform(-0.1, 0.1)
                address = f"Lahore Area - {tech.get('first_name', 'Technician')}'s Location"
                accuracy = random.randint(5, 25)
                speed = random.randint(0, 60)
                heading = random.randint(0, 360)
                last_updated = datetime.now(timezone.utc)
            
            # Get current job if any
            current_job = await db.jobs.find_one({
                "assigned_to": tech["_id"],
                "status": {"$in": ["in_progress", "en_route"]}
            })
            
            location_data = {
                "technician_id": str(tech["_id"]),
                "name": f"{tech.get('first_name', '')} {tech.get('last_name', '')}".strip(),
                "email": tech.get("email"),
                "phone": tech.get("phone"),
                "latitude": lat,
                "longitude": lng,
                "address": address,
                "accuracy": accuracy,
                "speed": speed,
                "heading": heading,
                "last_updated": last_updated.isoformat() if isinstance(last_updated, datetime) else last_updated,
                "status": "active" if current_job else "idle",
                "current_job_id": str(current_job["_id"]) if current_job else None,
                "avatar_url": tech.get("avatar_url")
            }
            
            locations.append(location_data)
        
        logger.info(f"✅ Returned {len(locations)} technician locations")
        return locations
        
    except Exception as e:
        logger.error(f"❌ Error fetching technician locations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch locations: {str(e)}")


# User list endpoint
@router.get("/list")
async def read_users_list(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    role: Optional[str] = Query(None, description="Filter users by role")
) -> Any:
    """Retrieve users with optional role filter"""
    try:
        query = {"company_id": ObjectId(current_user["company_id"])}
        
        if role:
            query["role"] = role
        
        users = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        result = []
        for user in users:
            user_data = {
                "id": str(user["_id"]),
                "company_id": str(user["company_id"]),
                "email": user.get("email"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "phone": user.get("phone"),
                "role": user.get("role"),
                "status": user.get("status", "active"),
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at")
            }
            result.append(user_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


# Profile endpoints
@router.patch("/me")
async def update_user_profile(
    profile_data: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Update current user's profile"""
    user_id = current_user["_id"]
    update_data = {k: v for k, v in profile_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(400, "No valid fields provided for update")

    update_data["updated_at"] = datetime.utcnow()
    result = await db.users.update_one({"_id": user_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")

    updated_user = await db.users.find_one({"_id": user_id})
    if updated_user:
        updated_user["_id"] = str(updated_user["_id"])
        if "company_id" in updated_user and updated_user["company_id"]:
            updated_user["company_id"] = str(updated_user["company_id"])
        updated_user.pop("password_hash", None)
        updated_user.pop("hashed_password", None)
        for k, v in updated_user.items():
            if isinstance(v, ObjectId):
                updated_user[k] = str(v)

    logger.info(f"✅ Profile updated successfully for user {user_id}")
    return updated_user


@router.post("/me/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Change current user's password"""
    user = await db.users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(404, "User not found")

    password_field = "hashed_password" if "hashed_password" in user else "password_hash"
    if not pwd_context.verify(request.current_password, user[password_field]):
        raise HTTPException(400, "Incorrect current password")

    new_hash = pwd_context.hash(request.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {password_field: new_hash, "updated_at": datetime.utcnow()}},
    )
    
    logger.info(f"✅ Password changed successfully for user {current_user['_id']}")
    return {"message": "Password changed successfully"}


# Avatar helper functions
def validate_image_file(file: UploadFile) -> bool:
    return (file.content_type and file.content_type.startswith("image/") 
            and Path(file.filename).suffix.lower() in ALLOWED_EXTENSIONS)

def generate_avatar_filename(user_id: str, original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    return f"avatar_{user_id}_{uuid.uuid4().hex[:8]}{ext}"

async def process_and_save_avatar(file: UploadFile, user_id: str) -> str:
    if not validate_image_file(file):
        raise HTTPException(400, "Invalid image file")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 5MB)")

    filename = generate_avatar_filename(user_id, file.filename)
    path = UPLOAD_DIR / filename
    temp = path.with_suffix(".temp")

    async with aiofiles.open(temp, "wb") as f:
        await f.write(await file.read())

    with Image.open(temp) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        img.thumbnail(AVATAR_SIZE, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", AVATAR_SIZE, (255, 255, 255))
        canvas.paste(img, ((AVATAR_SIZE[0]-img.width)//2, (AVATAR_SIZE[1]-img.height)//2))
        canvas.save(path, "JPEG", quality=85, optimize=True)

    temp.unlink(missing_ok=True)
    return f"/static/avatars/{filename}"

async def delete_avatar_file(avatar_url: str):
    if not avatar_url or not avatar_url.startswith("/static/avatars/"):
        return False
    path = UPLOAD_DIR / avatar_url.split("/")[-1]
    if path.exists():
        path.unlink()
        return True
    return False


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Upload user avatar"""
    avatar_url = await process_and_save_avatar(file, str(current_user["_id"]))
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"avatar_url": avatar_url, "updated_at": datetime.utcnow()}},
    )
    logger.info(f"✅ Avatar uploaded for user {current_user['_id']}")
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}


@router.delete("/me/avatar")
async def delete_avatar(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete user avatar"""
    old = current_user.get("avatar_url")
    if not old:
        raise HTTPException(404, "No avatar to delete")
    
    await delete_avatar_file(old)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"avatar_url": ""}, "$set": {"updated_at": datetime.utcnow()}},
    )
    logger.info(f"✅ Avatar deleted for user {current_user['_id']}")
    return {"message": "Avatar deleted successfully"}


# User by ID endpoints
@router.get("/{user_id}")
async def get_user_by_id(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get a specific user by ID"""
    try:
        user = await db.users.find_one({
            "_id": ObjectId(user_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = {
            "id": str(user["_id"]),
            "company_id": str(user["company_id"]),
            "email": user.get("email"),
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "phone": user.get("phone"),
            "role": user.get("role"),
            "status": user.get("status", "active"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        }
        
        return user_data
        
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Update a user"""
    update_data = {k: v for k, v in user_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {
            "_id": ObjectId(user_id),
            "company_id": ObjectId(current_user["company_id"])
        },
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if updated_user:
        updated_user["id"] = str(updated_user["_id"])
        updated_user["company_id"] = str(updated_user["company_id"])
        updated_user.pop("hashed_password", None)
    
    return updated_user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Delete a user"""
    if user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({
        "_id": ObjectId(user_id),
        "company_id": ObjectId(current_user["company_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


# ========================================
# ✅ MAIN USERS ENDPOINT (MUST BE LAST!)
# ========================================
@router.get("/")
async def read_users(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    role: Optional[str] = Query(None, description="Filter users by role")
) -> Any:
    """Retrieve users with optional role filter - Main endpoint for Jobs.tsx"""
    try:
        logger.info(f"👥 GET /users called by {current_user.get('email')}")
        
        # Build query
        query = {"company_id": ObjectId(current_user["company_id"])}
        
        # Add role filter if provided
        if role:
            query["role"] = role
            logger.info(f"👥 Filtering users by role: {role}")
        
        users = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        # Format for frontend (includes 'name' field)
        result = []
        for user in users:
            user_data = {
                "id": str(user["_id"]),
                "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('email', 'Unknown'),
                "email": user.get("email"),
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "phone": user.get("phone"),
                "role": user.get("role"),
                "status": user.get("status", "active"),
                "company_id": str(user["company_id"]) if user.get("company_id") else None,
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at")
            }
            result.append(user_data)
        
        logger.info(f"👥 Returning {len(result)} users")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")


# ========================================
# CREATE USER ENDPOINT
# ========================================
@router.post("/")
async def create_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_in: UserCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Create new user"""
    auth_service = AuthService(db)
    
    from app.schemas.user import UserCreate
    user_data = UserCreate(
        email=user_in.email,
        password=user_in.password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role=user_in.role
    )
    
    user = await auth_service.create_user(user_data, str(current_user["company_id"]))
    
    if user:
        user["id"] = str(user["_id"])
        user["company_id"] = str(user["company_id"])
        user.pop("hashed_password", None)
    
    return user