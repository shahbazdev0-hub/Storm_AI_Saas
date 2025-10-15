# app/services/auth_service.py - FIXED VERSION
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.core.logger import get_logger
from app.models.user import UserRole, UserStatus, get_default_permissions

# Import the schemas that now exist
from app.schemas.user import UserCreate, UserUpdate, UserLogin

logger = get_logger("services.auth")

class AuthService:
    """Authentication and user management service"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.users_collection = database.users
        self.companies_collection = database.companies
        self.sessions_collection = database.user_sessions
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        try:
            # Find user by email
            user = await self.users_collection.find_one(
                {"email": email.lower().strip()}
            )
            
            if not user:
                logger.warning(f"Authentication failed - user not found: {email}")
                return None
            
            # Verify password
            if not verify_password(password, user["hashed_password"]):
                logger.warning(f"Authentication failed - invalid password: {email}")
                await self._increment_failed_attempts(user["_id"])
                return None
            
            # Check if account is active
            if user.get("status") != "active":
                logger.warning(f"Authentication failed - account inactive: {email}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is not active"
                )
            
            # Update login information
            await self._update_login_info(user["_id"])
            
            logger.info(f"User authenticated successfully: {email}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error authenticating user {email}: {e}")
            return None
    
    async def create_user(self, user_data: UserCreate, company_id: str = None) -> Dict[str, Any]:
        """Create a new user"""
        try:
            print(f"🔧 AuthService.create_user called with: {user_data}")
            
            # Check if user already exists
            existing_user = await self.users_collection.find_one(
                {"email": user_data.email.lower().strip()}
            )
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
            
            # Create company if this is the first user (admin registration)
            if not company_id:
                company_data = {
                    "name": f"{user_data.first_name} {user_data.last_name}'s Company",
                    "industry": "service",
                    "status": "active",
                    "settings": {},
                    "ai_settings": {},
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                company_result = await self.companies_collection.insert_one(company_data)
                company_id = str(company_result.inserted_id)
                user_role = UserRole.ADMIN
                
                logger.info(f"Created new company: {company_id}")
            else:
                user_role = user_data.role
            
            # Prepare user data
            user_doc = {
                "email": user_data.email.lower().strip(),
                "first_name": user_data.first_name,
                "last_name": user_data.last_name,
                "phone": user_data.phone,
                "role": user_role,
                "status": "active",
                "company_id": ObjectId(company_id),
                "hashed_password": get_password_hash(user_data.password),
                "permissions": get_default_permissions(user_role),
                "is_superuser": user_role == UserRole.ADMIN,
                "is_email_verified": False,
                "is_phone_verified": False,
                "login_count": 0,
                "failed_login_attempts": 0,
                "profile": {
                    "bio": None,
                    "department": None,
                    "job_title": None,
                    "employee_id": None,
                    "hire_date": None,
                    "skills": [],
                    "certifications": []
                },
                "preferences": {
                    "theme": "light",
                    "language": "en", 
                    "timezone": "UTC",
                    "date_format": "MM/DD/YYYY",
                    "time_format": "12h",
                    "notifications_email": True,
                    "notifications_sms": True,
                    "notifications_browser": True,
                    "items_per_page": 25
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_manager": user_role in [UserRole.ADMIN, UserRole.MANAGER]
            }
            
            print(f"🔧 About to insert user: {user_doc}")
            
            # Insert user
            result = await self.users_collection.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            
            logger.info(f"Created new user: {user_data.email}")
            print(f"✅ User created successfully: {result.inserted_id}")
            
            return user_doc
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating user {user_data.email}: {e}")
            print(f"❌ Error creating user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            if not ObjectId.is_valid(user_id):
                return None
            
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            return user
            
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            user = await self.users_collection.find_one(
                {"email": email.lower().strip()}
            )
            return user
            
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[Dict[str, Any]]:
        """Update user information"""
        try:
            if not ObjectId.is_valid(user_id):
                return None
            
            update_doc = {"updated_at": datetime.utcnow()}
            
            # Update basic fields
            for field, value in user_data.model_dump(exclude_unset=True).items():
                if field == "password":
                    update_doc["hashed_password"] = get_password_hash(value)
                    update_doc["password_changed_at"] = datetime.utcnow()
                elif value is not None:
                    update_doc[field] = value
            
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_doc}
            )
            
            if result.modified_count:
                updated_user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
                logger.info(f"Updated user: {user_id}")
                return updated_user
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return None
    
    # Private helper methods
    async def _increment_failed_attempts(self, user_id: ObjectId) -> None:
        """Increment failed login attempts"""
        try:
            await self.users_collection.update_one(
                {"_id": user_id},
                {
                    "$inc": {"failed_login_attempts": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        except Exception as e:
            logger.error(f"Error incrementing failed attempts for {user_id}: {e}")
    
    async def _update_login_info(self, user_id: ObjectId) -> None:
        """Update user login information"""
        try:
            await self.users_collection.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "last_login": datetime.utcnow(),
                        "failed_login_attempts": 0,
                        "updated_at": datetime.utcnow()
                    },
                    "$inc": {"login_count": 1}
                }
            )
        except Exception as e:
            logger.error(f"Error updating login info for {user_id}: {e}")