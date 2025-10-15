# app/schemas/invoice.py
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.invoice import InvoiceStatus, PaymentMethod

# Payment schemas
class PaymentBase(BaseModel):
    """Base payment schema"""
    model_config = ConfigDict(extra="forbid")
    
    amount: float = Field(..., gt=0, description="Payment amount")
    payment_method: PaymentMethod = Field(..., description="Payment method")
    payment_date: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Payment date")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    notes: Optional[str] = Field(None, max_length=500, description="Payment notes")
    
    # External payment data
    stripe_payment_id: Optional[str] = Field(None, description="Stripe payment ID")
    external_reference: Optional[str] = Field(None, description="External reference")

class PaymentCreate(PaymentBase):
    """Schema for creating payment"""
    pass

class PaymentResponse(PaymentBase):
    """Schema for payment response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Payment ID")
    recorded_by: str = Field(..., description="Recorded by user ID")
    recorded_at: datetime = Field(..., description="Recording timestamp")

# Invoice line item schemas (reuse from estimate)
class InvoiceLineItemBase(BaseModel):
    """Base invoice line item schema"""
    model_config = ConfigDict(extra="forbid")
    
    description: str = Field(..., min_length=1, max_length=500, description="Item description")
    quantity: float = Field(..., gt=0, description="Quantity")
    unit: Optional[str] = Field(default="each", max_length=20, description="Unit of measure")
    unit_price: float = Field(..., ge=0, description="Unit price")
    sku: Optional[str] = Field(None, max_length=100, description="SKU")
    category: Optional[str] = Field(None, max_length=100, description="Item category")
    notes: Optional[str] = Field(None, max_length=500, description="Item notes")

class InvoiceLineItemCreate(InvoiceLineItemBase):
    """Schema for creating invoice line item"""
    pass

class InvoiceLineItemUpdate(InvoiceLineItemBase):
    """Schema for updating invoice line item"""
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Item description")
    quantity: Optional[float] = Field(None, gt=0, description="Quantity")
    unit_price: Optional[float] = Field(None, ge=0, description="Unit price")

class InvoiceLineItemResponse(InvoiceLineItemBase):
    """Schema for invoice line item response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Line item ID")
    total_price: float = Field(..., description="Total price")

# Base invoice schemas
class InvoiceBase(BaseModel):
    """Base invoice schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    status: Optional[InvoiceStatus] = Field(None, description="Invoice status")
    issue_date: Optional[date] = Field(default_factory=date.today, description="Issue date")
    due_date: Optional[date] = Field(None, description="Due date")
    
    # Pricing
    tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Tax rate percentage")
    discount_amount: Optional[float] = Field(None, ge=0, description="Discount amount")
    
    # Notes
    notes: Optional[str] = Field(None, max_length=1000, description="Invoice notes")
    payment_instructions: Optional[str] = Field(None, max_length=500, description="Payment instructions")

# Invoice creation schema
class InvoiceCreate(InvoiceBase):
    """Schema for creating a new invoice"""
    customer_id: str = Field(..., description="Customer contact ID")
    due_date: date = Field(..., description="Due date")
    line_items: List[InvoiceLineItemCreate] = Field(..., min_length=1, description="Invoice line items")
    
    # Optional related entities
    job_id: Optional[str] = Field(None, description="Related job ID")
    estimate_id: Optional[str] = Field(None, description="Related estimate ID")
    
    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v, info):
        """Ensure due date is not in the past"""
        if v and info.data.get("issue_date"):
            issue_date = info.data["issue_date"]
            if v < issue_date:
                raise ValueError("Due date cannot be before issue date")
        return v

# Invoice update schema
class InvoiceUpdate(InvoiceBase):
    """Schema for updating invoice information"""
    line_items: Optional[List[InvoiceLineItemUpdate]] = Field(None, description="Invoice line items")

# Invoice search schema
class InvoiceSearch(BaseModel):
    """Schema for invoice search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    status: Optional[InvoiceStatus] = Field(None, description="Status filter")
    customer_id: Optional[str] = Field(None, description="Customer filter")
    job_id: Optional[str] = Field(None, description="Job filter")
    
    # Date filters
    issue_date_after: Optional[date] = Field(None, description="Issue date after")
    issue_date_before: Optional[date] = Field(None, description="Issue date before")
    due_date_after: Optional[date] = Field(None, description="Due date after")
    due_date_before: Optional[date] = Field(None, description="Due date before")
    
    # Amount filters
    min_amount: Optional[float] = Field(None, ge=0, description="Minimum amount")
    max_amount: Optional[float] = Field(None, ge=0, description="Maximum amount")
    
    # Boolean filters
    overdue: Optional[bool] = Field(None, description="Overdue invoices filter")
    paid: Optional[bool] = Field(None, description="Paid invoices filter")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Invoice payment recording schema
class InvoicePaymentRecord(BaseModel):
    """Schema for recording invoice payment"""
    model_config = ConfigDict(extra="forbid")
    
    amount: float = Field(..., gt=0, description="Payment amount")
    payment_method: PaymentMethod = Field(..., description="Payment method")
    payment_date: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Payment date")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    notes: Optional[str] = Field(None, max_length=500, description="Payment notes")
    
    # External payment data
    stripe_payment_id: Optional[str] = Field(None, description="Stripe payment ID")
    external_reference: Optional[str] = Field(None, description="External reference")

# Response schemas
class InvoiceResponse(InvoiceBase):
    """Schema for invoice response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Invoice ID")
    company_id: str = Field(..., description="Company ID")
    customer_id: str = Field(..., description="Customer ID")
    invoice_number: str = Field(..., description="Invoice number")
    
    # Required fields
    status: InvoiceStatus = Field(..., description="Invoice status")
    issue_date: date = Field(..., description="Issue date")
    due_date: date = Field(..., description="Due date")
    
    # Line items and calculations
    line_items: List[InvoiceLineItemResponse] = Field(..., description="Line items")
    subtotal: float = Field(..., description="Subtotal")
    tax_amount: float = Field(..., description="Tax amount")
    discount_amount: float = Field(..., description="Discount amount")
    total_amount: float = Field(..., description="Total amount")
    
    # Payment tracking
    amount_paid: float = Field(..., description="Amount paid")
    amount_due: float = Field(..., description="Amount due")
    payments: List[PaymentResponse] = Field(default_factory=list, description="Payments")
    
    # Communication tracking
    sent_at: Optional[datetime] = Field(None, description="Sent timestamp")
    viewed_at: Optional[datetime] = Field(None, description="Viewed timestamp")
    
    # Files
    pdf_url: Optional[str] = Field(None, description="PDF URL")
    
    # Computed fields
    is_overdue: bool = Field(..., description="Overdue status")
    days_overdue: Optional[int] = Field(None, description="Days overdue")
    
    # System fields
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # Customer information (populated)
    customer_name: Optional[str] = Field(None, description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")

class InvoiceListResponse(BaseModel):
    """Schema for invoice list response"""
    model_config = ConfigDict(from_attributes=True)
    
    invoices: List[InvoiceResponse] = Field(..., description="List of invoices")
    total: int = Field(..., description="Total number of invoices")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

class InvoiceSummaryResponse(BaseModel):
    """Schema for invoice summary response"""
    model_config = ConfigDict(extra="forbid")
    
    id: str = Field(..., description="Invoice ID")
    invoice_number: str = Field(..., description="Invoice number")
    customer_name: str = Field(..., description="Customer name")
    status: InvoiceStatus = Field(..., description="Invoice status")
    issue_date: date = Field(..., description="Issue date")
    due_date: date = Field(..., description="Due date")
    total_amount: float = Field(..., description="Total amount")
    amount_due: float = Field(..., description="Amount due")
    is_overdue: bool = Field(..., description="Overdue status")

# Invoice status update schema
class InvoiceStatusUpdate(BaseModel):
    """Schema for updating invoice status"""
    model_config = ConfigDict(extra="forbid")
    
    status: InvoiceStatus = Field(..., description="New invoice status")
    notes: Optional[str] = Field(None, max_length=500, description="Status change notes")

# Invoice sending schema
class InvoiceSend(BaseModel):
    """Schema for sending invoice"""
    model_config = ConfigDict(extra="forbid")
    
    email_template: Optional[str] = Field(None, description="Email template to use")
    custom_message: Optional[str] = Field(None, max_length=1000, description="Custom message")
    send_copy_to: Optional[List[str]] = Field(None, description="Additional email recipients")

# Bulk operations schemas
class InvoiceBulkUpdate(BaseModel):
    """Schema for bulk invoice updates"""
    model_config = ConfigDict(extra="forbid")
    
    invoice_ids: List[str] = Field(..., min_length=1, description="Invoice IDs to update")
    updates: InvoiceUpdate = Field(..., description="Update data")

class InvoiceBulkStatusUpdate(BaseModel):
    """Schema for bulk invoice status updates"""
    model_config = ConfigDict(extra="forbid")
    
    invoice_ids: List[str] = Field(..., min_length=1, description="Invoice IDs to update")
    status: InvoiceStatus = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Status change notes")

class InvoiceBulkSend(BaseModel):
    """Schema for bulk invoice sending"""
    model_config = ConfigDict(extra="forbid")
    
    invoice_ids: List[str] = Field(..., min_length=1, description="Invoice IDs to send")
    email_template: Optional[str] = Field(None, description="Email template to use")
    custom_message: Optional[str] = Field(None, max_length=1000, description="Custom message")

# Analytics schemas
class InvoiceAnalytics(BaseModel):
    """Schema for invoice analytics"""
    model_config = ConfigDict(extra="forbid")
    
    total_invoices: int = Field(..., description="Total number of invoices")
    by_status: Dict[str, int] = Field(..., description="Invoices by status")
    total_amount: float = Field(..., description="Total invoice amount")
    amount_paid: float = Field(..., description="Total amount paid")
    amount_outstanding: float = Field(..., description="Total outstanding amount")
    overdue_count: int = Field(..., description="Number of overdue invoices")
    overdue_amount: float = Field(..., description="Total overdue amount")
    average_payment_time: Optional[float] = Field(None, description="Average payment time in days")

class InvoiceOverdueSummary(BaseModel):
    """Schema for overdue invoice summary"""
    model_config = ConfigDict(extra="forbid")
    
    total_overdue: int = Field(..., description="Total overdue invoices")
    total_overdue_amount: float = Field(..., description="Total overdue amount")
    by_age_range: Dict[str, Dict[str, Any]] = Field(..., description="Overdue invoices by age range")
    top_overdue_customers: List[Dict[str, Any]] = Field(..., description="Top overdue customers")

# Export/Import schemas
class InvoiceExport(BaseModel):
    """Schema for invoice export"""
    model_config = ConfigDict(extra="forbid")
    
    format: str = Field(..., pattern="^(csv|xlsx|pdf|json)$", description="Export format")
    fields: List[str] = Field(..., description="Fields to export")
    filters: Optional[InvoiceSearch] = Field(None, description="Export filters")

# Success/Error response schemas
class InvoiceSuccessResponse(BaseModel):
    """Schema for invoice success responses"""
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., description="Success message")
    invoice_id: Optional[str] = Field(None, description="Invoice ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

class InvoiceErrorResponse(BaseModel):
    """Schema for invoice error responses"""
    model_config = ConfigDict(extra="forbid")
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

# Export all schemas
__all__ = [
    # Payment schemas
    "PaymentBase",
    "PaymentCreate",
    "PaymentResponse",
    
    # Line item schemas
    "InvoiceLineItemBase",
    "InvoiceLineItemCreate",
    "InvoiceLineItemUpdate",
    "InvoiceLineItemResponse",
    
    # Base invoice schemas
    "InvoiceBase",
    "InvoiceCreate",
    "InvoiceUpdate",
    "InvoiceSearch",
    
    # Payment recording
    "InvoicePaymentRecord",
    
    # Response schemas
    "InvoiceResponse",
    "InvoiceListResponse",
    "InvoiceSummaryResponse",
    
    # Status and operations
    "InvoiceStatusUpdate",
    "InvoiceSend",
    
    # Bulk operations
    "InvoiceBulkUpdate",
    "InvoiceBulkStatusUpdate",
    "InvoiceBulkSend",
    
    # Analytics schemas
    "InvoiceAnalytics",
    "InvoiceOverdueSummary",
    
    # Export schemas
    "InvoiceExport",
    
    # Response schemas
    "InvoiceSuccessResponse",
    "InvoiceErrorResponse"
]

# Alias for backward compatibility
Invoice = InvoiceResponse
InvoiceCreate = InvoiceCreate
InvoiceUpdate = InvoiceUpdate