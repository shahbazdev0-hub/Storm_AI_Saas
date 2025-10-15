# app/schemas/lead.py
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.lead import (
    LeadStatus, LeadPriority, LeadQuality, LeadStage, ServiceType
)
from app.models.contact import LeadSource

# Lead scoring schemas
class LeadScoringBase(BaseModel):
    """Base lead scoring schema"""
    model_config = ConfigDict(extra="forbid")
    
    budget_score: Optional[int] = Field(None, ge=0, le=10, description="Budget score (0-10)")
    authority_score: Optional[int] = Field(None, ge=0, le=10, description="Authority score (0-10)")
    need_score: Optional[int] = Field(None, ge=0, le=10, description="Need score (0-10)")
    timeline_score: Optional[int] = Field(None, ge=0, le=10, description="Timeline score (0-10)")
    website_score: Optional[int] = Field(None, ge=0, le=10, description="Website engagement score")
    email_score: Optional[int] = Field(None, ge=0, le=10, description="Email engagement score")
    phone_score: Optional[int] = Field(None, ge=0, le=10, description="Phone engagement score")
    social_score: Optional[int] = Field(None, ge=0, le=10, description="Social engagement score")

class LeadScoringUpdate(LeadScoringBase):
    """Schema for updating lead scoring"""
    pass

class LeadScoringResponse(LeadScoringBase):
    """Schema for lead scoring response"""
    model_config = ConfigDict(from_attributes=True)
    
    ai_score: Optional[float] = Field(None, description="AI-generated score")
    ai_confidence: Optional[float] = Field(None, description="AI confidence level")
    total_score: Optional[float] = Field(None, description="Total calculated score")
    quality_grade: Optional[str] = Field(None, description="Quality grade (A-F)")
    last_calculated: Optional[datetime] = Field(None, description="Last calculation timestamp")

# Lead interaction schemas
class LeadInteractionBase(BaseModel):
    """Base lead interaction schema"""
    model_config = ConfigDict(extra="forbid")
    
    interaction_type: str = Field(..., description="Interaction type")
    direction: Optional[str] = Field(default="outbound", description="Interaction direction")
    subject: Optional[str] = Field(None, max_length=200, description="Interaction subject")
    description: str = Field(..., min_length=1, max_length=1000, description="Interaction description")
    outcome: Optional[str] = Field(None, max_length=500, description="Interaction outcome")
    next_action: Optional[str] = Field(None, max_length=500, description="Next action")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled time")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Duration in minutes")

class LeadInteractionCreate(LeadInteractionBase):
    """Schema for creating lead interaction"""
    pass

class LeadInteractionResponse(LeadInteractionBase):
    """Schema for lead interaction response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Interaction ID")
    created_by: str = Field(..., description="Created by user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

# Lead note schemas
class LeadNoteBase(BaseModel):
    """Base lead note schema"""
    model_config = ConfigDict(extra="forbid")
    
    content: str = Field(..., min_length=1, max_length=2000, description="Note content")
    note_type: Optional[str] = Field(default="general", description="Note type")
    is_important: Optional[bool] = Field(default=False, description="Important flag")
    is_private: Optional[bool] = Field(default=False, description="Private flag")

class LeadNoteCreate(LeadNoteBase):
    """Schema for creating lead note"""
    pass

class LeadNoteResponse(LeadNoteBase):
    """Schema for lead note response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Note ID")
    created_by: str = Field(..., description="Created by user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

# Base lead schemas
class LeadBase(BaseModel):
    """Base lead schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    status: Optional[LeadStatus] = Field(None, description="Lead status")
    priority: Optional[LeadPriority] = Field(None, description="Lead priority")
    quality: Optional[LeadQuality] = Field(None, description="Lead quality")
    stage: Optional[LeadStage] = Field(None, description="Lead stage")
    source: Optional[LeadSource] = Field(None, description="Lead source")
    source_detail: Optional[str] = Field(None, max_length=200, description="Source detail")
    source_url: Optional[str] = Field(None, description="Source URL")
    
    # UTM parameters
    utm_source: Optional[str] = Field(None, max_length=100, description="UTM source")
    utm_medium: Optional[str] = Field(None, max_length=100, description="UTM medium")
    utm_campaign: Optional[str] = Field(None, max_length=100, description="UTM campaign")
    utm_content: Optional[str] = Field(None, max_length=100, description="UTM content")
    
    # Service requirements
    service_type: Optional[ServiceType] = Field(None, description="Service type")
    service_details: Optional[str] = Field(None, max_length=1000, description="Service details")
    service_location: Optional[str] = Field(None, max_length=500, description="Service location")
    
    # Financial information
    estimated_value: Optional[float] = Field(None, ge=0, description="Estimated value")
    budget_range_min: Optional[float] = Field(None, ge=0, description="Budget minimum")
    budget_range_max: Optional[float] = Field(None, ge=0, description="Budget maximum")
    
    # Timeline
    expected_close_date: Optional[date] = Field(None, description="Expected close date")
    decision_timeline: Optional[str] = Field(None, max_length=100, description="Decision timeline")
    project_start_date: Optional[date] = Field(None, description="Project start date")
    
    # Qualification (BANT)
    has_budget: Optional[bool] = Field(None, description="Has budget confirmed")
    budget_confirmed: Optional[bool] = Field(None, description="Budget confirmed")
    decision_maker: Optional[bool] = Field(None, description="Is decision maker")
    pain_points: Optional[List[str]] = Field(default_factory=list, description="Pain points")
    current_solution: Optional[str] = Field(None, max_length=500, description="Current solution")
    
    # Competition
    competitors: Optional[List[str]] = Field(default_factory=list, description="Competitors")
    competitive_advantage: Optional[str] = Field(None, max_length=1000, description="Competitive advantage")
    
    # Assignment
    assigned_to: Optional[str] = Field(None, description="Assigned to user ID")
    
    # Probability and forecasting
    probability: Optional[int] = Field(None, ge=0, le=100, description="Close probability %")
    forecast_category: Optional[str] = Field(None, description="Forecast category")
    
    # Follow-up
    next_follow_up: Optional[datetime] = Field(None, description="Next follow-up date")
    follow_up_reason: Optional[str] = Field(None, max_length=500, description="Follow-up reason")
    
    # Tags and custom fields
    tags: Optional[List[str]] = Field(default_factory=list, description="Lead tags")
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom fields")

# Lead creation schema
class LeadCreate(LeadBase):
    """Schema for creating a new lead"""
    contact_id: str = Field(..., description="Contact ID")
    source: LeadSource = Field(..., description="Lead source")
    service_type: ServiceType = Field(default=ServiceType.OTHER, description="Service type")
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []

# Lead update schema
class LeadUpdate(LeadBase):
    """Schema for updating lead information"""
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if v is None:
            return v
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v

# Lead search and filter schemas
class LeadSearch(BaseModel):
    """Schema for lead search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    status: Optional[LeadStatus] = Field(None, description="Lead status filter")
    priority: Optional[LeadPriority] = Field(None, description="Priority filter")
    quality: Optional[LeadQuality] = Field(None, description="Quality filter")
    stage: Optional[LeadStage] = Field(None, description="Stage filter")
    source: Optional[LeadSource] = Field(None, description="Source filter")
    service_type: Optional[ServiceType] = Field(None, description="Service type filter")
    assigned_to: Optional[str] = Field(None, description="Assigned to user filter")
    tag: Optional[str] = Field(None, description="Tag filter")
    
    # Date filters
    created_after: Optional[datetime] = Field(None, description="Created after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    expected_close_after: Optional[date] = Field(None, description="Expected close after")
    expected_close_before: Optional[date] = Field(None, description="Expected close before")
    
    # Value filters
    min_value: Optional[float] = Field(None, ge=0, description="Minimum estimated value")
    max_value: Optional[float] = Field(None, ge=0, description="Maximum estimated value")
    min_probability: Optional[int] = Field(None, ge=0, le=100, description="Minimum probability")
    max_probability: Optional[int] = Field(None, ge=0, le=100, description="Maximum probability")
    min_score: Optional[float] = Field(None, ge=0, le=100, description="Minimum AI score")
    
    # Boolean filters
    has_budget: Optional[bool] = Field(None, description="Has budget filter")
    decision_maker: Optional[bool] = Field(None, description="Decision maker filter")
    overdue_follow_up: Optional[bool] = Field(None, description="Overdue follow-up filter")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Lead status update schema
class LeadStatusUpdate(BaseModel):
    """Schema for updating lead status"""
    model_config = ConfigDict(extra="forbid")
    
    status: LeadStatus = Field(..., description="New lead status")
    notes: Optional[str] = Field(None, max_length=1000, description="Status change notes")
    lost_reason: Optional[str] = Field(None, max_length=500, description="Lost reason")
    lost_reason_detail: Optional[str] = Field(None, max_length=1000, description="Lost reason detail")
    lost_to_competitor: Optional[str] = Field(None, max_length=200, description="Lost to competitor")

# Lead assignment schema
class LeadAssignment(BaseModel):
    """Schema for lead assignment"""
    model_config = ConfigDict(extra="forbid")
    
    assigned_to: str = Field(..., description="User ID to assign lead to")
    notes: Optional[str] = Field(None, max_length=500, description="Assignment notes")

# Lead conversion schema
class LeadConversion(BaseModel):
    """Schema for lead conversion"""
    model_config = ConfigDict(extra="forbid")
    
    notes: Optional[str] = Field(None, max_length=1000, description="Conversion notes")
    actual_value: Optional[float] = Field(None, ge=0, description="Actual conversion value")

# Response schemas
class LeadResponse(LeadBase):
    """Schema for lead response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Lead ID")
    company_id: str = Field(..., description="Company ID")
    contact_id: str = Field(..., description="Contact ID")
    lead_number: str = Field(..., description="Lead number")
    
    # Required fields
    source: LeadSource = Field(..., description="Lead source")
    service_type: ServiceType = Field(..., description="Service type")
    status: LeadStatus = Field(..., description="Lead status")
    priority: LeadPriority = Field(..., description="Lead priority")
    quality: LeadQuality = Field(..., description="Lead quality")
    stage: LeadStage = Field(..., description="Lead stage")
    
    # Computed fields
    is_active: bool = Field(..., description="Active status")
    is_qualified: bool = Field(..., description="Qualified status")
    is_hot: bool = Field(..., description="Hot status")
    is_overdue: bool = Field(..., description="Overdue status")
    days_in_pipeline: int = Field(..., description="Days in pipeline")
    days_since_last_contact: Optional[int] = Field(None, description="Days since last contact")
    total_score: float = Field(..., description="Total lead score")
    quality_grade: str = Field(..., description="Quality grade")
    weighted_value: Optional[float] = Field(None, description="Weighted value")
    
    # Scoring
    scoring: LeadScoringResponse = Field(..., description="Lead scoring data")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    converted_at: Optional[datetime] = Field(None, description="Conversion timestamp")
    lost_at: Optional[datetime] = Field(None, description="Lost timestamp")
    
    # Contact information (populated)
    contact_name: Optional[str] = Field(None, description="Contact full name")
    contact_email: Optional[str] = Field(None, description="Contact email")
    contact_phone: Optional[str] = Field(None, description="Contact phone")

class LeadDetailResponse(LeadResponse):
    """Schema for detailed lead response"""
    
    # Include interactions and notes
    interactions: List[LeadInteractionResponse] = Field(default_factory=list, description="Lead interactions")
    notes: List[LeadNoteResponse] = Field(default_factory=list, description="Lead notes")

class LeadListResponse(BaseModel):
    """Schema for lead list response"""
    model_config = ConfigDict(from_attributes=True)
    
    leads: List[LeadResponse] = Field(..., description="List of leads")
    total: int = Field(..., description="Total number of leads")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

class LeadSummaryResponse(BaseModel):
    """Schema for lead summary response"""
    model_config = ConfigDict(extra="forbid")
    
    id: str = Field(..., description="Lead ID")
    lead_number: str = Field(..., description="Lead number")
    contact_name: str = Field(..., description="Contact name")
    source: LeadSource = Field(..., description="Lead source")
    service_type: ServiceType = Field(..., description="Service type")
    status: LeadStatus = Field(..., description="Lead status")
    priority: LeadPriority = Field(..., description="Lead priority")
    estimated_value: Optional[float] = Field(None, description="Estimated value")
    total_score: float = Field(..., description="Total score")
    created_at: datetime = Field(..., description="Creation timestamp")
    next_follow_up: Optional[datetime] = Field(None, description="Next follow-up")

# Bulk operations schemas
class LeadBulkUpdate(BaseModel):
    """Schema for bulk lead updates"""
    model_config = ConfigDict(extra="forbid")
    
    lead_ids: List[str] = Field(..., min_length=1, description="Lead IDs to update")
    updates: LeadUpdate = Field(..., description="Update data")

class LeadBulkStatusUpdate(BaseModel):
    """Schema for bulk lead status updates"""
    model_config = ConfigDict(extra="forbid")
    
    lead_ids: List[str] = Field(..., min_length=1, description="Lead IDs to update")
    status: LeadStatus = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Status change notes")

class LeadBulkAssign(BaseModel):
    """Schema for bulk lead assignment"""
    model_config = ConfigDict(extra="forbid")
    
    lead_ids: List[str] = Field(..., min_length=1, description="Lead IDs to assign")
    assigned_to: str = Field(..., description="User ID to assign to")

class LeadBulkTag(BaseModel):
    """Schema for bulk lead tagging"""
    model_config = ConfigDict(extra="forbid")
    
    lead_ids: List[str] = Field(..., min_length=1, description="Lead IDs to tag")
    tags: List[str] = Field(..., min_length=1, description="Tags to add/remove")
    action: str = Field(..., pattern="^(add|remove)$", description="Tag action")

# Analytics schemas
class LeadAnalytics(BaseModel):
    """Schema for lead analytics"""
    model_config = ConfigDict(extra="forbid")
    
    total_leads: int = Field(..., description="Total number of leads")
    by_status: Dict[str, int] = Field(..., description="Leads by status")
    by_source: Dict[str, int] = Field(..., description="Leads by source")
    by_stage: Dict[str, int] = Field(..., description="Leads by stage")
    by_priority: Dict[str, int] = Field(..., description="Leads by priority")
    conversion_rate: float = Field(..., description="Overall conversion rate")
    average_score: float = Field(..., description="Average lead score")
    total_value: float = Field(..., description="Total pipeline value")
    weighted_value: float = Field(..., description="Weighted pipeline value")

class LeadPipelineAnalytics(BaseModel):
    """Schema for lead pipeline analytics"""
    model_config = ConfigDict(extra="forbid")
    
    stages: List[Dict[str, Any]] = Field(..., description="Pipeline stages data")
    conversion_rates: Dict[str, float] = Field(..., description="Stage conversion rates")
    average_time_in_stage: Dict[str, float] = Field(..., description="Average time in each stage")
    bottlenecks: List[str] = Field(..., description="Pipeline bottlenecks")

# Export/Import schemas
class LeadExport(BaseModel):
    """Schema for lead export"""
    model_config = ConfigDict(extra="forbid")
    
    format: str = Field(..., pattern="^(csv|xlsx|json)$", description="Export format")
    fields: List[str] = Field(..., description="Fields to export")
    filters: Optional[LeadSearch] = Field(None, description="Export filters")

# Communication schemas
class LeadCommunication(BaseModel):
    """Schema for lead communication"""
    model_config = ConfigDict(extra="forbid")
    
    type: str = Field(..., pattern="^(email|sms|call)$", description="Communication type")
    subject: Optional[str] = Field(None, max_length=200, description="Subject line")
    content: str = Field(..., min_length=1, description="Message content")
    template_id: Optional[str] = Field(None, description="Template ID")
    send_immediately: bool = Field(default=True, description="Send immediately flag")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled send time")

# Success/Error response schemas
class LeadSuccessResponse(BaseModel):
    """Schema for lead success responses"""
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., description="Success message")
    lead_id: Optional[str] = Field(None, description="Lead ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

class LeadErrorResponse(BaseModel):
    """Schema for lead error responses"""
    model_config = ConfigDict(extra="forbid")
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

# Export all schemas
__all__ = [
    # Scoring schemas
    "LeadScoringBase",
    "LeadScoringUpdate",
    "LeadScoringResponse",
    
    # Interaction schemas
    "LeadInteractionBase",
    "LeadInteractionCreate",
    "LeadInteractionResponse",
    
    # Note schemas
    "LeadNoteBase",
    "LeadNoteCreate", 
    "LeadNoteResponse",
    
    # Base lead schemas
    "LeadBase",
    "LeadCreate",
    "LeadUpdate",
    "LeadSearch",
    
    # Status and assignment
    "LeadStatusUpdate",
    "LeadAssignment",
    "LeadConversion",
    
    # Response schemas
    "LeadResponse",
    "LeadDetailResponse",
    "LeadListResponse",
    "LeadSummaryResponse",
    
    # Bulk operations
    "LeadBulkUpdate",
    "LeadBulkStatusUpdate",
    "LeadBulkAssign",
    "LeadBulkTag",
    
    # Analytics schemas
    "LeadAnalytics",
    "LeadPipelineAnalytics",
    
    # Export schemas
    "LeadExport",
    
    # Communication schemas
    "LeadCommunication",
    
    # Response schemas
    "Lead",  # ✅ Add this line
    "LeadSuccessResponse",
    "LeadErrorResponse"
]


# Lead alias for backward compatibility
class Lead(LeadResponse):
    """Lead schema - alias for LeadResponse"""
    pass

