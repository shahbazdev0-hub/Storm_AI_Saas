# backend/app/api/v1/endpoints/service_requests.py - FIXED VERSION

# backend/app/api/v1/endpoints/service_requests.py - FIXED VERSION with Better Error Handling


import logging


from app.dependencies.auth import get_current_active_user
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)
# Request Models
class ServiceRequestUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Status: pending, assigned, in_progress, completed, cancelled")
    priority: Optional[str] = Field(None, description="Priority: low, medium, high, urgent")
    assigned_to: Optional[str] = Field(None, description="User ID of assigned admin/technician")
    admin_notes: Optional[str] = Field(None, description="Internal admin notes")
    estimated_cost: Optional[float] = Field(None, description="Estimated cost")
    estimated_duration: Optional[int] = Field(None, description="Estimated duration in minutes")

class ServiceRequestAssign(BaseModel):
    assigned_to: str = Field(..., description="User ID to assign to")
    notes: Optional[str] = Field(None, description="Assignment notes")

def oid(i: Any) -> ObjectId:
    """Convert string to ObjectId safely"""
    if i is None:
        return None
    if isinstance(i, ObjectId):
        return i
    try:
        return ObjectId(str(i))
    except Exception:
        return None


# ADD THIS TO THE TOP OF YOUR service_requests.py FILE
from bson import ObjectId
import json
from datetime import datetime

def safe_serialize(obj):
    """Convert ObjectIds and datetime objects to JSON-serializable formats"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: safe_serialize(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [safe_serialize(item) for item in obj]
    else:
        return obj

# UPDATE YOUR _serialize_service_request FUNCTION WITH THIS VERSION:

def _serialize_service_request(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-serializable dict with COMPLETE ObjectId handling"""
    if not doc:
        return {}
    
    try:
        out = dict(doc)
        
        # Convert _id to id
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        
        # Deep serialize the entire document to handle nested ObjectIds
        out = safe_serialize(out)
        
        # Ensure required fields have default values
        out.setdefault("status", "pending")
        out.setdefault("priority", "medium")
        out.setdefault("customer_name", "Unknown")
        out.setdefault("description", "")
        out.setdefault("service_type", "")
        out.setdefault("location", "")
        out.setdefault("contact_phone", "")
        out.setdefault("customer_email", "")
        out.setdefault("special_instructions", "")
        out.setdefault("admin_notes", "")
        
        return out
        
    except Exception as e:
        logger.error(f"Error serializing service request: {e}")
        # Return minimal safe object
        return {
            "id": str(doc.get("_id", ObjectId())),
            "status": "pending",
            "priority": "medium",
            "customer_name": doc.get("customer_name", "Unknown"),
            "description": doc.get("description", ""),
            "service_type": doc.get("service_type", ""),
            "created_at": datetime.utcnow().isoformat(),
            "customer": {
                "id": str(doc.get("customer_id", "")),
                "name": doc.get("customer_name", "Unknown"),
                "email": doc.get("customer_email", ""),
                "phone": doc.get("contact_phone", ""),
            }
        }
    
    return out

# ================================
# ADMIN SERVICE REQUESTS ENDPOINTS
# ================================

@router.get("/")
async def get_all_service_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user"),
    search: Optional[str] = Query(None, description="Search in description, customer name"),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get all service requests for admin (paginated) with comprehensive error handling"""
    
    try:
        company_id = oid(current_user.get("company_id"))
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company ID")
        
        logger.info(f"Fetching service requests for company {company_id}")
        
        # Build base query
        query = {"company_id": company_id}
        
        # Apply filters only if they have valid values
        if status and status.strip() and status.lower() != "all":
            query["status"] = status.strip()
            
        if priority and priority.strip() and priority.lower() != "all":
            query["priority"] = priority.strip()
            
        if assigned_to and assigned_to.strip():
            assigned_oid = oid(assigned_to)
            if assigned_oid:
                query["assigned_to"] = assigned_oid
        
        # Search functionality
        if search and search.strip():
            search_regex = {"$regex": search.strip(), "$options": "i"}
            query["$or"] = [
                {"description": search_regex},
                {"customer_name": search_regex},
                {"service_type": search_regex},
                {"location": search_regex},
                {"request_number": search_regex}
            ]
        
        logger.info(f"Query built: {query}")
        
        # Get total count first
        try:
            total = await db.service_requests.count_documents(query)
            logger.info(f"Total service requests found: {total}")
        except Exception as e:
            logger.error(f"Error counting documents: {e}")
            total = 0
        
        if total == 0:
            return {
                "service_requests": [],
                "total": 0,
                "page": 1,
                "per_page": limit,
                "has_next": False,
                "has_prev": False
            }
        
        # Sort order
        sort_direction = -1 if sort_order.lower() == "desc" else 1
        
        # Get requests with error handling
        try:
            requests = await db.service_requests.find(query)\
                .sort(sort_by, sort_direction)\
                .skip(offset)\
                .limit(limit)\
                .to_list(length=limit)
            logger.info(f"Retrieved {len(requests)} service requests")
        except Exception as e:
            logger.error(f"Error querying service requests: {e}")
            requests = []
        
        # Format response with comprehensive error handling
        formatted_requests = []
        for req in requests:
            try:
                formatted_req = _serialize_service_request(req)
                
                # Handle customer info with multiple fallbacks
                customer_info = None
                if req.get("customer_id"):
                    try:
                        customer_id = req["customer_id"]
                        
                        # Try as ObjectId first
                        if isinstance(customer_id, ObjectId):
                            customer_info = await db.contacts.find_one({"_id": customer_id})
                        
                        # If no result and it's a string, try converting to ObjectId
                        if not customer_info and isinstance(customer_id, str) and ObjectId.is_valid(customer_id):
                            customer_oid = ObjectId(customer_id)
                            customer_info = await db.contacts.find_one({"_id": customer_oid})
                            
                    except Exception as customer_error:
                        logger.error(f"Error fetching customer info: {customer_error}")
                        customer_info = None
                
                # Set customer info with fallbacks
                if customer_info:
                    try:
                        formatted_req["customer"] = {
                            "id": str(customer_info["_id"]),
                            "name": f"{customer_info.get('first_name', '')} {customer_info.get('last_name', '')}".strip() or customer_info.get('customer_name', 'Unknown'),
                            "email": customer_info.get("email", ""),
                            "phone": customer_info.get("phone", ""),
                        }
                    except Exception:
                        formatted_req["customer"] = {
                            "id": str(req.get("customer_id", "")),
                            "name": req.get("customer_name", "Unknown"),
                            "email": req.get("customer_email", ""),
                            "phone": req.get("contact_phone", ""),
                        }
                else:
                    # Fallback to service request data
                    formatted_req["customer"] = {
                        "id": str(req.get("customer_id", "")),
                        "name": req.get("customer_name", "Unknown"),
                        "email": req.get("customer_email", ""),
                        "phone": req.get("contact_phone", ""),
                    }
                
                # Handle assigned user info
                if req.get("assigned_to"):
                    try:
                        assigned_id = req["assigned_to"]
                        user_info = None
                        
                        if isinstance(assigned_id, ObjectId):
                            user_info = await db.users.find_one({"_id": assigned_id})
                        elif isinstance(assigned_id, str) and ObjectId.is_valid(assigned_id):
                            user_info = await db.users.find_one({"_id": ObjectId(assigned_id)})
                        
                        if user_info:
                            formatted_req["assigned_user"] = {
                                "id": str(user_info["_id"]),
                                "name": f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip() or "Unknown",
                                "email": user_info.get("email", ""),
                                "role": user_info.get("role", "")
                            }
                    except Exception as assign_error:
                        logger.error(f"Error fetching assigned user: {assign_error}")
                
                formatted_requests.append(formatted_req)
                
            except Exception as format_error:
                logger.error(f"Error formatting request {req.get('_id')}: {format_error}")
                # Include minimal version to avoid losing data
                try:
                    minimal_req = {
                        "id": str(req.get("_id", "")),
                        "status": req.get("status", "pending"),
                        "priority": req.get("priority", "medium"),
                        "customer_name": req.get("customer_name", "Unknown"),
                        "service_type": req.get("service_type", ""),
                        "description": req.get("description", ""),
                        "created_at": datetime.utcnow().isoformat(),
                        "customer": {
                            "id": str(req.get("customer_id", "")),
                            "name": req.get("customer_name", "Unknown"),
                            "email": req.get("customer_email", ""),
                            "phone": req.get("contact_phone", ""),
                        }
                    }
                    formatted_requests.append(minimal_req)
                except Exception:
                    logger.error(f"Failed to create minimal request for {req.get('_id')}")
                    continue
        
        logger.info(f"Successfully formatted {len(formatted_requests)} requests")
        
        return {
            "service_requests": formatted_requests,
            "total": total,
            "page": offset // limit + 1,
            "per_page": limit,
            "has_next": offset + limit < total,
            "has_prev": offset > 0,
            "filters_applied": {
                "status": status,
                "priority": priority,
                "assigned_to": assigned_to,
                "search": search
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Critical error in get_all_service_requests: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Return safe fallback response
        return {
            "service_requests": [],
            "total": 0,
            "page": 1,
            "per_page": limit,
            "has_next": False,
            "has_prev": False,
            "error": f"Failed to fetch service requests: {str(e)}"
        }

@router.get("/debug")
async def debug_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Debug endpoint to check data"""
    try:
        company_id = oid(current_user["company_id"])
        
        total = await db.service_requests.count_documents({"company_id": company_id})
        all_total = await db.service_requests.count_documents({})
        
        # Get a few sample requests
        sample_requests = await db.service_requests.find({}).limit(3).to_list(length=3)
        
        return {
            "current_user_company_id": str(company_id),
            "total_for_company": total,
            "total_all_companies": all_total,
            "collections_available": await db.list_collection_names(),
            "sample_requests": [
                {
                    "id": str(req["_id"]),
                    "company_id": str(req.get("company_id", "None")),
                    "customer_name": req.get("customer_name", "No name"),
                    "status": req.get("status", "No status"),
                    "created_at": str(req.get("created_at", "No date"))
                } for req in sample_requests
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@router.get("/{request_id}")
async def get_service_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get single service request with full details"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Get basic request first
        req = await db.service_requests.find_one({
            "_id": oid(request_id),
            "company_id": company_id
        })
        
        if not req:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        formatted_req = _serialize_service_request(req)
        
        # Add customer info if available
        if req.get("customer_id"):
            try:
                customer = await db.contacts.find_one({"_id": req["customer_id"]})
                if customer:
                    formatted_req["customer"] = {
                        "id": str(customer["_id"]),
                        "name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                        "email": customer.get("email", ""),
                        "phone": customer.get("phone", ""),
                        "addresses": customer.get("addresses", [])
                    }
            except Exception:
                pass
        
        # Add assigned user info if available
        if req.get("assigned_to"):
            try:
                user = await db.users.find_one({"_id": req["assigned_to"]})
                if user:
                    formatted_req["assigned_user"] = {
                        "id": str(user["_id"]),
                        "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                        "email": user.get("email", ""),
                        "role": user.get("role", "")
                    }
            except Exception:
                pass
        
        # Add related jobs and estimates (optional)
        formatted_req["related_jobs"] = []
        formatted_req["related_estimates"] = []
        
        try:
            related_jobs = await db.jobs.find({"service_request_id": oid(request_id)}).to_list(length=10)
            formatted_req["related_jobs"] = [
                {
                    "id": str(job["_id"]),
                    "job_number": job.get("job_number", ""),
                    "status": job.get("status", ""),
                    "scheduled_date": job.get("scheduled_date", "")
                } for job in related_jobs
            ]
        except Exception:
            pass
        
        try:
            related_estimates = await db.estimates.find({"service_request_id": oid(request_id)}).to_list(length=10)
            formatted_req["related_estimates"] = [
                {
                    "id": str(est["_id"]),
                    "estimate_number": est.get("estimate_number", ""),
                    "total_amount": est.get("total_amount", 0),
                    "status": est.get("status", "")
                } for est in related_estimates
            ]
        except Exception:
            pass
        
        return {"service_request": formatted_req}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/fix-company-data")
async def fix_company_data(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Fix service requests company_id mismatch"""
    try:
        target_company_id = current_user["company_id"]
        
        # Update the mismatched service request
        result = await db.service_requests.update_one(
            {"_id": ObjectId("68b29880ec2cbde708922ee0")},
            {"$set": {"company_id": ObjectId(target_company_id)}}
        )
        
        return {"message": f"Updated {result.modified_count} service request(s)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/{request_id}")
async def update_service_request(
    request_id: str,
    update_data: ServiceRequestUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update service request"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Check if request exists
        existing = await db.service_requests.find_one({
            "_id": oid(request_id),
            "company_id": company_id
        })
        if not existing:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        
        if update_data.status:
            update_doc["status"] = update_data.status
        if update_data.priority:
            update_doc["priority"] = update_data.priority
        if update_data.assigned_to:
            if ObjectId.is_valid(update_data.assigned_to):
                update_doc["assigned_to"] = oid(update_data.assigned_to)
        if update_data.admin_notes is not None:
            update_doc["admin_notes"] = update_data.admin_notes
        if update_data.estimated_cost is not None:
            update_doc["estimated_cost"] = update_data.estimated_cost
        if update_data.estimated_duration is not None:
            update_doc["estimated_duration"] = update_data.estimated_duration
        
        # Update request
        result = await db.service_requests.update_one(
            {"_id": oid(request_id), "company_id": company_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        # Return updated request
        return await get_service_request(request_id, db, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# backend/app/api/v1/endpoints/service_requests.py - UPDATED with Job Creation

# Add this new endpoint to automatically create jobs when assigning service requests
# Add this to your service_requests.py file to ensure proper linkage

@router.post("/{request_id}/convert-to-job")
async def convert_service_request_to_job(
    request_id: str,
    job_data: Optional[Dict[str, Any]] = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Convert service request to job - UPDATED VERSION"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Get the service request
        service_request = await db.service_requests.find_one({
            "_id": oid(request_id),
            "company_id": company_id
        })
        
        if not service_request:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        if service_request.get("status") == "converted_to_job":
            raise HTTPException(status_code=400, detail="Service request already converted to job")
        
        # Get customer details
        customer = await db.contacts.find_one({
            "_id": service_request["customer_id"]
        }) if service_request.get("customer_id") else None
        
        # Generate job number
        job_count = await db.jobs.count_documents({"company_id": company_id})
        job_number = f"JOB-{datetime.now().strftime('%Y%m%d')}-{job_count + 1:04d}"
        
        # Create job from service request
        job_doc = {
            "company_id": company_id,
            "job_number": job_number,
            "service_request_id": oid(request_id),  # **IMPORTANT: Link to service request**
            "customer_id": service_request.get("customer_id"),
            "customer_name": service_request.get("customer_name", ""),
            "customer_email": service_request.get("customer_email", ""),
            "customer_phone": service_request.get("contact_phone", ""),
            "service_type": service_request.get("service_type", ""),
            "priority": service_request.get("priority", "medium"),
            "description": service_request.get("description", ""),
            "special_instructions": service_request.get("special_instructions", ""),
            "status": "scheduled",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": oid(current_user["_id"])
        }
        
        # Add location information
        if service_request.get("location"):
            job_doc["address"] = {
                "street": service_request["location"],
                "city": "",
                "state": "",
                "postal_code": ""
            }
        
        # Add customer address if available
        if customer and customer.get("address"):
            address = customer["address"]
            job_doc["address"] = {
                "street": address.get("street", ""),
                "city": address.get("city", ""),
                "state": address.get("state", ""),
                "postal_code": address.get("postal_code", "")
            }
        
        # Add scheduled date/time
        if service_request.get("preferred_date"):
            try:
                preferred_date = service_request["preferred_date"]
                if isinstance(preferred_date, str):
                    scheduled_date = datetime.fromisoformat(preferred_date)
                else:
                    scheduled_date = preferred_date
                
                # Set default times based on preferred_time
                preferred_time = service_request.get("preferred_time", "morning")
                if preferred_time == "morning":
                    start_time = scheduled_date.replace(hour=9, minute=0)
                    end_time = scheduled_date.replace(hour=11, minute=0)
                elif preferred_time == "afternoon":
                    start_time = scheduled_date.replace(hour=13, minute=0)
                    end_time = scheduled_date.replace(hour=15, minute=0)
                elif preferred_time == "evening":
                    start_time = scheduled_date.replace(hour=17, minute=0)
                    end_time = scheduled_date.replace(hour=19, minute=0)
                else:
                    start_time = scheduled_date.replace(hour=10, minute=0)
                    end_time = scheduled_date.replace(hour=12, minute=0)
                
                job_doc["time_tracking"] = {
                    "scheduled_start": start_time,
                    "scheduled_end": end_time,
                    "scheduled_duration": 120  # 2 hours default
                }
            except:
                pass
        
        # Add assigned technician if available
        if service_request.get("assigned_to"):
            assigned_user = await db.users.find_one({"_id": service_request["assigned_to"]})
            if assigned_user and assigned_user.get("role") == "technician":
                job_doc["technician_id"] = service_request["assigned_to"]
        
        # Merge any additional job data provided
        if job_data:
            job_doc.update(job_data)
        
        # Insert the job
        result = await db.jobs.insert_one(job_doc)
        job_id = result.inserted_id
        
        # **IMPORTANT: Update service request status and link to job**
        await db.service_requests.update_one(
            {"_id": oid(request_id)},
            {
                "$set": {
                    "status": "converted_to_job",
                    "job_id": job_id,  # **Link job back to service request**
                    "updated_at": datetime.utcnow(),
                    "converted_by": oid(current_user["_id"]),
                    "converted_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Service request {request_id} converted to job {job_id}")
        
        return {
            "message": "Service request converted to job successfully",
            "job_id": str(job_id),
            "job_number": job_number,
            "service_request_id": request_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting service request to job: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Also add this helper function to check for orphaned service requests
@router.get("/debug/orphaned-requests")
async def get_orphaned_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Debug endpoint to find service requests that should be completed"""
    
    company_id = oid(current_user["company_id"])
    
    # Find service requests that have been converted to jobs
    converted_requests = await db.service_requests.find({
        "company_id": company_id,
        "status": "converted_to_job",
        "job_id": {"$exists": True}
    }).to_list(length=None)
    
    orphaned_requests = []
    
    for req in converted_requests:
        # Check if the linked job is completed
        if req.get("job_id"):
            job = await db.jobs.find_one({
                "_id": req["job_id"],
                "status": "completed"
            })
            
            if job:
                orphaned_requests.append({
                    "service_request_id": str(req["_id"]),
                    "job_id": str(req["job_id"]),
                    "customer_name": req.get("customer_name", ""),
                    "service_type": req.get("service_type", ""),
                    "request_status": req.get("status", ""),
                    "job_status": job.get("status", ""),
                    "job_completed_at": job.get("completion_date")
                })
    
    return {
        "orphaned_requests": orphaned_requests,
        "count": len(orphaned_requests),
        "message": f"Found {len(orphaned_requests)} service requests that should be marked as completed"
    }

# Fix orphaned service requests (one-time operation)
@router.post("/debug/fix-orphaned-requests")
async def fix_orphaned_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """One-time fix for orphaned service requests"""
    
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company_id = oid(current_user["company_id"])
    
    # Find all service requests that are linked to completed jobs
    pipeline = [
        {"$match": {"company_id": company_id, "status": "converted_to_job", "job_id": {"$exists": True}}},
        {
            "$lookup": {
                "from": "jobs",
                "localField": "job_id",
                "foreignField": "_id",
                "as": "job_info"
            }
        },
        {"$match": {"job_info.status": "completed"}}
    ]
    
    orphaned_requests = await db.service_requests.aggregate(pipeline).to_list(length=None)
    
    # Update them to completed status
    fixed_count = 0
    for req in orphaned_requests:
        job_info = req["job_info"][0] if req["job_info"] else {}
        completion_date = job_info.get("completion_date", datetime.utcnow())
        
        result = await db.service_requests.update_one(
            {"_id": req["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": completion_date,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            fixed_count += 1
    
    return {
        "message": f"Fixed {fixed_count} orphaned service requests",
        "fixed_count": fixed_count,
        "total_found": len(orphaned_requests)
    }

# UPDATED: Modify the existing assign endpoint to automatically create a job
@router.post("/{request_id}/assign")
async def assign_service_request(
    request_id: str,
    assign_data: ServiceRequestAssign,
    auto_create_job: bool = True,  # New parameter to automatically create job
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Assign service request to user and optionally create job"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    if not ObjectId.is_valid(assign_data.assigned_to):
        raise HTTPException(status_code=400, detail="Invalid assigned_to user ID")
    
    try:
        company_id = oid(current_user["company_id"])
        assigned_to = oid(assign_data.assigned_to)
        
        # Verify assigned user exists and is in same company
        assigned_user = await db.users.find_one({
            "_id": assigned_to,
            "company_id": company_id
        })
        if not assigned_user:
            raise HTTPException(status_code=400, detail="Invalid user to assign to")
        
        # Update service request
        update_doc = {
            "assigned_to": assigned_to,
            "status": "assigned",
            "updated_at": datetime.utcnow()
        }
        if assign_data.notes:
            update_doc["admin_notes"] = assign_data.notes
        
        result = await db.service_requests.update_one(
            {"_id": oid(request_id), "company_id": company_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        response = {
            "message": "Service request assigned successfully",
            "assigned_to": f"{assigned_user.get('first_name', '')} {assigned_user.get('last_name', '')}".strip()
        }
        
        # Automatically create job if requested and assigned to technician
        if auto_create_job and assigned_user.get("role") == "technician":
            try:
                job_result = await convert_service_request_to_job(
                    request_id, None, db, current_user
                )
                response.update({
                    "job_created": True,
                    "job_id": job_result["job_id"],
                    "job_number": job_result["job_number"]
                })
            except Exception as job_error:
                print(f"Warning: Failed to create job automatically: {job_error}")
                response["job_creation_warning"] = "Service request assigned but job creation failed"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Add a new endpoint to get jobs created from service requests
@router.get("/{request_id}/job")
async def get_job_for_service_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get job created from service request"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Find job linked to this service request
        job = await db.jobs.find_one({
            "service_request_id": oid(request_id),
            "company_id": company_id
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="No job found for this service request")
        
        # Format job data
        formatted_job = {
            "id": str(job["_id"]),
            "job_number": job.get("job_number", ""),
            "title": job.get("title", ""),
            "status": job.get("status", ""),
            "service_type": job.get("service_type", ""),
            "scheduled_start": job.get("time_tracking", {}).get("scheduled_start"),
            "technician_id": str(job["technician_id"]) if job.get("technician_id") else None,
            "created_at": job.get("created_at")
        }
        
        # Get technician info if assigned
        if job.get("technician_id"):
            try:
                technician = await db.users.find_one({"_id": job["technician_id"]})
                if technician:
                    formatted_job["technician_name"] = f"{technician.get('first_name', '')} {technician.get('last_name', '')}".strip()
            except Exception:
                pass
        
        return {"job": formatted_job}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
@router.post("/{request_id}/assign")
async def assign_service_request(
    request_id: str,
    assign_data: ServiceRequestAssign,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Assign service request to user"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    if not ObjectId.is_valid(assign_data.assigned_to):
        raise HTTPException(status_code=400, detail="Invalid assigned_to user ID")
    
    try:
        company_id = oid(current_user["company_id"])
        assigned_to = oid(assign_data.assigned_to)
        
        # Verify assigned user exists and is in same company
        assigned_user = await db.users.find_one({
            "_id": assigned_to,
            "company_id": company_id
        })
        if not assigned_user:
            raise HTTPException(status_code=400, detail="Invalid user to assign to")
        
        # Update request
        update_doc = {
            "assigned_to": assigned_to,
            "status": "assigned",
            "updated_at": datetime.utcnow()
        }
        if assign_data.notes:
            update_doc["admin_notes"] = assign_data.notes
        
        result = await db.service_requests.update_one(
            {"_id": oid(request_id), "company_id": company_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        return {
            "message": "Service request assigned successfully",
            "assigned_to": f"{assigned_user.get('first_name', '')} {assigned_user.get('last_name', '')}".strip()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{request_id}/convert-to-lead")
async def convert_to_lead(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Convert service request to lead"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Get service request
        service_req = await db.service_requests.find_one({
            "_id": oid(request_id),
            "company_id": company_id
        })
        if not service_req:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        # Create lead from service request
        lead_doc = {
            "company_id": company_id,
            "contact_id": service_req.get("customer_id"),
            "lead_number": f"LEAD-{datetime.now().strftime('%Y%m%d')}-{str(ObjectId())[-4:]}",
            "status": "new",
            "priority": 3 if service_req.get("priority") == "medium" else (4 if service_req.get("priority") == "high" else 2),
            "source": "service_request",
            "service_type": service_req.get("service_type", ""),
            "service_details": service_req.get("description", ""),
            "estimated_value": service_req.get("estimated_cost", 0),
            "notes": [
                {
                    "id": str(ObjectId()),
                    "content": f"Converted from service request #{service_req.get('request_number', '')}. Original request: {service_req.get('description', '')}",
                    "note_type": "general",
                    "is_important": True,
                    "created_by": oid(current_user["_id"]),
                    "created_at": datetime.utcnow()
                }
            ],
            "service_request_id": oid(request_id),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": oid(current_user["_id"])
        }
        
        lead_result = await db.leads.insert_one(lead_doc)
        lead_id = lead_result.inserted_id
        
        # Update service request status
        await db.service_requests.update_one(
            {"_id": oid(request_id)},
            {
                "$set": {
                    "status": "converted_to_lead",
                    "lead_id": lead_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "message": "Service request converted to lead successfully",
            "lead_id": str(lead_id),
            "lead_number": lead_doc["lead_number"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{request_id}")
async def delete_service_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    """Delete service request (soft delete by setting status to cancelled)"""
    
    if not ObjectId.is_valid(request_id):
        raise HTTPException(status_code=400, detail="Invalid request ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        result = await db.service_requests.update_one(
            {"_id": oid(request_id), "company_id": company_id},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.utcnow(),
                    "cancelled_by": oid(current_user["_id"])
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        return {"message": "Service request cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ================================
# DASHBOARD/STATS ENDPOINTS
# ================================

@router.get("/stats/overview")
async def get_service_requests_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get service requests statistics for admin dashboard"""
    
    try:
        company_id = oid(current_user["company_id"])
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get overall stats
        total_requests = await db.service_requests.count_documents({"company_id": company_id})
        pending_requests = await db.service_requests.count_documents({
            "company_id": company_id,
            "status": "pending"
        })
        assigned_requests = await db.service_requests.count_documents({
            "company_id": company_id,
            "status": "assigned"
        })
        completed_requests = await db.service_requests.count_documents({
            "company_id": company_id,
            "status": "completed"
        })
        
        # Recent requests (last X days)
        recent_requests = await db.service_requests.count_documents({
            "company_id": company_id,
            "created_at": {"$gte": start_date}
        })
        
        # Priority breakdown
        priority_stats = []
        try:
            priority_stats = await db.service_requests.aggregate([
                {"$match": {"company_id": company_id}},
                {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]).to_list(length=None)
        except Exception:
            pass
        
        # Status breakdown
        status_stats = []
        try:
            status_stats = await db.service_requests.aggregate([
                {"$match": {"company_id": company_id}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]).to_list(length=None)
        except Exception:
            pass
        
        return {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "assigned_requests": assigned_requests,
            "completed_requests": completed_requests,
            "recent_requests": recent_requests,
            "completion_rate": round((completed_requests / total_requests) * 100, 1) if total_requests > 0 else 0,
            "priority_breakdown": {
                stat["_id"] or "none": stat["count"] for stat in priority_stats
            },
            "status_breakdown": {
                stat["_id"] or "pending": stat["count"] for stat in status_stats
            }
        }
        
    except Exception as e:
        return {
            "total_requests": 0,
            "pending_requests": 0,
            "assigned_requests": 0,
            "completed_requests": 0,
            "recent_requests": 0,
            "completion_rate": 0,
            "priority_breakdown": {},
            "status_breakdown": {},
            "error": str(e)
        }



# ADD THIS TEMPORARY DEBUG ENDPOINT TO YOUR service_requests.py

@router.get("/debug-serialization")
async def debug_serialization(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Debug endpoint to find ObjectId serialization issues"""
    
    def find_objectids(obj, path=""):
        """Recursively find ObjectIds in the data structure"""
        issues = []
        
        if isinstance(obj, ObjectId):
            issues.append(f"ObjectId found at: {path}")
        elif isinstance(obj, dict):
            for key, value in obj.items():
                issues.extend(find_objectids(value, f"{path}.{key}"))
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                issues.extend(find_objectids(item, f"{path}[{i}]"))
        
        return issues
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Get one service request
        req = await db.service_requests.find_one({"company_id": company_id})
        
        if not req:
            return {"message": "No service requests found"}
        
        # Check raw document
        raw_issues = find_objectids(req, "raw_doc")
        
        # Check after serialization
        formatted_req = _serialize_service_request(req)
        formatted_issues = find_objectids(formatted_req, "formatted_doc")
        
        # Try to JSON serialize
        try:
            import json
            json.dumps(formatted_req, default=str)  # This should work
            json_serializable = True
            json_error = None
        except Exception as e:
            json_serializable = False
            json_error = str(e)
        
        return {
            "raw_document_objectid_issues": raw_issues,
            "formatted_document_objectid_issues": formatted_issues,
            "json_serializable": json_serializable,
            "json_error": json_error,
            "sample_formatted_doc": formatted_req
        }
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

# ADD THESE DEBUG ENDPOINTS TO YOUR BACKEND

# 1. SERVICE REQUESTS DEBUG - Add to service_requests.py
@router.get("/debug/company-data")
async def debug_company_data(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Debug service requests by company"""
    try:
        user_company_id = current_user.get("company_id")
        
        # Get all service requests (not filtered by company)
        all_requests = await db.service_requests.find({}).to_list(length=None)
        
        # Group by company_id
        by_company = {}
        for req in all_requests:
            company_id = str(req.get("company_id", "None"))
            if company_id not in by_company:
                by_company[company_id] = []
            by_company[company_id].append({
                "id": str(req["_id"]),
                "request_number": req.get("request_number"),
                "customer_name": req.get("customer_name"),
                "status": req.get("status"),
                "assigned_to": str(req.get("assigned_to", "None")) if req.get("assigned_to") else None,
                "job_id": str(req.get("job_id", "None")) if req.get("job_id") else None
            })
        
        # Check user's company requests specifically
        user_company_requests = await db.service_requests.find({
            "company_id": ObjectId(user_company_id)
        }).to_list(length=None)
        
        return {
            "current_user": {
                "company_id": str(user_company_id),
                "role": current_user.get("role"),
                "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            },
            "all_requests_by_company": by_company,
            "user_company_requests_count": len(user_company_requests),
            "total_requests_in_system": len(all_requests),
            "diagnosis": {
                "issue": "Multiple company_ids found" if len(by_company) > 1 else "Single company found",
                "recommendation": "Check if service requests were created with wrong company_id"
            }
        }
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

# 2. JOBS DEBUG - Add to technician_portal.py  
@router.get("/debug/job-assignment-detailed")
async def debug_job_assignment_detailed(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Detailed debug of job assignments"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = current_user["_id"]
        company_id = current_user["company_id"]
        
        # Check user info
        user_info = {
            "technician_id": str(technician_id),
            "technician_id_type": type(technician_id).__name__,
            "company_id": str(company_id),
            "company_id_type": type(company_id).__name__,
            "role": current_user.get("role"),
            "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        }
        
        # Get ALL jobs in the system (no filters)
        all_jobs = await db.jobs.find({}).to_list(length=None)
        
        # Get jobs for this company
        company_jobs = await db.jobs.find({"company_id": ObjectId(company_id)}).to_list(length=None)
        
        # Get service requests that created jobs
        service_requests_with_jobs = await db.service_requests.find({
            "job_id": {"$exists": True}
        }).to_list(length=None)
        
        # Analyze job assignments
        job_analysis = []
        for job in all_jobs:
            tech_id_field = job.get("technician_id")
            assigned_to_field = job.get("assigned_to")
            
            matches_technician = False
            if tech_id_field:
                if isinstance(tech_id_field, ObjectId):
                    matches_technician = tech_id_field == ObjectId(technician_id)
                else:
                    matches_technician = str(tech_id_field) == str(technician_id)
            
            if assigned_to_field and not matches_technician:
                if isinstance(assigned_to_field, ObjectId):
                    matches_technician = assigned_to_field == ObjectId(technician_id)
                else:
                    matches_technician = str(assigned_to_field) == str(technician_id)
            
            job_analysis.append({
                "job_id": str(job["_id"]),
                "job_number": job.get("job_number", "No number"),
                "company_id": str(job.get("company_id", "None")),
                "company_matches": str(job.get("company_id", "")) == str(company_id),
                "technician_id_field": str(tech_id_field) if tech_id_field else None,
                "technician_id_type": type(tech_id_field).__name__ if tech_id_field else None,
                "assigned_to_field": str(assigned_to_field) if assigned_to_field else None,
                "assigned_to_type": type(assigned_to_field).__name__ if assigned_to_field else None,
                "matches_current_technician": matches_technician,
                "status": job.get("status", "No status"),
                "title": job.get("title", "No title")
            })
        
        # Find jobs that should match this technician
        potential_matches = [job for job in job_analysis if job["matches_current_technician"]]
        
        return {
            "technician_info": user_info,
            "totals": {
                "all_jobs_in_system": len(all_jobs),
                "jobs_in_technician_company": len(company_jobs),
                "service_requests_with_jobs": len(service_requests_with_jobs),
                "jobs_matching_technician": len(potential_matches)
            },
            "job_analysis": job_analysis,
            "potential_matches": potential_matches,
            "service_requests_with_jobs": [
                {
                    "request_id": str(sr["_id"]),
                    "request_number": sr.get("request_number"),
                    "job_id": str(sr.get("job_id")),
                    "assigned_to": str(sr.get("assigned_to", "None")) if sr.get("assigned_to") else None,
                    "company_id": str(sr.get("company_id", "None"))
                }
                for sr in service_requests_with_jobs
            ]
        }
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

# 3. COMPANY DATA FIX ENDPOINT - Add to service_requests.py
@router.post("/debug/fix-company-data")
async def fix_company_data(
    target_company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Fix service requests with wrong company_id"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate target company ID
        if not ObjectId.is_valid(target_company_id):
            raise HTTPException(status_code=400, detail="Invalid target company ID")
        
        # Get current user's company
        user_company_id = str(current_user["company_id"])
        
        # Find service requests with wrong company_id
        wrong_company_requests = await db.service_requests.find({
            "company_id": {"$ne": ObjectId(target_company_id)},
            "customer_email": "sh@gmail.com"  # Using email as identifier for your test data
        }).to_list(length=None)
        
        updated_count = 0
        for request in wrong_company_requests:
            # Update company_id
            result = await db.service_requests.update_one(
                {"_id": request["_id"]},
                {
                    "$set": {
                        "company_id": ObjectId(target_company_id),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            if result.modified_count > 0:
                updated_count += 1
        
        return {
            "message": f"Fixed {updated_count} service requests",
            "target_company_id": target_company_id,
            "user_company_id": user_company_id,
            "requests_found": len(wrong_company_requests),
            "requests_updated": updated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fix failed: {str(e)}")

# 4. JOB ASSIGNMENT FIX - Add to jobs.py
@router.post("/debug/fix-job-assignments")
async def fix_job_assignments(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Fix job assignments by syncing with service requests"""
    try:
        if current_user.get("role") not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Admin/Manager access required")
        
        company_id = ObjectId(current_user["company_id"])
        
        # Get service requests that have job_id and assigned_to
        service_requests_with_assignments = await db.service_requests.find({
            "company_id": company_id,
            "job_id": {"$exists": True},
            "assigned_to": {"$exists": True}
        }).to_list(length=None)
        
        fixed_count = 0
        for sr in service_requests_with_assignments:
            job_id = sr.get("job_id")
            assigned_to = sr.get("assigned_to")
            
            if job_id and assigned_to:
                # Update the job with correct technician assignment
                result = await db.jobs.update_one(
                    {"_id": ObjectId(job_id)},
                    {
                        "$set": {
                            "technician_id": ObjectId(assigned_to),
                            "status": "assigned",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    fixed_count += 1
        
        return {
            "message": f"Fixed {fixed_count} job assignments",
            "service_requests_checked": len(service_requests_with_assignments),
            "jobs_updated": fixed_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fix failed: {str(e)}")


# Add this endpoint to service_requests.py for one-time cleanup

@router.post("/debug/fix-orphaned-requests")
async def fix_orphaned_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """One-time fix for service requests that should be marked completed"""
    
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company_id = oid(current_user["company_id"])
    
    try:
        # Find all service requests that are linked to completed jobs
        pipeline = [
            {
                "$match": {
                    "company_id": company_id,
                    "status": {"$in": ["converted_to_job", "assigned", "in_progress"]},
                    "$or": [
                        {"job_id": {"$exists": True}},
                        {"service_request_id": {"$exists": True}}
                    ]
                }
            },
            {
                "$lookup": {
                    "from": "jobs",
                    "localField": "job_id",
                    "foreignField": "_id",
                    "as": "job_info"
                }
            },
            {
                "$match": {
                    "$or": [
                        {"job_info.status": "completed"},
                        {"job_info": {"$size": 0}}  # Handle missing jobs
                    ]
                }
            }
        ]
        
        orphaned_requests = await db.service_requests.aggregate(pipeline).to_list(length=None)
        
        # Also find requests that should be completed but aren't linked to any job
        # by checking if there are completed jobs for the same customer/service
        additional_requests = await db.service_requests.find({
            "company_id": company_id,
            "status": {"$nin": ["completed", "cancelled"]},
            "created_at": {"$lt": datetime.utcnow() - timedelta(days=1)}  # Older than 1 day
        }).to_list(length=None)
        
        # Check each request against completed jobs
        for req in additional_requests:
            if req not in orphaned_requests:
                # Look for completed jobs for the same customer and similar service
                matching_job = await db.jobs.find_one({
                    "company_id": company_id,
                    "customer_id": req.get("customer_id"),
                    "service_type": req.get("service_type"),
                    "status": "completed",
                    "created_at": {"$gte": req.get("created_at", datetime.utcnow())}
                })
                
                if matching_job:
                    orphaned_requests.append(req)
        
        # Update them to completed status
        fixed_count = 0
        for req in orphaned_requests:
            job_info = req.get("job_info", [{}])[0] if req.get("job_info") else {}
            completion_date = job_info.get("completion_date", datetime.utcnow())
            
            result = await db.service_requests.update_one(
                {"_id": req["_id"]},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": completion_date,
                        "updated_at": datetime.utcnow(),
                        "auto_completed": True  # Mark as auto-completed for tracking
                    }
                }
            )
            
            if result.modified_count > 0:
                fixed_count += 1
                logger.info(f"✅ Fixed orphaned service request: {req['_id']}")
        
        return {
            "success": True,
            "message": f"Fixed {fixed_count} orphaned service requests",
            "fixed_count": fixed_count,
            "total_found": len(orphaned_requests),
            "details": [
                {
                    "request_id": str(req["_id"]),
                    "customer_name": req.get("customer_name", ""),
                    "service_type": req.get("service_type", ""),
                    "original_status": req.get("status", "")
                }
                for req in orphaned_requests[:10]  # Show first 10 for reference
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fixing orphaned service requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/orphaned-requests")
async def get_orphaned_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Debug endpoint to find service requests that should be completed"""
    
    company_id = oid(current_user["company_id"])
    
    try:
        # Find service requests that have been converted to jobs
        converted_requests = await db.service_requests.find({
            "company_id": company_id,
            "status": "converted_to_job",
            "job_id": {"$exists": True}
        }).to_list(length=None)
        
        orphaned_requests = []
        
        for req in converted_requests:
            # Check if the linked job is completed
            if req.get("job_id"):
                job = await db.jobs.find_one({
                    "_id": req["job_id"],
                    "status": "completed"
                })
                
                if job:
                    orphaned_requests.append({
                        "service_request_id": str(req["_id"]),
                        "job_id": str(req["job_id"]),
                        "customer_name": req.get("customer_name", ""),
                        "service_type": req.get("service_type", ""),
                        "request_status": req.get("status", ""),
                        "job_status": job.get("status", ""),
                        "job_completed_at": job.get("completion_date"),
                        "created_at": req.get("created_at")
                    })
        
        return {
            "orphaned_requests": orphaned_requests,
            "count": len(orphaned_requests),
            "message": f"Found {len(orphaned_requests)} service requests that should be marked as completed"
        }
        
    except Exception as e:
        logger.error(f"Error finding orphaned requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))




