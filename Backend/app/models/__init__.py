# =============================================================================
# app/models/__init__.py
# =============================================================================
"""
Database models for AI-Enhanced SaaS CRM

This module contains all MongoDB document models using Pydantic v2.
All models are designed to work with Motor (async MongoDB driver).
"""

# Import all models
from .user import (
    User, UserRole, UserStatus, UserPermission, 
    UserPreferences, UserProfile, PyObjectId,
    ROLE_PERMISSIONS, get_default_permissions
)

from .company import (
    Company, CompanyStatus, SubscriptionPlan, CompanyIndustry,
    CompanySize, BusinessHours, CompanyAddress, CompanySettings,
    AISettings, BillingInfo, PLAN_LIMITS, INDUSTRY_DEFAULTS,
    get_plan_limits, get_industry_defaults
)

from .contact import (
    Contact, ContactType, ContactStatus, LeadSource,
    CommunicationPreference, ContactAddress, ContactNote,
    ContactActivity, SocialMedia
)

from .lead import (
    Lead, LeadStatus, LeadPriority, LeadQuality, LeadStage,
    ServiceType, LeadInteraction, LeadNote, LeadScoring,
    PIPELINE_STAGES
)

from .job import (
    Job, JobStatus, JobPriority, JobType, RecurrencePattern,
    JobAddress, JobMaterial, JobPhoto, JobNote, JobTimeTracking,
    JobRecurrence, JOB_STATUS_WORKFLOW, can_transition_to_status
)

from .estimate import (
    Estimate, EstimateStatus, EstimateLineItem
)

from .invoice import (
    Invoice, InvoiceStatus, PaymentMethod, Payment
)

from .ai_flow import (
    AIFlow, FlowTrigger, ActionType, FlowCondition,
    FlowAction, FlowExecution
)

from .campaign import (
    Campaign, CampaignType, CampaignStatus, CampaignTargeting,
    CampaignMessage, CampaignMetrics
)

# Version information
__version__ = "1.0.0"

# Export all models for easy import
__all__ = [
    # Base utilities
    "PyObjectId",
    
    # User models
    "User", "UserRole", "UserStatus", "UserPermission", 
    "UserPreferences", "UserProfile", "ROLE_PERMISSIONS", 
    "get_default_permissions",
    
    # Company models
    "Company", "CompanyStatus", "SubscriptionPlan", "CompanyIndustry",
    "CompanySize", "BusinessHours", "CompanyAddress", "CompanySettings",
    "AISettings", "BillingInfo", "PLAN_LIMITS", "INDUSTRY_DEFAULTS",
    "get_plan_limits", "get_industry_defaults",
    
    # Contact models
    "Contact", "ContactType", "ContactStatus", "LeadSource",
    "CommunicationPreference", "ContactAddress", "ContactNote",
    "ContactActivity", "SocialMedia",
    
    # Lead models
    "Lead", "LeadStatus", "LeadPriority", "LeadQuality", "LeadStage",
    "ServiceType", "LeadInteraction", "LeadNote", "LeadScoring",
    "PIPELINE_STAGES",
    
    # Job models
    "Job", "JobStatus", "JobPriority", "JobType", "RecurrencePattern",
    "JobAddress", "JobMaterial", "JobPhoto", "JobNote", "JobTimeTracking",
    "JobRecurrence", "JOB_STATUS_WORKFLOW", "can_transition_to_status",
    
    # Financial models
    "Estimate", "EstimateStatus", "EstimateLineItem",
    "Invoice", "InvoiceStatus", "PaymentMethod", "Payment",
    
    # AI models
    "AIFlow", "FlowTrigger", "ActionType", "FlowCondition",
    "FlowAction", "FlowExecution",
    
    # Marketing models
    "Campaign", "CampaignType", "CampaignStatus", "CampaignTargeting",
    "CampaignMessage", "CampaignMetrics",
]

# Model registry for dynamic access
MODEL_REGISTRY = {
    "user": User,
    "company": Company,
    "contact": Contact,
    "lead": Lead,
    "job": Job,
    "estimate": Estimate,
    "invoice": Invoice,
    "ai_flow": AIFlow,
    "campaign": Campaign,
}

def get_model_class(model_name: str):
    """Get model class by name"""
    return MODEL_REGISTRY.get(model_name.lower())

def list_models():
    """List all available models"""
    return list(MODEL_REGISTRY.keys())

# Collection names mapping
COLLECTION_NAMES = {
    User: "users",
    Company: "companies", 
    Contact: "contacts",
    Lead: "leads",
    Job: "jobs",
    Estimate: "estimates",
    Invoice: "invoices",
    AIFlow: "ai_flows",
    Campaign: "campaigns",
}

def get_collection_name(model_class):
    """Get MongoDB collection name for model class"""
    return COLLECTION_NAMES.get(model_class, model_class.__name__.lower() + "s")