# app/models/company.py
from typing import Optional, List, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field, EmailStr, HttpUrl, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId

class CompanyStatus(str, Enum):
    """Company status"""
    ACTIVE = "active"
    TRIAL = "trial"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    PENDING = "pending"

class SubscriptionPlan(str, Enum):
    """Subscription plans"""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

class CompanyIndustry(str, Enum):
    """Company industries"""
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

class CompanySize(str, Enum):
    """Company size categories"""
    SOLO = "solo"           # 1 person
    SMALL = "small"         # 2-10 people
    MEDIUM = "medium"       # 11-50 people
    LARGE = "large"         # 51-200 people
    ENTERPRISE = "enterprise"  # 200+ people

class BusinessHours(BaseModel):
    """Business hours configuration"""
    model_config = ConfigDict(extra="allow")
    
    monday: Dict[str, str] = Field(default={"open": "09:00", "close": "17:00", "closed": False})
    tuesday: Dict[str, str] = Field(default={"open": "09:00", "close": "17:00", "closed": False})
    wednesday: Dict[str, str] = Field(default={"open": "09:00", "close": "17:00", "closed": False})
    thursday: Dict[str, str] = Field(default={"open": "09:00", "close": "17:00", "closed": False})
    friday: Dict[str, str] = Field(default={"open": "09:00", "close": "17:00", "closed": False})
    saturday: Dict[str, str] = Field(default={"open": "09:00", "close": "15:00", "closed": False})
    sunday: Dict[str, str] = Field(default={"open": "10:00", "close": "14:00", "closed": True})
    timezone: str = Field(default="UTC")
    
    @field_validator("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", mode="before")
    @classmethod
    def validate_day_hours(cls, v):
        """Validate day hours format"""
        if isinstance(v, dict):
            if v.get("closed", False):
                return {"closed": True}
            
            # Validate time format
            open_time = v.get("open", "09:00")
            close_time = v.get("close", "17:00")
            
            import re
            time_pattern = r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
            
            if not re.match(time_pattern, open_time):
                raise ValueError(f"Invalid open time format: {open_time}")
            
            if not re.match(time_pattern, close_time):
                raise ValueError(f"Invalid close time format: {close_time}")
            
            return {"open": open_time, "close": close_time, "closed": False}
        
        return v

class CompanyAddress(BaseModel):
    """Company address"""
    model_config = ConfigDict(extra="allow")
    
    street: Optional[str] = None
    street2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = Field(default="US")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v):
        """Validate latitude range"""
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v
    
    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v):
        """Validate longitude range"""
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v

class CompanySettings(BaseModel):
    """Company settings and preferences"""
    model_config = ConfigDict(extra="allow")
    
    # General settings
    timezone: str = Field(default="UTC")
    currency: str = Field(default="USD")
    date_format: str = Field(default="MM/DD/YYYY")
    time_format: str = Field(default="12h")
    first_day_of_week: int = Field(default=0, ge=0, le=6)  # 0 = Sunday
    
    # Business settings
    business_hours: BusinessHours = Field(default_factory=BusinessHours)
    service_radius_miles: Optional[float] = Field(None, ge=0)
    travel_time_buffer_minutes: int = Field(default=15, ge=0)
    default_job_duration_minutes: int = Field(default=60, ge=15)
    
    # Financial settings
    tax_rate_percentage: float = Field(default=0.0, ge=0, le=100)
    payment_terms_days: int = Field(default=30, ge=0)
    late_fee_percentage: float = Field(default=0.0, ge=0, le=100)
    discount_percentage: float = Field(default=0.0, ge=0, le=100)
    
    # Notification settings
    email_notifications: bool = Field(default=True)
    sms_notifications: bool = Field(default=True)
    job_reminders: bool = Field(default=True)
    payment_reminders: bool = Field(default=True)
    overdue_notifications: bool = Field(default=True)
    
    # Automation settings
    auto_send_estimates: bool = Field(default=False)
    auto_send_invoices: bool = Field(default=False)
    auto_follow_up_days: int = Field(default=3, ge=0)
    auto_create_recurring_jobs: bool = Field(default=True)
    
    # Custom fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Branding
    logo_url: Optional[str] = None
    primary_color: str = Field(default="#3B82F6")
    secondary_color: str = Field(default="#1F2937")
    
    @field_validator("primary_color", "secondary_color")
    @classmethod
    def validate_color(cls, v):
        """Validate hex color format"""
        import re
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError("Color must be a valid hex color (e.g., #FF0000)")
        return v

class AISettings(BaseModel):
    """AI and automation settings"""
    model_config = ConfigDict(extra="allow")
    
    # AI Features
    enable_lead_scoring: bool = Field(default=True)
    enable_sms_automation: bool = Field(default=True)
    enable_email_automation: bool = Field(default=True)
    enable_churn_prediction: bool = Field(default=True)
    enable_price_optimization: bool = Field(default=False)
    
    # SMS Automation
    sms_response_tone: str = Field(default="friendly")  # friendly, professional, casual
    sms_auto_respond: bool = Field(default=True)
    sms_business_hours_only: bool = Field(default=True)
    sms_max_auto_responses: int = Field(default=3, ge=1, le=10)
    
    # Lead Scoring
    lead_scoring_model: str = Field(default="default")
    lead_score_threshold_hot: int = Field(default=80, ge=0, le=100)
    lead_score_threshold_warm: int = Field(default=60, ge=0, le=100)
    lead_score_threshold_cold: int = Field(default=40, ge=0, le=100)
    
    # Email Automation
    email_signature: Optional[str] = None
    email_template_style: str = Field(default="modern")
    auto_follow_up_enabled: bool = Field(default=True)
    follow_up_sequence_days: List[int] = Field(default=[1, 3, 7, 14])
    
    # AI Model Configuration
    ai_model_provider: str = Field(default="openai")  # openai, anthropic
    ai_model_name: str = Field(default="gpt-3.5-turbo")
    ai_temperature: float = Field(default=0.7, ge=0, le=2)
    ai_max_tokens: int = Field(default=150, ge=50, le=1000)
    
    # Custom AI Prompts
    custom_prompts: Dict[str, str] = Field(default_factory=dict)

class BillingInfo(BaseModel):
    """Billing information"""
    model_config = ConfigDict(extra="allow")
    
    # Subscription
    plan: SubscriptionPlan = Field(default=SubscriptionPlan.FREE)
    plan_started_at: Optional[datetime] = None
    plan_expires_at: Optional[datetime] = None
    auto_renew: bool = Field(default=True)
    
    # Usage limits
    monthly_sms_limit: int = Field(default=100)
    monthly_email_limit: int = Field(default=1000)
    user_limit: int = Field(default=1)
    storage_limit_gb: int = Field(default=1)
    
    # Usage tracking
    monthly_sms_used: int = Field(default=0)
    monthly_email_used: int = Field(default=0)
    current_users: int = Field(default=1)
    storage_used_gb: float = Field(default=0.0)
    
    # Payment
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    
    # Billing address
    billing_name: Optional[str] = None
    billing_email: Optional[EmailStr] = None
    billing_address: Optional[CompanyAddress] = None
    
    # Invoice preferences
    billing_cycle: str = Field(default="monthly")  # monthly, yearly
    next_billing_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    last_payment_amount: Optional[float] = None

class Company(BaseModel):
    """Company model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str = Field(..., min_length=1, max_length=100, description="Company name")
    slug: Optional[str] = Field(None, description="URL-friendly company identifier")
    
    # Basic information
    industry: CompanyIndustry = Field(default=CompanyIndustry.OTHER)
    company_size: CompanySize = Field(default=CompanySize.SOLO)
    description: Optional[str] = Field(None, max_length=500)
    website: Optional[HttpUrl] = None
    
    # Contact information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[CompanyAddress] = None
    
    # Status and subscription
    status: CompanyStatus = Field(default=CompanyStatus.TRIAL)
    billing_info: BillingInfo = Field(default_factory=BillingInfo)
    
    # Configuration
    settings: CompanySettings = Field(default_factory=CompanySettings)
    ai_settings: AISettings = Field(default_factory=AISettings)
    
    # API and integrations
    api_key: Optional[str] = Field(None, description="API key for integrations")
    api_key_created_at: Optional[datetime] = None
    webhook_url: Optional[HttpUrl] = None
    webhook_secret: Optional[str] = None
    
    # Feature flags
    features_enabled: List[str] = Field(default_factory=list)
    beta_features: List[str] = Field(default_factory=list)
    
    # Onboarding
    onboarding_completed: bool = Field(default=False)
    onboarding_step: int = Field(default=0)
    setup_wizard_completed: bool = Field(default=False)
    
    # Owner information
    owner_id: Optional[PyObjectId] = None
    created_by: Optional[PyObjectId] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    
    # Trial information
    trial_started_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    trial_extended: bool = Field(default=False)
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v, info):
        """Generate slug from company name if not provided"""
        if v is None and info.data.get("name"):
            import re
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', info.data["name"].lower()).strip('-')
            return slug[:50]  # Limit length
        return v
    
    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format"""
        if v is None:
            return v
        
        import re
        phone_digits = re.sub(r'\D', '', str(v))
        
        if not (10 <= len(phone_digits) <= 15):
            raise ValueError("Phone number must be 10-15 digits")
        
        return phone_digits
    
    @property
    def is_active(self) -> bool:
        """Check if company is active"""
        return (self.status == CompanyStatus.ACTIVE and 
                not self.deleted_at)
    
    @property
    def is_trial(self) -> bool:
        """Check if company is in trial"""
        return self.status == CompanyStatus.TRIAL
    
    @property
    def is_trial_expired(self) -> bool:
        """Check if trial has expired"""
        if not self.trial_ends_at:
            return False
        return datetime.utcnow() > self.trial_ends_at
    
    @property
    def days_until_trial_expiry(self) -> Optional[int]:
        """Get days until trial expires"""
        if not self.trial_ends_at:
            return None
        
        delta = self.trial_ends_at - datetime.utcnow()
        return max(0, delta.days)
    
    @property
    def subscription_active(self) -> bool:
        """Check if subscription is active"""
        if self.billing_info.plan == SubscriptionPlan.FREE:
            return True
        
        if not self.billing_info.plan_expires_at:
            return True  # Lifetime or no expiry
        
        return datetime.utcnow() < self.billing_info.plan_expires_at
    
    @property
    def can_use_ai_features(self) -> bool:
        """Check if company can use AI features"""
        if self.billing_info.plan in [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.ENTERPRISE, SubscriptionPlan.CUSTOM]:
            return True
        
        return "ai_features" in self.features_enabled
    
    @property
    def sms_limit_reached(self) -> bool:
        """Check if SMS limit is reached"""
        return self.billing_info.monthly_sms_used >= self.billing_info.monthly_sms_limit
    
    @property
    def email_limit_reached(self) -> bool:
        """Check if email limit is reached"""
        return self.billing_info.monthly_email_used >= self.billing_info.monthly_email_limit
    
    @property
    def user_limit_reached(self) -> bool:
        """Check if user limit is reached"""
        return self.billing_info.current_users >= self.billing_info.user_limit
    
    def increment_sms_usage(self, count: int = 1) -> bool:
        """Increment SMS usage and return if within limit"""
        if self.billing_info.monthly_sms_used + count > self.billing_info.monthly_sms_limit:
            return False
        
        self.billing_info.monthly_sms_used += count
        self.updated_at = datetime.utcnow()
        return True
    
    def increment_email_usage(self, count: int = 1) -> bool:
        """Increment email usage and return if within limit"""
        if self.billing_info.monthly_email_used + count > self.billing_info.monthly_email_limit:
            return False
        
        self.billing_info.monthly_email_used += count
        self.updated_at = datetime.utcnow()
        return True
    
    def reset_monthly_usage(self) -> None:
        """Reset monthly usage counters"""
        self.billing_info.monthly_sms_used = 0
        self.billing_info.monthly_email_used = 0
        self.updated_at = datetime.utcnow()
    
    def enable_feature(self, feature: str) -> None:
        """Enable a feature for the company"""
        if feature not in self.features_enabled:
            self.features_enabled.append(feature)
            self.updated_at = datetime.utcnow()
    
    def disable_feature(self, feature: str) -> None:
        """Disable a feature for the company"""
        if feature in self.features_enabled:
            self.features_enabled.remove(feature)
            self.updated_at = datetime.utcnow()
    
    def has_feature(self, feature: str) -> bool:
        """Check if company has a specific feature enabled"""
        return feature in self.features_enabled
    
    def extend_trial(self, days: int = 30) -> None:
        """Extend trial period"""
        if not self.trial_ends_at:
            self.trial_ends_at = datetime.utcnow()
        
        from datetime import timedelta
        self.trial_ends_at += timedelta(days=days)
        self.trial_extended = True
        self.updated_at = datetime.utcnow()
    
    def start_trial(self, duration_days: int = 30) -> None:
        """Start trial period"""
        from datetime import timedelta
        self.trial_started_at = datetime.utcnow()
        self.trial_ends_at = datetime.utcnow() + timedelta(days=duration_days)
        self.status = CompanyStatus.TRIAL
        self.updated_at = datetime.utcnow()
    
    def upgrade_plan(self, plan: SubscriptionPlan) -> None:
        """Upgrade subscription plan"""
        self.billing_info.plan = plan
        self.status = CompanyStatus.ACTIVE
        self.updated_at = datetime.utcnow()
        
        # Update limits based on plan
        plan_limits = get_plan_limits(plan)
        for key, value in plan_limits.items():
            setattr(self.billing_info, key, value)
    
    def soft_delete(self) -> None:
        """Soft delete company"""
        self.deleted_at = datetime.utcnow()
        self.status = CompanyStatus.CANCELLED
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft-deleted company"""
        self.deleted_at = None
        self.status = CompanyStatus.ACTIVE
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, exclude_sensitive: bool = True) -> Dict[str, Any]:
        """Convert to dictionary, optionally excluding sensitive data"""
        data = self.model_dump(by_alias=True)
        
        if exclude_sensitive:
            sensitive_fields = [
                "api_key",
                "webhook_secret", 
                "billing_info.stripe_customer_id",
                "billing_info.stripe_subscription_id",
                "billing_info.payment_method_id"
            ]
            for field in sensitive_fields:
                keys = field.split(".")
                current = data
                for key in keys[:-1]:
                    current = current.get(key, {})
                current.pop(keys[-1], None)
        
        # Convert ObjectId to string
        if data.get("_id"):
            data["id"] = str(data["_id"])
        
        return data

# Plan limits configuration
PLAN_LIMITS = {
    SubscriptionPlan.FREE: {
        "monthly_sms_limit": 25,
        "monthly_email_limit": 100,
        "user_limit": 1,
        "storage_limit_gb": 1,
    },
    SubscriptionPlan.STARTER: {
        "monthly_sms_limit": 500,
        "monthly_email_limit": 2000,
        "user_limit": 3,
        "storage_limit_gb": 5,
    },
    SubscriptionPlan.PROFESSIONAL: {
        "monthly_sms_limit": 2000,
        "monthly_email_limit": 10000,
        "user_limit": 10,
        "storage_limit_gb": 25,
    },
    SubscriptionPlan.ENTERPRISE: {
        "monthly_sms_limit": 10000,
        "monthly_email_limit": 50000,
        "user_limit": 50,
        "storage_limit_gb": 100,
    },
    SubscriptionPlan.CUSTOM: {
        "monthly_sms_limit": 50000,
        "monthly_email_limit": 200000,
        "user_limit": 200,
        "storage_limit_gb": 500,
    }
}

def get_plan_limits(plan: SubscriptionPlan) -> Dict[str, Any]:
    """Get limits for a subscription plan"""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[SubscriptionPlan.FREE])

# Industry-specific settings
INDUSTRY_DEFAULTS = {
    CompanyIndustry.PEST_CONTROL: {
        "service_types": ["General Pest Control", "Termite Treatment", "Rodent Control", "Bed Bug Treatment"],
        "default_job_duration": 60,
        "requires_licensing": True,
    },
    CompanyIndustry.LAWN_CARE: {
        "service_types": ["Mowing", "Fertilization", "Weed Control", "Aeration", "Seeding"],
        "default_job_duration": 45,
        "seasonal": True,
    },
    CompanyIndustry.HVAC: {
        "service_types": ["Installation", "Repair", "Maintenance", "Inspection"],
        "default_job_duration": 120,
        "requires_licensing": True,
    },
    CompanyIndustry.PLUMBING: {
        "service_types": ["Repair", "Installation", "Drain Cleaning", "Water Heater Service"],
        "default_job_duration": 90,
        "requires_licensing": True,
    },
    CompanyIndustry.ROOFING: {
        "service_types": ["Repair", "Replacement", "Inspection", "Maintenance"],
        "default_job_duration": 240,
        "weather_dependent": True,
    }
}

def get_industry_defaults(industry: CompanyIndustry) -> Dict[str, Any]:
    """Get default settings for an industry"""
    return INDUSTRY_DEFAULTS.get(industry, {})

# Export model and utilities
__all__ = [
    "Company",
    "CompanyStatus",
    "SubscriptionPlan", 
    "CompanyIndustry",
    "CompanySize",
    "BusinessHours",
    "CompanyAddress",
    "CompanySettings",
    "AISettings",
    "BillingInfo",
    "PLAN_LIMITS",
    "INDUSTRY_DEFAULTS",
    "get_plan_limits",
    "get_industry_defaults"
]