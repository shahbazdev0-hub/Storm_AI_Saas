from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query,Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_jobs(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(default=0),
    limit: int = Query(default=100)
):
    try:
        query = {"company_id": ObjectId(current_user["company_id"])}
        jobs = await db.jobs.find(query).skip(skip).limit(limit).to_list(length=limit)
        total = await db.jobs.count_documents(query)
        
        formatted_jobs = []
        for job in jobs:
            formatted_jobs.append({
                "id": str(job["_id"]),
                "job_number": job.get("job_number", ""),
                "customer_name": "Customer",
                "status": job.get("status", "scheduled"),
                "service_type": job.get("service_type", "Service"),
                "created_at": job.get("created_at").isoformat() if job.get("created_at") else None
            })
        
        return {
            "jobs": formatted_jobs,
            "total": total,
            "page": skip // limit,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# TEST ENDPOINT
@router.get("/test")
async def test_jobs_endpoint(
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Test endpoint to verify jobs API is working"""
    return {
        "message": "Jobs API is working!",
        "user_id": str(current_user["_id"]),
        "company_id": str(current_user["company_id"]),
        "timestamp": datetime.utcnow().isoformat()
    }


# CALENDAR ENDPOINT - For Calendar.tsx
@router.get("/calendar", response_model=Dict[str, Any])
async def get_calendar_jobs(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    technician_id: Optional[str] = Query(None, description="Filter by technician")
) -> Dict[str, Any]:
    """Get jobs for calendar view with enhanced data"""
    from app.core.logger import get_logger
    logger = get_logger("endpoints.jobs.calendar")
    
    try:
        logger.info(f"Calendar request - Start: {start_date}, End: {end_date}")
        
        # Build date filter
        query = {"company_id": ObjectId(current_user["company_id"])}
        
        if start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                
                query["$or"] = [
                    {
                        "time_tracking.scheduled_start": {
                            "$gte": start_dt,
                            "$lte": end_dt
                        }
                    },
                    {
                        "time_tracking.scheduled_end": {
                            "$gte": start_dt,
                            "$lte": end_dt
                        }
                    },
                    {
                        "created_at": {
                            "$gte": start_dt,
                            "$lte": end_dt
                        }
                    }
                ]
            except ValueError as e:
                logger.error(f"Invalid date format: {e}")
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Add technician filter properly
        if technician_id and ObjectId.is_valid(technician_id):
            query["technician_id"] = ObjectId(technician_id)
        
        logger.info(f"Query: {query}")
        
        # Get jobs
        jobs_cursor = db.jobs.find(query)
        jobs = await jobs_cursor.to_list(length=None)
        
        logger.info(f"Found {len(jobs)} jobs")
        
        # Format jobs for calendar
        calendar_jobs = []
        for job in jobs:
            try:
                # Get customer info
                customer_name = "Unknown Customer"
                customer_id = None
                customer_phone = None
                if job.get("customer_id"):
                    customer = await db.contacts.find_one({"_id": job["customer_id"]})
                    if customer:
                        customer_id = str(customer["_id"])
                        customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or customer.get('name', 'Unknown')
                        customer_phone = customer.get("phone")
                
                # Get technician info
                technician_name = None
                technician_id_str = None
                if job.get("technician_id"):
                    technician = await db.users.find_one({"_id": job["technician_id"]})
                    if technician:
                        technician_id_str = str(technician["_id"])
                        technician_name = f"{technician.get('first_name', '')} {technician.get('last_name', '')}".strip()
                
                # Format time tracking
                time_tracking = job.get("time_tracking", {})
                scheduled_start = time_tracking.get("scheduled_start")
                scheduled_end = time_tracking.get("scheduled_end")
                
                # Use created_at as fallback
                if not scheduled_start:
                    scheduled_start = job.get("created_at")
                if not scheduled_end and scheduled_start:
                    scheduled_end = scheduled_start + timedelta(hours=1)
                
                # Location (normalized)
                address = job.get("address", {})
                location = {}
                if isinstance(address, dict):
                    location = {
                        "street": address.get("street", ""),
                        "city": address.get("city", ""),
                        "state": address.get("state", ""),
                        "postal_code": address.get("postal_code", "") or address.get("zip_code", "")
                    }
                
                # Create calendar job object
                calendar_job = {
                    "id": str(job["_id"]),
                    "title": job.get("title", "Service Call"),
                    "description": job.get("description", ""),
                    "status": job.get("status", "scheduled"),
                    "priority": job.get("priority", "medium"),
                    "service_type": job.get("service_type", "other"),
                    "job_number": job.get("job_number"),
                    
                    "customer": {
                        "id": customer_id,
                        "name": customer_name,
                        "phone": customer_phone,
                    },
                    
                    "technician": {
                        "id": technician_id_str,
                        "name": technician_name,
                    },
                    
                    "scheduled_start": scheduled_start.isoformat() if scheduled_start else None,
                    "scheduled_end": scheduled_end.isoformat() if scheduled_end else None,

                    "location": location,
                    
                    "created_at": job.get("created_at").isoformat() if job.get("created_at") else None,
                }
                
                calendar_jobs.append(calendar_job)
                
            except Exception as job_error:
                logger.error(f"Error processing job {job.get('_id')}: {job_error}")
                continue
        
        logger.info(f"Successfully processed {len(calendar_jobs)} calendar jobs")
        
        return {
            "jobs": calendar_jobs,
            "total": len(calendar_jobs),
            "start_date": start_date,
            "end_date": end_date,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch calendar jobs: {str(e)}")

# CREATE JOB
# Fixed section for jobs.py - Lines 217-283

@router.post("/", response_model=Dict[str, Any])
async def create_job(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    job_data: dict = Body(...),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Create new job"""
    try:
        from app.core.logger import get_logger
        logger = get_logger("endpoints.jobs.create")
        
        logger.info(f"Creating job for user: {current_user['_id']}")
        logger.info(f"📝 Received job data: {job_data}")
        
        # Generate job data
        new_job_id = ObjectId()
        
        # ✅ FIXED: Handle both old and new data formats
        # Check if time_tracking exists (old format) or use start_time/end_time (new format)
        if 'time_tracking' in job_data:
            # Old format with time_tracking object
            scheduled_start = datetime.fromisoformat(job_data['time_tracking']['scheduled_start'].replace('Z', '+00:00'))
            scheduled_end = datetime.fromisoformat(job_data['time_tracking']['scheduled_end'].replace('Z', '+00:00')) if job_data['time_tracking'].get('scheduled_end') else None
            scheduled_duration = job_data['time_tracking'].get('scheduled_duration', 60)
        else:
            # ✅ NEW FORMAT: start_time and end_time sent directly
            scheduled_start = datetime.fromisoformat(job_data['start_time'].replace('Z', '+00:00'))
            scheduled_end = datetime.fromisoformat(job_data['end_time'].replace('Z', '+00:00')) if job_data.get('end_time') else None
            scheduled_duration = job_data.get('estimated_duration', 60)
        
        # Build address object from flat fields or nested object
        if isinstance(job_data.get('address'), dict):
            address_obj = job_data['address']
        else:
            # Build from flat fields (city, state, zip_code, address)
            address_obj = {
                "street": job_data.get('address', ''),
                "city": job_data.get('city', ''),
                "state": job_data.get('state', ''),
                "zip_code": job_data.get('zip_code', ''),
            }
        
        job_document = {
            "_id": new_job_id,
            "company_id": ObjectId(current_user["company_id"]),
            "customer_id": ObjectId(job_data["customer_id"]),
            "created_by": ObjectId(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": job_data.get("status", "scheduled"),
            "job_number": f"JOB-{datetime.now().strftime('%Y%m%d')}-{str(new_job_id)[-4:]}",
            
            # Core fields
            "title": job_data.get('title', f"{job_data['service_type']} - Service Call"),
            "service_type": job_data['service_type'],
            "description": job_data.get('description', ''),
            "priority": job_data.get('priority', 'medium'),
            
            # ✅ Time tracking - built from parsed data
            "time_tracking": {
                "scheduled_start": scheduled_start,
                "scheduled_end": scheduled_end,
                "scheduled_duration": scheduled_duration
            },
            
            # ✅ Address - properly structured
            "address": address_obj,
            
            # Optional fields
            "estimated_duration": job_data.get('estimated_duration', 60),
            "special_instructions": job_data.get('notes', job_data.get('special_instructions', '')),
            "equipment_needed": job_data.get('equipment_needed', []),
            "quoted_price": job_data.get('quoted_price'),
        }

        # ✅ Handle technician assignment
        technician_id = job_data.get('technician_id')
        if technician_id and technician_id != '' and ObjectId.is_valid(technician_id):
            job_document['technician_id'] = ObjectId(technician_id)
            logger.info(f"✅ Assigned technician: {technician_id}")
        else:
            logger.info("ℹ️ No technician assigned (auto-assign)")
        
        # Insert into database
        logger.info(f"💾 Inserting job document: {job_document}")
        result = await db.jobs.insert_one(job_document)
        
        logger.info(f"✅ Job created with ID: {result.inserted_id}")
        
        return {
            "id": str(new_job_id),
            "job_number": job_document["job_number"],
            "status": job_document["status"],
            "message": "Job created successfully"
        }
        
    except KeyError as e:
        logger.error(f"❌ Missing required field: {e}")
        raise HTTPException(status_code=400, detail=f"Missing required field: {str(e)}")
    except ValueError as e:
        logger.error(f"❌ Invalid data format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error creating job: {e}")
        logger.error(f"❌ Job data received: {job_data}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

# UPDATE JOB (status / technician / other fields)
@router.patch("/{job_id}", response_model=Dict[str, Any])
async def update_job(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    job_id: str,
    job_update: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Update job status and data, including technician assignment"""
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    update_data: Dict[str, Any] = {"updated_at": datetime.utcnow()}
    
    # Status updates
    if "status" in job_update:
        update_data["status"] = job_update["status"]
        
        if job_update["status"] == "in_progress":
            update_data["actual_start_time"] = job_update.get("actual_start_time", datetime.utcnow())
        elif job_update["status"] == "completed":
            update_data["actual_end_time"] = job_update.get("actual_end_time", datetime.utcnow())

    # Technician assignment/unassignment
    if "technician_id" in job_update:
        tech_id = job_update.get("technician_id")
        if tech_id and ObjectId.is_valid(tech_id):
            update_data["technician_id"] = ObjectId(tech_id)
        else:
            update_data["technician_id"] = None

    # Allow updating other supported fields
    allowed_fields = {"title", "service_type", "description", "address", "priority",
                      "estimated_duration", "special_instructions", "equipment_needed", "quoted_price"}
    for k in allowed_fields:
        if k in job_update:
            update_data[k] = job_update[k]

    # Normalize time_tracking if provided
    if "time_tracking" in job_update and isinstance(job_update["time_tracking"], dict):
        tt = job_update["time_tracking"]
        normalized_tt: Dict[str, Any] = {}
        if "scheduled_start" in tt and tt["scheduled_start"]:
            normalized_tt["scheduled_start"] = datetime.fromisoformat(str(tt["scheduled_start"]).replace('Z', '+00:00'))
        if "scheduled_end" in tt and tt["scheduled_end"]:
            normalized_tt["scheduled_end"] = datetime.fromisoformat(str(tt["scheduled_end"]).replace('Z', '+00:00'))
        if "scheduled_duration" in tt:
            normalized_tt["scheduled_duration"] = tt["scheduled_duration"]
        if normalized_tt:
            update_data["time_tracking"] = normalized_tt
    
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "company_id": ObjectId(current_user["company_id"])},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job updated successfully", "job_id": job_id}





# backend/app/api/v1/endpoints/jobs.py


# ✅ FIXED: Assign Technician Endpoint
@router.patch("/{job_id}/assign-technician", response_model=dict)
async def assign_technician_to_job(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    job_id: str,
    assignment_data: dict,  # {technician_id: string}
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Assign technician to job"""
    try:
        # Validate job_id
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        # Extract and validate technician_id
        technician_id = assignment_data.get("technician_id")
        if not technician_id:
            raise HTTPException(status_code=400, detail="technician_id is required")
        
        if not ObjectId.is_valid(technician_id):
            raise HTTPException(status_code=400, detail="Invalid technician ID")
        
        # ✅ Verify technician exists and belongs to company
        technician = await db.users.find_one({
            "_id": ObjectId(technician_id),
            "company_id": ObjectId(current_user["company_id"]),
            "role": {"$in": ["technician", "manager", "admin"]}
        })
        
        if not technician:
            raise HTTPException(status_code=404, detail="Technician not found or invalid")
        
        # ✅ CRITICAL: Update job with ObjectId conversion
        update_data = {
            "technician_id": ObjectId(technician_id),  # ✅ Ensure ObjectId conversion
            "updated_at": datetime.utcnow(),
            "updated_by": ObjectId(current_user["_id"])
        }
        
        result = await db.jobs.update_one(
            {
                "_id": ObjectId(job_id), 
                "company_id": ObjectId(current_user["company_id"])
            },
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Job not found or not updated")
        
        # ✅ Add assignment note for audit trail
        note = {
            "id": str(ObjectId()),
            "content": f"Technician {technician['first_name']} {technician['last_name']} assigned to job",
            "note_type": "assignment",
            "created_at": datetime.utcnow(),
            "created_by": current_user["_id"]
        }
        
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$push": {"notes": note}}
        )
        
        logger.info(f"✅ Job {job_id} assigned to technician {technician_id}")
        
        return {
            "message": "Technician assigned successfully",
            "job_id": job_id,
            "technician_id": technician_id,
            "technician_name": f"{technician['first_name']} {technician['last_name']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error assigning technician: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign technician: {str(e)}")

# ✅ HELPER: Endpoint to verify job assignments
@router.get("/{job_id}/assignment")
async def get_job_assignment(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    job_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get job assignment details for debugging"""
    try:
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID")
        
        job = await db.jobs.find_one({
            "_id": ObjectId(job_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get technician details if assigned
        technician_info = None
        if job.get("technician_id"):
            technician = await db.users.find_one({
                "_id": ObjectId(job["technician_id"])
            })
            if technician:
                technician_info = {
                    "id": str(technician["_id"]),
                    "name": f"{technician.get('first_name', '')} {technician.get('last_name', '')}".strip(),
                    "email": technician.get("email"),
                    "role": technician.get("role")
                }
        
        return {
            "job_id": str(job["_id"]),
            "title": job.get("title"),
            "technician_id": str(job["technician_id"]) if job.get("technician_id") else None,
            "technician_info": technician_info,
            "status": job.get("status"),
            "created_at": job.get("created_at"),
            "updated_at": job.get("updated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting job assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# backend/app/api/v1/endpoints/jobs.py - ADD AI BOOKING DISPLAY

# Add this endpoint to your existing jobs.py file
# Add these endpoints to your existing backend/app/api/v1/endpoints/jobs.py file
# backend/app/api/v1/endpoints/jobs.py - Add this endpoint
# backend/app/api/v1/endpoints/jobs.py - ADD THESE ENDPOINTS TO YOUR JOBS ROUTER
# backend/app/api/v1/endpoints/jobs.py - ADD THESE ENDPOINTS

from datetime import datetime
import logging
from fastapi import Query, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Make sure you have these imports in your jobs.py file

@router.get("/ai-bookings")
async def get_ai_bookings(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get AI chatbot generated bookings/jobs"""
    try:
        from bson import ObjectId
        
        # Query for jobs created by AI chatbot
        query = {
            "company_id": ObjectId(current_user["company_id"]),
            "source": {"$in": ["ai_chatbot", "canvas_ai_chatbot"]} # To this # Filter for AI-generated bookings
        }
        
        logger.info(f"🔍 Searching for AI bookings with query: {query}")
        
        # Get total count
        total = await db.jobs.count_documents(query)
        logger.info(f"📊 Found {total} AI bookings")
        
        # Get bookings with pagination
        ai_bookings = await db.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        # Convert ObjectIds to strings
        for booking in ai_bookings:
            booking["_id"] = str(booking["_id"])
            booking["company_id"] = str(booking["company_id"])
            
            # Ensure all expected fields exist
            booking.setdefault("ai_session_id", "")
            booking.setdefault("notes", [])
        
        # Calculate pagination
        pages = (total + limit - 1) // limit
        
        logger.info(f"✅ Returning {len(ai_bookings)} AI bookings")
        
        return {
            "ai_bookings": ai_bookings,
            "total": total,
            "page": (skip // limit) + 1,
            "pages": pages
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting AI bookings: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving AI bookings")
# backend/app/api/v1/endpoints/jobs.py - SIMPLE FIX for confirmation endpoint
# backend/app/api/v1/endpoints/jobs.py - UPDATED CONFIRMATION ENDPOINT

import asyncio
from app.services.customer_notification_service import CustomerNotificationService

async def send_booking_confirmation(
    self,
    customer_email: str,
    customer_name: str,
    service_type: str,
    location: str = "To be confirmed",
    scheduled_time: str = "To be confirmed",
    booking_id: str = "",
    admin_notes: str = "",
    company_id: str = ""
) -> bool:
    """Send booking confirmation email to customer"""
    try:
        subject = f"✅ Booking Confirmed - {service_type}"
        
        # Create HTML email body
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .booking-details {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }}
                .detail-row {{ margin: 10px 0; }}
                .label {{ font-weight: bold; color: #6B7280; }}
                .value {{ color: #111827; }}
                .footer {{ text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }}
                .success-badge {{ display: inline-block; background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Booking Confirmed!</h1>
                </div>
                
                <div class="content">
                    <p>Dear {customer_name},</p>
                    
                    <p>Great news! Your booking has been confirmed by our team.</p>
                    
                    <div class="success-badge">✅ Confirmed</div>
                    
                    <div class="booking-details">
                        <h3 style="margin-top: 0; color: #4F46E5;">Booking Details</h3>
                        
                        <div class="detail-row">
                            <span class="label">Service:</span>
                            <span class="value">{service_type}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Location:</span>
                            <span class="value">{location}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Scheduled Time:</span>
                            <span class="value">{scheduled_time}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Booking ID:</span>
                            <span class="value">{booking_id}</span>
                        </div>
                        
                        {f'<div class="detail-row" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><span class="label">Note from Admin:</span><p style="margin: 10px 0; padding: 10px; background: #FEF3C7; border-left: 3px solid #F59E0B; border-radius: 4px;">{admin_notes}</p></div>' if admin_notes else ''}
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>Our team will contact you within 24 hours to finalize details</li>
                        <li>Please ensure someone is available at the scheduled time</li>
                        <li>If you need to reschedule, please contact us as soon as possible</li>
                    </ul>
                    
                    <p>If you have any questions, feel free to reply to this email or contact us directly.</p>
                    
                    <p>Best regards,<br><strong>Your Service Team</strong></p>
                </div>
                
                <div class="footer">
                    <p>This is an automated confirmation email.</p>
                    <p>© {datetime.now().year} Your Company. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
Booking Confirmed!

Dear {customer_name},

Great news! Your booking has been confirmed by our team.

Booking Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: {service_type}
Location: {location}
Scheduled Time: {scheduled_time}
Booking ID: {booking_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{f'Note from Admin: {admin_notes}' if admin_notes else ''}

What's Next?
- Our team will contact you within 24 hours to finalize details
- Please ensure someone is available at the scheduled time
- If you need to reschedule, please contact us as soon as possible

Best regards,
Your Service Team
        """
        
        # Send using existing SMTP method
        await self._send_via_smtp(
            to_email=customer_email,
            subject=subject,
            content=html_content,
            from_email=settings.EMAIL_USER,
            from_name="Your Service Team",
            content_type="html"
        )
        
        logger.info(f"✅ Booking confirmation email sent to {customer_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send booking confirmation email: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

@router.post("/{job_id}/send-confirmation-email")
async def send_booking_confirmation_email(
    job_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    request_body: Dict[str, str] = Body(default={})
):
    """Send booking confirmation email to customer"""
    try:
        from bson import ObjectId
        from app.services.email_service import EmailService
        
        admin_notes = request_body.get("admin_notes", "")
        
        logger.info(f"📧 Sending confirmation email for job {job_id}")
        
        # Get the booking
        booking = await db.jobs.find_one({
            "_id": ObjectId(job_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        customer_email = booking.get("customer_email")
        
        if not customer_email:
            logger.warning(f"No customer email for booking {job_id}")
            return {
                "success": False,
                "message": "No customer email available",
                "email_sent": False
            }
        
        # Prepare booking details
        customer_name = booking.get("customer_name", "Customer")
        service_type = booking.get("service_type", "Service")
        location = booking.get("location", "To be confirmed")
        scheduled_time = booking.get("scheduled_time", "To be confirmed")
        
        logger.info(f"📧 Sending to: {customer_email}")
        
        # Send email using EmailService
        email_service = EmailService(db)
        email_sent = await email_service.send_booking_confirmation(
            customer_email=customer_email,
            customer_name=customer_name,
            service_type=service_type,
            location=location,
            scheduled_time=scheduled_time,
            booking_id=job_id,
            admin_notes=admin_notes,
            
        )
        
        if email_sent:
            # Add note about email sent
            await db.jobs.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$push": {
                        "notes": {
                            "content": f"Confirmation email sent to {customer_email}",
                            "created_at": datetime.utcnow(),
                            "created_by": "system"
                        }
                    }
                }
            )
            
            logger.info(f"✅ Confirmation email sent to {customer_email}")
            
            return {
                "success": True,
                "message": "Confirmation email sent successfully",
                "email_sent": True,
                "customer_email": customer_email
            }
        else:
            logger.error(f"❌ Failed to send email to {customer_email}")
            return {
                "success": False,
                "message": "Failed to send email",
                "email_sent": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sending confirmation email: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
@router.patch("/ai-bookings/{booking_id}/confirm")
async def confirm_ai_booking(
    booking_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    notes: str = ""
):
    """Confirm an AI booking and send customer notification"""
    try:
        from bson import ObjectId
        
        logger.info(f"🔧 Confirming AI booking: {booking_id}")
        
        # First, get the booking details
        booking = await db.jobs.find_one({
            "_id": ObjectId(booking_id),
            "company_id": ObjectId(current_user["company_id"]),
            "source": "canvas_ai_chatbot"
        })
        
        if not booking:
            logger.warning(f"AI booking not found: {booking_id}")
            raise HTTPException(status_code=404, detail="AI booking not found")
        
        # Update the booking status to confirmed
        update_data = {
            "$set": {
                "status": "confirmed",
                "updated_at": datetime.utcnow(),
                "confirmed_by": current_user.get("email", "admin"),
                "confirmed_at": datetime.utcnow()
            }
        }
        
        # Add confirmation note
        if notes:
            confirmation_note = {
                "content": f"Booking confirmed by admin. Notes: {notes}",
                "created_at": datetime.utcnow(),
                "created_by": current_user.get("email", "admin")
            }
        else:
            confirmation_note = {
                "content": "Booking confirmed by admin",
                "created_at": datetime.utcnow(),
                "created_by": current_user.get("email", "admin")
            }
        
        update_data["$push"] = {"notes": confirmation_note}
        
        # Update the booking
        result = await db.jobs.update_one(
            {"_id": ObjectId(booking_id)},
            update_data
        )
        
        if result.modified_count == 0:
            logger.error(f"Failed to update booking: {booking_id}")
            raise HTTPException(status_code=500, detail="Failed to update booking")
        
        logger.info(f"✅ AI booking {booking_id} confirmed successfully")
        
        # Send customer notification EMAIL
        customer_email = booking.get("customer_email")
        if customer_email:
            try:
                logger.info(f"📧 Sending confirmation email to: {customer_email}")
                
                # Prepare booking data for email
                booking_data = {
                    "customer_name": booking.get("customer_name", "Customer"),
                    "customer_email": customer_email,
                    "service_type": booking.get("service_type", "Service"),
                    "location": booking.get("location", ""),
                    "scheduled_time": booking.get("scheduled_time", ""),
                    "frequency": booking.get("frequency", "one-time"),
                    "estimated_price": booking.get("estimated_price", 0),
                    "booking_id": booking_id,
                    "description": booking.get("description", ""),
                    "admin_notes": notes
                }
                
                # ✅ FIX: Pass database to CustomerNotificationService
                notification_service = CustomerNotificationService(db)
                email_sent = await notification_service.send_booking_confirmation(booking_data)
                
                if email_sent:
                    logger.info(f"✅ Confirmation email sent to {customer_email}")
                    
                    # Add note about email sent
                    await db.jobs.update_one(
                        {"_id": ObjectId(booking_id)},
                        {
                            "$push": {
                                "notes": {
                                    "content": f"Confirmation email sent to {customer_email}",
                                    "created_at": datetime.utcnow(),
                                    "created_by": "system"
                                }
                            }
                        }
                    )
                    
                    # Create admin notification
                    try:
                        admin_notification = {
                            "_id": ObjectId(),
                            "company_id": ObjectId(current_user["company_id"]),
                            "type": "customer_notified",
                            "title": "Customer Notified",
                            "message": f"Confirmation email sent to {booking.get('customer_name', 'customer')} ({customer_email})",
                            "data": {
                                "booking_id": booking_id,
                                "customer_email": customer_email,
                                "action": "booking_confirmed"
                            },
                            "is_read": False,
                            "priority": "medium",
                            "created_at": datetime.utcnow()
                        }
                        
                        await db.notifications.insert_one(admin_notification)
                        logger.info(f"✅ Admin notification created")
                        
                    except Exception as notification_error:
                        logger.error(f"❌ Error creating admin notification: {notification_error}")
                
                else:
                    logger.error(f"❌ Failed to send email to {customer_email}")
                    
                    # Add note about email failure
                    await db.jobs.update_one(
                        {"_id": ObjectId(booking_id)},
                        {
                            "$push": {
                                "notes": {
                                    "content": f"Failed to send confirmation email to {customer_email}",
                                    "created_at": datetime.utcnow(),
                                    "created_by": "system"
                                }
                            }
                        }
                    )
                
                return {
                    "success": True,
                    "message": "AI booking confirmed successfully",
                    "booking_id": booking_id,
                    "email_sent": email_sent,
                    "customer_email": customer_email if email_sent else None
                }
                
            except Exception as email_error:
                logger.error(f"❌ Error sending customer notification: {email_error}")
                
                # Still return success for booking confirmation, but note email failure
                return {
                    "success": True,
                    "message": "Booking confirmed but failed to send customer notification",
                    "booking_id": booking_id,
                    "email_sent": False,
                    "error": "Failed to send email notification"
                }
        else:
            logger.warning(f"⚠️ No customer email found for booking: {booking_id}")
            return {
                "success": True,
                "message": "Booking confirmed but no customer email available",
                "booking_id": booking_id,
                "email_sent": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error confirming AI booking {booking_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error confirming booking: {str(e)}")


# ALSO ADD - Simple notifications endpoint to stop the 404 error
@router.get("/notifications") 
async def get_notifications(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get notifications for current user - SIMPLE VERSION"""
    try:
        from bson import ObjectId
        
        # Get notifications for user's company
        notifications = await db.notifications.find({
            "company_id": ObjectId(current_user["company_id"])
        }).sort("created_at", -1).limit(10).to_list(length=10)
        
        # Convert ObjectIds to strings
        for notification in notifications:
            notification["_id"] = str(notification["_id"])
            notification["company_id"] = str(notification["company_id"])
        
        return {
            "notifications": notifications,
            "unread_count": len([n for n in notifications if not n.get("is_read", False)])
        }
        
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        return {"notifications": [], "unread_count": 0}
    



# Add this to your backend jobs router file (app/api/v1/endpoints/jobs.py)
# This should be added after the existing endpoints

from pydantic import BaseModel, Field
from typing import List

# Add this Pydantic model for validation
class TimeSlot(BaseModel):
    time: str
    available: bool
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None

class AvailabilityResponse(BaseModel):
    date: str
    technician_id: Optional[str] = None
    slots: List[TimeSlot]

# Add this endpoint to your router
@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    technician_id: Optional[str] = Query(None, description="Optional technician ID to filter")
) -> Dict[str, Any]:
    """
    Get availability for a specific date and optionally a specific technician.
    Returns time slots with availability status.
    """
    try:
        logger.info(f"Availability request - Date: {date}, Technician: {technician_id}")
        
        # Validate date format
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=422, 
                detail={
                    "error": "validation_error",
                    "message": "Request validation failed",
                    "details": {"date": "Invalid date format. Expected YYYY-MM-DD"},
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        # Validate technician_id if provided
        if technician_id and not ObjectId.is_valid(technician_id):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "validation_error",
                    "message": "Request validation failed",
                    "details": {"technician_id": "Invalid technician ID format"},
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        # Build query for jobs on this date
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        query = {
            "company_id": ObjectId(current_user["company_id"]),
            "$or": [
                {
                    "time_tracking.scheduled_start": {
                        "$gte": start_of_day,
                        "$lte": end_of_day
                    }
                },
                {
                    "time_tracking.scheduled_end": {
                        "$gte": start_of_day,
                        "$lte": end_of_day
                    }
                }
            ]
        }
        
        # Add technician filter if provided
        if technician_id:
            query["technician_id"] = ObjectId(technician_id)
        
        # Get all jobs for this date
        jobs = await db.jobs.find(query).to_list(length=None)
        
        logger.info(f"Found {len(jobs)} jobs for {date}")
        
        # Generate time slots (8 AM to 6 PM in 30-minute intervals)
        time_slots = []
        current_time = start_of_day.replace(hour=8, minute=0)
        end_time = start_of_day.replace(hour=18, minute=0)
        
        while current_time <= end_time:
            slot_time = current_time.strftime("%H:%M")
            
            # Check if this time slot is occupied by any job
            is_available = True
            occupying_tech_id = None
            occupying_tech_name = None
            
            for job in jobs:
                job_start = job.get("time_tracking", {}).get("scheduled_start")
                job_end = job.get("time_tracking", {}).get("scheduled_end")
                
                if job_start and job_end:
                    # Check if current_time falls within the job's time range
                    if job_start <= current_time < job_end:
                        is_available = False
                        
                        # Get technician info if not filtering by technician
                        if not technician_id and job.get("technician_id"):
                            occupying_tech_id = str(job["technician_id"])
                            tech = await db.users.find_one({"_id": job["technician_id"]})
                            if tech:
                                occupying_tech_name = f"{tech.get('first_name', '')} {tech.get('last_name', '')}".strip()
                        break
            
            time_slots.append({
                "time": slot_time,
                "available": is_available,
                "technician_id": occupying_tech_id,
                "technician_name": occupying_tech_name
            })
            
            # Move to next 30-minute slot
            current_time += timedelta(minutes=30)
        
        return {
            "date": date,
            "technician_id": technician_id,
            "slots": time_slots
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting availability: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching availability: {str(e)}")



@router.get("/debug-bookings")
async def debug_all_bookings(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Debug endpoint to see ALL bookings in database"""
    try:
        from bson import ObjectId
        
        # Get ALL bookings with ai_chatbot or canvas_ai_chatbot source
        all_ai_bookings = await db.jobs.find({
            "source": {"$in": ["ai_chatbot", "canvas_ai_chatbot"]}
        }).to_list(length=100)
        
        logger.info(f"🔍 Total AI bookings in database: {len(all_ai_bookings)}")
        
        # Get bookings for current company
        company_bookings = await db.jobs.find({
            "company_id": ObjectId(current_user["company_id"]),
            "source": {"$in": ["ai_chatbot", "canvas_ai_chatbot"]}
        }).to_list(length=100)
        
        logger.info(f"🔍 AI bookings for company {current_user['company_id']}: {len(company_bookings)}")
        
        # Show company IDs of all AI bookings
        booking_summary = []
        for booking in all_ai_bookings:
            booking_summary.append({
                "booking_id": str(booking["_id"]),
                "company_id": str(booking["company_id"]),
                "customer_email": booking.get("customer_email", ""),
                "source": booking.get("source", ""),
                "created_at": booking.get("created_at", "")
            })
        
        return {
            "your_company_id": str(current_user["company_id"]),
            "total_ai_bookings": len(all_ai_bookings),
            "your_company_bookings": len(company_bookings),
            "all_bookings": booking_summary
        }
        
    except Exception as e:
        logger.error(f"Debug error: {e}")
        return {"error": str(e)}