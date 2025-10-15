# app/schemas/contact.py
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict

from app.models.contact import (
    ContactType, ContactStatus, LeadSource, CommunicationPreference
)

# Address schemas
class ContactAddressBase(BaseModel):
    """Base contact address schema"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    type: Optional[str] = Field(default="home", description="Address type")
    street: Optional[str] = Field(None, max_length=200, description="Street address")
    street2: Optional[str] = Field(None, max_length=200, description="Apartment/suite")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=50, description="State/province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(default="US", description="Country code")
    is_primary: Optional[bool] = Field(default=False, description="Primary address flag")
    is_service_address: Optional[bool] = Field(default=True, description="Service address flag")
    access_instructions: Optional[str] = Field(None, max_length=500, description="Access instructions")
    gate_code: Optional[str] = Field(None, max_length=50, description="Gate code")

class ContactAddressCreate(ContactAddressBase):
    """Schema for creating contact address"""
    street: str = Field(..., min_length=1, max_length=200, description="Street address")
    city: str = Field(..., min_length=1, max_length=100, description="City")
    state: str = Field(..., min_length=2, max_length=50, description="State/province")
    postal_code: str = Field(..., min_length=3, max_length=20, description="Postal code")

class ContactAddressUpdate(ContactAddressBase):
    """Schema for updating contact address"""
    pass

class ContactAddressResponse(ContactAddressBase):
    """Schema for contact address response"""
    model_config = ConfigDict(from_attributes=True)
    
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")

# Social media schemas
class SocialMediaBase(BaseModel):
    """Base social media schema"""
    model_config = ConfigDict(extra="forbid")
    
    facebook: Optional[str] = Field(None, max_length=200)
    twitter: Optional[str] = Field(None, max_length=200)
    linkedin: Optional[str] = Field(None, max_length=200)
    instagram: Optional[str] = Field(None, max_length=200)
    tiktok: Optional[str] = Field(None, max_length=200)
    youtube: Optional[str] = Field(None, max_length=200)

class SocialMediaUpdate(SocialMediaBase):
    """Schema for updating social media profiles"""
    pass

# Note schemas
class ContactNoteBase(BaseModel):
    """Base contact note schema"""
    model_config = ConfigDict(extra="forbid")
    
    content: str = Field(..., min_length=1, max_length=2000, description="Note content")
    note_type: Optional[str] = Field(default="general", description="Note type")
    is_important: Optional[bool] = Field(default=False, description="Important flag")
    is_customer_visible: Optional[bool] = Field(default=True, description="Customer visible flag")

class ContactNoteCreate(ContactNoteBase):
    """Schema for creating contact note"""
    pass

class ContactNoteResponse(ContactNoteBase):
    """Schema for contact note response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Note ID")
    created_by: str = Field(..., description="Created by user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

# Base contact schemas
class ContactBase(BaseModel):
    """Base contact schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    type: Optional[ContactType] = Field(None, description="Contact type")
    status: Optional[ContactStatus] = Field(None, description="Contact status")
    first_name: Optional[str] = Field(None, min_length=1, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, min_length=1, max_length=50, description="Last name")
    middle_name: Optional[str] = Field(None, max_length=50, description="Middle name")
    title: Optional[str] = Field(None, max_length=100, description="Title (Mr., Mrs., Dr.)")
    job_title: Optional[str] = Field(None, max_length=100, description="Job title")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Primary phone number")
    phone_mobile: Optional[str] = Field(None, description="Mobile phone number")
    phone_work: Optional[str] = Field(None, description="Work phone number")
    company: Optional[str] = Field(None, max_length=100, description="Company name")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    website: Optional[str] = Field(None, description="Website URL")
    
    # Communication preferences
    preferred_contact_method: Optional[CommunicationPreference] = Field(
        None, description="Preferred contact method"
    )
    email_opt_in: Optional[bool] = Field(default=True, description="Email opt-in status")
    sms_opt_in: Optional[bool] = Field(default=True, description="SMS opt-in status")
    marketing_opt_in: Optional[bool] = Field(default=True, description="Marketing opt-in status")
    
    # Lead information
    lead_source: Optional[LeadSource] = Field(None, description="Lead source")
    lead_source_detail: Optional[str] = Field(None, max_length=200, description="Lead source detail")
    referral_source: Optional[str] = Field(None, max_length=200, description="Referral source")
    
    # Assignment
    assigned_to: Optional[str] = Field(None, description="Assigned to user ID")
    
    # Categorization
    tags: Optional[List[str]] = Field(default_factory=list, description="Contact tags")
    categories: Optional[List[str]] = Field(default_factory=list, description="Contact categories")
    
    # Personal information
    spouse_name: Optional[str] = Field(None, max_length=100, description="Spouse name")
    children: Optional[List[str]] = Field(default_factory=list, description="Children names")
    birthday: Optional[datetime] = Field(None, description="Birthday")
    anniversary: Optional[datetime] = Field(None, description="Anniversary")

# Contact creation schema
class ContactCreate(ContactBase):
    """Schema for creating a new contact"""
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    type: ContactType = Field(default=ContactType.LEAD, description="Contact type")
    
    # Optional initial address
    addresses: Optional[List[ContactAddressCreate]] = Field(
        default_factory=list, description="Contact addresses"
    )
    
    # Custom fields
    custom_fields: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Custom fields"
    )
    
    @field_validator("tags", "categories", mode="before")
    @classmethod
    def validate_string_lists(cls, v):
        """Convert comma-separated strings to lists"""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v or []

# Contact update schema
class ContactUpdate(ContactBase):
    """Schema for updating contact information"""
    
    # Custom fields
    custom_fields: Optional[Dict[str, Any]] = Field(None, description="Custom fields")
    
    @field_validator("tags", "categories", mode="before")
    @classmethod
    def validate_string_lists(cls, v):
        """Convert comma-separated strings to lists"""
        if v is None:
            return v
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

# Contact search and filter schemas
class ContactSearch(BaseModel):
    """Schema for contact search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    type: Optional[ContactType] = Field(None, description="Contact type filter")
    status: Optional[ContactStatus] = Field(None, description="Contact status filter")
    tag: Optional[str] = Field(None, description="Tag filter")
    assigned_to: Optional[str] = Field(None, description="Assigned to user filter")
    lead_source: Optional[LeadSource] = Field(None, description="Lead source filter")
    created_after: Optional[datetime] = Field(None, description="Created after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    has_email: Optional[bool] = Field(None, description="Has email filter")
    has_phone: Optional[bool] = Field(None, description="Has phone filter")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Response schemas
class ContactResponse(ContactBase):
    """Schema for contact response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Contact ID")
    company_id: str = Field(..., description="Company ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    type: ContactType = Field(..., description="Contact type")
    status: ContactStatus = Field(..., description="Contact status")
    
    # Computed fields
    full_name: str = Field(..., description="Full name")
    display_name: str = Field(..., description="Display name")
    primary_phone: Optional[str] = Field(None, description="Primary phone number")
    is_active: bool = Field(..., description="Active status")
    can_contact_email: bool = Field(..., description="Can send emails")
    can_contact_sms: bool = Field(..., description="Can send SMS")
    
    # Relationships
    addresses: List[ContactAddressResponse] = Field(default_factory=list, description="Addresses")
    social_media: Optional[SocialMediaBase] = Field(None, description="Social media profiles")
    
    # Interaction tracking
    last_contact: Optional[datetime] = Field(None, description="Last contact timestamp")
    last_contact_type: Optional[str] = Field(None, description="Last contact type")
    next_follow_up: Optional[datetime] = Field(None, description="Next follow-up date")
    
    # Engagement metrics
    email_engagement_score: float = Field(default=0.0, description="Email engagement score")
    sms_engagement_score: float = Field(default=0.0, description="SMS engagement score")
    engagement_score: float = Field(default=0.0, description="Overall engagement score")
    
    # Service history
    total_revenue: float = Field(default=0.0, description="Total revenue")
    job_count: int = Field(default=0, description="Number of jobs")
    invoice_count: int = Field(default=0, description="Number of invoices")
    first_service_date: Optional[datetime] = Field(None, description="First service date")
    last_service_date: Optional[datetime] = Field(None, description="Last service date")
    
    # System fields
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    created_by: Optional[str] = Field(None, description="Created by user ID")

# Contact alias for backward compatibility
class Contact(ContactResponse):
    """Contact schema - alias for ContactResponse"""
    pass

class ContactListResponse(BaseModel):
    """Schema for contact list response"""
    model_config = ConfigDict(from_attributes=True)
    
    contacts: List[ContactResponse] = Field(..., description="List of contacts")
    total: int = Field(..., description="Total number of contacts")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

class ContactSummaryResponse(BaseModel):
    """Schema for contact summary response"""
    model_config = ConfigDict(extra="forbid")
    
    id: str = Field(..., description="Contact ID")
    full_name: str = Field(..., description="Full name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    type: ContactType = Field(..., description="Contact type")
    status: ContactStatus = Field(..., description="Contact status")
    company: Optional[str] = Field(None, description="Company name")
    last_contact: Optional[datetime] = Field(None, description="Last contact timestamp")

# Contact import/export schemas
class ContactImport(BaseModel):
    """Schema for contact import"""
    model_config = ConfigDict(extra="forbid")
    
    file_format: str = Field(..., pattern="^(csv|xlsx|json)$", description="File format")
    mapping: Dict[str, str] = Field(..., description="Field mapping")
    skip_duplicates: bool = Field(default=True, description="Skip duplicate contacts")
    update_existing: bool = Field(default=False, description="Update existing contacts")

class ContactExport(BaseModel):
    """Schema for contact export"""
    model_config = ConfigDict(extra="forbid")
    
    format: str = Field(..., pattern="^(csv|xlsx|json)$", description="Export format")
    fields: List[str] = Field(..., description="Fields to export")
    filters: Optional[ContactSearch] = Field(None, description="Export filters")

# Bulk operations schemas
class ContactBulkUpdate(BaseModel):
    """Schema for bulk contact updates"""
    model_config = ConfigDict(extra="forbid")
    
    contact_ids: List[str] = Field(..., min_length=1, description="Contact IDs to update")
    updates: ContactUpdate = Field(..., description="Update data")

class ContactBulkDelete(BaseModel):
    """Schema for bulk contact deletion"""
    model_config = ConfigDict(extra="forbid")
    
    contact_ids: List[str] = Field(..., min_length=1, description="Contact IDs to delete")
    permanent: bool = Field(default=False, description="Permanent deletion flag")

class ContactBulkTag(BaseModel):
    """Schema for bulk contact tagging"""
    model_config = ConfigDict(extra="forbid")
    
    contact_ids: List[str] = Field(..., min_length=1, description="Contact IDs to tag")
    tags: List[str] = Field(..., min_length=1, description="Tags to add/remove")
    action: str = Field(..., pattern="^(add|remove)$", description="Tag action")

class ContactBulkAssign(BaseModel):
    """Schema for bulk contact assignment"""
    model_config = ConfigDict(extra="forbid")
    
    contact_ids: List[str] = Field(..., min_length=1, description="Contact IDs to assign")
    assigned_to: str = Field(..., description="User ID to assign to")

# Contact activity schemas
class ContactActivityCreate(BaseModel):
    """Schema for creating contact activity"""
    model_config = ConfigDict(extra="forbid")
    
    activity_type: str = Field(..., description="Activity type")
    description: str = Field(..., min_length=1, max_length=500, description="Activity description")
    related_entity_type: Optional[str] = Field(None, description="Related entity type")
    related_entity_id: Optional[str] = Field(None, description="Related entity ID")
    data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Activity data")

class ContactActivityResponse(BaseModel):
    """Schema for contact activity response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Activity ID")
    activity_type: str = Field(..., description="Activity type")
    description: str = Field(..., description="Activity description")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: Optional[str] = Field(None, description="Created by user ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Activity data")

# Contact merge schemas
class ContactMerge(BaseModel):
    """Schema for merging contacts"""
    model_config = ConfigDict(extra="forbid")
    
    primary_contact_id: str = Field(..., description="Primary contact ID to keep")
    duplicate_contact_ids: List[str] = Field(..., min_length=1, description="Duplicate contact IDs to merge")
    field_preferences: Optional[Dict[str, str]] = Field(
        None, description="Field preferences for merged data"
    )

# Contact communication schemas
class ContactCommunication(BaseModel):
    """Schema for contact communication"""
    model_config = ConfigDict(extra="forbid")
    
    type: str = Field(..., pattern="^(email|sms|call)$", description="Communication type")
    subject: Optional[str] = Field(None, max_length=200, description="Subject line")
    content: str = Field(..., min_length=1, description="Message content")
    template_id: Optional[str] = Field(None, description="Template ID")
    send_immediately: bool = Field(default=True, description="Send immediately flag")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled send time")

# Contact preferences schemas
class ContactPreferencesUpdate(BaseModel):
    """Schema for updating contact communication preferences"""
    model_config = ConfigDict(extra="forbid")
    
    preferred_contact_method: Optional[CommunicationPreference] = None
    communication_preferences: Optional[List[CommunicationPreference]] = None
    email_opt_in: Optional[bool] = None
    sms_opt_in: Optional[bool] = None
    marketing_opt_in: Optional[bool] = None

# Analytics schemas
class ContactAnalytics(BaseModel):
    """Schema for contact analytics"""
    model_config = ConfigDict(extra="forbid")
    
    total_contacts: int = Field(..., description="Total number of contacts")
    by_type: Dict[str, int] = Field(..., description="Contacts by type")
    by_status: Dict[str, int] = Field(..., description="Contacts by status")
    by_source: Dict[str, int] = Field(..., description="Contacts by lead source")
    recent_additions: int = Field(..., description="Recently added contacts")
    engagement_stats: Dict[str, float] = Field(..., description="Engagement statistics")

# Success/Error response schemas
class ContactSuccessResponse(BaseModel):
    """Schema for contact success responses"""
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., description="Success message")
    contact_id: Optional[str] = Field(None, description="Contact ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

class ContactErrorResponse(BaseModel):
    """Schema for contact error responses"""
    model_config = ConfigDict(extra="forbid")
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

# Export all schemas
__all__ = [
    # Address schemas
    "ContactAddressBase",
    "ContactAddressCreate",
    "ContactAddressUpdate", 
    "ContactAddressResponse",
    
    # Social media schemas
    "SocialMediaBase",
    "SocialMediaUpdate",
    
    # Note schemas
    "ContactNoteBase",
    "ContactNoteCreate",
    "ContactNoteResponse",
    
    # Base contact schemas
    "ContactBase",
    "ContactCreate",
    "ContactUpdate",
    "ContactSearch",
    
    # Response schemas
    "Contact",  # ✅ Added Contact alias
    "ContactResponse",
    "ContactListResponse",
    "ContactSummaryResponse",
    
    # Import/Export schemas
    "ContactImport",
    "ContactExport",
    
    # Bulk operations
    "ContactBulkUpdate",
    "ContactBulkDelete",
    "ContactBulkTag",
    "ContactBulkAssign",
    
    # Activity schemas
    "ContactActivityCreate",
    "ContactActivityResponse",
    
    # Merge schemas
    "ContactMerge",
    
    # Communication schemas
    "ContactCommunication",
    "ContactPreferencesUpdate",
    
    # Analytics schemas
    "ContactAnalytics",
    
    # Response schemas
    "ContactSuccessResponse",
    "ContactErrorResponse"
]