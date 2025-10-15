# backend/app/utils/user_serializer.py

from datetime import datetime
from bson import ObjectId

def serialize_user(user: dict) -> dict:
    """Convert MongoDB user doc to safe JSON response."""
    if not user:
        return {}

    def serialize_value(value):
        """Recursively serialize values including nested dicts"""
        if isinstance(value, ObjectId):
            return str(value)
        elif isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, dict):
            return {k: serialize_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [serialize_value(item) for item in value]
        else:
            return value

    serialized = {}

    for key, value in user.items():
        serialized[key] = serialize_value(value)

    # Remove sensitive fields
    serialized.pop("hashed_password", None)
    serialized.pop("password_hash", None)

    # Add convenient fields
    serialized["id"] = str(user.get("_id")) if "_id" in user else None
    serialized["company_id"] = str(user.get("company_id")) if user.get("company_id") else None
    serialized["full_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    serialized["display_name"] = user.get("first_name") or user.get("email")
    serialized["is_active"] = user.get("status") == "active"
    serialized["is_admin"] = user.get("role") == "admin"

    return serialized