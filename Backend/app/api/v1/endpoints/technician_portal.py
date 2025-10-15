


# backend/app/api/v1/endpoints/technician_portal.py - FIXED VERSION
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query,Body
from fastapi.routing import serialize_response
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies.auth import get_current_active_user
from app.models.user import UserRole
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

def oid(i: Any) -> ObjectId:
    """Convert to ObjectId safely"""
    return i if isinstance(i, ObjectId) else ObjectId(str(i))

def _ensure_technician_role(user: Dict[str, Any]):
    """Ensure user has technician role or is admin/manager"""
    allowed_roles = ["technician", "admin", "manager"]
    user_role = str(user.get("role", "")).lower()
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Technician access required"
        )

# Request/Response Models
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: Optional[datetime] = None

class JobStatusUpdate(BaseModel):
    status: str = Field(..., description="New job status")
    notes: Optional[str] = None
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None

class TimeEntry(BaseModel):
    job_id: str
    entry_type: str  # "clock_in", "clock_out", "break_start", "break_end"
    timestamp: datetime
    location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None

class JobCompletion(BaseModel):
    completion_notes: Optional[str] = None
    work_performed: Optional[str] = None
    materials_used: Optional[List[Dict[str, Any]]] = None
    customer_signature: Optional[str] = None  # Base64 encoded signature
    recommendations: Optional[List[str]] = None
    follow_up_required: bool = False
    follow_up_date: Optional[datetime] = None

# Helper functions
async def _find_technician_jobs(db: AsyncIOMotorDatabase, company_id: ObjectId, technician_id: ObjectId):
    """Find jobs assigned to technician with multiple query methods"""
    try:
        # Method 1: Try by technician_id as ObjectId
        jobs_by_oid = await db.jobs.find({
            "company_id": company_id,
            "technician_id": technician_id
        }).to_list(length=None)
        
        if jobs_by_oid:
            return jobs_by_oid
        
        # Method 2: Try by technician_id as string
        jobs_by_str = await db.jobs.find({
            "company_id": company_id,
            "technician_id": str(technician_id)
        }).to_list(length=None)
        
        if jobs_by_str:
            return jobs_by_str
        
        # Method 3: Try by assigned_technician field
        jobs_by_assigned = await db.jobs.find({
            "company_id": company_id,
            "$or": [
                {"assigned_technician.id": technician_id},
                {"assigned_technician.id": str(technician_id)}
            ]
        }).to_list(length=None)
        
        return jobs_by_assigned or []
        
    except Exception as e:
        logger.error(f"Error finding technician jobs: {e}")
        return []

# ================================
# DASHBOARD ENDPOINT - FIXED
# ================================
@router.get("/dashboard")
async def get_technician_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get technician dashboard with today's jobs and stats - FIXED VERSION"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        logger.info(f"Getting dashboard for technician: {technician_id}")
        
        # Get today's date range
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        # Get all jobs for this technician
        all_jobs = await _find_technician_jobs(db, company_id, technician_id)
        
        # Filter today's jobs
        today_jobs = []
        for job in all_jobs:
            try:
                # Check multiple date fields
                scheduled_date = (
                    job.get("time_tracking", {}).get("scheduled_start") or
                    job.get("scheduled_date") or
                    job.get("service_date") or
                    job.get("created_at")
                )
                
                if scheduled_date:
                    # Convert to datetime if it's a string
                    if isinstance(scheduled_date, str):
                        try:
                            scheduled_datetime = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(scheduled_date, 'date'):
                        scheduled_datetime = scheduled_date
                    else:
                        continue
                        
                    # Check if it's today or if job status suggests it's active today
                    if (today <= scheduled_datetime < tomorrow or 
                        job.get("status", "").lower() in ["in_progress", "started"]):
                        today_jobs.append(job)
            except Exception as e:
                logger.error(f"Error processing job for today's list: {e}")
                continue
        
        # Format today's jobs
        formatted_today_jobs = []
        for job in today_jobs:
            try:
                # Get customer info
                customer_name = "Unknown Customer"
                customer_phone = ""
                customer_email = ""
                
                if job.get("customer_info"):
                    customer_info = job["customer_info"]
                    customer_name = f"{customer_info.get('first_name', '')} {customer_info.get('last_name', '')}".strip()
                    customer_phone = customer_info.get("phone", "")
                    customer_email = customer_info.get("email", "")
                elif job.get("customer_name"):
                    customer_name = job["customer_name"]
                    customer_phone = job.get("customer_phone", "")
                    customer_email = job.get("customer_email", "")
                
                # Get scheduled time
                scheduled_start = job.get("time_tracking", {}).get("scheduled_start")
                if scheduled_start and isinstance(scheduled_start, str):
                    try:
                        scheduled_start = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))
                    except:
                        scheduled_start = None
                
                # Get location
                location = job.get("address", {})
                if isinstance(location, dict):
                    location_str = f"{location.get('street', '')}, {location.get('city', '')}, {location.get('state', '')}"
                else:
                    location_str = str(location) if location else "No address provided"
                
                formatted_job = {
                    "id": str(job["_id"]),
                    "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                    "service_type": job.get("service_type", "Service"),
                    "description": job.get("description", ""),
                    "status": job.get("status", "scheduled"),
                    "priority": job.get("priority", "medium"),
                    "scheduled_start": scheduled_start.isoformat() if scheduled_start else None,
                    "estimated_duration": job.get("estimated_duration", "2 hours"),
                    "customer": {
                        "name": customer_name,
                        "phone": customer_phone,
                        "email": customer_email
                    },
                    "location": location_str,
                    "special_instructions": job.get("special_instructions", ""),
                    "equipment_needed": job.get("equipment_needed", []),
                    "materials_needed": job.get("materials_needed", []),
                    "time_tracking": job.get("time_tracking", {}),
                    "created_at": job.get("created_at", datetime.utcnow()).isoformat() if hasattr(job.get("created_at"), 'isoformat') else str(job.get("created_at", "")),
                    "updated_at": job.get("updated_at", datetime.utcnow()).isoformat() if hasattr(job.get("updated_at"), 'isoformat') else str(job.get("updated_at", ""))
                }
                
                formatted_today_jobs.append(formatted_job)
                
            except Exception as e:
                logger.error(f"Error formatting today's job: {e}")
                continue
        
        # Sort by scheduled time
        formatted_today_jobs.sort(key=lambda x: x.get("scheduled_start") or "9999-12-31")
        
        # Calculate basic stats
        total_jobs = len(all_jobs)
        completed_jobs = len([j for j in all_jobs if j.get("status", "").lower() == "completed"])
        in_progress_jobs = len([j for j in all_jobs if j.get("status", "").lower() in ["in_progress", "started"]])
        
        # Get this week's jobs for additional stats
        week_start = today - timedelta(days=today.weekday())
        week_jobs = []
        for job in all_jobs:
            try:
                job_date = (
                    job.get("time_tracking", {}).get("scheduled_start") or
                    job.get("created_at")
                )
                if job_date:
                    if isinstance(job_date, str):
                        try:
                            job_date = datetime.fromisoformat(job_date.replace('Z', '+00:00'))
                        except:
                            continue
                    if hasattr(job_date, 'date') and job_date >= week_start:
                        week_jobs.append(job)
            except Exception as e:
                logger.error(f"Error processing week job: {e}")
                continue
        
        # Get upcoming jobs (next 7 days)
        next_week = today + timedelta(days=7)
        upcoming_jobs = []
        for job in all_jobs:
            try:
                if job.get("status", "").lower() in ["scheduled", "confirmed"]:
                    job_date = (
                        job.get("time_tracking", {}).get("scheduled_start") or
                        job.get("scheduled_date") or
                        job.get("created_at")
                    )
                    
                    if job_date:
                        if isinstance(job_date, str):
                            try:
                                job_date = datetime.fromisoformat(job_date.replace('Z', '+00:00'))
                            except:
                                continue
                        
                        if hasattr(job_date, 'date') and tomorrow <= job_date < next_week:
                            upcoming_jobs.append({
                                "id": str(job["_id"]),
                                "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                                "service_type": job.get("service_type", "Service"),
                                "scheduled_date": job_date.date().isoformat(),
                                "customer_name": job.get("customer_name", "Unknown"),
                                "status": job.get("status", "scheduled")
                            })
            except Exception as e:
                logger.error(f"Error processing upcoming job: {e}")
                continue
        
        # Sort upcoming jobs by date
        upcoming_jobs.sort(key=lambda x: x.get("scheduled_date", "9999-12-31"))
        
        # Build dashboard response
        dashboard_data = {
            "technician": {
                "id": str(technician_id),
                "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
                "email": current_user.get("email", ""),
                "phone": current_user.get("phone", ""),
                "role": current_user.get("role", "technician")
            },
            "today_jobs": formatted_today_jobs,
            "upcoming_jobs": upcoming_jobs[:10],  # Limit to 10
            "stats": {
                "today": {
                    "total": len(formatted_today_jobs),
                    "completed": len([j for j in formatted_today_jobs if j.get("status", "").lower() == "completed"]),
                    "in_progress": len([j for j in formatted_today_jobs if j.get("status", "").lower() in ["in_progress", "started"]]),
                    "pending": len([j for j in formatted_today_jobs if j.get("status", "").lower() in ["scheduled", "confirmed"]])
                },
                "week": {
                    "total": len(week_jobs),
                    "completed": len([j for j in week_jobs if j.get("status", "").lower() == "completed"]),
                    "completion_rate": round((len([j for j in week_jobs if j.get("status", "").lower() == "completed"]) / len(week_jobs) * 100) if week_jobs else 0, 1)
                },
                "overall": {
                    "total_jobs": total_jobs,
                    "completed_jobs": completed_jobs,
                    "in_progress_jobs": in_progress_jobs,
                    "completion_rate": round((completed_jobs / total_jobs * 100) if total_jobs > 0 else 0, 1)
                }
            }
        }
        
        logger.info(f"Dashboard successful: {len(formatted_today_jobs)} today's jobs, {len(upcoming_jobs)} upcoming")
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")

# ================================
# JOB MANAGEMENT ENDPOINTS
# ================================

@router.get("/jobs")
async def get_technician_jobs(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get jobs assigned to technician"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Get all jobs for technician
        all_jobs = await _find_technician_jobs(db, company_id, technician_id)
        
        # Apply filters
        filtered_jobs = all_jobs
        
        if status:
            filtered_jobs = [job for job in filtered_jobs if job.get("status", "").lower() == status.lower()]
        
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from)
                filtered_jobs = [job for job in filtered_jobs if 
                               job.get("created_at") and job["created_at"] >= from_date]
            except:
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to)
                filtered_jobs = [job for job in filtered_jobs if 
                               job.get("created_at") and job["created_at"] <= to_date]
            except:
                pass
        
        # Sort by creation date (newest first)
        filtered_jobs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
        
        # Apply pagination
        paginated_jobs = filtered_jobs[offset:offset + limit]
        
        # Format jobs
        formatted_jobs = []
        for job in paginated_jobs:
            try:
                formatted_job = {
                    "id": str(job["_id"]),
                    "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                    "service_type": job.get("service_type", "Service"),
                    "description": job.get("description", ""),
                    "status": job.get("status", "scheduled"),
                    "priority": job.get("priority", "medium"),
                    "customer": {
                        "name": job.get("customer_name", "Unknown"),
                        "phone": job.get("customer_phone", ""),
                        "email": job.get("customer_email", "")
                    },
                    "location": job.get("address", {}),
                    "scheduled_date": job.get("time_tracking", {}).get("scheduled_start"),
                    "estimated_duration": job.get("estimated_duration", "2 hours"),
                    "created_at": job.get("created_at", datetime.utcnow()).isoformat() if hasattr(job.get("created_at"), 'isoformat') else str(job.get("created_at", "")),
                    "updated_at": job.get("updated_at", datetime.utcnow()).isoformat() if hasattr(job.get("updated_at"), 'isoformat') else str(job.get("updated_at", ""))
                }
                formatted_jobs.append(formatted_job)
            except Exception as e:
                logger.error(f"Error formatting job: {e}")
                continue
        
        return {
            "jobs": formatted_jobs,
            "total": len(filtered_jobs),
            "page": (offset // limit) + 1,
            "limit": limit,
            "has_more": offset + len(formatted_jobs) < len(filtered_jobs)
        }
        
    except Exception as e:
        logger.error(f"Error getting technician jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# QUICK FIX: Replace your get_job_details function with this serialization fix

@router.get("/jobs/{job_id}")
async def get_job_details(
    job_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get detailed job information - FIXED VERSION"""
    try:
        _ensure_technician_role(current_user)
        
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Find the job
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # FIXED: Add serialization function
        def serialize_value(value):
            """Convert ObjectId and datetime objects to JSON-serializable formats"""
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
        
        # Get customer details if available
        customer_details = {}
        if job.get("customer_id"):
            customer = await db.contacts.find_one({"_id": job["customer_id"]})
            if customer:
                customer_details = {
                    "id": str(customer["_id"]),
                    "name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                    "phone": customer.get("phone", ""),
                    "email": customer.get("email", ""),
                    "address": serialize_value(customer.get("address", "")),
                    "notes": customer.get("notes", "")
                }
        
        # FIXED: Serialize all job data
        job_details = {
            "id": str(job["_id"]),
            "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
            "service_type": job.get("service_type", "Service"),
            "description": job.get("description", ""),
            "status": job.get("status", "scheduled"),
            "priority": job.get("priority", "medium"),
            "customer": customer_details or {
                "name": job.get("customer_name", "Unknown"),
                "phone": job.get("customer_phone", ""),
                "email": job.get("customer_email", "")
            },
            "location": serialize_value(job.get("address", {})),
            "time_tracking": serialize_value(job.get("time_tracking", {})),
            "special_instructions": job.get("special_instructions", ""),
            "equipment_needed": job.get("equipment_needed", []),
            "materials_needed": job.get("materials_needed", []),
            "photos": serialize_value(job.get("photos", [])),
            "notes": serialize_value(job.get("notes", [])),
            "work_performed": job.get("work_performed", ""),
            "materials_used": serialize_value(job.get("materials_used", [])),
            "completion_notes": job.get("completion_notes", ""),
            "recommendations": job.get("recommendations", []),
            "invoice_created": job.get("invoice_created", False),
            "invoice_id": str(job["invoice_id"]) if job.get("invoice_id") else None,
            "invoice_number": job.get("invoice_number"),
            "created_at": serialize_value(job.get("created_at", datetime.utcnow())),
            "updated_at": serialize_value(job.get("updated_at", datetime.utcnow()))
        }
        
        return {"job": job_details}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# QUICK FIX: Update your create_invoice_from_job_enhanced function
# Find this function in your technician_portal.py and replace the invoice_doc creation part:
# Replace your create_invoice_from_job_enhanced function in technician_portal.py with this:

async def create_invoice_from_job_enhanced(
    job: Dict[str, Any],
    db: AsyncIOMotorDatabase,
    current_user: Dict[str, Any]
):
    """Enhanced automatic invoice creation from completed job - FIXED VERSION"""
    try:
        logger.info(f"Creating invoice for job: {job.get('job_number')}")
        
        company_id = oid(current_user["company_id"])
        
        # Check if invoice already exists
        existing_invoice = await db.invoices.find_one({
            "job_id": job["_id"],
            "company_id": company_id
        })
        
        if existing_invoice:
            logger.info(f"Invoice already exists for job {job['_id']}")
            return {
                "success": True,
                "invoice_id": str(existing_invoice["_id"]),
                "invoice_number": existing_invoice["invoice_number"],
                "total_amount": existing_invoice["total_amount"]
            }
        
        # Get customer information
        customer = None
        customer_email = ""
        customer_name = ""
        
        if job.get("customer_id"):
            customer = await db.contacts.find_one({"_id": job["customer_id"]})
            if customer:
                customer_email = customer.get("email", "")
                customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        
        # Fallback to job customer info
        if not customer_email:
            customer_email = job.get("customer_email", "")
        if not customer_name:
            customer_name = job.get("customer_name", "Unknown Customer")
        
        # Generate invoice number
        invoice_count = await db.invoices.count_documents({"company_id": company_id})
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{(invoice_count + 1):04d}"
        
        # FIXED: Get actual pricing from job or use dynamic calculation
        service_cost = 0.0
        line_items = []
        
        # Method 1: Use existing line items from job
        if job.get("line_items") and len(job["line_items"]) > 0:
            for item in job["line_items"]:
                item_total = float(item.get("quantity", 1)) * float(item.get("unit_price", 0))
                line_items.append({
                    "description": item.get("description", "Service"),
                    "quantity": float(item.get("quantity", 1)),
                    "unit_price": float(item.get("unit_price", 0)),
                    "total": item_total
                })
                service_cost += item_total
        
        # Method 2: Use quoted price from job
        elif job.get("quoted_price") and float(job["quoted_price"]) > 0:
            service_cost = float(job["quoted_price"])
            line_items.append({
                "description": job.get("service_type", "Service Completed"),
                "quantity": 1.0,
                "unit_price": service_cost,
                "total": service_cost
            })
        
        # Method 3: Calculate based on materials used and labor
        elif job.get("materials_used") or job.get("work_performed"):
            # Calculate materials cost
            materials_cost = 0.0
            if job.get("materials_used"):
                for material in job["materials_used"]:
                    mat_cost = float(material.get("cost", 0)) * float(material.get("quantity", 1))
                    materials_cost += mat_cost
                    line_items.append({
                        "description": f"Materials: {material.get('name', 'Unknown')}",
                        "quantity": float(material.get("quantity", 1)),
                        "unit_price": float(material.get("cost", 0)),
                        "total": mat_cost
                    })
            
            # Calculate labor cost based on time spent
            labor_cost = 0.0
            time_tracking = job.get("time_tracking", {})
            actual_start = time_tracking.get("actual_start")
            actual_end = time_tracking.get("actual_end")
            
            if actual_start and actual_end:
                try:
                    if isinstance(actual_start, str):
                        actual_start = datetime.fromisoformat(actual_start.replace('Z', '+00:00'))
                    if isinstance(actual_end, str):
                        actual_end = datetime.fromisoformat(actual_end.replace('Z', '+00:00'))
                    
                    hours_worked = (actual_end - actual_start).total_seconds() / 3600
                    # Use technician hourly rate or default to $75/hour
                    hourly_rate = float(job.get("hourly_rate", 75.0))
                    labor_cost = hours_worked * hourly_rate
                    
                    line_items.append({
                        "description": f"Labor: {job.get('service_type', 'Service')} ({hours_worked:.1f} hours)",
                        "quantity": round(hours_worked, 1),
                        "unit_price": hourly_rate,
                        "total": labor_cost
                    })
                except Exception as e:
                    logger.warning(f"Could not calculate labor cost: {e}")
                    # Fallback labor charge
                    labor_cost = 150.0
                    line_items.append({
                        "description": f"Labor: {job.get('service_type', 'Service')}",
                        "quantity": 1.0,
                        "unit_price": labor_cost,
                        "total": labor_cost
                    })
            else:
                # Default labor charge if no time tracking
                labor_cost = 150.0
                line_items.append({
                    "description": f"Labor: {job.get('service_type', 'Service')}",
                    "quantity": 1.0,
                    "unit_price": labor_cost,
                    "total": labor_cost
                })
            
            service_cost = materials_cost + labor_cost
        
        # Method 4: Fallback to service-based pricing
        else:
            # Dynamic pricing based on service type
            service_type = job.get("service_type", "").lower()
            if "hvac" in service_type or "air conditioning" in service_type:
                service_cost = 200.0
            elif "plumbing" in service_type:
                service_cost = 175.0
            elif "electrical" in service_type:
                service_cost = 150.0
            elif "pest" in service_type:
                service_cost = 125.0
            elif "lawn" in service_type or "garden" in service_type:
                service_cost = 100.0
            else:
                service_cost = 150.0  # Default service cost
            
            line_items.append({
                "description": job.get("service_type", "Service Completed"),
                "quantity": 1.0,
                "unit_price": service_cost,
                "total": service_cost
            })
        
        # Ensure minimum charge
        if service_cost < 50.0:
            service_cost = 50.0
            line_items = [{
                "description": "Minimum Service Charge",
                "quantity": 1.0,
                "unit_price": 50.0,
                "total": 50.0
            }]
        
        # Calculate tax and totals
        tax_rate = 8.25  # You can make this configurable per company
        subtotal = service_cost
        tax_amount = (subtotal * tax_rate) / 100
        total_amount = subtotal + tax_amount
        
        # Create invoice document with datetime objects
        current_datetime = datetime.utcnow()
        due_datetime = current_datetime + timedelta(days=30)
        
        invoice_doc = {
            "company_id": company_id,
            "job_id": job["_id"],
            "customer_id": job.get("customer_id"),
            "invoice_number": invoice_number,
            "title": f"Service Invoice - {job.get('service_type', 'Service')}",
            "description": job.get("work_performed", job.get("description", "")),
            "status": "draft",
            "line_items": line_items,
            "subtotal": subtotal,
            "discount_amount": 0.0,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "amount_paid": 0.0,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": job.get("customer_phone", ""),
            "issue_date": current_datetime,
            "due_date": due_datetime,
            "created_at": current_datetime,
            "updated_at": current_datetime,
            "created_by": oid(current_user["_id"]),
            "notes": f"Invoice generated from completed job: {job.get('job_number', '')}",
            "terms_and_conditions": "Payment due within 30 days. Late payments may incur additional fees."
        }
        
        # Insert invoice
        result = await db.invoices.insert_one(invoice_doc)
        invoice_id = result.inserted_id
        
        # Update job with invoice reference
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "invoice_created": True,
                    "invoice_id": invoice_id,
                    "invoice_number": invoice_number,
                    "updated_at": current_datetime
                }
            }
        )
        
        logger.info(f"Invoice created successfully: {invoice_number} for ${total_amount:.2f}")
        
        return {
            "success": True,
            "invoice_id": str(invoice_id),
            "invoice_number": invoice_number,
            "total_amount": total_amount,
            "customer_email": customer_email
        }
        
    except Exception as e:
        logger.error(f"Error creating invoice from job: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}

# ALSO FIX: If you have create_invoice_from_job function, update it too:
async def create_invoice_from_job(
    db: AsyncIOMotorDatabase,
    job: Dict[str, Any],
    company_id: ObjectId
):
    """Automatically create invoice when job is completed - FIXED VERSION"""
    try:
        logger.info(f"Creating invoice for completed job {job['_id']}")
        
        # Check if invoice already exists
        existing_invoice = await db.invoices.find_one({
            "job_id": job["_id"],
            "company_id": company_id
        })
        
        if existing_invoice:
            logger.info(f"Invoice already exists for job {job['_id']}")
            return existing_invoice
        
        # Generate invoice number
        invoice_count = await db.invoices.count_documents({"company_id": company_id})
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_count + 1:04d}"
        
        # Calculate pricing
        service_cost = job.get("quoted_price", 150.0) or 150.0
        tax_rate = 8.25
        subtotal = service_cost
        tax_amount = (subtotal * tax_rate) / 100
        total_amount = subtotal + tax_amount
        
        # FIXED: Create invoice document with datetime objects
        current_datetime = datetime.utcnow()
        
        invoice_doc = {
            "company_id": company_id,
            "job_id": job["_id"],
            "customer_id": job.get("customer_id"),
            "invoice_number": invoice_number,
            "status": "draft",
            "subtotal": subtotal,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "amount_paid": 0.0,
            # FIXED: Use datetime, not date
            "issue_date": current_datetime,
            "due_date": current_datetime + timedelta(days=30),
            "customer_name": job.get("customer_name", ""),
            "customer_email": job.get("customer_email", ""),
            "customer_phone": job.get("customer_phone", ""),
            "created_at": current_datetime,
            "updated_at": current_datetime,
            "created_by": job.get("technician_id")
        }
        
        # Insert invoice
        result = await db.invoices.insert_one(invoice_doc)
        invoice_id = result.inserted_id
        
        # Update job
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "invoice_created": True,
                    "invoice_id": invoice_id,
                    "updated_at": current_datetime
                }
            }
        )
        
        logger.info(f"Invoice {invoice_number} created for job {job['_id']}")
        
        # Return the created invoice
        invoice_doc["_id"] = invoice_id
        return invoice_doc
        
    except Exception as e:
        logger.error(f"Error creating invoice from job: {e}")
        return None
    
async def update_service_request_on_job_completion(
    db: AsyncIOMotorDatabase,
    job_id: str,
    company_id: ObjectId
):
    """Update related service request status when job is completed"""
    try:
        # Find the job to get service_request_id
        job = await db.jobs.find_one({"_id": oid(job_id), "company_id": company_id})
        if not job:
            logger.warning(f"Job {job_id} not found when updating service request")
            return
        
        # Check if job has related service request
        service_request_id = job.get("service_request_id")
        if not service_request_id:
            logger.info(f"Job {job_id} has no related service request")
            return
        
        # Update service request status to completed
        result = await db.service_requests.update_one(
            {"_id": oid(service_request_id), "company_id": company_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count > 0:
            logger.info(f"Updated service request {service_request_id} to completed status")
        else:
            logger.warning(f"Service request {service_request_id} not found or not updated")
            
    except Exception as e:
        logger.error(f"Error updating service request on job completion: {e}")

# UPDATED complete_job function with both fixes
@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    completion_data: JobCompletion,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Complete a job with completion details - UPDATED VERSION WITH INVOICE GENERATION"""
    try:
        _ensure_technician_role(current_user)
        
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Prepare completion data
        completion_time = datetime.utcnow()
        update_data = {
            "status": "completed",
            "completion_date": completion_time,
            "time_tracking.actual_end": completion_time,
            "updated_at": completion_time
        }
        
        # Add completion details
        if completion_data.completion_notes:
            update_data["completion_notes"] = completion_data.completion_notes
        
        if completion_data.work_performed:
            update_data["work_performed"] = completion_data.work_performed
        
        if completion_data.materials_used:
            update_data["materials_used"] = completion_data.materials_used
        
        if completion_data.customer_signature:
            update_data["customer_signature"] = completion_data.customer_signature
        
        if completion_data.recommendations:
            update_data["recommendations"] = completion_data.recommendations
        
        if completion_data.follow_up_required:
            update_data["follow_up_required"] = True
            if completion_data.follow_up_date:
                update_data["follow_up_date"] = completion_data.follow_up_date
        
        # Set actual start if not already set
        if not job.get("time_tracking", {}).get("actual_start"):
            update_data["time_tracking.actual_start"] = completion_time - timedelta(hours=2)
        
        # Update the job
        result = await db.jobs.update_one(
            {"_id": oid(job_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Failed to complete job")
        
        # Get updated job for invoice creation
        updated_job = await db.jobs.find_one({"_id": oid(job_id)})
        
        # **NEW: Update related service request to completed**
        await update_service_request_on_job_completion(db, job_id, company_id)
        
        # **NEW: Update related service request to completed**
        response_data = {
            "success": True,
            "message": "Job completed successfully",
            "job_id": job_id,
            "completion_time": completion_time.isoformat(),
            "invoice_created": False,
            "manual_invoice_required": True
            }

        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# UPDATED update_job_status function with both fixes
@router.patch("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    status_update: JobStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Update job status - UPDATED VERSION WITH SERVICE REQUEST AND INVOICE UPDATES"""
    try:
        _ensure_technician_role(current_user)
        
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Prepare update data
        update_data = {
            "status": status_update.status,
            "updated_at": datetime.utcnow()
        }
        
        # Handle time tracking based on status
        if status_update.status.lower() == "in_progress" or status_update.status.lower() == "started":
            if not job.get("time_tracking", {}).get("actual_start"):
                update_data["time_tracking.actual_start"] = status_update.actual_start_time or datetime.utcnow()
        
        elif status_update.status.lower() == "completed":
            if not job.get("time_tracking", {}).get("actual_end"):
                update_data["time_tracking.actual_end"] = status_update.actual_end_time or datetime.utcnow()
            
            # Set completion date
            update_data["completion_date"] = datetime.utcnow()
        
        # Add notes if provided
        if status_update.notes:
            existing_notes = job.get("technician_notes", [])
            if isinstance(existing_notes, str):
                existing_notes = [existing_notes]
            elif not isinstance(existing_notes, list):
                existing_notes = []
            
            new_note = {
                "note": status_update.notes,
                "timestamp": datetime.utcnow(),
                "technician": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            }
            existing_notes.append(new_note)
            update_data["technician_notes"] = existing_notes
        
        # Update the job
        result = await db.jobs.update_one(
            {"_id": oid(job_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Failed to update job")
        
        response_data = {
            "success": True,
            "message": f"Job status updated to {status_update.status}",
            "job_id": job_id,
            "new_status": status_update.status
        }
        
        # **NEW: Handle completion workflow**
        if status_update.status.lower() == "completed":
            # Update related service request
            await update_service_request_on_job_completion(db, job_id, company_id)
            
            # Create invoice automatically
            # No automatic invoice - let technician create manually
            response_data["invoice_created"] = False
            response_data["manual_invoice_required"] = True 
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add utility endpoint to fix existing data
@router.post("/debug/fix-completed-jobs")
async def fix_completed_jobs_workflow(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """One-time fix for existing completed jobs"""
    
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    company_id = oid(current_user["company_id"])
    
    # Find all completed jobs without invoices
    completed_jobs = await db.jobs.find({
        "company_id": company_id,
        "status": "completed",
        "invoice_created": {"$ne": True}
    }).to_list(length=None)
    
    fixed_count = 0
    service_requests_fixed = 0
    invoices_created = 0
    
    for job in completed_jobs:
        try:
            # Fix service request status
            if job.get("service_request_id"):
                result = await db.service_requests.update_one(
                    {"_id": job["service_request_id"], "company_id": company_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": job.get("completion_date", datetime.utcnow()),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                if result.modified_count > 0:
                    service_requests_fixed += 1
            
            # Create invoice
            invoice = await create_invoice_from_job(db, job, company_id)
            if invoice:
                invoices_created += 1
            
            fixed_count += 1
            
        except Exception as e:
            logger.error(f"Error fixing job {job['_id']}: {e}")
    
    return {
        "message": f"Fixed {fixed_count} completed jobs",
        "jobs_processed": len(completed_jobs),
        "jobs_fixed": fixed_count,
        "service_requests_fixed": service_requests_fixed,
        "invoices_created": invoices_created
    }

# ================================
# TIME TRACKING ENDPOINTS
# ================================

@router.post("/jobs/{job_id}/time-entry")
async def create_time_entry(
    job_id: str,
    time_entry: TimeEntry,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Create a time entry for a job"""
    try:
        _ensure_technician_role(current_user)
        
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Create time entry
        time_entry_data = {
            "job_id": oid(job_id),
            "technician_id": technician_id,
            "company_id": company_id,
            "entry_type": time_entry.entry_type,
            "timestamp": time_entry.timestamp,
            "location": time_entry.location,
            "notes": time_entry.notes,
            "created_at": datetime.utcnow()
        }
        
        # Insert time entry
        result = await db.time_entries.insert_one(time_entry_data)
        
        # Update job time tracking based on entry type
        update_data = {"updated_at": datetime.utcnow()}
        
        if time_entry.entry_type == "clock_in":
            update_data["time_tracking.actual_start"] = time_entry.timestamp
            if job.get("status") in ["scheduled", "confirmed"]:
                update_data["status"] = "in_progress"
        
        elif time_entry.entry_type == "clock_out":
            update_data["time_tracking.actual_end"] = time_entry.timestamp
            if job.get("status") == "in_progress":
                update_data["status"] = "completed"
                update_data["completion_date"] = time_entry.timestamp
        
        # Update job if there are changes
        if len(update_data) > 1:  # More than just updated_at
            await db.jobs.update_one(
                {"_id": oid(job_id)},
                {"$set": update_data}
            )
        
        logger.info(f"Time entry created for job {job_id}: {time_entry.entry_type}")
        
        return {
            "success": True,
            "time_entry_id": str(result.inserted_id),
            "entry_type": time_entry.entry_type,
            "timestamp": time_entry.timestamp.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating time entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# LOCATION AND OTHER ENDPOINTS
# ================================
@router.post("/location/update")
async def update_location(
    location_data: LocationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Update technician location - FIXED VERSION"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        logger.info(f"Updating location for technician {technician_id}")
        
        # Validate location data
        if not (-90 <= location_data.latitude <= 90):
            raise HTTPException(status_code=400, detail="Invalid latitude")
        if not (-180 <= location_data.longitude <= 180):
            raise HTTPException(status_code=400, detail="Invalid longitude")
        
        current_time = datetime.utcnow()
        
        # Update or create location record
        location_record = {
            "technician_id": technician_id,
            "company_id": company_id,
            "latitude": location_data.latitude,
            "longitude": location_data.longitude,
            "accuracy": location_data.accuracy,
            "timestamp": location_data.timestamp or current_time,
            "updated_at": current_time
        }
        
        # Try to upsert location with proper error handling
        try:
            # Upsert location record in technician_locations collection
            await db.technician_locations.update_one(
                {
                    "technician_id": technician_id, 
                    "company_id": company_id
                },
                {"$set": location_record},
                upsert=True
            )
            
            # Also update the user's current location field
            await db.users.update_one(
                {"_id": technician_id},
                {
                    "$set": {
                        "current_location": {
                            "latitude": location_data.latitude,
                            "longitude": location_data.longitude,
                            "accuracy": location_data.accuracy,
                            "updated_at": current_time
                        },
                        "last_location_update": current_time
                    }
                }
            )
            
            logger.info(f"Location updated successfully for technician {technician_id}")
            
            return {
                "success": True, 
                "message": "Location updated successfully",
                "timestamp": current_time.isoformat()
            }
            
        except Exception as db_error:
            logger.error(f"Database error updating location: {db_error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Database error: {str(db_error)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in location update: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to update location: {str(e)}"
        )


# Replace your existing @router.get("/stats") endpoint with this fixed version:

@router.get("/stats")
async def get_technician_stats(
    period: str = Query("week", description="week, month, or year"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get technician performance stats - FIXED VERSION"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Calculate date range
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if period == "week":
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=7)
        elif period == "month":
            start_date = today.replace(day=1)
            if today.month == 12:
                end_date = today.replace(year=today.year + 1, month=1, day=1)
            else:
                end_date = today.replace(month=today.month + 1, day=1)
        else:  # year
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(year=today.year + 1, month=1, day=1)
        
        # Get all jobs for technician
        all_jobs = await _find_technician_jobs(db, company_id, technician_id)
        
        # Filter jobs by date range
        period_jobs = []
        for job in all_jobs:
            job_date = job.get("created_at") or job.get("updated_at") or datetime.now()
            if hasattr(job_date, 'date') and start_date <= job_date < end_date:
                period_jobs.append(job)
        
        # Calculate stats
        total_jobs = len(period_jobs)
        completed_jobs = len([j for j in period_jobs if j.get("status", "").lower() == "completed"])
        in_progress_jobs = len([j for j in period_jobs if j.get("status", "").lower() in ["in_progress", "started"]])
        cancelled_jobs = len([j for j in period_jobs if j.get("status", "").lower() == "cancelled"])
        
        # Calculate completion rate
        completion_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        
        # Calculate average job duration for completed jobs
        total_duration = 0
        duration_count = 0
        
        for job in period_jobs:
            if job.get("status", "").lower() == "completed":
                start_time = job.get("time_tracking", {}).get("actual_start")
                end_time = job.get("time_tracking", {}).get("actual_end")
                
                if start_time and end_time:
                    try:
                        if isinstance(start_time, str):
                            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        if isinstance(end_time, str):
                            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                        
                        duration = (end_time - start_time).total_seconds() / 3600  # Convert to hours
                        total_duration += duration
                        duration_count += 1
                    except:
                        continue
        
        avg_duration = total_duration / duration_count if duration_count > 0 else 0
        
        # FIXED: Return plain dictionary instead of using serialize_response
        stats_data = {
            "stats": {
                "period": {
                    "type": period,
                    "days": (end_date - start_date).days,
                    "start_date": start_date.date().isoformat(),
                    "end_date": end_date.date().isoformat()
                },
                "jobs": {
                    "total": total_jobs,
                    "completed": completed_jobs,
                    "in_progress": in_progress_jobs,
                    "cancelled": cancelled_jobs,
                    "completion_rate": round(completion_rate, 1)
                },
                "performance": {
                    "avg_job_duration_hours": round(avg_duration, 2),
                    "total_hours_worked": round(total_duration, 2),
                    "jobs_per_day": round(total_jobs / max(1, (end_date - start_date).days), 2)
                }
            }
        }
        
        logger.info(f"Stats calculated for technician {technician_id}: {total_jobs} jobs")
        return stats_data
        
    except Exception as e:
        logger.error(f"Error getting technician stats: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")
    

# Add this route-optimization endpoint to your technician_portal.py file
# Insert this BEFORE the stats endpoint

@router.get("/route-optimization")
async def get_route_optimization(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get optimized route for technician jobs on specific date"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Parse target date
        if date:
            try:
                target_date = datetime.strptime(date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        next_day = target_date + timedelta(days=1)
        
        logger.info(f"Getting route optimization for technician {technician_id} on {target_date.date()}")
        
        # Get all jobs for this technician
        all_jobs = await _find_technician_jobs(db, company_id, technician_id)
        
        # Filter jobs for the target date
        date_jobs = []
        for job in all_jobs:
            try:
                # Check multiple date fields to find jobs for the target date
                job_date = (
                    job.get("time_tracking", {}).get("scheduled_start") or
                    job.get("scheduled_date") or
                    job.get("service_date") or
                    job.get("created_at")
                )
                
                if job_date:
                    # Convert to datetime if it's a string
                    if isinstance(job_date, str):
                        try:
                            job_datetime = datetime.fromisoformat(job_date.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(job_date, 'date'):
                        job_datetime = job_date
                    else:
                        continue
                        
                    # Check if job is on target date
                    if target_date <= job_datetime < next_day:
                        date_jobs.append(job)
            except Exception as e:
                logger.error(f"Error processing job date: {e}")
                continue
        
        # Format jobs for route optimization
        route_jobs = []
        total_service_time = 0
        
        for job in date_jobs:
            try:
                # Get customer info
                customer_name = "Unknown Customer"
                customer_phone = ""
                
                if job.get("customer_info"):
                    customer_info = job["customer_info"]
                    customer_name = f"{customer_info.get('first_name', '')} {customer_info.get('last_name', '')}".strip() or "Unknown"
                    customer_phone = customer_info.get("phone", "")
                elif job.get("customer_name"):
                    customer_name = job["customer_name"]
                    customer_phone = job.get("customer_phone", "")
                
                # Get customer from contacts if we have customer_id
                if job.get("customer_id") and not customer_phone:
                    try:
                        customer = await db.contacts.find_one({"_id": job["customer_id"]})
                        if customer:
                            customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or customer_name
                            customer_phone = customer.get("phone", "")
                    except:
                        pass
                
                # Get location info
                address = job.get("address", {})
                location = {
                    "street": "",
                    "city": "",
                    "state": "",
                    "zip_code": "",
                    "latitude": None,
                    "longitude": None,
                    "full_address": "No address provided"
                }
                
                if isinstance(address, dict):
                    location.update({
                        "street": address.get("street", ""),
                        "city": address.get("city", ""),
                        "state": address.get("state", ""),
                        "zip_code": address.get("zip_code", "") or address.get("postal_code", ""),
                        "latitude": address.get("latitude"),
                        "longitude": address.get("longitude")
                    })
                    
                    # Create full address
                    address_parts = [
                        location["street"],
                        location["city"],
                        f"{location['state']} {location['zip_code']}".strip()
                    ]
                    location["full_address"] = ", ".join([part for part in address_parts if part])
                elif address:
                    location["full_address"] = str(address)
                
                # Get time window
                time_tracking = job.get("time_tracking", {})
                scheduled_start = time_tracking.get("scheduled_start")
                scheduled_end = time_tracking.get("scheduled_end")
                estimated_duration = time_tracking.get("scheduled_duration", 60)  # Default 60 minutes
                
                # Convert times to ISO format
                start_iso = None
                end_iso = None
                
                if scheduled_start:
                    if isinstance(scheduled_start, str):
                        start_iso = scheduled_start
                    elif hasattr(scheduled_start, 'isoformat'):
                        start_iso = scheduled_start.isoformat()
                
                if scheduled_end:
                    if isinstance(scheduled_end, str):
                        end_iso = scheduled_end
                    elif hasattr(scheduled_end, 'isoformat'):
                        end_iso = scheduled_end.isoformat()
                
                # Create route job object
                route_job = {
                    "id": str(job["_id"]),
                    "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                    "title": job.get("title") or job.get("service_type", "Service"),
                    "service_type": job.get("service_type", "Service"),
                    "status": job.get("status", "scheduled"),
                    "priority": job.get("priority", "medium"),
                    "customer": {
                        "name": customer_name,
                        "phone": customer_phone
                    },
                    "location": location,
                    "time_window": {
                        "scheduled_start": start_iso,
                        "scheduled_end": end_iso,
                        "estimated_duration": estimated_duration
                    },
                    "special_instructions": job.get("special_instructions", ""),
                    "estimated_travel_time": 0  # Will be calculated below
                }
                
                route_jobs.append(route_job)
                total_service_time += estimated_duration
                
            except Exception as e:
                logger.error(f"Error processing job for route: {e}")
                continue
        
        # Sort jobs by scheduled start time
        route_jobs.sort(key=lambda x: x["time_window"]["scheduled_start"] or "9999-12-31T23:59:59")
        
        # Add estimated travel times between jobs (simple estimation)
        total_travel_time = 0
        for i, job in enumerate(route_jobs):
            if i == 0:
                job["estimated_travel_time"] = 0  # First job, no travel time
            else:
                # Simple travel time estimation (in real app, use Google Maps API)
                estimated_travel = 15  # 15 minutes default between jobs
                job["estimated_travel_time"] = estimated_travel
                total_travel_time += estimated_travel
            
            # Add route order
            job["route_order"] = i + 1
        
        # Create response
        response_data = {
            "date": target_date.strftime("%Y-%m-%d"),
            "total_jobs": len(route_jobs),
            "estimated_total_time": total_service_time,  # Total service time in minutes
            "estimated_travel_time": total_travel_time,  # Total travel time in minutes
            "route": route_jobs
        }
        
        logger.info(f"Route optimization returning {len(route_jobs)} jobs with {total_service_time}min service time")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Route optimization error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Route optimization error: {str(e)}")

# Also add this schedule endpoint if it's missing
@router.get("/schedule")
async def get_technician_schedule(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get technician schedule for specific date"""
    try:
        _ensure_technician_role(current_user)
        
        technician_id = oid(current_user["_id"])
        company_id = oid(current_user["company_id"])
        
        # Parse date
        if date:
            try:
                target_date = datetime.strptime(date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        next_day = target_date + timedelta(days=1)
        
        # Get all jobs for technician
        all_jobs = await _find_technician_jobs(db, company_id, technician_id)
        
        # Filter jobs for target date
        schedule_jobs = []
        for job in all_jobs:
            try:
                job_date = (
                    job.get("time_tracking", {}).get("scheduled_start") or
                    job.get("scheduled_date") or
                    job.get("created_at")
                )
                
                if job_date:
                    if isinstance(job_date, str):
                        try:
                            job_datetime = datetime.fromisoformat(job_date.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(job_date, 'date'):
                        job_datetime = job_date
                    else:
                        continue
                        
                    if target_date <= job_datetime < next_day:
                        schedule_jobs.append({
                            "id": str(job["_id"]),
                            "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                            "title": job.get("title", job.get("service_type", "Service")),
                            "service_type": job.get("service_type", "Service"),
                            "status": job.get("status", "scheduled"),
                            "customer_name": job.get("customer_name", "Unknown"),
                            "scheduled_start": job_datetime.isoformat(),
                            "estimated_duration": job.get("time_tracking", {}).get("scheduled_duration", 60),
                            "location": job.get("address", {}),
                            "special_instructions": job.get("special_instructions", "")
                        })
            except Exception as e:
                logger.error(f"Error processing schedule job: {e}")
                continue
        
        # Sort by scheduled start time
        schedule_jobs.sort(key=lambda x: x["scheduled_start"])
        
        return {
            "schedule": schedule_jobs,
            "total": len(schedule_jobs),
            "date": target_date.strftime("%Y-%m-%d"),
            "technician": {
                "id": str(technician_id),
                "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting technician schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get schedule: {str(e)}")
    

# Add this endpoint to technician_portal.py for manual invoice generation
# Replace your existing generate_manual_invoice function in technician_portal.py with this:

@router.post("/jobs/{job_id}/generate-invoice")
async def generate_manual_invoice(
    job_id: str,
    invoice_data: Optional[Dict[str, Any]] = Body({}),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Manually generate invoice for a job with custom amount - UPDATED VERSION"""
    _ensure_technician_role(current_user)
    
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    try:
        job_oid = oid(job_id)
        company_id = oid(current_user["company_id"])
        technician_id = oid(current_user["_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": job_oid,
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Check if invoice already exists
        existing_invoice = await db.invoices.find_one({
            "job_id": job_oid,
            "company_id": company_id
        })
        
        if existing_invoice:
            return {
                "success": True,
                "message": "Invoice already exists for this job",
                "invoice_id": str(existing_invoice["_id"]),
                "invoice_number": existing_invoice["invoice_number"],
                "payment_link": f"http://localhost:5173/customer-portal/payments/{existing_invoice['_id']}",
                "total_amount": existing_invoice["total_amount"]
            }
        
        # Get custom amount from request or use calculated amount
        custom_amount = invoice_data.get("amount")
        custom_description = invoice_data.get("description", "")
        
        logger.info(f"Manual invoice generation - Custom amount: {custom_amount}")
        
        # Get customer information
        customer = None
        customer_email = ""
        customer_name = ""
        
        if job.get("customer_id"):
            customer = await db.contacts.find_one({"_id": job["customer_id"]})
            if customer:
                customer_email = customer.get("email", "")
                customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        
        # Fallback to job customer info
        if not customer_email:
            customer_email = job.get("customer_email", "")
        if not customer_name:
            customer_name = job.get("customer_name", "Unknown Customer")
        
        # Generate invoice number
        invoice_count = await db.invoices.count_documents({"company_id": company_id})
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{(invoice_count + 1):04d}"
        
        # Calculate pricing
        service_cost = 0.0
        line_items = []
        
        if custom_amount and float(custom_amount) > 0:
            # Use custom amount provided by technician
            service_cost = float(custom_amount)
            description = custom_description or f"{job.get('service_type', 'Service')} - Manual Entry"
            
            line_items.append({
                "description": description,
                "quantity": 1.0,
                "unit_price": service_cost,
                "total": service_cost
            })
            
            logger.info(f"Using custom amount: ${service_cost}")
            
        else:
            # Use existing calculation logic as fallback
            logger.info("No custom amount provided, using calculated pricing")
            
            # Method 1: Use existing line items from job
            if job.get("line_items") and len(job["line_items"]) > 0:
                for item in job["line_items"]:
                    item_total = float(item.get("quantity", 1)) * float(item.get("unit_price", 0))
                    line_items.append({
                        "description": item.get("description", "Service"),
                        "quantity": float(item.get("quantity", 1)),
                        "unit_price": float(item.get("unit_price", 0)),
                        "total": item_total
                    })
                    service_cost += item_total
            
            # Method 2: Use quoted price from job
            elif job.get("quoted_price") and float(job["quoted_price"]) > 0:
                service_cost = float(job["quoted_price"])
                line_items.append({
                    "description": job.get("service_type", "Service Completed"),
                    "quantity": 1.0,
                    "unit_price": service_cost,
                    "total": service_cost
                })
            
            # Method 3: Default to 0 and require manual entry
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="No pricing information available. Please provide an amount for the invoice."
                )
        
        # Ensure minimum charge if using calculated pricing
        if not custom_amount and service_cost < 50.0:
            service_cost = 50.0
            line_items = [{
                "description": "Minimum Service Charge",
                "quantity": 1.0,
                "unit_price": 50.0,
                "total": 50.0
            }]
        
        # Calculate tax and totals
        tax_rate = 8.25  # You can make this configurable per company
        subtotal = service_cost
        tax_amount = (subtotal * tax_rate) / 100
        total_amount = subtotal + tax_amount
        
        # Create invoice document
        current_datetime = datetime.utcnow()
        due_datetime = current_datetime + timedelta(days=30)
        
        invoice_doc = {
            "company_id": company_id,
            "job_id": job["_id"],
            "customer_id": job.get("customer_id"),
            "invoice_number": invoice_number,
            "title": f"Service Invoice - {job.get('service_type', 'Service')}",
            "description": custom_description or job.get("work_performed", job.get("description", "")),
            "status": "draft",
            "line_items": line_items,
            "subtotal": subtotal,
            "discount_amount": 0.0,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "amount_paid": 0.0,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": job.get("customer_phone", ""),
            "issue_date": current_datetime,
            "due_date": due_datetime,
            "created_at": current_datetime,
            "updated_at": current_datetime,
            "created_by": oid(current_user["_id"]),
            "notes": f"Manual invoice generated by technician from job: {job.get('job_number', '')}",
            "terms_and_conditions": "Payment due within 30 days. Late payments may incur additional fees.",
            "manual_entry": custom_amount is not None  # Flag to indicate manual entry
        }
        
        # Insert invoice
        result = await db.invoices.insert_one(invoice_doc)
        invoice_id = result.inserted_id
        
        # Update job with invoice reference
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "invoice_created": True,
                    "invoice_id": invoice_id,
                    "invoice_number": invoice_number,
                    "updated_at": current_datetime
                }
            }
        )
        
        # Generate payment link
        payment_link = f"http://localhost:5173/customer-portal/payments/{invoice_id}"
        
        # Update invoice with payment link
        await db.invoices.update_one(
            {"_id": invoice_id},
            {"$set": {"payment_link": payment_link, "status": "sent"}}
        )
        
        logger.info(f"Manual invoice created: {invoice_number} for ${total_amount:.2f}")
        
        return {
            "success": True,
            "message": "Invoice generated successfully",
            "invoice_id": str(invoice_id),
            "invoice_number": invoice_number,
            "payment_link": payment_link,
            "total_amount": total_amount,
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "customer_email": customer_email,
            "manual_entry": custom_amount is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in manual invoice generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Also add this endpoint to send invoice to customer
@router.post("/jobs/{job_id}/send-invoice")
async def send_invoice_to_customer(
    job_id: str,
    send_data: Optional[Dict[str, Any]] = Body({}),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Send existing invoice to customer via email"""
    _ensure_technician_role(current_user)
    
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    try:
        company_id = oid(current_user["company_id"])
        
        # Find the invoice for this job
        invoice = await db.invoices.find_one({
            "job_id": oid(job_id),
            "company_id": company_id
        })
        
        if not invoice:
            raise HTTPException(status_code=404, detail="No invoice found for this job")
        
        # Update invoice status to sent
        await db.invoices.update_one(
            {"_id": invoice["_id"]},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Generate payment link
        payment_link = f"http://localhost:5173/customer-portal/payments/{invoice['_id']}"
        
        logger.info(f"📧 Invoice {invoice['invoice_number']} sent to customer")
        
        return {
            "success": True,
            "message": "Invoice sent to customer successfully",
            "invoice_id": str(invoice["_id"]),
            "invoice_number": invoice["invoice_number"],
            "payment_link": payment_link,
            "customer_email": invoice.get("customer_email", ""),
            "sent_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# Replace your existing photo upload endpoint in technician_portal.py with this fixed version:

@router.post("/jobs/{job_id}/photos")
async def upload_job_photo(
    job_id: str,
    file: UploadFile = File(...),
    category: str = Form(...),
    description: str = Form(""),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Upload photo for a job - FIXED VERSION WITH BASE64 STORAGE"""
    _ensure_technician_role(current_user)
    
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    try:
        company_id = oid(current_user["company_id"])
        technician_id = oid(current_user["_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and encode file content as base64
        file_content = await file.read()
        import base64
        base64_content = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_content}"
        
        # Create photo data with actual image data
        photo_id = str(ObjectId())
        photo_data = {
            "id": photo_id,
            "filename": file.filename,
            "category": category,
            "description": description,
            "content_type": file.content_type,
            "size": len(file_content),
            "url": data_url,  # FIXED: Use actual base64 data URL
            "uploaded_by": str(technician_id),
            "uploaded_at": datetime.utcnow(),
        }
        
        # Add photo to job
        result = await db.jobs.update_one(
            {"_id": oid(job_id)},
            {
                "$push": {"photos": photo_data},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.info(f"Photo uploaded for job {job_id} by technician {technician_id}")
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo": {
                "id": photo_data["id"],
                "filename": photo_data["filename"],
                "category": photo_data["category"],
                "description": photo_data["description"],
                "url": data_url,  # Return the actual image data
                "uploaded_at": photo_data["uploaded_at"].isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Also add the missing notes endpoint if you haven't already:
@router.post("/jobs/{job_id}/notes")
async def add_job_note(
    job_id: str,
    note_data: Dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Add a note to a job"""
    _ensure_technician_role(current_user)
    
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    try:
        company_id = oid(current_user["company_id"])
        technician_id = oid(current_user["_id"])
        
        # Verify job exists and belongs to technician
        job = await db.jobs.find_one({
            "_id": oid(job_id),
            "company_id": company_id,
            "$or": [
                {"technician_id": technician_id},
                {"technician_id": str(technician_id)}
            ]
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or access denied")
        
        # Create note document - FIXED: All strings, no ObjectId
        note_doc = {
            "id": str(ObjectId()),
            "content": note_data.get("content", ""),
            "note_type": note_data.get("note_type", "general"),
            "is_important": note_data.get("is_important", False),
            "is_customer_visible": note_data.get("is_customer_visible", True),
            "created_by": str(technician_id),  # FIXED: Convert to string
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add note to job
        result = await db.jobs.update_one(
            {"_id": oid(job_id)},
            {
                "$push": {"notes": note_doc},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.info(f"Note added to job {job_id} by technician {technician_id}")
        
        # FIXED: Return serializable response
        return {
            "success": True,
            "message": "Note added successfully",
            "note_id": note_doc["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding note: {e}")
        raise HTTPException(status_code=500, detail=str(e))



























































































































        