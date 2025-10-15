# =============================================================================
# app/models/campaign.py
# =============================================================================
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum
from bson import ObjectId
from .base import PyObjectId

        
class CampaignType(str, Enum):
    """Campaign types"""
    EMAIL = "email"
    SMS = "sms"
    MULTI_CHANNEL = "multi_channel"
    DRIP = "drip"
    PROMOTIONAL = "promotional"
    EDUCATIONAL = "educational"
    FOLLOW_UP = "follow_up"

class CampaignStatus(str, Enum):
    """Campaign status"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CampaignTargeting(BaseModel):
    """Campaign targeting criteria"""
    model_config = ConfigDict(extra="allow")
    
    # Contact filters
    contact_types: List[str] = Field(default_factory=list)
    contact_statuses: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    lead_sources: List[str] = Field(default_factory=list)
    
    # Geographic filters
    states: List[str] = Field(default_factory=list)
    cities: List[str] = Field(default_factory=list)
    postal_codes: List[str] = Field(default_factory=list)
    
    # Service filters
    service_types: List[str] = Field(default_factory=list)
    last_service_days: Optional[int] = None  # Days since last service
    
    # Engagement filters
    email_engaged: Optional[bool] = None
    sms_engaged: Optional[bool] = None
    min_lead_score: Optional[float] = None
    
    # Custom criteria
    custom_filters: Dict[str, Any] = Field(default_factory=dict)

class CampaignMessage(BaseModel):
    """Campaign message template"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    message_type: str  # email, sms
    subject: Optional[str] = None  # For emails
    content: str = Field(..., min_length=1)
    
    # Personalization variables
    variables: List[str] = Field(default_factory=list)
    
    # Timing
    send_delay_minutes: int = Field(default=0, ge=0)
    send_time: Optional[str] = None  # HH:MM format for scheduled sending
    
    # A/B testing
    variant_name: Optional[str] = None
    split_percentage: float = Field(default=100.0, ge=0, le=100)

class CampaignMetrics(BaseModel):
    """Campaign performance metrics"""
    model_config = ConfigDict(extra="allow")
    
    # Sending metrics
    total_sent: int = Field(default=0)
    total_delivered: int = Field(default=0)
    total_bounced: int = Field(default=0)
    total_failed: int = Field(default=0)
    
    # Engagement metrics
    total_opened: int = Field(default=0)
    total_clicked: int = Field(default=0)
    total_replies: int = Field(default=0)
    total_unsubscribed: int = Field(default=0)
    
    # Conversion metrics
    total_leads_generated: int = Field(default=0)
    total_appointments_booked: int = Field(default=0)
    total_sales: int = Field(default=0)
    total_revenue: float = Field(default=0.0)
    
    # Calculated rates
    delivery_rate: float = Field(default=0.0)
    open_rate: float = Field(default=0.0)
    click_rate: float = Field(default=0.0)
    conversion_rate: float = Field(default=0.0)
    
    # Last updated
    last_calculated: Optional[datetime] = None

class Campaign(BaseModel):
    """Campaign model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    company_id: PyObjectId = Field(..., description="Company ID")
    
    # Campaign identification
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    
    # Campaign configuration
    campaign_type: CampaignType
    status: CampaignStatus = Field(default=CampaignStatus.DRAFT)
    
    # Targeting
    targeting: CampaignTargeting = Field(default_factory=CampaignTargeting)
    target_count: int = Field(default=0)  # Estimated target audience size
    
    # Messages
    messages: List[CampaignMessage] = Field(default_factory=list)
    
    # Scheduling
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    send_immediately: bool = Field(default=False)
    
    # Execution control
    max_sends_per_hour: int = Field(default=100, ge=1, le=1000)
    respect_business_hours: bool = Field(default=True)
    
    # A/B testing
    is_ab_test: bool = Field(default=False)
    ab_test_percentage: float = Field(default=50.0, ge=0, le=100)
    
    # Performance metrics
    metrics: CampaignMetrics = Field(default_factory=CampaignMetrics)
    
    # Categorization
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: PyObjectId
    updated_by: Optional[PyObjectId] = None
    
    # Execution tracking
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_sent_at: Optional[datetime] = None
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []
    
    def calculate_metrics(self) -> None:
        """Calculate campaign performance metrics"""
        metrics = self.metrics
        
        # Calculate rates
        if metrics.total_sent > 0:
            metrics.delivery_rate = (metrics.total_delivered / metrics.total_sent) * 100
        
        if metrics.total_delivered > 0:
            metrics.open_rate = (metrics.total_opened / metrics.total_delivered) * 100
            
        if metrics.total_opened > 0:
            metrics.click_rate = (metrics.total_clicked / metrics.total_opened) * 100
            
        if metrics.total_sent > 0:
            metrics.conversion_rate = (metrics.total_sales / metrics.total_sent) * 100
        
        metrics.last_calculated = datetime.utcnow()
        self.updated_at = datetime.utcnow()