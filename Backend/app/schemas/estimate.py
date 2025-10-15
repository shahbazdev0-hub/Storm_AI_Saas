# # =============================================================================
# # app/schemas/estimate.py
# # =============================================================================
# from typing import Optional, List, Dict, Any
# from datetime import datetime, date
# from pydantic import BaseModel, Field, field_validator, ConfigDict

# from app.models.estimate import EstimateStatus

# # Estimate line item schemas
# class EstimateLineItemBase(BaseModel):
#     """Base estimate line item schema"""
#     model_config = ConfigDict(extra="forbid")
    
#     description: str = Field(..., min_length=1, max_length=500, description="Item description")
#     quantity: float = Field(..., gt=0, description="Quantity")
#     unit: Optional[str] = Field(default="each", max_length=20, description="Unit of measure")
#     unit_price: float = Field(..., ge=0, description="Unit price")
#     sku: Optional[str] = Field(None, max_length=100, description="SKU")
#     category: Optional[str] = Field(None, max_length=100, description="Item category")
#     notes: Optional[str] = Field(None, max_length=500, description="Item notes")

# class EstimateLineItemCreate(EstimateLineItemBase):
#     """Schema for creating estimate line item"""
#     pass

# class EstimateLineItemUpdate(EstimateLineItemBase):
#     """Schema for updating estimate line item"""
#     description: Optional[str] = Field(None, min_length=1, max_length=500, description="Item description")
#     quantity: Optional[float] = Field(None, gt=0, description="Quantity")
#     unit_price: Optional[float] = Field(None, ge=0, description="Unit price")

# class EstimateLineItemResponse(EstimateLineItemBase):
#     """Schema for estimate line item response"""
#     model_config = ConfigDict(from_attributes=True)
    
#     id: str = Field(..., description="Line item ID")
#     total_price: float = Field(..., description="Total price")

# # Base estimate schemas
# class EstimateBase(BaseModel):
#     """Base estimate schema with common fields"""
#     model_config = ConfigDict(
#         str_strip_whitespace=True,
#         validate_assignment=True,
#         extra="forbid"
#     )
    
#     title: Optional[str] = Field(None, min_length=1, max_length=200, description="Estimate title")
#     description: Optional[str] = Field(None, max_length=2000, description="Estimate description")
#     status: Optional[EstimateStatus] = Field(None, description="Estimate status")
    
#     # Pricing
#     tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Tax rate percentage")
#     discount_percentage: Optional[float] = Field(None, ge=0, le=100, description="Discount percentage")
    
#     # Terms
#     valid_until: Optional[date] = Field(None, description="Valid until date")
#     terms_and_conditions: Optional[str] = Field(None, max_length=2000, description="Terms and conditions")
#     payment_terms: Optional[str] = Field(None, max_length=500, description="Payment terms")
    
#     # Custom fields
#     custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom fields")
#     notes: Optional[str] = Field(None, max_length=1000, description="Internal notes")

# # Estimate creation schema
# class EstimateCreate(EstimateBase):
#     """Schema for creating a new estimate"""
#     customer_id: str = Field(..., description="Customer contact ID")
#     title: str = Field(..., min_length=1, max_length=200, description="Estimate title")
#     line_items: List[EstimateLineItemCreate] = Field(..., min_length=1, description="Estimate line items")
    
#     @field_validator("valid_until")
#     @classmethod
#     def validate_valid_until(cls, v):
#         """Ensure valid until date is in the future"""
#         if v and v <= date.today():
#             raise ValueError("Valid until date must be in the future")
#         return v

# # Estimate update schema
# class EstimateUpdate(EstimateBase):
#     """Schema for updating estimate information"""
#     line_items: Optional[List[EstimateLineItemUpdate]] = Field(None, description="Estimate line items")

# # Estimate search schema
# class EstimateSearch(BaseModel):
#     """Schema for estimate search parameters"""
#     model_config = ConfigDict(extra="forbid")
    
#     q: Optional[str] = Field(None, description="Search query")
#     status: Optional[EstimateStatus] = Field(None, description="Status filter")
#     customer_id: Optional[str] = Field(None, description="Customer filter")
#     created_after: Optional[datetime] = Field(None, description="Created after")
#     created_before: Optional[datetime] = Field(None, description="Created before")
#     min_amount: Optional[float] = Field(None, ge=0, description="Minimum amount")
#     max_amount: Optional[float] = Field(None, ge=0, description="Maximum amount")
#     expired: Optional[bool] = Field(None, description="Expired estimates filter")
    
#     # Pagination
#     page: int = Field(default=1, ge=1, description="Page number")
#     size: int = Field(default=25, ge=1, le=100, description="Page size")
    
#     # Sorting
#     sort_by: Optional[str] = Field(default="created_at", description="Sort field")
#     sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# # Response schemas
# class EstimateResponse(EstimateBase):
#     """Schema for estimate response"""
#     model_config = ConfigDict(from_attributes=True)
    
#     id: str = Field(..., description="Estimate ID")
#     company_id: str = Field(..., description="Company ID")
#     customer_id: str = Field(..., description="Customer ID")
#     estimate_number: str = Field(..., description="Estimate number")
    
#     # Required fields
#     title: str = Field(..., description="Estimate title")
#     status: EstimateStatus = Field(..., description="Estimate status")
    
#     # Line items and calculations
#     line_items: List[EstimateLineItemResponse] = Field(..., description="Line items")
#     subtotal: float = Field(..., description="Subtotal")
#     tax_amount: float = Field(..., description="Tax amount")
#     discount_amount: float = Field(..., description="Discount amount")
#     total_amount: float = Field(..., description="Total amount")
    
#     # Communication tracking
#     sent_at: Optional[datetime] = Field(None, description="Sent timestamp")
#     viewed_at: Optional[datetime] = Field(None, description="Viewed timestamp")
#     accepted_at: Optional[datetime] = Field(None, description="Accepted timestamp")
#     declined_at: Optional[datetime] = Field(None, description="Declined timestamp")
    
#     # Files
#     pdf_url: Optional[str] = Field(None, description="PDF URL")
    
#     # System fields
#     created_at: datetime = Field(..., description="Creation timestamp")
#     updated_at: datetime = Field(..., description="Update timestamp")
    
#     # Customer information (populated)
#     customer_name: Optional[str] = Field(None, description="Customer name")
#     customer_email: Optional[str] = Field(None, description="Customer email")

# class EstimateListResponse(BaseModel):
#     """Schema for estimate list response"""
#     model_config = ConfigDict(from_attributes=True)
    
#     estimates: List[EstimateResponse] = Field(..., description="List of estimates")
#     total: int = Field(..., description="Total number of estimates")
#     page: int = Field(..., description="Current page")
#     size: int = Field(..., description="Page size")
#     pages: int = Field(..., description="Total pages")
#     has_next: bool = Field(..., description="Has next page")
#     has_prev: bool = Field(..., description="Has previous page")























































# =============================================================================
# app/schemas/estimate.py
# =============================================================================
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.estimate import EstimateStatus

# Estimate line item schemas
class EstimateLineItemBase(BaseModel):
    """Base estimate line item schema"""
    model_config = ConfigDict(extra="forbid")
    
    description: str = Field(..., min_length=1, max_length=500, description="Item description")
    quantity: float = Field(..., gt=0, description="Quantity")
    unit: Optional[str] = Field(default="each", max_length=20, description="Unit of measure")
    unit_price: float = Field(..., ge=0, description="Unit price")
    sku: Optional[str] = Field(None, max_length=100, description="SKU")
    category: Optional[str] = Field(None, max_length=100, description="Item category")
    notes: Optional[str] = Field(None, max_length=500, description="Item notes")

class EstimateLineItemCreate(EstimateLineItemBase):
    """Schema for creating estimate line item"""
    pass

class EstimateLineItemUpdate(EstimateLineItemBase):
    """Schema for updating estimate line item"""
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Item description")
    quantity: Optional[float] = Field(None, gt=0, description="Quantity")
    unit_price: Optional[float] = Field(None, ge=0, description="Unit price")

class EstimateLineItemResponse(EstimateLineItemBase):
    """Schema for estimate line item response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Line item ID")
    total_price: float = Field(..., description="Total price")

# Base estimate schemas
class EstimateBase(BaseModel):
    """Base estimate schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Estimate title")
    description: Optional[str] = Field(None, max_length=2000, description="Estimate description")
    status: Optional[EstimateStatus] = Field(None, description="Estimate status")
    
    # Pricing
    tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Tax rate percentage")
    discount_percentage: Optional[float] = Field(None, ge=0, le=100, description="Discount percentage")
    
    # Terms
    valid_until: Optional[date] = Field(None, description="Valid until date")
    terms_and_conditions: Optional[str] = Field(None, max_length=2000, description="Terms and conditions")
    payment_terms: Optional[str] = Field(None, max_length=500, description="Payment terms")
    
    # Custom fields
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom fields")
    notes: Optional[str] = Field(None, max_length=1000, description="Internal notes")

# Estimate creation schema
class EstimateCreate(EstimateBase):
    """Schema for creating a new estimate"""
    customer_id: str = Field(..., description="Customer contact ID")
    title: str = Field(..., min_length=1, max_length=200, description="Estimate title")
    line_items: List[EstimateLineItemCreate] = Field(..., min_length=1, description="Estimate line items")
    
    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v):
        """Ensure valid until date is in the future"""
        if v and v <= date.today():
            raise ValueError("Valid until date must be in the future")
        return v

# Estimate update schema
class EstimateUpdate(EstimateBase):
    """Schema for updating estimate information"""
    line_items: Optional[List[EstimateLineItemUpdate]] = Field(None, description="Estimate line items")

# Estimate search schema
class EstimateSearch(BaseModel):
    """Schema for estimate search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    status: Optional[EstimateStatus] = Field(None, description="Status filter")
    customer_id: Optional[str] = Field(None, description="Customer filter")
    created_after: Optional[datetime] = Field(None, description="Created after")
    created_before: Optional[datetime] = Field(None, description="Created before")
    min_amount: Optional[float] = Field(None, ge=0, description="Minimum amount")
    max_amount: Optional[float] = Field(None, ge=0, description="Maximum amount")
    expired: Optional[bool] = Field(None, description="Expired estimates filter")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Response schemas
class EstimateResponse(EstimateBase):
    """Schema for estimate response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Estimate ID")
    company_id: str = Field(..., description="Company ID")
    customer_id: str = Field(..., description="Customer ID")
    estimate_number: str = Field(..., description="Estimate number")
    
    # Required fields
    title: str = Field(..., description="Estimate title")
    status: EstimateStatus = Field(..., description="Estimate status")
    
    # Line items and calculations
    line_items: List[EstimateLineItemResponse] = Field(..., description="Line items")
    subtotal: float = Field(..., description="Subtotal")
    tax_amount: float = Field(..., description="Tax amount")
    discount_amount: float = Field(..., description="Discount amount")
    total_amount: float = Field(..., description="Total amount")
    
    # Communication tracking
    sent_at: Optional[datetime] = Field(None, description="Sent timestamp")
    viewed_at: Optional[datetime] = Field(None, description="Viewed timestamp")
    accepted_at: Optional[datetime] = Field(None, description="Accepted timestamp")
    declined_at: Optional[datetime] = Field(None, description="Declined timestamp")
    
    # Files
    pdf_url: Optional[str] = Field(None, description="PDF URL")
    
    # System fields
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # Customer information (populated)
    customer_name: Optional[str] = Field(None, description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")

class EstimateListResponse(BaseModel):
    """Schema for estimate list response"""
    model_config = ConfigDict(from_attributes=True)
    
    estimates: List[EstimateResponse] = Field(..., description="List of estimates")
    total: int = Field(..., description="Total number of estimates")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

# ---- Backward-compat alias (fixes ImportError in endpoints) ------------------
class Estimate(EstimateResponse):
    """Alias to maintain imports like `from app.schemas.estimate import Estimate`."""
    pass
