# app/models/contact.py
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId

class ContactType(str, Enum):
    """Contact type"""
    LEAD = "lead"
    PROSPECT = "prospect"
    CUSTOMER = "customer"
    FORMER_CUSTOMER = "former_customer"
    VENDOR = "vendor"
    PARTNER = "partner"

class ContactStatus(str, Enum):
    """Contact status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DO_NOT_CONTACT = "do_not_contact"
    BLACKLISTED = "blacklisted"
    BOUNCED = "bounced"

class LeadSource(str, Enum):
    """Lead source options"""
    WEBSITE = "website"
    REFERRAL = "referral"
    GOOGLE_ADS = "google_ads"
    FACEBOOK_ADS = "facebook_ads"
    SOCIAL_MEDIA = "social_media"
    PHONE_CALL = "phone_call"
    EMAIL = "email"
    TRADE_SHOW = "trade_show"
    DIRECT_MAIL = "direct_mail"
    COLD_CALL = "cold_call"
    WALK_IN = "walk_in"
    EXISTING_CUSTOMER = "existing_customer"
    PARTNER = "partner"
    OTHER = "other"

class CommunicationPreference(str, Enum):
    """Communication preferences"""
    EMAIL = "email"
    PHONE = "phone"
    SMS = "sms"
    MAIL = "mail"
    NO_CONTACT = "no_contact"

class ContactAddress(BaseModel):
    """Contact address"""
    model_config = ConfigDict(extra="allow")
    
    type: str = Field(default="home")  # home, work, billing, service
    street: Optional[str] = None
    street2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = Field(default="US")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_primary: bool = Field(default=False)
    
    # Service-specific fields
    is_service_address: bool = Field(default=True)
    access_instructions: Optional[str] = None
    gate_code: Optional[str] = None
    
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

class ContactNote(BaseModel):
    """Contact note/interaction"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    content: str = Field(..., min_length=1)
    note_type: str = Field(default="general")  # general, call, email, meeting, service
    is_important: bool = Field(default=False)
    is_private: bool = Field(default=False)
    
    # Metadata
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Related entities
    related_job_id: Optional[PyObjectId] = None
    related_estimate_id: Optional[PyObjectId] = None
    related_invoice_id: Optional[PyObjectId] = None
    
    # Attachments
    attachments: List[str] = Field(default_factory=list)

class ContactActivity(BaseModel):
    """Contact activity/interaction tracking"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    activity_type: str  # email_sent, email_opened, sms_sent, call_made, meeting_scheduled, etc.
    description: str
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    
    # Activity data
    data: Dict[str, Any] = Field(default_factory=dict)
    
    # Related entities
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None

class SocialMedia(BaseModel):
    """Social media profiles"""
    model_config = ConfigDict(extra="allow")
    
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None

class Contact(BaseModel):
    """Contact model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    company_id: PyObjectId = Field(..., description="Company ID")
    
    # Basic information
    type: ContactType = Field(default=ContactType.LEAD)
    status: ContactStatus = Field(default=ContactStatus.ACTIVE)
    
    # Personal information
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=100)  # Mr., Mrs., Dr., etc.
    job_title: Optional[str] = Field(None, max_length=100)
    
    # Contact information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    phone_mobile: Optional[str] = None
    phone_work: Optional[str] = None
    fax: Optional[str] = None
    
    # Company/Organization
    company: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = None
    
    # Address information
    addresses: List[ContactAddress] = Field(default_factory=list)
    
    # Communication preferences
    preferred_contact_method: CommunicationPreference = Field(default=CommunicationPreference.EMAIL)
    communication_preferences: List[CommunicationPreference] = Field(default_factory=list)
    email_opt_in: bool = Field(default=True)
    sms_opt_in: bool = Field(default=True)
    marketing_opt_in: bool = Field(default=True)
    
    # Lead information
    lead_source: Optional[LeadSource] = None
    lead_source_detail: Optional[str] = None  # Specific campaign, referrer, etc.
    referral_source: Optional[str] = None
    
    # Assignment and ownership
    assigned_to: Optional[PyObjectId] = None
    owner_id: Optional[PyObjectId] = None
    
    # Categorization
    tags: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    
    # Custom fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Relationship data
    spouse_name: Optional[str] = None
    children: List[str] = Field(default_factory=list)
    birthday: Optional[datetime] = None
    anniversary: Optional[datetime] = None
    
    # Social media
    social_media: SocialMedia = Field(default_factory=SocialMedia)
    
    # Notes and activities
    notes: List[ContactNote] = Field(default_factory=list)
    activities: List[ContactActivity] = Field(default_factory=list)
    
    # Interaction tracking
    last_contact: Optional[datetime] = None
    last_contact_type: Optional[str] = None
    last_contacted_by: Optional[PyObjectId] = None
    next_follow_up: Optional[datetime] = None
    follow_up_reason: Optional[str] = None
    
    # Email tracking
    email_bounced: bool = Field(default=False)
    email_bounce_reason: Optional[str] = None
    last_email_opened: Optional[datetime] = None
    last_email_clicked: Optional[datetime] = None
    email_engagement_score: float = Field(default=0.0, ge=0, le=1)
    
    # SMS tracking
    sms_delivery_failed: bool = Field(default=False)
    sms_failure_reason: Optional[str] = None
    last_sms_received: Optional[datetime] = None
    sms_engagement_score: float = Field(default=0.0, ge=0, le=1)
    
    # Scoring and analytics
    lead_score: Optional[float] = Field(None, ge=0, le=100)
    customer_lifetime_value: Optional[float] = None
    total_revenue: float = Field(default=0.0, ge=0)
    job_count: int = Field(default=0, ge=0)
    invoice_count: int = Field(default=0, ge=0)
    
    # Service history
    first_service_date: Optional[datetime] = None
    last_service_date: Optional[datetime] = None
    service_frequency: Optional[str] = None  # weekly, monthly, quarterly, yearly
    preferred_technician_id: Optional[PyObjectId] = None
    
    # Financial information
    credit_limit: Optional[float] = None
    payment_terms: Optional[str] = None
    tax_exempt: bool = Field(default=False)
    tax_id: Optional[str] = None
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    updated_by: Optional[PyObjectId] = None
    deleted_at: Optional[datetime] = None
    
    # Import/sync data
    external_id: Optional[str] = None  # ID from external system
    import_source: Optional[str] = None
    last_sync: Optional[datetime] = None
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v):
        if v and isinstance(v, str):
            return v.lower().strip()
        return v
    
    @field_validator("phone", "phone_mobile", "phone_work", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        
        import re
        phone_digits = re.sub(r'\D', '', str(v))
        
        if phone_digits and not (10 <= len(phone_digits) <= 15):
            raise ValueError("Phone number must be 10-15 digits")
        
        return phone_digits if phone_digits else None
    
    @field_validator("tags", "categories", mode="before")
    @classmethod
    def validate_string_lists(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []
    
    @property
    def full_name(self) -> str:
        """Get full name"""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(parts)
    
    @property
    def display_name(self) -> str:
        """Get display name with title if available"""
        name = self.full_name
        if self.title:
            return f"{self.title} {name}"
        return name
    
    @property
    def primary_phone(self) -> Optional[str]:
        """Get primary phone number"""
        return self.phone_mobile or self.phone or self.phone_work
    
    @property
    def primary_address(self) -> Optional[ContactAddress]:
        """Get primary address"""
        for address in self.addresses:
            if address.is_primary:
                return address
        return self.addresses[0] if self.addresses else None
    
    @property
    def service_address(self) -> Optional[ContactAddress]:
        """Get service address"""
        for address in self.addresses:
            if address.is_service_address:
                return address
        return self.primary_address
    
    @property
    def is_active(self) -> bool:
        """Check if contact is active"""
        return (self.status == ContactStatus.ACTIVE and 
                not self.deleted_at)
    
    @property
    def can_contact_email(self) -> bool:
        """Check if can send emails"""
        return (self.email and 
                self.email_opt_in and 
                not self.email_bounced and
                self.status not in [ContactStatus.DO_NOT_CONTACT, ContactStatus.BLACKLISTED])
    
    @property
    def can_contact_sms(self) -> bool:
        """Check if can send SMS"""
        return (self.primary_phone and 
                self.sms_opt_in and 
                not self.sms_delivery_failed and
                self.status not in [ContactStatus.DO_NOT_CONTACT, ContactStatus.BLACKLISTED])
    
    @property
    def is_customer(self) -> bool:
        """Check if contact is a customer"""
        return self.type == ContactType.CUSTOMER
    
    @property
    def is_lead(self) -> bool:
        """Check if contact is a lead"""
        return self.type == ContactType.LEAD
    
    @property
    def days_since_last_contact(self) -> Optional[int]:
        """Get days since last contact"""
        if not self.last_contact:
            return None
        
        delta = datetime.utcnow() - self.last_contact
        return delta.days
    
    @property
    def engagement_score(self) -> float:
        """Calculate overall engagement score"""
        email_weight = 0.4
        sms_weight = 0.3
        interaction_weight = 0.3
        
        # Base scores
        email_score = self.email_engagement_score if self.email else 0
        sms_score = self.sms_engagement_score if self.primary_phone else 0
        
        # Interaction score based on recent activity
        interaction_score = 0.0
        if self.last_contact:
            days_since = self.days_since_last_contact or 0
            if days_since <= 7:
                interaction_score = 1.0
            elif days_since <= 30:
                interaction_score = 0.7
            elif days_since <= 90:
                interaction_score = 0.4
            else:
                interaction_score = 0.1
        
        return (email_score * email_weight + 
                sms_score * sms_weight + 
                interaction_score * interaction_weight)
    
    def add_note(self, content: str, note_type: str = "general", 
                 created_by: PyObjectId = None, **kwargs) -> ContactNote:
        """Add a note to the contact"""
        note = ContactNote(
            content=content,
            note_type=note_type,
            created_by=created_by,
            **kwargs
        )
        self.notes.append(note)
        self.updated_at = datetime.utcnow()
        return note
    
    def add_activity(self, activity_type: str, description: str,
                     created_by: PyObjectId = None, **kwargs) -> ContactActivity:
        """Add an activity to the contact"""
        activity = ContactActivity(
            activity_type=activity_type,
            description=description,
            created_by=created_by,
            **kwargs
        )
        self.activities.append(activity)
        self.last_contact = datetime.utcnow()
        self.last_contact_type = activity_type
        self.last_contacted_by = created_by
        self.updated_at = datetime.utcnow()
        return activity
    
    def add_address(self, address: ContactAddress) -> None:
        """Add an address to the contact"""
        # If this is marked as primary, remove primary from others
        if address.is_primary:
            for addr in self.addresses:
                addr.is_primary = False
        
        self.addresses.append(address)
        self.updated_at = datetime.utcnow()
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the contact"""
        tag = tag.strip().lower()
        if tag and tag not in self.tags:
            self.tags.append(tag)
            self.updated_at = datetime.utcnow()
    
    def remove_tag(self, tag: str) -> None:
        """Remove a tag from the contact"""
        tag = tag.strip().lower()
        if tag in self.tags:
            self.tags.remove(tag)
            self.updated_at = datetime.utcnow()
    
    def convert_to_customer(self) -> None:
        """Convert lead/prospect to customer"""
        self.type = ContactType.CUSTOMER
        if not self.first_service_date:
            self.first_service_date = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def update_revenue(self, amount: float) -> None:
        """Update total revenue"""
        self.total_revenue += amount
        self.updated_at = datetime.utcnow()
    
    def update_engagement_score(self, email_score: float = None, 
                              sms_score: float = None) -> None:
        """Update engagement scores"""
        if email_score is not None:
            self.email_engagement_score = max(0, min(1, email_score))
        
        if sms_score is not None:
            self.sms_engagement_score = max(0, min(1, sms_score))
        
        self.updated_at = datetime.utcnow()
    
    def soft_delete(self) -> None:
        """Soft delete contact"""
        self.deleted_at = datetime.utcnow()
        self.status = ContactStatus.INACTIVE
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft-deleted contact"""
        self.deleted_at = None
        self.status = ContactStatus.ACTIVE
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, include_notes: bool = False, 
                include_activities: bool = False) -> Dict[str, Any]:
        """Convert to dictionary with options"""
        data = self.model_dump(by_alias=True)
        
        if not include_notes:
            data.pop("notes", None)
        
        if not include_activities:
            data.pop("activities", None)
        
        # Convert ObjectIds to strings
        if data.get("_id"):
            data["id"] = str(data["_id"])
        
        string_fields = ["company_id", "assigned_to", "owner_id", "created_by", "updated_by"]
        for field in string_fields:
            if data.get(field):
                data[field] = str(data[field])
        
        return data

# Export model and utilities
__all__ = [
    "Contact",
    "ContactType",
    "ContactStatus", 
    "LeadSource",
    "CommunicationPreference",
    "ContactAddress",
    "ContactNote",
    "ContactActivity",
    "SocialMedia"
]