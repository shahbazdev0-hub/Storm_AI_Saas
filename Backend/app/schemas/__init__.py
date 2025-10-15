# # =============================================================================
# # app/schemas/__init__.py - CORRECTED BASED ON ACTUAL USER.PY
# # =============================================================================
# """
# Pydantic schemas for AI-Enhanced SaaS CRM
# """
# from pydantic import BaseModel, Field, EmailStr, ConfigDict
# from typing import Optional, List, Dict, Any
# from datetime import datetime

# # Import ONLY the schemas that actually exist in user.py
# from .user import (
#     # Base schemas (these exist in your user.py)
#     UserBase,
#     UserCreate, 
#     UserUpdate,
#     UserPreferencesUpdate,
#     UserProfileUpdate,
#     UserPermissionsUpdate,
    
#     # Response schemas (these exist)
#     UserResponse,
#     UserListResponse,
    
#     # Authentication schemas (these exist)
#     UserLogin,
#     UserRegister,
#     Token,
#     TokenPayload,
#     RefreshToken,
    
#     # Password management (these exist)
#     PasswordChange,
#     PasswordReset,
#     PasswordResetConfirm,
    
#     # Account management (these exist)
#     AccountActivation,
#     EmailVerification,
#     PhoneVerification,
    
#     # API key management (these exist)
#     APIKeyGenerate,
#     APIKeyResponse,
    
#     # Response schemas (these exist)
#     UserErrorResponse,
#     UserSuccessResponse,
    
#     # Alias that you added at the bottom of user.py
#     User
# )

# # Don't import from files that don't exist yet
# # from .contact import ...
# # from .lead import ...
# # etc.

# # Version information
# __version__ = "1.0.0"

# # Export only what actually exists
# __all__ = [
#     # User schemas (these all exist in your user.py)
#     "UserBase",
#     "UserCreate", 
#     "UserUpdate",
#     "UserPreferencesUpdate",
#     "UserProfileUpdate", 
#     "UserPermissionsUpdate",
#     "UserResponse",
#     "UserListResponse",
#     "UserLogin",
#     "UserRegister",
#     "Token",
#     "TokenPayload", 
#     "RefreshToken",
#     "PasswordChange",
#     "PasswordReset",
#     "PasswordResetConfirm",
#     "AccountActivation",
#     "EmailVerification",
#     "PhoneVerification",
#     "APIKeyGenerate",
#     "APIKeyResponse",
#     "UserErrorResponse",
#     "UserSuccessResponse",
#     "User",
# ]

# # Schema registry
# SCHEMA_REGISTRY = {
#     "user_create": UserCreate,
#     "user_update": UserUpdate,
#     "user_response": UserResponse,
#     "user_login": UserLogin,
#     "user_register": UserRegister,
#     "user": User,
# }

# def get_schema_class(schema_name: str):
#     """Get schema class by name"""
#     return SCHEMA_REGISTRY.get(schema_name.lower())

# def list_schemas():
#     """List all available schemas"""
#     return list(SCHEMA_REGISTRY.keys())

# # Common response schemas
# class MessageResponse(BaseModel):
#     """Generic message response schema"""
#     model_config = ConfigDict(extra="forbid")
    
#     message: str = Field(..., description="Response message")
#     success: bool = Field(default=True, description="Success flag")
#     data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

# class ErrorResponse(BaseModel):
#     """Generic error response schema"""
#     model_config = ConfigDict(extra="forbid")
    
#     error: str = Field(..., description="Error type")
#     message: str = Field(..., description="Error message")
#     details: Optional[Dict[str, Any]] = Field(None, description="Error details")
#     timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

# class PaginationResponse(BaseModel):
#     """Generic pagination response schema"""
#     model_config = ConfigDict(extra="forbid")
    
#     page: int = Field(..., description="Current page")
#     size: int = Field(..., description="Page size")
#     total: int = Field(..., description="Total items")
#     pages: int = Field(..., description="Total pages")
#     has_next: bool = Field(..., description="Has next page")
#     has_prev: bool = Field(..., description="Has previous page")

# # Add common schemas to exports
# __all__.extend([
#     "MessageResponse",
#     "ErrorResponse", 
#     "PaginationResponse",
#     "get_schema_class",
#     "list_schemas"
# ])






















































# backend/app/schemas/__init__.py - MINIMAL VERSION
"""
Schemas package - minimal version to avoid import issues
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

# Common response schemas only
class MessageResponse(BaseModel):
    """Generic message response schema"""
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., description="Response message")
    success: bool = Field(default=True, description="Success flag")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

class ErrorResponse(BaseModel):
    """Generic error response schema"""
    model_config = ConfigDict(extra="forbid")
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

# Export only what we define here
__all__ = [
    "MessageResponse",
    "ErrorResponse"
]