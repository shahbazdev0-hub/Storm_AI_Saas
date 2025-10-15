# backend/app/schemas/customer_portal.py
from pydantic import BaseModel, Field
from typing import List, Optional

# ---------- Dashboard ----------

class CustomerProfile(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UpcomingAppointment(BaseModel):
    id: str
    date: str
    time: str
    service_type: str
    technician_name: str
    technician_phone: Optional[str] = None
    status: str
    special_instructions: Optional[str] = None

class RecentService(BaseModel):
    id: str
    service_type: str
    completion_date: str
    technician_name: str
    rating: Optional[float] = None
    notes: Optional[str] = None
    photos: List[str] = []

class InvoiceSummary(BaseModel):
    id: str
    number: str
    date: str
    amount_due: float
    status: str
    due_date: Optional[str] = None

class Notification(BaseModel):
    id: str
    type: str
    message: str
    date: str
    read: bool = False

class SatisfactionScores(BaseModel):
    overall: Optional[float] = None
    last_90_days: Optional[float] = None

class CustomerDashboardResponse(BaseModel):
    customer: CustomerProfile
    upcoming_appointments: List[UpcomingAppointment] = []
    recent_services: List[RecentService] = []
    outstanding_invoices: List[InvoiceSummary] = []
    service_agreement: Optional[str] = None
    notifications: List[Notification] = []
    satisfaction_scores: Optional[SatisfactionScores] = None

# ---------- Service History ----------

class WarrantyInfo(BaseModel):
    warranty_period: Optional[int] = None
    warranty_type: Optional[str] = None
    expiration_date: Optional[str] = None

class ServiceHistoryInvoice(BaseModel):
    id: str
    number: str
    amount: float
    status: str

class ServiceHistoryItem(BaseModel):
    id: str
    date: str
    service_type: str
    duration: Optional[str] = None
    technician_name: Optional[str] = None
    before_photos: List[str] = []
    after_photos: List[str] = []
    customer_rating: Optional[float] = None
    customer_feedback: Optional[str] = None
    technician_notes: Optional[str] = None
    warranty_info: Optional[WarrantyInfo] = None
    invoice: ServiceHistoryInvoice

class ServiceHistoryResponse(BaseModel):
    items: List[ServiceHistoryItem]

class ServiceHistoryFiltersResponse(BaseModel):
    service_types: List[str] = []
    technicians: List[str] = []
    ratings: List[int] = [1,2,3,4,5]
    date_ranges: List[str] = ["last_30_days", "last_90_days", "this_year"]

# ---------- Invoice & Payments ----------

class InvoiceLineItem(BaseModel):
    id: str
    description: str
    quantity: float
    unit_price: float
    total: float

class CompanyInfo(BaseModel):
    name: str
    address: str
    phone: str
    email: str
    logo_url: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    number: str
    date: str
    due_date: Optional[str]
    subtotal: float
    tax: float
    total: float
    amount_due: float
    status: str
    line_items: List[InvoiceLineItem]
    payment_methods: List[str]
    payment_instructions: str
    company_info: CompanyInfo

class PaymentMethodsResponse(BaseModel):
    methods: List[str]

class PaymentRequest(BaseModel):
    method: str
    token: Optional[str] = None          # e.g., Stripe payment method id
    last4: Optional[str] = None
    brand: Optional[str] = None
    save_card: Optional[bool] = False

class PaymentResult(BaseModel):
    success: bool
    message: Optional[str] = None
    transaction_id: Optional[str] = None

class PaymentResponse(PaymentResult):
    pass
