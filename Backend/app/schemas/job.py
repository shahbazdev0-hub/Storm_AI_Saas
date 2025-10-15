# =============================================================================
# app/schemas/job.py
# =============================================================================
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.job import (
    JobStatus, JobPriority, JobType, RecurrencePattern
)
from app.models.lead import ServiceType

# Job address schemas
class JobAddressBase(BaseModel):
    """Base job address schema"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    street: Optional[str] = Field(None, max_length=200, description="Street address")
    street2: Optional[str] = Field(None, max_length=200, description="Apartment/suite")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=50, description="State/province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(default="US", description="Country code")
    access_instructions: Optional[str] = Field(None, max_length=500, description="Access instructions")
    gate_code: Optional[str] = Field(None, max_length=50, description="Gate code")
    key_location: Optional[str] = Field(None, max_length=200, description="Key location")
    parking_instructions: Optional[str] = Field(None, max_length=500, description="Parking instructions")

class JobAddressCreate(JobAddressBase):
    """Schema for creating job address"""
    street: str = Field(..., min_length=1, max_length=200, description="Street address")
    city: str = Field(..., min_length=1, max_length=100, description="City")
    state: str = Field(..., min_length=2, max_length=50, description="State/province")
    postal_code: str = Field(..., min_length=3, max_length=20, description="Postal code")

class JobAddressResponse(JobAddressBase):
    """Schema for job address response"""
    model_config = ConfigDict(from_attributes=True)
    
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")

# Job material schemas
class JobMaterialBase(BaseModel):
    """Base job material schema"""
    model_config = ConfigDict(extra="forbid")
    
    name: str = Field(..., min_length=1, max_length=200, description="Material name")
    description: Optional[str] = Field(None, max_length=500, description="Material description")
    sku: Optional[str] = Field(None, max_length=100, description="SKU")
    quantity: float = Field(..., gt=0, description="Quantity")
    unit: Optional[str] = Field(default="each", max_length=20, description="Unit of measure")
    unit_cost: Optional[float] = Field(None, ge=0, description="Unit cost")
    markup_percentage: Optional[float] = Field(None, ge=0, description="Markup percentage")
    notes: Optional[str] = Field(None, max_length=500, description="Material notes")

class JobMaterialCreate(JobMaterialBase):
    """Schema for creating job material"""
    pass

class JobMaterialUpdate(JobMaterialBase):
    """Schema for updating job material"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Material name")
    quantity: Optional[float] = Field(None, gt=0, description="Quantity")

class JobMaterialResponse(JobMaterialBase):
    """Schema for job material response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Material ID")
    total_cost: Optional[float] = Field(None, description="Total cost")
    lot_number: Optional[str] = Field(None, description="Lot number")
    expiration_date: Optional[date] = Field(None, description="Expiration date")

# Job photo schemas
class JobPhotoBase(BaseModel):
    """Base job photo schema"""
    model_config = ConfigDict(extra="forbid")
    
    category: str = Field(default="general", description="Photo category")
    description: Optional[str] = Field(None, max_length=500, description="Photo description")

class JobPhotoCreate(JobPhotoBase):
    """Schema for creating job photo"""
    filename: str = Field(..., description="Photo filename")
    original_filename: str = Field(..., description="Original filename")

class JobPhotoResponse(JobPhotoBase):
    """Schema for job photo response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Photo ID")
    filename: str = Field(..., description="Photo filename")
    url: str = Field(..., description="Photo URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type")
    taken_by: str = Field(..., description="Taken by user ID")
    taken_at: datetime = Field(..., description="Photo timestamp")

# Job note schemas
class JobNoteBase(BaseModel):
    """Base job note schema"""
    model_config = ConfigDict(extra="forbid")
    
    content: str = Field(..., min_length=1, max_length=2000, description="Note content")
    note_type: Optional[str] = Field(default="general", description="Note type")
    is_important: Optional[bool] = Field(default=False, description="Important flag")
    is_customer_visible: Optional[bool] = Field(default=True, description="Customer visible flag")

class JobNoteCreate(JobNoteBase):
    """Schema for creating job note"""
    pass

class JobNoteResponse(JobNoteBase):
    """Schema for job note response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Note ID")
    created_by: str = Field(..., description="Created by user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

# Job time tracking schemas
class JobTimeTrackingBase(BaseModel):
    """Base job time tracking schema"""
    model_config = ConfigDict(extra="forbid")
    
    scheduled_start: datetime = Field(..., description="Scheduled start time")
    scheduled_end: datetime = Field(..., description="Scheduled end time")
    scheduled_duration: Optional[int] = Field(None, description="Scheduled duration in minutes")

class JobTimeTrackingCreate(JobTimeTrackingBase):
    """Schema for creating job time tracking"""
    pass

class JobTimeTrackingUpdate(BaseModel):
    """Schema for updating job time tracking"""
    model_config = ConfigDict(extra="forbid")
    
    scheduled_start: Optional[datetime] = Field(None, description="Scheduled start time")
    scheduled_end: Optional[datetime] = Field(None, description="Scheduled end time")
    actual_start: Optional[datetime] = Field(None, description="Actual start time")
    actual_end: Optional[datetime] = Field(None, description="Actual end time")
    break_start: Optional[datetime] = Field(None, description="Break start time")
    break_end: Optional[datetime] = Field(None, description="Break end time")
    travel_to_duration: Optional[int] = Field(None, ge=0, description="Travel to duration (minutes)")
    travel_from_duration: Optional[int] = Field(None, ge=0, description="Travel from duration (minutes)")
    billable_hours: Optional[float] = Field(None, ge=0, description="Billable hours")
    non_billable_hours: Optional[float] = Field(None, ge=0, description="Non-billable hours")

class JobTimeTrackingResponse(JobTimeTrackingBase):
    """Schema for job time tracking response"""
    model_config = ConfigDict(from_attributes=True)
    
    actual_start: Optional[datetime] = Field(None, description="Actual start time")
    actual_end: Optional[datetime] = Field(None, description="Actual end time")
    actual_duration: Optional[int] = Field(None, description="Actual duration in minutes")
    break_duration: Optional[int] = Field(None, description="Break duration in minutes")
    travel_to_duration: Optional[int] = Field(None, description="Travel to duration")
    travel_from_duration: Optional[int] = Field(None, description="Travel from duration")
    billable_hours: Optional[float] = Field(None, description="Billable hours")
    non_billable_hours: Optional[float] = Field(None, description="Non-billable hours")

# Job recurrence schemas
class JobRecurrenceBase(BaseModel):
    """Base job recurrence schema"""
    model_config = ConfigDict(extra="forbid")
    
    pattern: RecurrencePattern = Field(..., description="Recurrence pattern")
    interval: int = Field(default=1, ge=1, description="Interval")
    days_of_week: Optional[List[int]] = Field(None, description="Days of week (0=Sunday)")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month")
    end_date: Optional[date] = Field(None, description="End date")
    max_occurrences: Optional[int] = Field(None, ge=1, description="Maximum occurrences")

class JobRecurrenceCreate(JobRecurrenceBase):
    """Schema for creating job recurrence"""
    pass

class JobRecurrenceUpdate(JobRecurrenceBase):
    """Schema for updating job recurrence"""
    pattern: Optional[RecurrencePattern] = Field(None, description="Recurrence pattern")

class JobRecurrenceResponse(JobRecurrenceBase):
    """Schema for job recurrence response"""
    model_config = ConfigDict(from_attributes=True)
    
    next_occurrence: Optional[datetime] = Field(None, description="Next occurrence")
    jobs_created: int = Field(default=0, description="Jobs created count")
    last_generated: Optional[datetime] = Field(None, description="Last generation timestamp")

# Base job schemas
class JobBase(BaseModel):
    """Base job schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Job title")
    description: Optional[str] = Field(None, max_length=2000, description="Job description")
    service_type: Optional[ServiceType] = Field(None, description="Service type")
    job_type: Optional[JobType] = Field(None, description="Job type")
    status: Optional[JobStatus] = Field(None, description="Job status")
    priority: Optional[JobPriority] = Field(None, description="Job priority")
    
    # Assignment
    technician_id: Optional[str] = Field(None, description="Primary technician ID")
    technician_ids: Optional[List[str]] = Field(default_factory=list, description="All technician IDs")
    team_lead_id: Optional[str] = Field(None, description="Team lead ID")
    
    # Service details
    service_areas: Optional[List[str]] = Field(default_factory=list, description="Service areas")
    special_instructions: Optional[str] = Field(None, max_length=1000, description="Special instructions")
    safety_requirements: Optional[List[str]] = Field(default_factory=list, description="Safety requirements")
    equipment_needed: Optional[List[str]] = Field(default_factory=list, description="Equipment needed")
    
    # Costs
    labor_cost: Optional[float] = Field(None, ge=0, description="Labor cost")
    material_cost: Optional[float] = Field(None, ge=0, description="Material cost")
    equipment_cost: Optional[float] = Field(None, ge=0, description="Equipment cost")
    quoted_price: Optional[float] = Field(None, ge=0, description="Quoted price")
    discount_amount: Optional[float] = Field(None, ge=0, description="Discount amount")
    
    # Customer interaction
    customer_satisfaction_rating: Optional[int] = Field(None, ge=1, le=5, description="Satisfaction rating")
    customer_feedback: Optional[str] = Field(None, max_length=1000, description="Customer feedback")
    
    # Follow-up
    follow_up_required: Optional[bool] = Field(None, description="Follow-up required")
    follow_up_date: Optional[datetime] = Field(None, description="Follow-up date")
    follow_up_notes: Optional[str] = Field(None, max_length=500, description="Follow-up notes")
    warranty_expires: Optional[date] = Field(None, description="Warranty expiry date")
    
    # Weather dependency
    weather_dependent: Optional[bool] = Field(None, description="Weather dependent")
    
    # Custom fields and tags
    tags: Optional[List[str]] = Field(default_factory=list, description="Job tags")
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom fields")

# Job creation schema
class JobCreate(JobBase):
    """Schema for creating a new job"""
    customer_id: str = Field(..., description="Customer contact ID")
    title: str = Field(..., min_length=1, max_length=200, description="Job title")
    service_type: ServiceType = Field(default=ServiceType.OTHER, description="Service type")
    address: JobAddressCreate = Field(..., description="Job address")
    time_tracking: JobTimeTrackingCreate = Field(..., description="Time tracking")
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []

# Job update schema
class JobUpdate(JobBase):
    """Schema for updating job information"""
    
    # Optional address and time tracking updates
    address: Optional[JobAddressBase] = Field(None, description="Job address")
    time_tracking: Optional[JobTimeTrackingUpdate] = Field(None, description="Time tracking")
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if v is None:
            return v
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v

# Job search schemas
class JobSearch(BaseModel):
    """Schema for job search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    status: Optional[JobStatus] = Field(None, description="Job status filter")
    priority: Optional[JobPriority] = Field(None, description="Priority filter")
    job_type: Optional[JobType] = Field(None, description="Job type filter")
    service_type: Optional[ServiceType] = Field(None, description="Service type filter")
    technician_id: Optional[str] = Field(None, description="Technician filter")
    customer_id: Optional[str] = Field(None, description="Customer filter")
    tag: Optional[str] = Field(None, description="Tag filter")
    
    # Date filters
    scheduled_after: Optional[datetime] = Field(None, description="Scheduled after")
    scheduled_before: Optional[datetime] = Field(None, description="Scheduled before")
    created_after: Optional[datetime] = Field(None, description="Created after")
    created_before: Optional[datetime] = Field(None, description="Created before")
    
    # Boolean filters
    overdue: Optional[bool] = Field(None, description="Overdue jobs filter")
    today: Optional[bool] = Field(None, description="Today's jobs filter")
    follow_up_required: Optional[bool] = Field(None, description="Follow-up required filter")
    weather_dependent: Optional[bool] = Field(None, description="Weather dependent filter")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="scheduled_start", description="Sort field")
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order")

# Job completion schema
class JobCompletion(BaseModel):
    """Schema for job completion"""
    model_config = ConfigDict(extra="forbid")
    
    completion_notes: Optional[str] = Field(None, max_length=2000, description="Completion notes")
    work_performed: Optional[str] = Field(None, max_length=2000, description="Work performed")
    issues_found: Optional[List[str]] = Field(default_factory=list, description="Issues found")
    recommendations: Optional[List[str]] = Field(default_factory=list, description="Recommendations")
    customer_signature: Optional[str] = Field(None, description="Customer signature (base64)")
    actual_price: Optional[float] = Field(None, ge=0, description="Actual price charged")

# Job rescheduling schema
class JobReschedule(BaseModel):
    """Schema for job rescheduling"""
    model_config = ConfigDict(extra="forbid")
    
    new_start: datetime = Field(..., description="New start time")
    new_end: datetime = Field(..., description="New end time")
    reason: Optional[str] = Field(None, max_length=500, description="Reschedule reason")
    notify_customer: bool = Field(default=True, description="Notify customer")

# Response schemas
class JobResponse(JobBase):
    """Schema for job response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Job ID")
    company_id: str = Field(..., description="Company ID")
    customer_id: str = Field(..., description="Customer ID")
    job_number: str = Field(..., description="Job number")
    
    # Required fields
    title: str = Field(..., description="Job title")
    service_type: ServiceType = Field(..., description="Service type")
    job_type: JobType = Field(..., description="Job type")
    status: JobStatus = Field(..., description="Job status")
    priority: JobPriority = Field(..., description="Job priority")
    
    # Relationships
    address: JobAddressResponse = Field(..., description="Job address")
    time_tracking: JobTimeTrackingResponse = Field(..., description="Time tracking")
    
    # Computed fields
    is_active: bool = Field(..., description="Active status")
    is_overdue: bool = Field(..., description="Overdue status")
    is_today: bool = Field(..., description="Today status")
    duration_variance_minutes: Optional[int] = Field(None, description="Duration variance")
    total_time_minutes: Optional[int] = Field(None, description="Total time")
    profit_margin: Optional[float] = Field(None, description="Profit margin")
    total_cost: Optional[float] = Field(None, description="Total cost")
    
    # System fields
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # Customer information (populated)
    customer_name: Optional[str] = Field(None, description="Customer name")
    customer_phone: Optional[str] = Field(None, description="Customer phone")

class JobDetailResponse(JobResponse):
    """Schema for detailed job response"""
    
    # Include materials, photos, and notes
    materials: List[JobMaterialResponse] = Field(default_factory=list, description="Job materials")
    photos: List[JobPhotoResponse] = Field(default_factory=list, description="Job photos")
    notes: List[JobNoteResponse] = Field(default_factory=list, description="Job notes")
    recurrence: Optional[JobRecurrenceResponse] = Field(None, description="Recurrence settings")

class JobListResponse(BaseModel):
    """Schema for job list response"""
    model_config = ConfigDict(from_attributes=True)
    
    jobs: List[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

class JobSummaryResponse(BaseModel):
    """Schema for job summary response"""
    model_config = ConfigDict(extra="forbid")
    
    id: str = Field(..., description="Job ID")
    job_number: str = Field(..., description="Job number")
    title: str = Field(..., description="Job title")
    customer_name: str = Field(..., description="Customer name")
    service_type: ServiceType = Field(..., description="Service type")
    status: JobStatus = Field(..., description="Job status")
    priority: JobPriority = Field(..., description="Job priority")
    scheduled_start: datetime = Field(..., description="Scheduled start")
    address: str = Field(..., description="Service address")
