from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user

# =============================================================================
# app/api/v1/endpoints/scheduling.py
# =============================================================================
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta

from app.core.database import get_database
from app.services.scheduling_service import SchedulingService
from app.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/calendar")
async def get_calendar(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    technician_id: Optional[str] = None
) -> Any:
    """Get calendar view of jobs"""
    scheduling_service = SchedulingService(db)
    
    jobs = await scheduling_service.get_jobs(
        company_id=str(current_user["company_id"]),
        start_date=start_date,
        end_date=end_date,
        technician_id=technician_id
    )
    
    # Format for calendar display
    calendar_events = []
    for job in jobs:
        calendar_events.append({
            "id": job["id"],
            "title": job["title"],
            "start": job["scheduled_date"],
            "end": job["scheduled_date"] + timedelta(minutes=job["scheduled_duration"]),
            "technician_id": job.get("technician_id"),
            "customer_name": f"{job.get('customer_name', 'Unknown')}",
            "address": job["address"],
            "status": job["status"],
            "priority": job["priority"]
        })
    
    return calendar_events

@router.get("/availability")
async def check_availability(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    date: datetime = Query(...),
    technician_id: Optional[str] = None,
    duration: int = Query(default=60)  # minutes
) -> Any:
    """Check technician availability for given date"""
    scheduling_service = SchedulingService(db)
    
    # Get all jobs for the date
    start_of_day = date.replace(hour=0, minute=0, second=0)
    end_of_day = date.replace(hour=23, minute=59, second=59)
    
    jobs = await scheduling_service.get_jobs(
        company_id=str(current_user["company_id"]),
        start_date=start_of_day,
        end_date=end_of_day,
        technician_id=technician_id
    )
    
    # Calculate available time slots
    business_hours = {
        "start": 8,  # 8 AM
        "end": 18,   # 6 PM
        "lunch_start": 12,  # 12 PM
        "lunch_end": 13     # 1 PM
    }
    
    available_slots = []
    current_time = date.replace(hour=business_hours["start"], minute=0, second=0)
    end_time = date.replace(hour=business_hours["end"], minute=0, second=0)
    
    while current_time + timedelta(minutes=duration) <= end_time:
        # Skip lunch hour
        if (current_time.hour >= business_hours["lunch_start"] and 
            current_time.hour < business_hours["lunch_end"]):
            current_time += timedelta(hours=1)
            continue
        
        # Check if slot conflicts with existing jobs
        slot_end = current_time + timedelta(minutes=duration)
        conflicts = False
        
        for job in jobs:
            job_start = job["scheduled_date"]
            job_end = job_start + timedelta(minutes=job["scheduled_duration"])
            
            if (current_time < job_end and slot_end > job_start):
                conflicts = True
                break
        
        if not conflicts:
            available_slots.append({
                "start_time": current_time,
                "end_time": slot_end,
                "duration": duration
            })
        
        current_time += timedelta(minutes=30)  # 30-minute intervals
    
    return {
        "date": date,
        "technician_id": technician_id,
        "available_slots": available_slots,
        "total_slots": len(available_slots)
    }

@router.get("/optimize-routes")
async def optimize_routes(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    technician_id: Optional[str] = None
) -> Any:
    """Optimize routes for given date"""
    try:
        # Parse the date string to datetime
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
        start_of_day = parsed_date.replace(hour=0, minute=0, second=0)
        end_of_day = parsed_date.replace(hour=23, minute=59, second=59)
        
        # Get jobs for the date
        query = {
            "company_id": ObjectId(current_user["company_id"]),
            "time_tracking.scheduled_start": {
                "$gte": start_of_day,
                "$lte": end_of_day
            },
            "status": "scheduled"
        }
        
        if technician_id and ObjectId.is_valid(technician_id):
            query["technician_id"] = ObjectId(technician_id)
        
        jobs = await db.jobs.find(query).to_list(length=None)
        
        # Get technicians
        tech_query = {
            "company_id": ObjectId(current_user["company_id"]),
            "role": {"$in": ["technician", "manager"]},
            "status": "active"
        }
        if technician_id and ObjectId.is_valid(technician_id):
            tech_query["_id"] = ObjectId(technician_id)
            
        technicians = await db.users.find(tech_query).to_list(length=None)
        
        # Simple route optimization (distribute jobs among technicians)
        routes = []
        if technicians and jobs:
            jobs_per_tech = len(jobs) // len(technicians)
            remaining_jobs = len(jobs) % len(technicians)
            
            job_index = 0
            for i, tech in enumerate(technicians):
                # Calculate jobs for this technician
                jobs_count = jobs_per_tech + (1 if i < remaining_jobs else 0)
                tech_jobs = jobs[job_index:job_index + jobs_count]
                job_index += jobs_count
                
                if tech_jobs:
                    total_service_time = sum(job.get("estimated_duration", 60) for job in tech_jobs)
                    
                    routes.append({
                        "technician_id": str(tech["_id"]),
                        "technician_name": f"{tech['first_name']} {tech['last_name']}",
                        "jobs": [
                            {
                                "id": str(job["_id"]),
                                "customer_name": f"Customer {str(job['_id'])[-4:]}",  # Mock customer name
                                "service_type": job.get("service_type", "Service"),
                                "address": job.get("address", {}).get("street", "Address"),
                                "city": job.get("address", {}).get("city", "City"),
                                "state": job.get("address", {}).get("state", "State"),
                                "estimated_duration": job.get("estimated_duration", 60),
                                "priority": job.get("priority", "medium")
                            } for job in tech_jobs
                        ],
                        "total_distance": len(tech_jobs) * 8.5,  # Mock distance
                        "total_drive_time": len(tech_jobs) * 25,  # Mock drive time
                        "total_service_time": total_service_time,
                        "efficiency_score": 85 + (i * 3),  # Mock efficiency
                        "estimated_completion": f"{15 + len(tech_jobs)}:30:00"
                    })
        
        return {
            "routes": routes,
            "total_distance": sum(route["total_distance"] for route in routes),
            "total_time": sum(route["total_drive_time"] + route["total_service_time"] for route in routes),
            "optimization_savings": {
                "distance_saved": 12.3,
                "time_saved": 45,
                "fuel_cost_saved": 18.50
            },
            "unassigned_jobs": []
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

@router.post("/reschedule/{job_id}")
async def reschedule_job(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    job_id: str,
    new_date: datetime,
    new_technician_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Reschedule a job"""
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    update_data = {
        "scheduled_date": new_date,
        "updated_at": datetime.utcnow()
    }
    
    if new_technician_id:
        if not ObjectId.is_valid(new_technician_id):
            raise HTTPException(status_code=400, detail="Invalid technician ID")
        update_data["technician_id"] = ObjectId(new_technician_id)
    
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "company_id": ObjectId(current_user["company_id"])},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job rescheduled successfully"}

@router.get("/technicians")
async def get_technicians(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get all technicians for scheduling"""
    technicians = await db.users.find({
        "company_id": ObjectId(current_user["company_id"]),
        "role": {"$in": ["technician", "manager"]},
        "status": "active"
    }).to_list(length=None)
    
    # Format for scheduling
    result = []
    for tech in technicians:
        result.append({
            "id": str(tech["_id"]),
            "name": f"{tech['first_name']} {tech['last_name']}",
            "email": tech["email"],
            "phone": tech.get("phone"),
            "role": tech["role"]
        })
    
    return result
@router.post("/apply-routes")
async def apply_routes(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    routes_data: dict  # {routes: [...], date: "2025-08-25"}
) -> Any:
    """Apply optimized routes by updating job assignments"""
    try:
        routes = routes_data.get("routes", [])
        date_str = routes_data.get("date")
        
        if not routes or not date_str:
            raise HTTPException(status_code=400, detail="Routes and date are required")
        
        # Parse date
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        updated_jobs = []
        
        for route in routes:
            technician_id = route.get("technician_id")
            jobs = route.get("jobs", [])
            
            if not technician_id or not ObjectId.is_valid(technician_id):
                continue
            
            # Update each job in the route
            for job in jobs:
                job_id = job.get("id")
                if job_id and ObjectId.is_valid(job_id):
                    # Update job assignment
                    result = await db.jobs.update_one(
                        {
                            "_id": ObjectId(job_id),
                            "company_id": ObjectId(current_user["company_id"])
                        },
                        {
                            "$set": {
                                "technician_id": ObjectId(technician_id),
                                "updated_at": datetime.utcnow(),
                                "updated_by": ObjectId(current_user["_id"])
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        updated_jobs.append(job_id)
        
        return {
            "message": "Routes applied successfully",
            "updated_jobs": len(updated_jobs),
            "date": date_str
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply routes: {str(e)}")



# backend/app/api/v1/endpoints/scheduling.py




@router.get("/calendar")
async def get_calendar(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    technician_id: Optional[str] = None
) -> Any:
    """Get calendar view of jobs with proper technician filtering"""
    try:
        # Build base query
        query = {
            "company_id": ObjectId(current_user["company_id"]),
            "$or": [
                {
                    "time_tracking.scheduled_start": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                },
                {
                    "created_at": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }
            ]
        }
        
        # ✅ FIXED: Proper technician filtering
        if technician_id:
            if not ObjectId.is_valid(technician_id):
                raise HTTPException(status_code=400, detail="Invalid technician ID")
            query["technician_id"] = ObjectId(technician_id)
        
        # ✅ If user is a technician, only show their jobs
        if current_user.get("role") == "technician":
            query["technician_id"] = ObjectId(current_user["_id"])
        
        logger.info(f"🔍 Calendar query: {query}")
        
        # Fetch jobs with technician details
        pipeline = [
            {"$match": query},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "technician_id",
                    "foreignField": "_id",
                    "as": "technician_details"
                }
            },
            {
                "$lookup": {
                    "from": "contacts",
                    "localField": "customer_id",
                    "foreignField": "_id",
                    "as": "customer_details"
                }
            },
            {"$sort": {"time_tracking.scheduled_start": 1}}
        ]
        
        jobs = await db.jobs.aggregate(pipeline).to_list(length=None)
        
        # ✅ Format for calendar display
        calendar_events = []
        for job in jobs:
            # Get technician info
            technician_info = job.get("technician_details", [])
            technician_name = "Unassigned"
            if technician_info:
                tech = technician_info[0]
                technician_name = f"{tech.get('first_name', '')} {tech.get('last_name', '')}".strip()
            
            # Get customer info
            customer_info = job.get("customer_details", [])
            customer_name = "Unknown Customer"
            if customer_info:
                cust = customer_info[0]
                customer_name = f"{cust.get('first_name', '')} {cust.get('last_name', '')}".strip()
            
            # Calculate end time
            scheduled_start = job.get("time_tracking", {}).get("scheduled_start")
            scheduled_end = job.get("time_tracking", {}).get("scheduled_end")
            
            if not scheduled_end and scheduled_start:
                duration = job.get("time_tracking", {}).get("scheduled_duration", 60)
                scheduled_end = scheduled_start + timedelta(minutes=duration)
            
            calendar_event = {
                "id": str(job["_id"]),
                "title": job.get("title", "Service Call"),
                "start": scheduled_start.isoformat() if scheduled_start else job.get("created_at").isoformat(),
                "end": scheduled_end.isoformat() if scheduled_end else None,
                "technician_id": str(job["technician_id"]) if job.get("technician_id") else None,
                "technician_name": technician_name,
                "customer_name": customer_name,
                "address": job.get("address", {}),
                "status": job.get("status", "scheduled"),
                "priority": job.get("priority", "medium"),
                "service_type": job.get("service_type"),
                "description": job.get("description", ""),
                "backgroundColor": _get_status_color(job.get("status", "scheduled")),
                "borderColor": _get_priority_color(job.get("priority", "medium"))
            }
            calendar_events.append(calendar_event)
        
        logger.info(f"✅ Found {len(calendar_events)} calendar events")
        
        return {
            "events": calendar_events,
            "total_count": len(calendar_events),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching calendar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch calendar: {str(e)}")

def _get_status_color(status: str) -> str:
    """Get background color based on job status"""
    colors = {
        "scheduled": "#3B82F6",    # Blue
        "in_progress": "#F59E0B",  # Amber
        "completed": "#10B981",    # Emerald
        "cancelled": "#EF4444",    # Red
        "pending": "#6B7280"       # Gray
    }
    return colors.get(status, "#6B7280")

def _get_priority_color(priority: str) -> str:
    """Get border color based on priority"""
    colors = {
        "low": "#10B981",      # Green
        "medium": "#F59E0B",   # Amber
        "high": "#EF4444",     # Red
        "urgent": "#DC2626"    # Dark Red
    }
    return colors.get(priority, "#F59E0B")

# ✅ NEW: Endpoint specifically for technician calendar
@router.get("/technician-calendar")
async def get_technician_calendar(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...)
) -> Any:
    """Get calendar view specifically for technician portal"""
    
    # Ensure user is a technician
    if current_user.get("role") != "technician":
        raise HTTPException(status_code=403, detail="Technician access only")
    
    # Call main calendar endpoint with technician filter
    return await get_calendar(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        technician_id=str(current_user["_id"])
    )