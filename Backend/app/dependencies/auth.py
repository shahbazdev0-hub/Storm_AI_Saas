# Replace your entire app/dependencies/auth.py file with this:

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from jose import jwt, JWTError
from bson import ObjectId

from app.core.database import get_database
from app.core.config import settings
from app.core import security

# Use HTTPBearer instead of OAuth2PasswordBearer
security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    """Get current authenticated user"""
    from app.core.logger import get_logger
    logger = get_logger("dependencies.auth")
    
    logger.info(f"🔐 Auth attempt - Token received: {credentials.credentials[:20]}..." if credentials.credentials else "No token")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.info(f"🔐 Decoding JWT with SECRET_KEY: {settings.SECRET_KEY[:10]}...")
        logger.info(f"🔐 Using algorithm: {settings.ALGORITHM}")
        
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        logger.info(f"🔐 JWT decoded - user_id: {user_id}, type: {token_type}")
        
        if user_id is None or token_type != "access":
            logger.error(f"🔐 Invalid token data - user_id: {user_id}, type: {token_type}")
            raise credentials_exception
            
    except JWTError as e:
        logger.error(f"🔐 JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"🔐 Unexpected error: {e}")
        raise credentials_exception
    
    # Get user from database
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc is None:
            logger.error(f"🔐 User not found: {user_id}")
            raise credentials_exception
        
        # Check if user is active
        if user_doc.get("status") != "active":
            logger.error(f"🔐 User not active: {user_id}")
            raise HTTPException(status_code=400, detail="Inactive user")
        
        logger.info(f"🔐 Auth successful for user: {user_doc.get('email')}")
        return user_doc
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔐 Database error: {e}")
        raise credentials_exception

async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Get current user and verify active status"""
    if current_user["status"] != "active":
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        if current_user["role"] != required_role and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker