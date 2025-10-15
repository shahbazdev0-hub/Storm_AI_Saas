# backend/app/schemas/user.py - FIXED UserResponse Schema
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict

from app.models.user import UserRole, UserStatus, UserPermission

# Response schemas
class UserResponse(BaseModel):
    """Schema for user response"""
    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore"  # 🔧 CHANGED: from "forbid" to "ignore" to allow extra fields
    )
    
    id: str = Field(..., description="User ID")
    company_id: str = Field(..., description="Company ID")
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="Account status")
    permissions: List[UserPermission] = Field(default_factory=list, description="User permissions")
    is_email_verified: bool = Field(default=False, description="Email verification status")
    is_phone_verified: bool = Field(default=False, description="Phone verification status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # 🔧 ADD: Include the extra fields that your backend is returning
    is_superuser: Optional[bool] = Field(default=False, description="Superuser status")
    login_count: Optional[int] = Field(default=0, description="Login count")
    profile: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User profile")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User preferences")
    is_manager: Optional[bool] = Field(default=False, description="Manager status")
    
    # Computed fields
    full_name: str = Field(..., description="Full name")
    display_name: str = Field(..., description="Display name")
    is_active: bool = Field(..., description="Active status")
    is_admin: bool = Field(..., description="Admin status")




# backend/app/schemas/user.py - ADD THESE CLASSES AT THE END

# Add these classes at the very end of your existing user.py file:

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole

# These are the classes that auth_service.py is looking for:

class UserCreate(BaseModel):
    """Schema for creating a new user - matches what auth_service expects"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password")
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    role: UserRole = Field(default=UserRole.TECHNICIAN, description="User role")

class UserUpdate(BaseModel):
    """Schema for updating user information"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    role: Optional[UserRole] = Field(None, description="User role")
    password: Optional[str] = Field(None, min_length=8, description="New password")

class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

# Update your __all__ export at the bottom to include these:
__all__ = [
    # ... your existing exports ...
    "UserCreate",
    "UserUpdate", 
    "UserLogin",
    # ... rest of your exports ...
]