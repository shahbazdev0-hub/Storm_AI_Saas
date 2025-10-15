# app/dependencies/permissions.py
from typing import List
from fastapi import Depends, HTTPException, status
from .auth import get_current_active_user

def require_permissions(required_permissions: List[str]):
    def permission_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        user_permissions = current_user.get("permissions", [])
        
        # Admin has all permissions
        if current_user["role"] == "admin":
            return current_user
            
        # Check if user has required permissions
        if not all(perm in user_permissions for perm in required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return permission_checker


# ➕ ADD THIS:
def require_role(required_role: str):
    """Allow required role or admin."""
    def role_checker(current_user: dict = Depends(get_current_active_user)) -> dict:
        if current_user["role"] != required_role and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker