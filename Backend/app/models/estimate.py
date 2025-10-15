# =============================================================================
# app/models/estimate.py
# =============================================================================
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId
from .job import JobMaterial

class EstimateStatus(str, Enum):
    """Estimate status"""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    REVISED = "revised"

class EstimateLineItem(BaseModel):
    """Estimate line item"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    description: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="each")
    unit_price: float = Field(..., ge=0)
    total_price: float = Field(..., ge=0)
    
    # Optional fields
    sku: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator("total_price", mode="before")
    @classmethod
    def calculate_total(cls, v, info):
        """Auto-calculate total if not provided"""
        if info.data:
            quantity = info.data.get("quantity", 0)
            unit_price = info.data.get("unit_price", 0)
            return quantity * unit_price
        return v

class Estimate(BaseModel):
    """Estimate model for MongoDB with Pydantic v2"""
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
    
    # Estimate identification
    estimate_number: Optional[str] = None
    
    # Related entities
    lead_id: Optional[PyObjectId] = None
    
    # Basic information
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: EstimateStatus = Field(default=EstimateStatus.DRAFT)
    
    # Line items and pricing
    line_items: List[EstimateLineItem] = Field(default_factory=list)
    subtotal: float = Field(default=0.0, ge=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    tax_amount: float = Field(default=0.0, ge=0)
    discount_percentage: float = Field(default=0.0, ge=0, le=100)
    discount_amount: float = Field(default=0.0, ge=0)
    total_amount: float = Field(default=0.0, ge=0)
    
    # Validity and terms
    valid_until: Optional[date] = None
    terms_and_conditions: Optional[str] = None
    payment_terms: Optional[str] = None
    
    # Communication tracking
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    
    # Files and documents
    pdf_url: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    updated_by: Optional[PyObjectId] = None
    
    # Custom fields
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    
    @field_validator("estimate_number", mode="before")
    @classmethod
    def generate_estimate_number(cls, v, info):
        if v is None:
            today = datetime.now().strftime("%Y%m%d")
            import random
            suffix = str(random.randint(1000, 9999))
            return f"EST-{today}-{suffix}"
        return v
    
    def calculate_totals(self) -> None:
        """Calculate estimate totals"""
        self.subtotal = sum(item.total_price for item in self.line_items)
        self.discount_amount = self.subtotal * (self.discount_percentage / 100)
        taxable_amount = self.subtotal - self.discount_amount
        self.tax_amount = taxable_amount * (self.tax_rate / 100)
        self.total_amount = taxable_amount + self.tax_amount
        self.updated_at = datetime.utcnow()
