# app/services/scheduling_service.py
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, date, time
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging
from dataclasses import dataclass

from app.core.config import settings
from app.models.job import Job, JobStatus, JobPriority
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobSearch

logger = logging.getLogger(__name__)

@dataclass
class TimeSlot:
    """Represents an available time slot"""
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    technician_id: Optional[str] = None
    conflicts: List[str] = None

@dataclass
class SchedulingConstraint:
    """Scheduling constraints for optimization"""
    max_hours_per_day: int = 8
    min_break_minutes: int = 30
    max_travel_time_minutes: int = 60
    preferred_start_time: time = time(8, 0)
    preferred_end_time: time = time(17, 0)
    lunch_break_start: time = time(12, 0)
    lunch_break_end: time = time(13, 0)

class SchedulingService:
    """Service for job scheduling and calendar management"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.jobs_collection = database.jobs
        self.users_collection = database.users
        self.companies_collection = database.companies
    
    async def get_jobs(
        self,
        company_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        technician_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get jobs with filtering"""
        try:
            query = {"company_id": ObjectId(company_id)}
            
            # Date range filter
            if start_date and end_date:
                query["time_tracking.scheduled_start"] = {
                    "$gte": start_date,
                    "$lte": end_date
                }
            elif start_date:
                query["time_tracking.scheduled_start"] = {"$gte": start_date}
            elif end_date:
                query["time_tracking.scheduled_start"] = {"$lte": end_date}
            
            # Technician filter
            if technician_id:
                query["$or"] = [
                    {"technician_id": ObjectId(technician_id)},
                    {"technician_ids": ObjectId(technician_id)}
                ]
            
            # Status filter
            if status:
                query["status"] = status
            
            # Execute query
            cursor = self.jobs_collection.find(query).sort(
                "time_tracking.scheduled_start", 1
            ).skip(skip).limit(limit)
            
            jobs = await cursor.to_list(length=limit)
            
            # Convert ObjectIds to strings
            for job in jobs:
                job["id"] = str(job["_id"])
                job["company_id"] = str(job["company_id"])
                job["customer_id"] = str(job["customer_id"])
                if job.get("technician_id"):
                    job["technician_id"] = str(job["technician_id"])
                if job.get("technician_ids"):
                    job["technician_ids"] = [str(tid) for tid in job["technician_ids"]]
                if job.get("estimate_id"):
                    job["estimate_id"] = str(job["estimate_id"])
            
            return jobs
            
        except Exception as e:
            logger.error(f"Error getting jobs: {e}")
            raise
    
    async def create_job(
        self, 
        job_data: JobCreate, 
        company_id: str,
        created_by: str
    ) -> Dict[str, Any]:
        """Create a new job"""
        try:
            # Validate technician availability
            if job_data.technician_id:
                is_available = await self._check_technician_availability(
                    job_data.technician_id,
                    job_data.time_tracking.scheduled_start,
                    job_data.time_tracking.scheduled_end,
                    company_id
                )
                if not is_available:
                    raise ValueError("Technician is not available at the requested time")
            
            # Prepare job document
            job_doc = {
                "company_id": ObjectId(company_id),
                "customer_id": ObjectId(job_data.customer_id),
                "title": job_data.title,
                "description": job_data.description,
                "service_type": job_data.service_type,
                "job_type": job_data.job_type,
                "status": job_data.status or JobStatus.SCHEDULED,
                "priority": job_data.priority or JobPriority.NORMAL,
                "address": job_data.address.model_dump(),
                "time_tracking": job_data.time_tracking.model_dump(),
                "special_instructions": job_data.special_instructions,
                "tags": job_data.tags or [],
                "custom_fields": job_data.custom_fields or {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": ObjectId(created_by)
            }
            
            # Add technician assignment
            if job_data.technician_id:
                job_doc["technician_id"] = ObjectId(job_data.technician_id)
                job_doc["technician_ids"] = [ObjectId(job_data.technician_id)]
            
            if job_data.technician_ids:
                job_doc["technician_ids"] = [ObjectId(tid) for tid in job_data.technician_ids]
            
            # Generate job number
            job_doc["job_number"] = await self._generate_job_number()
            
            # Insert job
            result = await self.jobs_collection.insert_one(job_doc)
            
            # Retrieve created job
            created_job = await self.jobs_collection.find_one({"_id": result.inserted_id})
            
            # Convert ObjectIds to strings
            created_job["id"] = str(created_job["_id"])
            created_job["company_id"] = str(created_job["company_id"])
            created_job["customer_id"] = str(created_job["customer_id"])
            if created_job.get("technician_id"):
                created_job["technician_id"] = str(created_job["technician_id"])
            if created_job.get("technician_ids"):
                created_job["technician_ids"] = [str(tid) for tid in created_job["technician_ids"]]
            
            logger.info(f"Created job {created_job['job_number']} for company {company_id}")
            return created_job
            
        except Exception as e:
            logger.error(f"Error creating job: {e}")
            raise
    
    async def get_available_time_slots(
        self,
        company_id: str,
        date: date,
        duration_minutes: int,
        technician_id: Optional[str] = None,
        service_type: Optional[str] = None
    ) -> List[TimeSlot]:
        """Get available time slots for scheduling"""
        try:
            # Get company settings for business hours
            company = await self.companies_collection.find_one({"_id": ObjectId(company_id)})
            if not company:
                raise ValueError("Company not found")
            
            business_hours = company.get("settings", {}).get("business_hours", {})
            day_name = date.strftime("%A").lower()
            day_hours = business_hours.get(day_name, {
                "open": "08:00",
                "close": "17:00",
                "closed": False
            })
            
            if day_hours.get("closed", False):
                return []
            
            # Parse business hours
            start_time = datetime.combine(
                date, 
                datetime.strptime(day_hours.get("open", "08:00"), "%H:%M").time()
            )
            end_time = datetime.combine(
                date,
                datetime.strptime(day_hours.get("close", "17:00"), "%H:%M").time()
            )
            
            # Get existing jobs for the date
            existing_jobs = await self.get_jobs(
                company_id=company_id,
                start_date=start_time,
                end_date=end_time,
                technician_id=technician_id
            )
            
            # Generate available slots
            available_slots = []
            current_time = start_time
            slot_interval = timedelta(minutes=30)  # 30-minute intervals
            
            while current_time + timedelta(minutes=duration_minutes) <= end_time:
                slot_end = current_time + timedelta(minutes=duration_minutes)
                
                # Check for conflicts with existing jobs
                has_conflict = False
                conflicting_jobs = []
                
                for job in existing_jobs:
                    job_start = job["time_tracking"]["scheduled_start"]
                    job_end = job["time_tracking"]["scheduled_end"]
                    
                    # Check for overlap
                    if (current_time < job_end and slot_end > job_start):
                        has_conflict = True
                        conflicting_jobs.append(job["job_number"])
                
                # Skip lunch hour if configured
                lunch_start = datetime.combine(date, time(12, 0))
                lunch_end = datetime.combine(date, time(13, 0))
                if current_time < lunch_end and slot_end > lunch_start:
                    has_conflict = True
                    conflicting_jobs.append("Lunch break")
                
                if not has_conflict:
                    available_slots.append(TimeSlot(
                        start_time=current_time,
                        end_time=slot_end,
                        duration_minutes=duration_minutes,
                        technician_id=technician_id,
                        conflicts=None
                    ))
                
                current_time += slot_interval
            
            logger.info(f"Found {len(available_slots)} available slots for {date}")
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting available time slots: {e}")
            raise
    
    async def reschedule_job(
        self,
        job_id: str,
        new_start: datetime,
        new_end: datetime,
        company_id: str,
        updated_by: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reschedule a job"""
        try:
            # Validate job exists and belongs to company
            job = await self.jobs_collection.find_one({
                "_id": ObjectId(job_id),
                "company_id": ObjectId(company_id)
            })
            
            if not job:
                raise ValueError("Job not found")
            
            # Check technician availability for new time
            if job.get("technician_id"):
                is_available = await self._check_technician_availability(
                    str(job["technician_id"]),
                    new_start,
                    new_end,
                    company_id,
                    exclude_job_id=job_id
                )
                if not is_available:
                    raise ValueError("Technician is not available at the new time")
            
            # Update job
            old_start = job["time_tracking"]["scheduled_start"]
            duration = int((new_end - new_start).total_seconds() / 60)
            
            update_data = {
                "time_tracking.scheduled_start": new_start,
                "time_tracking.scheduled_end": new_end,
                "time_tracking.scheduled_duration": duration,
                "status": JobStatus.RESCHEDULED,
                "updated_at": datetime.utcnow(),
                "updated_by": ObjectId(updated_by)
            }
            
            await self.jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            # Add reschedule note
            note = {
                "id": str(ObjectId()),
                "content": f"Job rescheduled from {old_start} to {new_start}. {reason or ''}",
                "note_type": "reschedule",
                "created_by": ObjectId(updated_by),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$push": {"notes": note}}
            )
            
            # Get updated job
            updated_job = await self.jobs_collection.find_one({"_id": ObjectId(job_id)})
            
            logger.info(f"Rescheduled job {job['job_number']} from {old_start} to {new_start}")
            return updated_job
            
        except Exception as e:
            logger.error(f"Error rescheduling job: {e}")
            raise
    
    async def assign_technician(
        self,
        job_id: str,
        technician_id: str,
        company_id: str,
        assigned_by: str
    ) -> Dict[str, Any]:
        """Assign technician to job"""
        try:
            # Validate job and technician
            job = await self.jobs_collection.find_one({
                "_id": ObjectId(job_id),
                "company_id": ObjectId(company_id)
            })
            
            if not job:
                raise ValueError("Job not found")
            
            technician = await self.users_collection.find_one({
                "_id": ObjectId(technician_id),
                "company_id": ObjectId(company_id),
                "role": {"$in": ["technician", "manager"]}
            })
            
            if not technician:
                raise ValueError("Technician not found")
            
            # Check availability
            is_available = await self._check_technician_availability(
                technician_id,
                job["time_tracking"]["scheduled_start"],
                job["time_tracking"]["scheduled_end"],
                company_id,
                exclude_job_id=job_id
            )
            
            if not is_available:
                raise ValueError("Technician is not available at the scheduled time")
            
            # Update job assignment
            technician_ids = job.get("technician_ids", [])
            technician_obj_id = ObjectId(technician_id)
            
            if technician_obj_id not in technician_ids:
                technician_ids.append(technician_obj_id)
            
            update_data = {
                "technician_id": technician_obj_id,  # Primary technician
                "technician_ids": technician_ids,
                "updated_at": datetime.utcnow(),
                "updated_by": ObjectId(assigned_by)
            }
            
            await self.jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_data}
            )
            
            # Add assignment note
            note = {
                "id": str(ObjectId()),
                "content": f"Technician {technician['first_name']} {technician['last_name']} assigned to job",
                "note_type": "assignment",
                "created_by": ObjectId(assigned_by),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$push": {"notes": note}}
            )
            
            logger.info(f"Assigned technician {technician_id} to job {job['job_number']}")
            return {"message": "Technician assigned successfully"}
            
        except Exception as e:
            logger.error(f"Error assigning technician: {e}")
            raise
    
    async def get_technician_schedule(
        self,
        technician_id: str,
        company_id: str,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Get technician's schedule for date range"""
        try:
            start_datetime = datetime.combine(start_date, time.min)
            end_datetime = datetime.combine(end_date, time.max)
            
            jobs = await self.get_jobs(
                company_id=company_id,
                start_date=start_datetime,
                end_date=end_datetime,
                technician_id=technician_id
            )
            
            # Format for calendar display
            schedule = []
            for job in jobs:
                schedule.append({
                    "id": job["id"],
                    "title": job["title"],
                    "start": job["time_tracking"]["scheduled_start"],
                    "end": job["time_tracking"]["scheduled_end"],
                    "status": job["status"],
                    "priority": job["priority"],
                    "customer_name": job.get("customer_name", "Unknown"),
                    "address": job["address"],
                    "service_type": job["service_type"]
                })
            
            return schedule
            
        except Exception as e:
            logger.error(f"Error getting technician schedule: {e}")
            raise
    
    async def get_calendar_view(
        self,
        company_id: str,
        start_date: date,
        end_date: date,
        view_type: str = "week"  # day, week, month
    ) -> Dict[str, Any]:
        """Get calendar view data"""
        try:
            start_datetime = datetime.combine(start_date, time.min)
            end_datetime = datetime.combine(end_date, time.max)
            
            # Get all jobs in date range
            jobs = await self.get_jobs(
                company_id=company_id,
                start_date=start_datetime,
                end_date=end_datetime
            )
            
            # Get technicians
            technicians = await self.users_collection.find({
                "company_id": ObjectId(company_id),
                "role": {"$in": ["technician", "manager"]},
                "status": "active"
            }).to_list(length=None)
            
            # Organize by technician
            technician_schedules = {}
            unassigned_jobs = []
            
            for technician in technicians:
                tech_id = str(technician["_id"])
                technician_schedules[tech_id] = {
                    "technician": {
                        "id": tech_id,
                        "name": f"{technician['first_name']} {technician['last_name']}",
                        "email": technician["email"]
                    },
                    "jobs": []
                }
            
            for job in jobs:
                if job.get("technician_id"):
                    tech_id = job["technician_id"]
                    if tech_id in technician_schedules:
                        technician_schedules[tech_id]["jobs"].append(job)
                    else:
                        unassigned_jobs.append(job)
                else:
                    unassigned_jobs.append(job)
            
            return {
                "view_type": view_type,
                "start_date": start_date,
                "end_date": end_date,
                "technician_schedules": list(technician_schedules.values()),
                "unassigned_jobs": unassigned_jobs,
                "total_jobs": len(jobs)
            }
            
        except Exception as e:
            logger.error(f"Error getting calendar view: {e}")
            raise
    
    async def _check_technician_availability(
        self,
        technician_id: str,
        start_time: datetime,
        end_time: datetime,
        company_id: str,
        exclude_job_id: Optional[str] = None
    ) -> bool:
        """Check if technician is available for given time slot"""
        try:
            query = {
                "company_id": ObjectId(company_id),
                "$or": [
                    {"technician_id": ObjectId(technician_id)},
                    {"technician_ids": ObjectId(technician_id)}
                ],
                "status": {"$nin": [JobStatus.COMPLETED, JobStatus.CANCELLED]},
                "$or": [
                    {
                        "time_tracking.scheduled_start": {"$lt": end_time},
                        "time_tracking.scheduled_end": {"$gt": start_time}
                    }
                ]
            }
            
            if exclude_job_id:
                query["_id"] = {"$ne": ObjectId(exclude_job_id)}
            
            conflicting_jobs = await self.jobs_collection.count_documents(query)
            return conflicting_jobs == 0
            
        except Exception as e:
            logger.error(f"Error checking technician availability: {e}")
            return False
    
    async def _generate_job_number(self) -> str:
        """Generate unique job number"""
        today = datetime.now().strftime("%Y%m%d")
        
        # Find the highest job number for today
        pattern = f"JOB-{today}-"
        jobs = await self.jobs_collection.find({
            "job_number": {"$regex": f"^{pattern}"}
        }).sort("job_number", -1).limit(1).to_list(length=1)
        
        if jobs:
            last_number = jobs[0]["job_number"]
            sequence = int(last_number.split("-")[-1]) + 1
        else:
            sequence = 1
        
        return f"JOB-{today}-{sequence:04d}"
    
    async def get_scheduling_statistics(
        self,
        company_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get scheduling statistics"""
        try:
            start_datetime = datetime.combine(start_date, time.min)
            end_datetime = datetime.combine(end_date, time.max)
            
            # Get jobs in date range
            jobs = await self.get_jobs(
                company_id=company_id,
                start_date=start_datetime,
                end_date=end_datetime
            )
            
            # Calculate statistics
            total_jobs = len(jobs)
            completed_jobs = len([j for j in jobs if j["status"] == JobStatus.COMPLETED])
            in_progress_jobs = len([j for j in jobs if j["status"] == JobStatus.IN_PROGRESS])
            scheduled_jobs = len([j for j in jobs if j["status"] == JobStatus.SCHEDULED])
            cancelled_jobs = len([j for j in jobs if j["status"] == JobStatus.CANCELLED])
            
            # Calculate utilization by technician
            technician_utilization = {}
            for job in jobs:
                if job.get("technician_id"):
                    tech_id = job["technician_id"]
                    if tech_id not in technician_utilization:
                        technician_utilization[tech_id] = {
                            "total_jobs": 0,
                            "completed_jobs": 0,
                            "total_hours": 0,
                            "billable_hours": 0
                        }
                    
                    technician_utilization[tech_id]["total_jobs"] += 1
                    if job["status"] == JobStatus.COMPLETED:
                        technician_utilization[tech_id]["completed_jobs"] += 1
                    
                    # Calculate hours
                    duration = job["time_tracking"].get("actual_duration") or job["time_tracking"]["scheduled_duration"]
                    hours = duration / 60 if duration else 0
                    technician_utilization[tech_id]["total_hours"] += hours
            
            return {
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "job_counts": {
                    "total": total_jobs,
                    "completed": completed_jobs,
                    "in_progress": in_progress_jobs,
                    "scheduled": scheduled_jobs,
                    "cancelled": cancelled_jobs
                },
                "completion_rate": (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0,
                "technician_utilization": technician_utilization
            }
            
        except Exception as e:
            logger.error(f"Error getting scheduling statistics: {e}")
            raise

async def optimize_routes(
    self,
    company_id: str,
    date: datetime,
    technician_id: Optional[str] = None
) -> Dict[str, Any]:
    """Optimize routes for given date"""
    try:
        start_of_day = date.replace(hour=0, minute=0, second=0)
        end_of_day = date.replace(hour=23, minute=59, second=59)
        
        # Get jobs for the date
        jobs = await self.get_jobs(
            company_id=company_id,
            start_date=start_of_day,
            end_date=end_of_day,
            technician_id=technician_id,
            status="scheduled"
        )
        
        # Get technicians
        tech_query = {
            "company_id": ObjectId(company_id),
            "role": {"$in": ["technician", "manager"]},
            "status": "active"
        }
        if technician_id and ObjectId.is_valid(technician_id):
            tech_query["_id"] = ObjectId(technician_id)
            
        technicians = await self.users_collection.find(tech_query).to_list(length=None)
        
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
                    total_service_time = sum(
                        job.get("time_tracking", {}).get("scheduled_duration", 60) 
                        for job in tech_jobs
                    )
                    
                    # Format jobs for response
                    formatted_jobs = []
                    for job in tech_jobs:
                        # Get customer info if available
                        customer_name = f"Customer {str(job['_id'])[-4:]}"
                        if job.get("customer_id"):
                            customer = await self.db.contacts.find_one({"_id": ObjectId(job["customer_id"])})
                            if customer:
                                customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                        
                        formatted_jobs.append({
                            "id": job["id"],
                            "customer_name": customer_name,
                            "service_type": job.get("service_type", "Service"),
                            "address": job.get("address", {}).get("street", "Address"),
                            "city": job.get("address", {}).get("city", "City"),
                            "state": job.get("address", {}).get("state", "State"),
                            "estimated_duration": job.get("time_tracking", {}).get("scheduled_duration", 60),
                            "priority": job.get("priority", "medium")
                        })
                    
                    routes.append({
                        "technician_id": str(tech["_id"]),
                        "technician_name": f"{tech['first_name']} {tech['last_name']}",
                        "jobs": formatted_jobs,
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
        
    except Exception as e:
        logger.error(f"Error optimizing routes: {e}")
        raise