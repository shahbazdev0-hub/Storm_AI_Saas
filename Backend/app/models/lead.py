# app/models/lead.py
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId
from .contact import LeadSource

class LeadStatus(str, Enum):
    """Lead status in the sales pipeline"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL_SENT = "proposal_sent"
    FOLLOW_UP = "follow_up"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"
    ON_HOLD = "on_hold"
    UNQUALIFIED = "unqualified"

class LeadPriority(str, Enum):
    """Lead priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    HOT = "hot"

class LeadQuality(str, Enum):
    """Lead quality assessment"""
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"
    BURNING = "burning"

class LeadStage(str, Enum):
    """Lead pipeline stages"""
    AWARENESS = "awareness"
    INTEREST = "interest"
    CONSIDERATION = "consideration"
    INTENT = "intent"
    EVALUATION = "evaluation"
    PURCHASE = "purchase"

class ServiceType(str, Enum):
    """Types of services"""
    PEST_CONTROL = "pest_control"
    LAWN_CARE = "lawn_care"
    HVAC = "hvac"
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    ROOFING = "roofing"
    REMODELING = "remodeling"
    CLEANING = "cleaning"
    LANDSCAPING = "landscaping"
    POOL_SERVICE = "pool_service"
    APPLIANCE_REPAIR = "appliance_repair"
    HANDYMAN = "handyman"
    PAINTING = "painting"
    FLOORING = "flooring"
    SECURITY = "security"
    OTHER = "other"

class LeadInteraction(BaseModel):
    """Lead interaction/touchpoint"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    interaction_type: str  # call, email, sms, meeting, demo, proposal
    direction: str = Field(default="outbound")  # inbound, outbound
    subject: Optional[str] = None
    description: str
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    
    # Personnel
    created_by: PyObjectId
    attended_by: List[PyObjectId] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict)

class LeadNote(BaseModel):
    """Lead note/comment"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    content: str = Field(..., min_length=1)
    note_type: str = Field(default="general")
    is_important: bool = Field(default=False)
    is_private: bool = Field(default=False)
    
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    attachments: List[str] = Field(default_factory=list)

class LeadScoring(BaseModel):
    """Lead scoring data"""
    model_config = ConfigDict(extra="allow")
    
    # AI/ML scores
    ai_score: Optional[float] = Field(None, ge=0, le=100)
    ai_confidence: Optional[float] = Field(None, ge=0, le=1)
    ai_last_scored: Optional[datetime] = None
    
    # Manual scoring factors
    budget_score: Optional[int] = Field(None, ge=0, le=10)
    authority_score: Optional[int] = Field(None, ge=0, le=10)
    need_score: Optional[int] = Field(None, ge=0, le=10)
    timeline_score: Optional[int] = Field(None, ge=0, le=10)
    
    # Engagement scoring
    website_score: Optional[int] = Field(None, ge=0, le=10)
    email_score: Optional[int] = Field(None, ge=0, le=10)
    phone_score: Optional[int] = Field(None, ge=0, le=10)
    social_score: Optional[int] = Field(None, ge=0, le=10)
    
    # Demographics scoring
    geographic_score: Optional[int] = Field(None, ge=0, le=10)
    company_size_score: Optional[int] = Field(None, ge=0, le=10)
    industry_score: Optional[int] = Field(None, ge=0, le=10)
    
    # Total scores
    total_score: Optional[float] = Field(None, ge=0, le=100)
    quality_grade: Optional[str] = None  # A, B, C, D, F
    
    # Scoring metadata
    last_calculated: Optional[datetime] = None
    scoring_model_version: Optional[str] = None

class Lead(BaseModel):
    """Lead model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    company_id: PyObjectId = Field(..., description="Company ID")
    contact_id: PyObjectId = Field(..., description="Associated contact ID")
    
    # Lead identification
    lead_number: Optional[str] = None  # Auto-generated unique identifier
    
    # Status and classification
    status: LeadStatus = Field(default=LeadStatus.NEW)
    priority: LeadPriority = Field(default=LeadPriority.MEDIUM)
    quality: LeadQuality = Field(default=LeadQuality.WARM)
    stage: LeadStage = Field(default=LeadStage.AWARENESS)
    
    # Source information
    source: LeadSource = Field(..., description="How the lead was generated")
    source_detail: Optional[str] = None  # Campaign name, referrer, etc.
    source_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    
    # Service requirements
    service_type: ServiceType = Field(default=ServiceType.OTHER)
    service_details: Optional[str] = None
    service_location: Optional[str] = None
    
    # Financial information
    estimated_value: Optional[float] = Field(None, ge=0)
    budget_range_min: Optional[float] = Field(None, ge=0)
    budget_range_max: Optional[float] = Field(None, ge=0)
    actual_value: Optional[float] = Field(None, ge=0)
    
    # Timeline and urgency
    expected_close_date: Optional[date] = None
    decision_timeline: Optional[str] = None  # immediate, 1-2 weeks, 1-3 months, etc.
    project_start_date: Optional[date] = None
    urgency_level: Optional[str] = None
    
    # Qualification data (BANT - Budget, Authority, Need, Timeline)
    has_budget: Optional[bool] = None
    budget_confirmed: Optional[bool] = None
    decision_maker: Optional[bool] = None
    pain_points: List[str] = Field(default_factory=list)
    current_solution: Optional[str] = None
    
    # Competition
    competitors: List[str] = Field(default_factory=list)
    competitive_advantage: Optional[str] = None
    
    # Assignment and ownership
    assigned_to: Optional[PyObjectId] = None
    assigned_at: Optional[datetime] = None
    owner_id: Optional[PyObjectId] = None
    
    # Lead scoring
    scoring: LeadScoring = Field(default_factory=LeadScoring)
    
    # Probability and forecasting
    probability: Optional[int] = Field(None, ge=0, le=100)
    forecast_category: Optional[str] = None  # commit, best_case, pipeline, omitted
    weighted_value: Optional[float] = Field(None, ge=0)
    
    # Interactions and activities
    interactions: List[LeadInteraction] = Field(default_factory=list)
    notes: List[LeadNote] = Field(default_factory=list)
    
    # Follow-up scheduling
    next_follow_up: Optional[datetime] = None
    follow_up_reason: Optional[str] = None
    snooze_until: Optional[datetime] = None
    
    # Conversion tracking
    converted_at: Optional[datetime] = None
    converted_by: Optional[PyObjectId] = None
    conversion_notes: Optional[str] = None
    
    # Loss tracking
    lost_at: Optional[datetime] = None
    lost_reason: Optional[str] = None
    lost_reason_detail: Optional[str] = None
    lost_to_competitor: Optional[str] = None
    
    # Communication tracking
    last_email_sent: Optional[datetime] = None
    last_sms_sent: Optional[datetime] = None
    last_call_made: Optional[datetime] = None
    last_response_received: Optional[datetime] = None
    response_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Marketing attribution
    first_touch_attribution: Optional[Dict[str, Any]] = None
    last_touch_attribution: Optional[Dict[str, Any]] = None
    multi_touch_attribution: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Custom fields and tags
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    updated_by: Optional[PyObjectId] = None
    deleted_at: Optional[datetime] = None
    
    # Integration and sync
    external_id: Optional[str] = None
    import_source: Optional[str] = None
    last_sync: Optional[datetime] = None
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator("lead_number", mode="before")
    @classmethod
    def generate_lead_number(cls, v, info):
        """Generate lead number if not provided"""
        if v is None:
            # Generate format: LEAD-YYYYMMDD-XXXX
            today = datetime.now().strftime("%Y%m%d")
            import random
            suffix = str(random.randint(1000, 9999))
            return f"LEAD-{today}-{suffix}"
        return v
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []
    
    @property
    def is_active(self) -> bool:
        """Check if lead is active"""
        return (self.status not in [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST, LeadStatus.UNQUALIFIED] and
                not self.deleted_at)
    
    @property
    def is_qualified(self) -> bool:
        """Check if lead is qualified"""
        return self.status in [LeadStatus.QUALIFIED, LeadStatus.PROPOSAL_SENT, 
                              LeadStatus.NEGOTIATION, LeadStatus.FOLLOW_UP]
    
    @property
    def is_hot(self) -> bool:
        """Check if lead is hot"""
        return (self.quality in [LeadQuality.HOT, LeadQuality.BURNING] or
                self.priority in [LeadPriority.HOT, LeadPriority.URGENT])
    
    @property
    def is_overdue(self) -> bool:
        """Check if follow-up is overdue"""
        if not self.next_follow_up:
            return False
        return datetime.utcnow() > self.next_follow_up
    
    @property
    def days_in_pipeline(self) -> int:
        """Calculate days in pipeline"""
        return (datetime.utcnow() - self.created_at).days
    
    @property
    def days_since_last_contact(self) -> Optional[int]:
        """Calculate days since last contact"""
        last_contact = max(
            filter(None, [
                self.last_email_sent,
                self.last_sms_sent, 
                self.last_call_made,
                self.last_response_received
            ]),
            default=None
        )
        
        if last_contact:
            return (datetime.utcnow() - last_contact).days
        return None
    
    @property
    def total_score(self) -> float:
        """Calculate total lead score"""
        if self.scoring.ai_score:
            return self.scoring.ai_score
        
        if self.scoring.total_score:
            return self.scoring.total_score
        
        # Calculate basic score from manual factors
        manual_scores = [
            self.scoring.budget_score or 0,
            self.scoring.authority_score or 0,
            self.scoring.need_score or 0,
            self.scoring.timeline_score or 0
        ]
        
        if any(score > 0 for score in manual_scores):
            return (sum(manual_scores) / 4) * 10  # Convert to 0-100 scale
        
        return 0.0
    
    @property
    def quality_grade(self) -> str:
        """Get quality grade based on score"""
        score = self.total_score
        
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B"
        elif score >= 60:
            return "C"
        elif score >= 50:
            return "D"
        else:
            return "F"
    
    def add_interaction(self, interaction_type: str, description: str,
                       created_by: PyObjectId, **kwargs) -> LeadInteraction:
        """Add an interaction to the lead"""
        interaction = LeadInteraction(
            interaction_type=interaction_type,
            description=description,
            created_by=created_by,
            **kwargs
        )
        self.interactions.append(interaction)
        self.updated_at = datetime.utcnow()
        
        # Update last contact timestamps
        if interaction_type == "email":
            self.last_email_sent = datetime.utcnow()
        elif interaction_type == "sms":
            self.last_sms_sent = datetime.utcnow()
        elif interaction_type == "call":
            self.last_call_made = datetime.utcnow()
        
        return interaction
    
    def add_note(self, content: str, created_by: PyObjectId, 
                 note_type: str = "general", **kwargs) -> LeadNote:
        """Add a note to the lead"""
        note = LeadNote(
            content=content,
            note_type=note_type,
            created_by=created_by,
            **kwargs
        )
        self.notes.append(note)
        self.updated_at = datetime.utcnow()
        return note
    
    def update_status(self, status: LeadStatus, updated_by: PyObjectId = None) -> None:
        """Update lead status with tracking"""
        old_status = self.status
        self.status = status
        self.updated_at = datetime.utcnow()
        self.updated_by = updated_by
        
        # Handle status-specific logic
        if status == LeadStatus.CLOSED_WON:
            self.converted_at = datetime.utcnow()
            self.converted_by = updated_by
        elif status == LeadStatus.CLOSED_LOST:
            self.lost_at = datetime.utcnow()
        
        # Add status change note
        if updated_by:
            self.add_note(
                content=f"Status changed from {old_status} to {status}",
                created_by=updated_by,
                note_type="status_change"
            )
    
    def update_score(self, score: float, score_type: str = "ai", 
                     confidence: float = None) -> None:
        """Update lead score"""
        if score_type == "ai":
            self.scoring.ai_score = max(0, min(100, score))
            self.scoring.ai_confidence = confidence
            self.scoring.ai_last_scored = datetime.utcnow()
        else:
            self.scoring.total_score = max(0, min(100, score))
        
        self.scoring.quality_grade = self.quality_grade
        self.scoring.last_calculated = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def schedule_follow_up(self, follow_up_date: datetime, reason: str = None) -> None:
        """Schedule next follow-up"""
        self.next_follow_up = follow_up_date
        self.follow_up_reason = reason
        self.updated_at = datetime.utcnow()
    
    def snooze(self, until: datetime) -> None:
        """Snooze lead until specified date"""
        self.snooze_until = until
        self.updated_at = datetime.utcnow()
    
    def assign_to(self, user_id: PyObjectId, assigned_by: PyObjectId = None) -> None:
        """Assign lead to a user"""
        old_assignee = self.assigned_to
        self.assigned_to = user_id
        self.assigned_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        # Add assignment note
        if assigned_by:
            self.add_note(
                content=f"Lead reassigned from {old_assignee} to {user_id}",
                created_by=assigned_by,
                note_type="assignment"
            )
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the lead"""
        tag = tag.strip().lower()
        if tag and tag not in self.tags:
            self.tags.append(tag)
            self.updated_at = datetime.utcnow()
    
    def remove_tag(self, tag: str) -> None:
        """Remove a tag from the lead"""
        tag = tag.strip().lower()
        if tag in self.tags:
            self.tags.remove(tag)
            self.updated_at = datetime.utcnow()
    
    def convert_to_customer(self, converted_by: PyObjectId = None, 
                          notes: str = None) -> None:
        """Convert lead to customer"""
        self.status = LeadStatus.CLOSED_WON
        self.converted_at = datetime.utcnow()
        self.converted_by = converted_by
        self.conversion_notes = notes
        self.updated_at = datetime.utcnow()
        
        if converted_by:
            self.add_note(
                content=f"Lead converted to customer. {notes or ''}",
                created_by=converted_by,
                note_type="conversion"
            )
    
    def mark_as_lost(self, reason: str, detail: str = None, 
                     competitor: str = None, lost_by: PyObjectId = None) -> None:
        """Mark lead as lost"""
        self.status = LeadStatus.CLOSED_LOST
        self.lost_at = datetime.utcnow()
        self.lost_reason = reason
        self.lost_reason_detail = detail
        self.lost_to_competitor = competitor
        self.updated_at = datetime.utcnow()
        
        if lost_by:
            self.add_note(
                content=f"Lead marked as lost. Reason: {reason}. {detail or ''}",
                created_by=lost_by,
                note_type="lost"
            )
    
    def calculate_weighted_value(self) -> float:
        """Calculate weighted value based on probability"""
        if self.estimated_value and self.probability:
            self.weighted_value = self.estimated_value * (self.probability / 100)
            return self.weighted_value
        return 0.0
    
    def soft_delete(self) -> None:
        """Soft delete lead"""
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft-deleted lead"""
        self.deleted_at = None
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, include_interactions: bool = False, 
                include_notes: bool = False) -> Dict[str, Any]:
        """Convert to dictionary with options"""
        data = self.model_dump(by_alias=True)
        
        if not include_interactions:
            data.pop("interactions", None)
        
        if not include_notes:
            data.pop("notes", None)
        
        # Convert ObjectIds to strings
        if data.get("_id"):
            data["id"] = str(data["_id"])
        
        string_fields = [
            "company_id", "contact_id", "assigned_to", "owner_id", 
            "created_by", "updated_by", "converted_by"
        ]
        for field in string_fields:
            if data.get(field):
                data[field] = str(data[field])
        
        return data

# Lead pipeline configuration
PIPELINE_STAGES = {
    LeadStage.AWARENESS: {
        "name": "Awareness",
        "description": "Lead becomes aware of your services",
        "typical_statuses": [LeadStatus.NEW]
    },
    LeadStage.INTEREST: {
        "name": "Interest", 
        "description": "Lead shows interest in your services",
        "typical_statuses": [LeadStatus.CONTACTED]
    },
    LeadStage.CONSIDERATION: {
        "name": "Consideration",
        "description": "Lead is considering your services",
        "typical_statuses": [LeadStatus.QUALIFIED, LeadStatus.FOLLOW_UP]
    },
    LeadStage.INTENT: {
        "name": "Intent",
        "description": "Lead shows intent to purchase",
        "typical_statuses": [LeadStatus.PROPOSAL_SENT]
    },
    LeadStage.EVALUATION: {
        "name": "Evaluation",
        "description": "Lead is evaluating proposals",
        "typical_statuses": [LeadStatus.NEGOTIATION]
    },
    LeadStage.PURCHASE: {
        "name": "Purchase",
        "description": "Lead makes purchase decision",
        "typical_statuses": [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST]
    }
}

# Export model and utilities
__all__ = [
    "Lead",
    "LeadStatus",
    "LeadPriority",
    "LeadQuality", 
    "LeadStage",
    "ServiceType",
    "LeadInteraction",
    "LeadNote",
    "LeadScoring",
    "PIPELINE_STAGES"
]