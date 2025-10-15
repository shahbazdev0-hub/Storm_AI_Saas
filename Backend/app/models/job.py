# app/models/job.py
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date, time
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId
from .lead import ServiceType

class JobStatus(str, Enum):
    """Job status"""
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"
    ON_HOLD = "on_hold"

class JobPriority(str, Enum):
    """Job priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    EMERGENCY = "emergency"

class JobType(str, Enum):
    """Type of job"""
    ONE_TIME = "one_time"
    RECURRING = "recurring"
    MAINTENANCE = "maintenance"
    EMERGENCY = "emergency"
    FOLLOW_UP = "follow_up"
    INSPECTION = "inspection"
    ESTIMATE = "estimate"

class RecurrencePattern(str, Enum):
    """Recurrence patterns"""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUALLY = "semi_annually"
    ANNUALLY = "annually"
    CUSTOM = "custom"

class JobAddress(BaseModel):
    """Job service address"""
    model_config = ConfigDict(extra="allow")
    
    street: str = Field(..., min_length=1)
    street2: Optional[str] = None
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=2)
    postal_code: str = Field(..., min_length=5, max_length=10)
    country: str = Field(default="US")
    
    # GPS coordinates
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Access information
    access_instructions: Optional[str] = None
    gate_code: Optional[str] = None
    key_location: Optional[str] = None
    parking_instructions: Optional[str] = None
    
    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v):
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v
    
    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v):
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v

class JobMaterial(BaseModel):
    """Material used in job"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    sku: Optional[str] = None
    
    # Quantity and units
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="each")  # each, gallon, pound, hour, etc.
    
    # Pricing
    unit_cost: Optional[float] = Field(None, ge=0)
    total_cost: Optional[float] = Field(None, ge=0)
    markup_percentage: Optional[float] = Field(None, ge=0)
    
    # Inventory tracking
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    
    # Notes
    notes: Optional[str] = None

class JobPhoto(BaseModel):
    """Job photo/image"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    filename: str
    original_filename: str
    url: str
    thumbnail_url: Optional[str] = None
    
    # Metadata
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    
    # Categorization
    category: str = Field(default="general")  # before, after, progress, issue, general
    description: Optional[str] = None
    taken_by: PyObjectId
    taken_at: datetime = Field(default_factory=datetime.utcnow)
    
    # GPS location where photo was taken
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

class JobNote(BaseModel):
    """Job note/comment"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    content: str = Field(..., min_length=1)
    note_type: str = Field(default="general")  # general, issue, instruction, completion
    is_important: bool = Field(default=False)
    is_customer_visible: bool = Field(default=True)
    
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class JobTimeTracking(BaseModel):
    """Time tracking for job"""
    model_config = ConfigDict(extra="allow")
    
    # Scheduled times
    scheduled_start: datetime
    scheduled_end: datetime
    scheduled_duration: int  # minutes
    
    # Actual times
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    actual_duration: Optional[int] = None  # minutes
    
    # Break times
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    break_duration: Optional[int] = None  # minutes
    
    # Travel times
    travel_to_duration: Optional[int] = None  # minutes
    travel_from_duration: Optional[int] = None  # minutes
    
    # Billable time
    billable_hours: Optional[float] = None
    non_billable_hours: Optional[float] = None

class JobRecurrence(BaseModel):
    """Job recurrence settings"""
    model_config = ConfigDict(extra="allow")
    
    pattern: RecurrencePattern
    interval: int = Field(default=1, ge=1)  # Every X weeks/months/etc
    
    # Days of week for weekly/biweekly (0=Sunday, 6=Saturday)
    days_of_week: List[int] = Field(default_factory=list)
    
    # Day of month for monthly/quarterly/etc
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    
    # End conditions
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = Field(None, ge=1)
    
    # Next occurrence
    next_occurrence: Optional[datetime] = None
    
    # Generated jobs tracking
    jobs_created: int = Field(default=0)
    last_generated: Optional[datetime] = None

class Job(BaseModel):
    """Job model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    company_id: PyObjectId = Field(..., description="Company ID")
    customer_id: PyObjectId = Field(..., description="Customer contact ID")
    
    # Job identification
    job_number: Optional[str] = None  # Auto-generated unique identifier
    
    # Related entities
    estimate_id: Optional[PyObjectId] = None
    lead_id: Optional[PyObjectId] = None
    parent_job_id: Optional[PyObjectId] = None  # For recurring jobs
    recurring_job_id: Optional[PyObjectId] = None  # Original recurring job
    
    # Basic information
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    service_type: ServiceType = Field(default=ServiceType.OTHER)
    job_type: JobType = Field(default=JobType.ONE_TIME)
    
    # Status and priority
    status: JobStatus = Field(default=JobStatus.SCHEDULED)
    priority: JobPriority = Field(default=JobPriority.NORMAL)
    
    # Scheduling
    time_tracking: JobTimeTracking
    
    # Assignment
    technician_id: Optional[PyObjectId] = None
    technician_ids: List[PyObjectId] = Field(default_factory=list)  # Multiple technicians
    team_lead_id: Optional[PyObjectId] = None
    
    # Location
    address: JobAddress
    
    # Service details
    service_areas: List[str] = Field(default_factory=list)  # Specific areas to service
    special_instructions: Optional[str] = None
    safety_requirements: List[str] = Field(default_factory=list)
    equipment_needed: List[str] = Field(default_factory=list)
    
    # Materials and costs
    materials: List[JobMaterial] = Field(default_factory=list)
    labor_cost: Optional[float] = Field(None, ge=0)
    material_cost: Optional[float] = Field(None, ge=0)
    equipment_cost: Optional[float] = Field(None, ge=0)
    total_cost: Optional[float] = Field(None, ge=0)
    
    # Pricing
    quoted_price: Optional[float] = Field(None, ge=0)
    actual_price: Optional[float] = Field(None, ge=0)
    discount_amount: Optional[float] = Field(None, ge=0)
    tax_amount: Optional[float] = Field(None, ge=0)
    
    # Documentation
    notes: List[JobNote] = Field(default_factory=list)
    photos: List[JobPhoto] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)  # File URLs
    
    # Completion data
    completion_notes: Optional[str] = None
    work_performed: Optional[str] = None
    issues_found: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Customer interaction
    customer_signature: Optional[str] = None  # Base64 signature
    customer_satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    customer_feedback: Optional[str] = None
    
    # Quality control
    quality_check_completed: bool = Field(default=False)
    quality_check_by: Optional[PyObjectId] = None
    quality_check_date: Optional[datetime] = None
    quality_issues: List[str] = Field(default_factory=list)
    
    # Follow-up
    follow_up_required: bool = Field(default=False)
    follow_up_date: Optional[datetime] = None
    follow_up_notes: Optional[str] = None
    warranty_expires: Optional[date] = None
    
    # Recurrence (for recurring jobs)
    recurrence: Optional[JobRecurrence] = None
    is_recurring: bool = Field(default=False)
    
    # Weather dependency
    weather_dependent: bool = Field(default=False)
    weather_conditions: Optional[Dict[str, Any]] = None
    
    # Communication
    customer_notified: bool = Field(default=False)
    notification_sent_at: Optional[datetime] = None
    reminder_sent: bool = Field(default=False)
    reminder_sent_at: Optional[datetime] = None
    
    # Invoicing
    invoice_created: bool = Field(default=False)
    invoice_id: Optional[PyObjectId] = None
    billable: bool = Field(default=True)
    
    # Custom fields and tags
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    updated_by: Optional[PyObjectId] = None
    deleted_at: Optional[datetime] = None
    
    # Integration fields
    external_id: Optional[str] = None
    import_source: Optional[str] = None
    last_sync: Optional[datetime] = None
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator("job_number", mode="before")
    @classmethod
    def generate_job_number(cls, v, info):
        """Generate job number if not provided"""
        if v is None:
            # Generate format: JOB-YYYYMMDD-XXXX
            today = datetime.now().strftime("%Y%m%d")
            import random
            suffix = str(random.randint(1000, 9999))
            return f"JOB-{today}-{suffix}"
        return v
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []
    
    @property
    def is_active(self) -> bool:
        """Check if job is active"""
        return (self.status not in [JobStatus.COMPLETED, JobStatus.CANCELLED] and
                not self.deleted_at)
    
    @property
    def is_overdue(self) -> bool:
        """Check if job is overdue"""
        if self.status in [JobStatus.COMPLETED, JobStatus.CANCELLED]:
            return False
        return datetime.utcnow() > self.time_tracking.scheduled_end
    
    @property
    def is_today(self) -> bool:
        """Check if job is scheduled for today"""
        today = datetime.now().date()
        return self.time_tracking.scheduled_start.date() == today
    
    @property
    def duration_variance_minutes(self) -> Optional[int]:
        """Calculate variance between scheduled and actual duration"""
        if not self.time_tracking.actual_duration:
            return None
        return self.time_tracking.actual_duration - self.time_tracking.scheduled_duration
    
    @property
    def total_time_minutes(self) -> Optional[int]:
        """Calculate total time including travel and breaks"""
        if not self.time_tracking.actual_duration:
            return None
        
        total = self.time_tracking.actual_duration
        
        if self.time_tracking.travel_to_duration:
            total += self.time_tracking.travel_to_duration
        
        if self.time_tracking.travel_from_duration:
            total += self.time_tracking.travel_from_duration
        
        if self.time_tracking.break_duration:
            total += self.time_tracking.break_duration
        
        return total
    
    @property
    def profit_margin(self) -> Optional[float]:
        """Calculate profit margin"""
        if not self.actual_price or not self.total_cost:
            return None
        
        if self.total_cost == 0:
            return 100.0
        
        return ((self.actual_price - self.total_cost) / self.actual_price) * 100
    
    @property
    def assigned_technicians(self) -> List[PyObjectId]:
        """Get all assigned technicians"""
        technicians = self.technician_ids.copy()
        if self.technician_id and self.technician_id not in technicians:
            technicians.append(self.technician_id)
        return technicians
    
    def calculate_total_cost(self) -> float:
        """Calculate total cost from materials and labor"""
        material_total = sum(material.total_cost or 0 for material in self.materials)
        labor_total = self.labor_cost or 0
        equipment_total = self.equipment_cost or 0
        
        self.material_cost = material_total
        self.total_cost = material_total + labor_total + equipment_total
        self.updated_at = datetime.utcnow()
        
        return self.total_cost
    
    def add_material(self, material: JobMaterial) -> None:
        """Add material to job"""
        # Calculate total cost if unit cost is provided
        if material.unit_cost:
            material.total_cost = material.quantity * material.unit_cost
            if material.markup_percentage:
                material.total_cost *= (1 + material.markup_percentage / 100)
        
        self.materials.append(material)
        self.calculate_total_cost()
    
    def add_photo(self, photo: JobPhoto) -> None:
        """Add photo to job"""
        self.photos.append(photo)
        self.updated_at = datetime.utcnow()
    
    def add_note(self, content: str, created_by: PyObjectId, 
                 note_type: str = "general", **kwargs) -> JobNote:
        """Add note to job"""
        note = JobNote(
            content=content,
            note_type=note_type,
            created_by=created_by,
            **kwargs
        )
        self.notes.append(note)
        self.updated_at = datetime.utcnow()
        return note
    
    def start_job(self, started_by: PyObjectId) -> None:
        """Start the job"""
        self.status = JobStatus.IN_PROGRESS
        self.time_tracking.actual_start = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.updated_by = started_by
        
        self.add_note(
            content="Job started",
            created_by=started_by,
            note_type="status"
        )
    
    def complete_job(self, completed_by: PyObjectId, completion_notes: str = None,
                     work_performed: str = None, customer_signature: str = None) -> None:
        """Complete the job"""
        now = datetime.utcnow()
        
        self.status = JobStatus.COMPLETED
        self.time_tracking.actual_end = now
        
        # Calculate actual duration
        if self.time_tracking.actual_start:
            duration = now - self.time_tracking.actual_start
            self.time_tracking.actual_duration = int(duration.total_seconds() / 60)
        
        self.completion_notes = completion_notes
        self.work_performed = work_performed
        self.customer_signature = customer_signature
        self.updated_at = now
        self.updated_by = completed_by
        
        self.add_note(
            content=f"Job completed. {completion_notes or ''}",
            created_by=completed_by,
            note_type="completion"
        )
    
    def cancel_job(self, cancelled_by: PyObjectId, reason: str) -> None:
        """Cancel the job"""
        self.status = JobStatus.CANCELLED
        self.updated_at = datetime.utcnow()
        self.updated_by = cancelled_by
        
        self.add_note(
            content=f"Job cancelled. Reason: {reason}",
            created_by=cancelled_by,
            note_type="cancellation"
        )
    
    def reschedule_job(self, new_start: datetime, new_end: datetime, 
                      rescheduled_by: PyObjectId, reason: str = None) -> None:
        """Reschedule the job"""
        old_start = self.time_tracking.scheduled_start
        
        self.time_tracking.scheduled_start = new_start
        self.time_tracking.scheduled_end = new_end
        self.time_tracking.scheduled_duration = int((new_end - new_start).total_seconds() / 60)
        self.status = JobStatus.RESCHEDULED
        self.updated_at = datetime.utcnow()
        self.updated_by = rescheduled_by
        
        self.add_note(
            content=f"Job rescheduled from {old_start} to {new_start}. {reason or ''}",
            created_by=rescheduled_by,
            note_type="reschedule"
        )
    
    def assign_technician(self, technician_id: PyObjectId, assigned_by: PyObjectId) -> None:
        """Assign technician to job"""
        if technician_id not in self.technician_ids:
            self.technician_ids.append(technician_id)
        
        if not self.technician_id:  # Set as primary technician
            self.technician_id = technician_id
        
        self.updated_at = datetime.utcnow()
        self.updated_by = assigned_by
        
        self.add_note(
            content=f"Technician {technician_id} assigned to job",
            created_by=assigned_by,
            note_type="assignment"
        )
    
    def set_customer_satisfaction(self, rating: int, feedback: str = None) -> None:
        """Set customer satisfaction rating"""
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5")
        
        self.customer_satisfaction_rating = rating
        self.customer_feedback = feedback
        self.updated_at = datetime.utcnow()
    
    def schedule_follow_up(self, follow_up_date: datetime, notes: str = None) -> None:
        """Schedule follow-up"""
        self.follow_up_required = True
        self.follow_up_date = follow_up_date
        self.follow_up_notes = notes
        self.updated_at = datetime.utcnow()
    
    def create_recurring_jobs(self, count: int = 1) -> List['Job']:
        """Create future recurring jobs"""
        if not self.recurrence or not self.is_recurring:
            return []
        
        created_jobs = []
        current_date = self.recurrence.next_occurrence or self.time_tracking.scheduled_start
        
        for i in range(count):
            # Calculate next occurrence date
            if self.recurrence.pattern == RecurrencePattern.WEEKLY:
                from datetime import timedelta
                next_date = current_date + timedelta(weeks=self.recurrence.interval)
            elif self.recurrence.pattern == RecurrencePattern.MONTHLY:
                from dateutil.relativedelta import relativedelta
                next_date = current_date + relativedelta(months=self.recurrence.interval)
            # Add other recurrence patterns as needed
            
            # Check end conditions
            if self.recurrence.end_date and next_date.date() > self.recurrence.end_date:
                break
            
            if (self.recurrence.max_occurrences and 
                self.recurrence.jobs_created >= self.recurrence.max_occurrences):
                break
            
            # Create new job
            new_job_data = self.model_dump(exclude={"id", "_id", "created_at", "updated_at"})
            new_job_data["time_tracking"]["scheduled_start"] = next_date
            new_job_data["time_tracking"]["scheduled_end"] = (
                next_date + (self.time_tracking.scheduled_end - self.time_tracking.scheduled_start)
            )
            new_job_data["status"] = JobStatus.SCHEDULED
            new_job_data["parent_job_id"] = self.id
            new_job_data["recurring_job_id"] = self.id
            
            new_job = Job(**new_job_data)
            created_jobs.append(new_job)
            
            current_date = next_date
            self.recurrence.jobs_created += 1
        
        # Update next occurrence
        self.recurrence.next_occurrence = current_date
        self.recurrence.last_generated = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        return created_jobs
    
    def soft_delete(self) -> None:
        """Soft delete job"""
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft-deleted job"""
        self.deleted_at = None
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, include_materials: bool = True, include_photos: bool = True,
                include_notes: bool = True) -> Dict[str, Any]:
        """Convert to dictionary with options"""
        data = self.model_dump(by_alias=True)
        
        if not include_materials:
            data.pop("materials", None)
        
        if not include_photos:
            data.pop("photos", None)
        
        if not include_notes:
            data.pop("notes", None)
        
        # Convert ObjectIds to strings
        if data.get("_id"):
            data["id"] = str(data["_id"])
        
        string_fields = [
            "company_id", "customer_id", "estimate_id", "lead_id", 
            "parent_job_id", "recurring_job_id", "technician_id",
            "team_lead_id", "created_by", "updated_by", "invoice_id"
        ]
        for field in string_fields:
            if data.get(field):
                data[field] = str(data[field])
        
        # Convert technician_ids list
        if data.get("technician_ids"):
            data["technician_ids"] = [str(tid) for tid in data["technician_ids"]]
        
        return data

# Job status workflow
JOB_STATUS_WORKFLOW = {
    JobStatus.SCHEDULED: [JobStatus.CONFIRMED, JobStatus.IN_PROGRESS, JobStatus.CANCELLED, JobStatus.RESCHEDULED],
    JobStatus.CONFIRMED: [JobStatus.IN_PROGRESS, JobStatus.NO_SHOW, JobStatus.CANCELLED, JobStatus.RESCHEDULED],
    JobStatus.IN_PROGRESS: [JobStatus.COMPLETED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
    JobStatus.ON_HOLD: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED, JobStatus.RESCHEDULED],
    JobStatus.COMPLETED: [],  # Terminal state
    JobStatus.CANCELLED: [],  # Terminal state
    JobStatus.NO_SHOW: [JobStatus.RESCHEDULED],
    JobStatus.RESCHEDULED: [JobStatus.SCHEDULED, JobStatus.CONFIRMED]
}

def can_transition_to_status(current_status: JobStatus, new_status: JobStatus) -> bool:
    """Check if status transition is allowed"""
    return new_status in JOB_STATUS_WORKFLOW.get(current_status, [])

# Export model and utilities
__all__ = [
    "Job",
    "JobStatus",
    "JobPriority",
    "JobType",
    "RecurrencePattern",
    "JobAddress",
    "JobMaterial",
    "JobPhoto",
    "JobNote", 
    "JobTimeTracking",
    "JobRecurrence",
    "JOB_STATUS_WORKFLOW",
    "can_transition_to_status"
]