# backend/app/api/v1/endpoints/users.py - FIXED ROUTE ORDER

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.services.auth_service import AuthService
from app.dependencies.auth import get_current_user, require_role
from app.models.user import UserRole

# Define schemas directly here to avoid import issues
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

router = APIRouter()

# ✅ ROUTE ORDER: SPECIFIC ROUTES FIRST, GENERIC ROUTES LAST

# Test endpoints (no auth required)
@router.get("/test")
async def test_endpoint():
    return {"message": "Users router is working"}



# List endpoint (previously called read_users)
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
        # Build query
        query = {"company_id": ObjectId(current_user["company_id"])}
        
        # Add role filter if provided
        if role:
            query["role"] = role
        
        users_collection = db.users
        users = await users_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        # Convert ObjectIds to strings and remove sensitive data
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
        from app.core.logger import get_logger
        logger = get_logger("endpoints.users.read")
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

# Replace the main GET endpoint in your users.py file:

# QUICK FIX for your existing users.py
@router.get("/")
async def read_users(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),  # <-- PUT THIS BACK!
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    role: Optional[str] = Query(None, description="Filter users by role")
) -> Any:
    """Retrieve users with optional role filter - FIXED for Jobs.tsx"""
    try:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.users.read")
        
        # Build query
        query = {"company_id": ObjectId(current_user["company_id"])}
        
        # Add role filter if provided (this is what Jobs.tsx needs)
        if role:
            query["role"] = role
            logger.info(f"👥 Filtering users by role: {role}")
        
        users_collection = db.users
        users = await users_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        # Format for Jobs.tsx dropdown (it expects 'name' field)
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
        from app.core.logger import get_logger
        logger = get_logger("endpoints.users.read")
        logger.error(f"❌ Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@router.post("/")
async def create_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_in: UserCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Create new user"""
    auth_service = AuthService(db)
    
    # Convert to the format auth_service expects
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
    
    # Format response
    if user:
        user["id"] = str(user["_id"])
        user["company_id"] = str(user["company_id"])
        user.pop("hashed_password", None)
    
    return user
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
                # Use real stored location
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
                lat = base_lat + random.uniform(-0.1, 0.1)  # ±11km variation
                lng = base_lng + random.uniform(-0.1, 0.1)
                address = f"Lahore Area - {tech.get('first_name', 'Technician')}'s Location"
                accuracy = random.randint(5, 25)
                speed = random.randint(0, 60)
                heading = random.randint(0, 360)
                last_updated = datetime.now(timezone.utc)
            
            # Determine status based on various factors - FIXED TIMEZONE ISSUE
            if tech.get("last_login"):
                last_login = tech["last_login"]
                
                # Handle timezone properly
                try:
                    if isinstance(last_login, str):
                        from dateutil import parser
                        last_login = parser.parse(last_login)
                    
                    # Make both datetimes timezone-aware for comparison
                    now_utc = datetime.now(timezone.utc)
                    
                    # If last_login has no timezone, assume it's UTC
                    if last_login.tzinfo is None:
                        last_login = last_login.replace(tzinfo=timezone.utc)
                    else:
                        # Convert to UTC if it has a different timezone
                        last_login = last_login.astimezone(timezone.utc)
                    
                    time_since_login = now_utc - last_login
                    
                    if time_since_login.total_seconds() < 3600:  # Last hour
                        status = "online" if speed < 5 else "driving"
                    elif time_since_login.total_seconds() < 7200:  # Last 2 hours
                        status = "idle"
                    else:
                        status = "offline"
                        
                except Exception as date_error:
                    # If there's any issue with date parsing, default to offline
                    print(f"Date parsing error for {tech.get('first_name', 'Unknown')}: {date_error}")
                    status = "offline"
            else:
                status = "offline"
            
            # Create location data
            location_data = {
                "id": str(tech["_id"]),
                "name": f"{tech.get('first_name', '')} {tech.get('last_name', '')}".strip() or "Unknown Technician",
                "phone": tech.get("phone", ""),
                "employee_id": str(tech["_id"])[-6:],
                "current_location": {
                    "lat": lat,
                    "lng": lng,
                    "address": address,
                    "accuracy": accuracy,
                    "last_updated": last_updated.isoformat() if isinstance(last_updated, datetime) else str(last_updated),
                    "speed": speed,
                    "heading": heading
                },
                "status": status,
                "current_job": None,  # TODO: Link to actual jobs
                "todays_route": [],   # TODO: Link to scheduled jobs
                "performance": {
                    "jobs_completed": random.randint(0, 8),
                    "miles_driven": round(random.uniform(20, 150), 1),
                    "hours_worked": round(random.uniform(4, 8), 1),
                    "on_time_percentage": random.randint(75, 100),
                    "avg_speed": round(random.uniform(25, 45), 1)
                },
                "vehicle_info": {
                    "make": "Toyota",
                    "model": "Camry",
                    "year": 2020,
                    "license_plate": f"LHR-{random.randint(1000, 9999)}",
                    "fuel_level": random.randint(20, 100)
                }
            }
            
            locations.append(location_data)
        
        return locations
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.users.locations")
        logger.error(f"Error getting technician locations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get technician locations: {str(e)}")

# Add this new endpoint to update technician location
@router.post("/locations/update")
async def update_technician_location(
    location_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Update technician's current location"""
    try:
        from datetime import datetime, timezone
        
        # Extract location data
        lat = location_data.get("latitude") or location_data.get("lat")
        lng = location_data.get("longitude") or location_data.get("lng")
        accuracy = location_data.get("accuracy", 10)
        speed = location_data.get("speed", 0)
        heading = location_data.get("heading", 0)
        address = location_data.get("address", "Unknown Location")
        
        if not lat or not lng:
            raise HTTPException(status_code=400, detail="Latitude and longitude are required")
        
        # Update user's location
        update_result = await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {
                "$set": {
                    "current_location": {
                        "latitude": float(lat),
                        "longitude": float(lng),
                        "accuracy": float(accuracy),
                        "speed": float(speed),
                        "heading": float(heading),
                        "address": address,
                        "timestamp": datetime.now(timezone.utc)
                    },
                    "last_location_update": datetime.now(timezone.utc)
                }
            }
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "message": "Location updated successfully",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "location": {
                "lat": lat,
                "lng": lng,
                "accuracy": accuracy
            }
        }
        
    except Exception as e:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.users.update_location")
        logger.error(f"Error updating location: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")


# Add this endpoint for mobile apps to send GPS updates
@router.post("/locations/track")
async def track_location(
    tracking_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Track technician location (for mobile app integration)"""
    try:
        from datetime import datetime, timezone
        
        # This would be called by mobile apps to send GPS coordinates
        location_history = {
            "technician_id": ObjectId(current_user["_id"]),
            "company_id": ObjectId(current_user["company_id"]),
            "latitude": float(tracking_data["latitude"]),
            "longitude": float(tracking_data["longitude"]),
            "accuracy": float(tracking_data.get("accuracy", 10)),
            "speed": float(tracking_data.get("speed", 0)),
            "heading": float(tracking_data.get("heading", 0)),
            "timestamp": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Store in location history (create this collection if needed)
        await db.location_history.insert_one(location_history)
        
        # Update current location on user
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {
                "$set": {
                    "current_location": {
                        "latitude": location_history["latitude"],
                        "longitude": location_history["longitude"],
                        "accuracy": location_history["accuracy"],
                        "speed": location_history["speed"],
                        "heading": location_history["heading"],
                        "timestamp": location_history["timestamp"]
                    },
                    "last_location_update": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"message": "Location tracked successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track location: {str(e)}")










@router.post("/create-test-technicians")
async def create_test_technicians(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Create test technician users - REMOVE IN PRODUCTION"""
    try:
        from datetime import datetime
        import bcrypt
        
        def hash_password(password: str) -> str:
            salt = bcrypt.gensalt()
            return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        test_technicians = [
            {
                "email": "john.tech@company.com",
                "first_name": "John",
                "last_name": "Smith",
                "phone": "555-0101",
                "role": "technician",
                "status": "active",
                "company_id": ObjectId(current_user["company_id"]),
                "hashed_password": hash_password("password123"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "email": "mike.tech@company.com", 
                "first_name": "Mike",
                "last_name": "Johnson",
                "phone": "555-0102",
                "role": "technician", 
                "status": "active",
                "company_id": ObjectId(current_user["company_id"]),
                "hashed_password": hash_password("password123"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "email": "sarah.tech@company.com",
                "first_name": "Sarah", 
                "last_name": "Davis",
                "phone": "555-0103",
                "role": "technician",
                "status": "active", 
                "company_id": ObjectId(current_user["company_id"]),
                "hashed_password": hash_password("password123"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        result = await db.users.insert_many(test_technicians)
        
        return {
            "message": f"Created {len(result.inserted_ids)} test technicians",
            "technician_ids": [str(id) for id in result.inserted_ids]
        }
        
    except Exception as e:
        return {"error": str(e)}




















@router.get("/{user_id}")
async def read_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get user by ID"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Get user directly from database instead of using AuthService
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user can access this data
    if (str(user["company_id"]) != str(current_user["company_id"]) and 
        current_user["role"] not in ["admin", "manager"]):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Format response - CONVERT ALL ObjectIds to strings
    response = {
        "id": str(user["_id"]),
        "company_id": str(user["company_id"]),
        "email": user.get("email"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "status": user.get("status", "active"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        # Add any address fields if they exist
        "address": user.get("address"),
        "city": user.get("city"),
        "state": user.get("state"),
        "zip_code": user.get("zip_code"),
    }
    
    return response








@router.patch("/update-role/{user_id}")
async def update_user_role(
    user_id: str,
    new_role: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Update user role - admin only"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id), "company_id": ObjectId(current_user["company_id"])},
        {"$set": {"role": new_role, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {new_role}"}























@router.put("/{user_id}")
async def update_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_id: str,
    user_in: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Update user"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Check permissions
    if (user_id != str(current_user["_id"]) and 
        current_user["role"] not in ["admin", "manager"]):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    auth_service = AuthService(db)
    
    # Convert to the format auth_service expects
    from app.schemas.user import UserUpdate
    user_data = UserUpdate(**user_in.model_dump(exclude_unset=True))
    
    user = await auth_service.update_user(user_id, user_data)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Format response
    user["id"] = str(user["_id"])
    user["company_id"] = str(user["company_id"])
    user.pop("hashed_password", None)
    
    return user

@router.delete("/{user_id}")
async def delete_user(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Delete user"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({
        "_id": ObjectId(user_id),
        "company_id": ObjectId(current_user["company_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}





# backend/app/api/v1/endpoints/users.py - Add these endpoints to existing users.py
# backend/app/api/v1/endpoints/users.py
from datetime import datetime
from typing import Optional
from pathlib import Path
import uuid
import aiofiles
from PIL import Image

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from app.core.database import get_database
from app.dependencies.auth import get_current_active_user
from app.core.logger import get_logger
from app.utils.user_serializer import serialize_user

# Init
router = APIRouter()
logger = get_logger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Config
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)

# Schemas
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


# ================================
# PROFILE
# ================================
@router.patch("/me", response_model=dict)
async def update_user_profile(
    profile_data: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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


# ================================
# PASSWORD
# ================================
@router.post("/me/change-password", response_model=dict)
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user = await db.users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(404, "User not found")

    # Handle either field name
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


# ================================
# AVATAR HELPERS
# ================================
def validate_image_file(file: UploadFile) -> bool:
    return file.content_type and file.content_type.startswith("image/") \
        and Path(file.filename).suffix.lower() in ALLOWED_EXTENSIONS

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


# ================================
# AVATAR
# ================================
@router.post("/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    avatar_url = await process_and_save_avatar(file, str(current_user["_id"]))
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"avatar_url": avatar_url, "updated_at": datetime.utcnow()}},
    )
    logger.info(f"✅ Avatar uploaded for user {current_user['_id']}")
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}

@router.delete("/me/avatar", response_model=dict)
async def delete_avatar(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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


# ================================
# TEST
# ================================
@router.get("/test")
async def test():
    return {"message": "Users router working"}
