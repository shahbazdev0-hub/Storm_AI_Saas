# app/models/user.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

class PyObjectId(ObjectId):
    """Custom ObjectId class for Pydantic v2"""
    
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_wrap_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )
    
    @classmethod
    def validate(cls, v, handler=None):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            try:
                return ObjectId(v)
            except Exception:
                raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId")

class UserRole(str, Enum):
    """User roles in the system"""
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    SALES = "sales"
    CUSTOMER = "customer"
    SUPPORT = "support"

class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class UserPermission(str, Enum):
    """User permissions"""
    # Contact permissions
    CONTACTS_VIEW = "contacts:view"
    CONTACTS_CREATE = "contacts:create"
    CONTACTS_EDIT = "contacts:edit"
    CONTACTS_DELETE = "contacts:delete"
    
    # Lead permissions
    LEADS_VIEW = "leads:view"
    LEADS_CREATE = "leads:create"
    LEADS_EDIT = "leads:edit"
    LEADS_DELETE = "leads:delete"
    LEADS_ASSIGN = "leads:assign"
    
    # Job permissions
    JOBS_VIEW = "jobs:view"
    JOBS_CREATE = "jobs:create"
    JOBS_EDIT = "jobs:edit"
    JOBS_DELETE = "jobs:delete"
    JOBS_ASSIGN = "jobs:assign"
    
    # Estimate permissions
    ESTIMATES_VIEW = "estimates:view"
    ESTIMATES_CREATE = "estimates:create"
    ESTIMATES_EDIT = "estimates:edit"
    ESTIMATES_DELETE = "estimates:delete"
    ESTIMATES_SEND = "estimates:send"
    
    # Invoice permissions
    INVOICES_VIEW = "invoices:view"
    INVOICES_CREATE = "invoices:create"
    INVOICES_EDIT = "invoices:edit"
    INVOICES_DELETE = "invoices:delete"
    INVOICES_SEND = "invoices:send"
    
    # Analytics permissions
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"
    
    # Admin permissions
    USERS_MANAGE = "users:manage"
    COMPANY_SETTINGS = "company:settings"
    INTEGRATIONS_MANAGE = "integrations:manage"
    AI_FLOWS_MANAGE = "ai_flows:manage"

class UserPreferences(BaseModel):
    """User preferences and settings"""
    model_config = ConfigDict(extra="allow")
    
    theme: str = "light"
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = "MM/DD/YYYY"
    time_format: str = "12h"
    notifications_email: bool = True
    notifications_sms: bool = True
    notifications_browser: bool = True
    dashboard_layout: Dict[str, Any] = Field(default_factory=dict)
    items_per_page: int = 25

class UserProfile(BaseModel):
    """Extended user profile information"""
    model_config = ConfigDict(extra="allow")
    
    bio: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    employee_id: Optional[str] = None
    hire_date: Optional[datetime] = None
    manager_id: Optional[PyObjectId] = None
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    emergency_contact: Optional[Dict[str, str]] = None
    address: Optional[Dict[str, str]] = None

class User(BaseModel):
    """User model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    
    # System fields
    role: UserRole = Field(default=UserRole.TECHNICIAN, description="User role")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="Account status")
    company_id: PyObjectId = Field(..., description="Company ID")
    hashed_password: str = Field(..., description="Hashed password")
    
    # Profile information
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    profile: UserProfile = Field(default_factory=UserProfile, description="Extended profile")
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="User preferences")
    
    # Permissions and access
    permissions: List[UserPermission] = Field(default_factory=list, description="User permissions")
    is_superuser: bool = Field(default=False, description="Superuser flag")
    is_email_verified: bool = Field(default=False, description="Email verification status")
    is_phone_verified: bool = Field(default=False, description="Phone verification status")
    
    # Authentication
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(default=0, description="Login count")
    failed_login_attempts: int = Field(default=0, description="Failed login attempts")
    account_locked_until: Optional[datetime] = Field(None, description="Account lock expiry")
    password_changed_at: Optional[datetime] = Field(None, description="Password change timestamp")
    
    # API access
    api_key: Optional[str] = Field(None, description="API key for integrations")
    api_key_created_at: Optional[datetime] = Field(None, description="API key creation time")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")
    deleted_at: Optional[datetime] = Field(None, description="Soft delete timestamp")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="User tags")
    
    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v):
        """Validate and normalize email"""
        if isinstance(v, str):
            return v.lower().strip()
        return v
    
    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format"""
        if v is None:
            return v
        
        # Remove all non-digit characters
        import re
        phone_digits = re.sub(r'\D', '', str(v))
        
        # Validate length (10-15 digits)
        if not (10 <= len(phone_digits) <= 15):
            raise ValueError("Phone number must be 10-15 digits")
        
        return phone_digits
    
    @property
    def full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def display_name(self) -> str:
        """Get display name"""
        return self.full_name
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == UserRole.ADMIN or self.is_superuser
    
    @property
    def is_manager(self) -> bool:
        """Check if user is manager or above"""
        return self.role in [UserRole.ADMIN, UserRole.MANAGER] or self.is_superuser
    
    @property
    def is_active(self) -> bool:
        """Check if user account is active"""
        if self.status != UserStatus.ACTIVE:
            return False
        
        if self.account_locked_until and self.account_locked_until > datetime.utcnow():
            return False
        
        if self.deleted_at:
            return False
        
        return True
    
    @property
    def is_locked(self) -> bool:
        """Check if account is locked"""
        return (self.account_locked_until and 
                self.account_locked_until > datetime.utcnow())
    
    def has_permission(self, permission: UserPermission) -> bool:
        """Check if user has specific permission"""
        if self.is_superuser:
            return True
        
        if self.role == UserRole.ADMIN:
            return True
        
        return permission in self.permissions
    
    def has_any_permission(self, permissions: List[UserPermission]) -> bool:
        """Check if user has any of the specified permissions"""
        return any(self.has_permission(perm) for perm in permissions)
    
    def can_access_company_data(self, company_id: PyObjectId) -> bool:
        """Check if user can access data for specific company"""
        return str(self.company_id) == str(company_id)
    
    def update_last_login(self) -> None:
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
        self.login_count += 1
        self.failed_login_attempts = 0  # Reset failed attempts on successful login
        self.updated_at = datetime.utcnow()
    
    def lock_account(self, duration_minutes: int = 30) -> None:
        """Lock user account for specified duration"""
        from datetime import timedelta
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.updated_at = datetime.utcnow()
    
    def unlock_account(self) -> None:
        """Unlock user account"""
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.updated_at = datetime.utcnow()
    
    def soft_delete(self) -> None:
        """Soft delete user"""
        self.deleted_at = datetime.utcnow()
        self.status = UserStatus.INACTIVE
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft-deleted user"""
        self.deleted_at = None
        self.status = UserStatus.ACTIVE
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, exclude_sensitive: bool = True) -> Dict[str, Any]:
        """Convert to dictionary, optionally excluding sensitive data"""
        data = self.model_dump(by_alias=True)
        
        if exclude_sensitive:
            # Remove sensitive fields
            sensitive_fields = [
                "hashed_password", 
                "api_key", 
                "failed_login_attempts",
                "account_locked_until"
            ]
            for field in sensitive_fields:
                data.pop(field, None)
        
        # Convert ObjectId to string
        if data.get("_id"):
            data["id"] = str(data["_id"])
        
        if data.get("company_id"):
            data["company_id"] = str(data["company_id"])
        
        return data

# Role-based permission mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [perm for perm in UserPermission],  # All permissions
    
    UserRole.MANAGER: [
        UserPermission.CONTACTS_VIEW,
        UserPermission.CONTACTS_CREATE,
        UserPermission.CONTACTS_EDIT,
        UserPermission.LEADS_VIEW,
        UserPermission.LEADS_CREATE,
        UserPermission.LEADS_EDIT,
        UserPermission.LEADS_ASSIGN,
        UserPermission.JOBS_VIEW,
        UserPermission.JOBS_CREATE,
        UserPermission.JOBS_EDIT,
        UserPermission.JOBS_ASSIGN,
        UserPermission.ESTIMATES_VIEW,
        UserPermission.ESTIMATES_CREATE,
        UserPermission.ESTIMATES_EDIT,
        UserPermission.ESTIMATES_SEND,
        UserPermission.INVOICES_VIEW,
        UserPermission.INVOICES_CREATE,
        UserPermission.INVOICES_EDIT,
        UserPermission.INVOICES_SEND,
        UserPermission.ANALYTICS_VIEW,
        UserPermission.ANALYTICS_EXPORT,
    ],
    
    UserRole.SALES: [
        UserPermission.CONTACTS_VIEW,
        UserPermission.CONTACTS_CREATE,
        UserPermission.CONTACTS_EDIT,
        UserPermission.LEADS_VIEW,
        UserPermission.LEADS_CREATE,
        UserPermission.LEADS_EDIT,
        UserPermission.ESTIMATES_VIEW,
        UserPermission.ESTIMATES_CREATE,
        UserPermission.ESTIMATES_EDIT,
        UserPermission.ESTIMATES_SEND,
        UserPermission.ANALYTICS_VIEW,
    ],
    
    UserRole.TECHNICIAN: [
        UserPermission.CONTACTS_VIEW,
        UserPermission.JOBS_VIEW,
        UserPermission.JOBS_EDIT,
        UserPermission.ESTIMATES_VIEW,
    ],
    
    UserRole.SUPPORT: [
        UserPermission.CONTACTS_VIEW,
        UserPermission.CONTACTS_CREATE,
        UserPermission.CONTACTS_EDIT,
        UserPermission.JOBS_VIEW,
        UserPermission.INVOICES_VIEW,
    ],
    
    UserRole.CUSTOMER: [
        # Customers have limited permissions via customer portal
    ],
}

def get_default_permissions(role: UserRole) -> List[UserPermission]:
    """Get default permissions for a role"""
    return ROLE_PERMISSIONS.get(role, [])

# Export model and utilities
__all__ = [
    "User",
    "UserRole", 
    "UserStatus",
    "UserPermission",
    "UserPreferences",
    "UserProfile",
    "PyObjectId",
    "ROLE_PERMISSIONS",
    "get_default_permissions"
]