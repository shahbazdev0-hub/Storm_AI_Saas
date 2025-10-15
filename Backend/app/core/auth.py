# backend/app/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from .config import get_database
from ..models.user import User
from .config import settings

# Security scheme
security = HTTPBearer()

# JWT settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class PermissionError(HTTPException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> User:
    """Get current authenticated user"""
    
    # Verify token
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise AuthenticationError()
    
    # Get user ID from token
    user_id: str = payload.get("sub")
    if user_id is None:
        raise AuthenticationError()
    
    # Get user from database
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc is None:
            raise AuthenticationError("User not found")
        
        # Convert to User model
        user = User(
            id=str(user_doc["_id"]),
            name=user_doc.get("name", ""),
            email=user_doc.get("email", ""),
            password_hash=user_doc.get("password_hash", ""),
            role=user_doc.get("role", "buyer"),
            status=user_doc.get("status", "active"),
            verified=user_doc.get("verified", False),
            two_factor_enabled=user_doc.get("two_factor_enabled", False),
            created_at=user_doc.get("created_at"),
            updated_at=user_doc.get("updated_at"),
            last_login=user_doc.get("last_login"),
            avatar=user_doc.get("avatar")
        )
        
    except Exception as e:
        raise AuthenticationError("User not found")
    
    # Check if user is active
    if user.status != "active":
        raise AuthenticationError("User account is not active")
    
    return user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify admin permissions"""
    
    if current_user.role != "admin":
        raise PermissionError("Admin access required")
    
    return current_user

async def get_current_seller_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify seller permissions"""
    
    if current_user.role not in ["admin", "seller"]:
        raise PermissionError("Seller access required")
    
    return current_user

# Optional dependencies (don't raise error if not authenticated)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except:
        return None

# DEVELOPMENT ONLY: Mock admin user for testing
async def get_mock_admin_user(db: AsyncIOMotorDatabase = Depends(get_database)) -> User:
    """
    DEVELOPMENT ONLY: Mock admin user for testing
    Remove this in production and use proper authentication
    """
    
    # Try to get an existing admin user
    admin_user_doc = await db.users.find_one({"role": "admin"})
    
    if not admin_user_doc:
        # Create a mock admin user for development
        from .security import get_password_hash
        
        admin_data = {
            "_id": ObjectId(),
            "name": "Admin User",
            "email": "admin@nozama.ai",
            "password_hash": get_password_hash("admin123"),
            "role": "admin",
            "status": "active",
            "verified": True,
            "two_factor_enabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None,
            "avatar": None
        }
        
        await db.users.insert_one(admin_data)
        admin_user_doc = admin_data
    
    return User(
        id=str(admin_user_doc["_id"]),
        name=admin_user_doc.get("name", "Admin User"),
        email=admin_user_doc.get("email", "admin@nozama.ai"),
        password_hash=admin_user_doc.get("password_hash", ""),
        role=admin_user_doc.get("role", "admin"),
        status=admin_user_doc.get("status", "active"),
        verified=admin_user_doc.get("verified", True),
        two_factor_enabled=admin_user_doc.get("two_factor_enabled", False),
        created_at=admin_user_doc.get("created_at"),
        updated_at=admin_user_doc.get("updated_at"),
        last_login=admin_user_doc.get("last_login"),
        avatar=admin_user_doc.get("avatar")
    )