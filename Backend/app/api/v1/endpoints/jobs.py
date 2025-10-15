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
        
        # Generate job data
        new_job_id = ObjectId()
        
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
            
            # Time tracking
            "time_tracking": {
                "scheduled_start": datetime.fromisoformat(job_data['time_tracking']['scheduled_start'].replace('Z', '+00:00')),
                "scheduled_end": datetime.fromisoformat(job_data['time_tracking']['scheduled_end'].replace('Z', '+00:00')) if job_data['time_tracking'].get('scheduled_end') else None,
                "scheduled_duration": job_data['time_tracking'].get('scheduled_duration', 60)
            },
            
            # Optional fields
            "address": job_data.get('address', {}),
            "estimated_duration": job_data.get('estimated_duration', 60),
            "special_instructions": job_data.get('special_instructions', ''),
            "equipment_needed": job_data.get('equipment_needed', []),
            "quoted_price": job_data.get('quoted_price'),
        }

        # Persist technician if provided
        if job_data.get('technician_id') and ObjectId.is_valid(job_data['technician_id']):
            job_document['technician_id'] = ObjectId(job_data['technician_id'])
        
        # Insert into database
        result = await db.jobs.insert_one(job_document)
        
        logger.info(f"Job created with ID: {result.inserted_id}")
        
        return {
            "id": str(new_job_id),
            "job_number": job_document["job_number"],
            "status": job_document["status"],
            "message": "Job created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating job: {e}")
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
            "source": "canvas_ai_chatbot"  # To this # Filter for AI-generated bookings
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
    
