# app/core/security.py
from datetime import datetime, timedelta
from typing import Any, Union, Optional, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from passlib.hash import bcrypt
import secrets
import hashlib
import hmac
from .config import settings

# Module-level constants for backward compatibility
ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = settings.REFRESH_TOKEN_EXPIRE_MINUTES

# Password hashing context
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12
)

class SecurityManager:
    """Centralized security management"""
    
    def __init__(self):
        self.algorithm = settings.ALGORITHM
        self.secret_key = settings.SECRET_KEY
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_minutes = settings.REFRESH_TOKEN_EXPIRE_MINUTES
    
    def create_access_token(
        self, 
        subject: Union[str, Any], 
        expires_delta: Optional[timedelta] = None,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create JWT access token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.access_token_expire_minutes
            )
        
        to_encode = {
            "exp": expire,
            "sub": str(subject),
            "type": "access",
            "iat": datetime.utcnow()
        }
        
        # Add additional claims if provided
        if additional_claims:
            to_encode.update(additional_claims)
        
        encoded_jwt = jwt.encode(
            to_encode, 
            self.secret_key, 
            algorithm=self.algorithm
        )
        return encoded_jwt
    
    def create_refresh_token(
        self, 
        subject: Union[str, Any], 
        expires_delta: Optional[timedelta] = None,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create JWT refresh token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.refresh_token_expire_minutes
            )
        
        to_encode = {
            "exp": expire,
            "sub": str(subject),
            "type": "refresh",
            "iat": datetime.utcnow()
        }
        
        # Add additional claims if provided
        if additional_claims:
            to_encode.update(additional_claims)
        
        encoded_jwt = jwt.encode(
            to_encode, 
            self.secret_key, 
            algorithm=self.algorithm
        )
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            return payload
        except JWTError as e:
            print(f"JWT decode error: {e}")
            return None
        except Exception as e:
            print(f"Token decode error: {e}")
            return None
    
    def verify_token_type(self, token: str, expected_type: str) -> bool:
        """Verify token type (access or refresh)"""
        payload = self.decode_token(token)
        if not payload:
            return False
        return payload.get("type") == expected_type
    
    def is_token_expired(self, token: str) -> bool:
        """Check if token is expired"""
        payload = self.decode_token(token)
        if not payload:
            return True
        
        exp = payload.get("exp")
        if not exp:
            return True
        
        return datetime.utcnow() > datetime.fromtimestamp(exp)
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def generate_api_key(self, prefix: str = "crm") -> str:
        """Generate secure API key"""
        random_part = secrets.token_urlsafe(32)
        return f"{prefix}_{random_part}"
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate secure random token"""
        return secrets.token_urlsafe(length)
    
    def generate_reset_token(self, user_id: str, expires_minutes: int = 60) -> str:
        """Generate password reset token"""
        expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
        to_encode = {
            "exp": expire,
            "sub": str(user_id),
            "type": "reset",
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(
            to_encode, 
            self.secret_key, 
            algorithm=self.algorithm
        )
    
    def verify_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token and return user ID"""
        payload = self.decode_token(token)
        if not payload:
            return None
        
        if payload.get("type") != "reset":
            return None
        
        return payload.get("sub")
    
    def create_webhook_signature(self, payload: str, secret: str) -> str:
        """Create webhook signature for verification"""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def verify_webhook_signature(
        self, 
        payload: str, 
        signature: str, 
        secret: str
    ) -> bool:
        """Verify webhook signature"""
        expected_signature = self.create_webhook_signature(payload, secret)
        return hmac.compare_digest(signature, expected_signature)
    
    def generate_csrf_token(self) -> str:
        """Generate CSRF token"""
        return secrets.token_urlsafe(32)
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        result = {
            "is_valid": True,
            "score": 0,
            "errors": []
        }
        
        if len(password) < 8:
            result["errors"].append("Password must be at least 8 characters long")
            result["is_valid"] = False
        else:
            result["score"] += 1
        
        if not any(c.isupper() for c in password):
            result["errors"].append("Password must contain at least one uppercase letter")
            result["is_valid"] = False
        else:
            result["score"] += 1
        
        if not any(c.islower() for c in password):
            result["errors"].append("Password must contain at least one lowercase letter")
            result["is_valid"] = False
        else:
            result["score"] += 1
        
        if not any(c.isdigit() for c in password):
            result["errors"].append("Password must contain at least one digit")
            result["is_valid"] = False
        else:
            result["score"] += 1
        
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            result["errors"].append("Password must contain at least one special character")
            result["is_valid"] = False
        else:
            result["score"] += 1
        
        # Check for common passwords
        common_passwords = [
            "password", "123456", "123456789", "qwerty", 
            "abc123", "password123", "admin", "letmein"
        ]
        if password.lower() in common_passwords:
            result["errors"].append("Password is too common")
            result["is_valid"] = False
        
        return result

# Create global security manager instance
security_manager = SecurityManager()

# Convenience functions for backward compatibility
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create access token - convenience function"""
    return security_manager.create_access_token(subject, expires_delta)

def create_refresh_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create refresh token - convenience function"""
    return security_manager.create_refresh_token(subject, expires_delta)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password - convenience function"""
    return security_manager.verify_password(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password - convenience function"""
    return security_manager.hash_password(password)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode token - convenience function"""
    return security_manager.decode_token(token)

def generate_api_key(prefix: str = "crm") -> str:
    """Generate API key - convenience function"""
    return security_manager.generate_api_key(prefix)

def generate_reset_token(user_id: str, expires_minutes: int = 60) -> str:
    """Generate reset token - convenience function"""
    return security_manager.generate_reset_token(user_id, expires_minutes)

def verify_reset_token(token: str) -> Optional[str]:
    """Verify reset token - convenience function"""
    return security_manager.verify_reset_token(token)

# Export main functions
__all__ = [
    "ALGORITHM",
    "SECRET_KEY", 
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_MINUTES",
    "security_manager",
    "create_access_token",
    "create_refresh_token", 
    "verify_password",
    "get_password_hash",
    "decode_token",
    "generate_api_key",
    "generate_reset_token",
    "verify_reset_token",
    "SecurityManager"
]