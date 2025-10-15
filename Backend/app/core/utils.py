# backend/app/core/utils.py

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
        return obj.isoformat()
    else:
        return obj

def serialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document ObjectIds to strings for JSON serialization"""
    if not doc:
        return doc
    
    serialized = {}
    for key, value in doc.items():
        if key == "_id":
            serialized["id"] = str(value)
        elif isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, dict):
            serialized[key] = serialize_document(value)
        elif isinstance(value, list):
            serialized[key] = [
                serialize_document(item) if isinstance(item, dict) else 
                str(item) if isinstance(item, ObjectId) else item
                for item in value
            ]
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    
    return serialized