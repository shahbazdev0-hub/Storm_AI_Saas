# =============================================================================
# app/models/invoice.py
# =============================================================================
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict
from pydantic_core import core_schema
from enum import Enum
from bson import ObjectId
from app.models.estimate import EstimateLineItem


# ✅ Fixed for Pydantic v2
class PyObjectId(ObjectId):
    """Custom Pydantic-compatible ObjectId for Pydantic v2"""
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler
    ) -> core_schema.CoreSchema:
        """Generate core schema for ObjectId validation"""
        return core_schema.with_info_after_validator_function(
            cls._validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )
    
    @classmethod
    def _validate(cls, value: Any, info=None) -> ObjectId:
        """Validate ObjectId"""
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str):
            if ObjectId.is_valid(value):
                return ObjectId(value)
        raise ValueError(f"Invalid ObjectId: {value}")
    
    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema, handler
    ) -> Dict[str, Any]:
        """Generate JSON schema for ObjectId"""
        json_schema = handler(core_schema)
        json_schema.update(
            type="string",
            format="objectid",
            examples=["507f1f77bcf86cd799439011"]
        )
        return json_schema


class InvoiceStatus(str, Enum):
    """Invoice status"""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    """Payment methods"""
    CASH = "cash"
    CHECK = "check"
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    STRIPE = "stripe"
    OTHER = "other"

class Payment(BaseModel):
    """Payment record"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    
    # External payment data
    stripe_payment_id: Optional[str] = None
    external_reference: Optional[str] = None
    
    recorded_by: PyObjectId
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

class Invoice(BaseModel):
    """Invoice model for MongoDB with Pydantic v2"""
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
    
    # Invoice identification
    invoice_number: Optional[str] = None
    
    # Related entities
    job_id: Optional[PyObjectId] = None
    estimate_id: Optional[PyObjectId] = None
    
    # Basic information
    status: InvoiceStatus = Field(default=InvoiceStatus.DRAFT)
    issue_date: date = Field(default_factory=date.today)
    due_date: date
    
    # Line items and pricing (reuse from estimate)
    line_items: List[EstimateLineItem] = Field(default_factory=list)
    subtotal: float = Field(default=0.0, ge=0)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    tax_amount: float = Field(default=0.0, ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    total_amount: float = Field(default=0.0, ge=0)
    
    # Payment tracking
    amount_paid: float = Field(default=0.0, ge=0)
    amount_due: float = Field(default=0.0, ge=0)
    payments: List[Payment] = Field(default_factory=list)
    
    # Communication
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    
    # Files
    pdf_url: Optional[str] = None
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[PyObjectId] = None
    
    @field_validator("invoice_number", mode="before")
    @classmethod
    def generate_invoice_number(cls, v, info):
        if v is None:
            today = datetime.now().strftime("%Y%m%d")
            import random
            suffix = str(random.randint(1000, 9999))
            return f"INV-{today}-{suffix}"
        return v
    
    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        return (self.status not in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] and 
                date.today() > self.due_date)