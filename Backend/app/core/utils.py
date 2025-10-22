# backend/app/core/utils.py - FIXED VERSION

from bson import ObjectId
from fastapi.encoders import jsonable_encoder
from typing import Any, Dict, List, Union
from datetime import datetime

def custom_jsonable_encoder(obj: Any, **kwargs) -> Any:
    """Custom jsonable_encoder that converts ObjectId to str and handles other MongoDB types."""
    return jsonable_encoder(obj, custom_encoder={ObjectId: str}, **kwargs)

def serialize_object_id(obj: Any) -> Any:
    """Convert ObjectId fields to strings recursively."""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_object_id(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_object_id(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat() + 'Z' if obj.tzinfo is None else obj.isoformat()
    else:
        return obj

def serialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert MongoDB document ObjectIds to strings for JSON serialization.
    Handles nested documents, arrays, and datetime objects.
    """
    if not doc:
        return doc
    
    serialized = {}
    
    for key, value in doc.items():
        # Convert _id to id
        if key == "_id":
            serialized["id"] = str(value)
        # Handle ObjectId
        elif isinstance(value, ObjectId):
            serialized[key] = str(value)
        # Handle datetime
        elif isinstance(value, datetime):
            # Always add 'Z' for UTC timezone
            serialized[key] = value.isoformat() + 'Z' if value.tzinfo is None else value.isoformat()
        # Handle nested documents
        elif isinstance(value, dict):
            serialized[key] = serialize_document(value)
        # Handle arrays
        elif isinstance(value, list):
            serialized[key] = [
                serialize_document(item) if isinstance(item, dict) 
                else str(item) if isinstance(item, ObjectId)
                else item.isoformat() + 'Z' if isinstance(item, datetime) and item.tzinfo is None
                else item.isoformat() if isinstance(item, datetime)
                else item
                for item in value
            ]
        # Handle everything else
        else:
            serialized[key] = value
    
    return serialized

def deserialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert document with string IDs back to ObjectIds for database operations.
    Opposite of serialize_document.
    """
    if not doc:
        return doc
    
    deserialized = {}
    
    for key, value in doc.items():
        # Convert id back to _id with ObjectId
        if key == "id" and isinstance(value, str):
            try:
                deserialized["_id"] = ObjectId(value)
            except:
                deserialized[key] = value
        # Convert string to ObjectId if it looks like one
        elif isinstance(value, str) and key.endswith("_id") and len(value) == 24:
            try:
                deserialized[key] = ObjectId(value)
            except:
                deserialized[key] = value
        # Handle nested documents
        elif isinstance(value, dict):
            deserialized[key] = deserialize_document(value)
        # Handle arrays
        elif isinstance(value, list):
            deserialized[key] = [
                deserialize_document(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            deserialized[key] = value
    
    return deserialized

def validate_object_id(id_string: str) -> bool:
    """Check if a string is a valid MongoDB ObjectId"""
    try:
        ObjectId(id_string)
        return True
    except:
        return False

def ensure_object_id(value: Union[str, ObjectId]) -> ObjectId:
    """Convert string to ObjectId if needed"""
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(value)
    except:
        raise ValueError(f"Invalid ObjectId: {value}")