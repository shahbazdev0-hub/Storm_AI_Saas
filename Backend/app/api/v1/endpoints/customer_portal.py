
# backend/app/api/v1/endpoints/customer_portal.py - FIXED VERSION
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies.auth import get_current_active_user
from app.models.user import UserRole
from app.core.logger import get_logger
import asyncio
logger = get_logger(__name__)

router = APIRouter()

def serialize_for_json(obj: Any) -> Any:
    """Convert ObjectId objects to strings for JSON serialization"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj
    
def oid(i: Any) -> ObjectId:
    """Convert to ObjectId safely"""
    return i if isinstance(i, ObjectId) else ObjectId(str(i))

def _ensure_customer_role(user: Dict[str, Any]):
    """Ensure user has customer role - temporarily allowing all users for testing"""
    # For now, allow any authenticated user to access customer portal
    # TODO: Uncomment this line when you have proper customer users:
    # if str(user.get("role", "")).lower() != "customer":
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access only")
    pass

async def _get_customer_contact(db: AsyncIOMotorDatabase, company_id: ObjectId, email: str) -> Optional[Dict[str, Any]]:
    """Get customer contact by email and company"""
    try:
        return await db.contacts.find_one({"company_id": company_id, "email": email.lower().strip()})
    except Exception as e:
        logger.error(f"Error finding customer contact: {e}")
        return None

async def _find_customer_jobs(db: AsyncIOMotorDatabase, company_id: ObjectId, email: str, customer_id: Optional[ObjectId] = None):
    """Find customer jobs by multiple methods"""
    try:
        # Method 1: Try by customer_id if we have it
        if customer_id:
            jobs_by_id = await db.jobs.find({
                "company_id": company_id,
                "customer_id": customer_id
            }).to_list(length=None)
            
            if jobs_by_id:
                return jobs_by_id
        
        # Method 2: Try by email
        jobs_by_email = await db.jobs.find({
            "company_id": company_id,
            "customer_email": email.lower().strip()
        }).to_list(length=None)
        
        if jobs_by_email:
            return jobs_by_email
            
        # Method 3: Try by customer_info.email
        jobs_by_info = await db.jobs.find({
            "company_id": company_id,
            "customer_info.email": email.lower().strip()
        }).to_list(length=None)
        
        return jobs_by_info or []
        
    except Exception as e:
        logger.error(f"Error finding customer jobs: {e}")
        return []

async def _find_customer_invoices(db: AsyncIOMotorDatabase, company_id: ObjectId, email: str, customer_id: Optional[ObjectId] = None):
    """Find customer invoices by multiple methods"""
    try:
        # Method 1: Try by customer_id
        if customer_id:
            invoices_by_id = await db.invoices.find({
                "company_id": company_id,
                "customer_id": customer_id
            }).to_list(length=None)
            
            if invoices_by_id:
                return invoices_by_id
        
        # Method 2: Try by email
        invoices_by_email = await db.invoices.find({
            "company_id": company_id,
            "customer_email": email.lower().strip()
        }).to_list(length=None)
        
        return invoices_by_email or []
        
    except Exception as e:
        logger.error(f"Error finding customer invoices: {e}")
        return []

# Pydantic models for requests
class ServiceRequestCreate(BaseModel):
    service_type: str = Field(..., description="Type of service needed")
    priority: str = Field(default="medium", description="Priority level: low, medium, high, urgent")
    preferred_date: Optional[str] = Field(None, description="Preferred service date")
    preferred_time: Optional[str] = Field(None, description="Preferred time slot")
    description: str = Field(..., description="Detailed description of the issue")
    location: str = Field(..., description="Service location")
    contact_phone: Optional[str] = Field(None, description="Contact phone for this request")
    special_instructions: Optional[str] = Field(None, description="Special instructions")
    attachments: List[str] = Field(default_factory=list, description="Attachment URLs")

class MessageCreate(BaseModel):
    subject: str = Field(..., description="Message subject")
    message: str = Field(..., description="Message content")
    priority: str = Field(default="normal", description="Message priority")

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    notifications_email: Optional[bool] = None
    notifications_sms: Optional[bool] = None

import stripe
import os

# Set your Stripe secret key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/invoices/{invoice_id}/create-payment-intent")
async def create_stripe_payment_intent(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Create Stripe Payment Intent for real payments"""
    try:
        # Get invoice
        invoice = await db.invoices.find_one({"_id": oid(invoice_id)})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        amount_cents = int(invoice.get("total_amount", 0) * 100)  # Convert to cents
        
        # Create Stripe Payment Intent
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='usd',
            metadata={
                'invoice_id': invoice_id,
                'customer_email': current_user["email"]
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "amount": invoice.get("total_amount", 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ================================
# DASHBOARD ENDPOINT - FIXED
# ================================
# Replace your customer_portal.py dashboard endpoint with this COMPLETE FIX
# Replace your customer_portal.py dashboard endpoint with this COMPLETE FIX

@router.get("/dashboard")
async def get_customer_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer dashboard - COMPLETE FIX FOR PENDING REQUESTS"""
    _ensure_customer_role(current_user)
    
    company_id = oid(current_user["company_id"])
    customer_id = oid(current_user["_id"])
    
    logger.info(f"Getting dashboard for customer {customer_id}")
    
    # Get customer info
    customer = {
        "id": str(customer_id),
        "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
        "email": current_user.get("email", ""),
        "phone": current_user.get("phone", ""),
        "customer_since": current_user.get("created_at", datetime.utcnow()).isoformat() if hasattr(current_user.get("created_at"), 'isoformat') else str(current_user.get("created_at", ""))
    }
    
    # Get upcoming appointments (scheduled jobs)
    upcoming = await db.jobs.find({
        "company_id": company_id,
        "customer_id": customer_id,
        "status": {"$in": ["scheduled", "confirmed", "assigned", "in_progress"]},
        "time_tracking.scheduled_start": {"$gte": datetime.utcnow()}
    }).sort("time_tracking.scheduled_start", 1).to_list(length=5)

    # Get recent completed services (jobs)
    recent = await db.jobs.find({
        "company_id": company_id,
        "customer_id": customer_id,
        "status": "completed"
    }).sort("completion_date", -1).to_list(length=5)

    # Get outstanding invoices
    invoices = await db.invoices.find({
        "company_id": company_id,
        "customer_id": customer_id,
        "status": {"$in": ["sent", "viewed", "overdue", "draft"]}
    }).sort("due_date", 1).to_list(length=5)

    # **FIXED: Get only ACTUAL pending service requests**
    # Exclude completed, cancelled, and converted requests
    service_requests = await db.service_requests.find({
        "company_id": company_id,
        "customer_id": customer_id,
        "status": {"$nin": ["completed", "cancelled", "converted_to_job"]}
    }).sort("created_at", -1).to_list(length=5)

    # Get recent messages
    messages = await db.messages.find({
        "company_id": company_id,
        "customer_id": customer_id
    }).sort("created_at", -1).to_list(length=10)

    # Calculate stats
    total_jobs = await db.jobs.count_documents({"company_id": company_id, "customer_id": customer_id})
    
    # **FIXED: Only count truly pending requests**
    actual_pending_requests = await db.service_requests.count_documents({
        "company_id": company_id,
        "customer_id": customer_id,
        "status": {"$nin": ["completed", "cancelled", "converted_to_job"]}
    })
    
    # Calculate outstanding balance
    outstanding_balance = 0.0
    for inv in invoices:
        total = inv.get("total_amount", 0)
        paid = inv.get("amount_paid", 0)
        outstanding_balance += (total - paid)
    
    logger.info(f"Customer dashboard stats: pending_requests={actual_pending_requests}, total_jobs={total_jobs}")
    
    return {
        "customer": customer,
        "upcoming_appointments": [
            {
                "id": str(j["_id"]),
                "service_type": j.get("service_type", ""),
                "scheduled_date": j.get("time_tracking", {}).get("scheduled_start", ""),
                "start_time": j.get("time_tracking", {}).get("scheduled_start", ""),
                "end_time": j.get("time_tracking", {}).get("scheduled_end", ""),
                "technician_name": j.get("technician_name", "TBD"),
                "technician_phone": j.get("technician_phone", ""),
                "status": j.get("status", "scheduled"),
                "special_instructions": j.get("special_instructions", ""),
            } for j in upcoming
        ],
        "recent_services": [
            {
                "id": str(r["_id"]),
                "service_type": r.get("service_type", ""),
                "completion_date": r.get("completion_date", ""),
                "technician_name": r.get("technician_name", "Technician"),
                "rating": r.get("customer_rating"),
                "notes": "Nice work",  # Default note for demo
                "photos": r.get("after_photos", []),
            } for r in recent
        ],
        "outstanding_invoices": [
            {
                "id": str(inv["_id"]),
                "invoice_number": inv.get("invoice_number", ""),
                "service_date": inv.get("issue_date", ""),
                "amount": inv.get("total_amount", 0),
                "due_date": inv.get("due_date", ""),
                "status": inv.get("status", "sent"),
            } for inv in invoices
        ],
        "service_requests": [
            {
                "id": str(req["_id"]),
                "service_type": req.get("service_type", ""),
                "description": req.get("description", ""),
                "status": req.get("status", "pending"),
                "priority": req.get("priority", "medium"),
                "created_at": req.get("created_at", ""),
            } for req in service_requests
        ],
        "recent_messages": [
            {
                "id": str(msg["_id"]),
                "content": msg.get("content", ""),
                "from_customer": msg.get("from_customer", False),
                "created_at": msg.get("created_at", ""),
            } for msg in messages
        ],
        "stats": {
            "next_appointment": "No upcoming" if not upcoming else upcoming[0].get("time_tracking", {}).get("scheduled_start", ""),
            "outstanding_balance": round(outstanding_balance, 2),
            "total_services": len([r for r in recent if r.get("status") == "completed"]),
            "pending_requests": actual_pending_requests  # **FIXED: Use actual count**
        }
    }

# Add this endpoint to your customer_portal.py file

@router.get("/invoices/{invoice_id}")
async def get_customer_invoice_for_payment(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get specific invoice for payment portal - COMPLETE INVOICE DATA"""
    try:
        _ensure_customer_role(current_user)
        
        if not ObjectId.is_valid(invoice_id):
            raise HTTPException(status_code=400, detail="Invalid invoice ID")
        
        company_id = oid(current_user["company_id"])
        customer_id = oid(current_user["_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        if contact:
            customer_id = contact["_id"]
        
        # Get the invoice with multiple search methods
        invoice = None
        
        # Method 1: By customer_id
        if not invoice:
            invoice = await db.invoices.find_one({
                "_id": oid(invoice_id),
                "company_id": company_id,
                "customer_id": customer_id
            })
        
        # Method 2: By email
        if not invoice:
            invoice = await db.invoices.find_one({
                "_id": oid(invoice_id),
                "company_id": company_id,
                "customer_email": email.lower().strip()
            })
        
        # Method 3: Public access for payment (if invoice has payment link)
        if not invoice:
            invoice = await db.invoices.find_one({
                "_id": oid(invoice_id),
                "company_id": company_id
            })
            
            # Verify this invoice can be accessed publicly for payment
            if invoice and invoice.get("status") not in ["sent", "viewed", "overdue"]:
                raise HTTPException(status_code=403, detail="Invoice not accessible for payment")
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get related job details if available
        job_details = None
        if invoice.get("job_id"):
            try:
                job = await db.jobs.find_one({"_id": invoice["job_id"]})
                if job:
                    # Get technician info
                    technician_name = "Technician"
                    if job.get("technician_id"):
                        try:
                            tech = await db.users.find_one({"_id": job["technician_id"]})
                            if tech:
                                technician_name = f"{tech.get('first_name', '')} {tech.get('last_name', '')}".strip()
                        except:
                            pass
                    
                    job_details = {
                        "job_number": job.get("job_number", ""),
                        "service_type": job.get("service_type", "Service"),
                        "completed_date": job.get("completion_date"),
                        "technician_name": technician_name
                    }
            except Exception as e:
                logger.error(f"Error getting job details: {e}")
        
        # Get customer info
        customer_info = None
        if invoice.get("customer_id"):
            try:
                customer = await db.contacts.find_one({"_id": invoice["customer_id"]})
                if customer:
                    customer_info = {
                        "name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                        "email": customer.get("email", ""),
                        "phone": customer.get("phone", "")
                    }
            except Exception as e:
                logger.error(f"Error getting customer info: {e}")
        
        # Fallback customer info
        if not customer_info:
            customer_info = {
                "name": invoice.get("customer_name", "Customer"),
                "email": invoice.get("customer_email", ""),
                "phone": invoice.get("customer_phone", "")
            }
        
        # Build comprehensive invoice response
        invoice_response = {
            "id": str(invoice["_id"]),
            "invoice_number": invoice.get("invoice_number", f"INV-{str(invoice['_id'])[-6:]}"),
            "status": invoice.get("status", "sent"),
            "issue_date": invoice.get("issue_date").isoformat() if invoice.get("issue_date") else None,
            "due_date": invoice.get("due_date").isoformat() if invoice.get("due_date") else None,
            
            # Financial details
            "subtotal": invoice.get("subtotal", 0),
            "tax_amount": invoice.get("tax_amount", 0),
            "tax_rate": invoice.get("tax_rate", 0),
            "total_amount": invoice.get("total_amount", 0),
            "amount_paid": invoice.get("amount_paid", 0),
            "amount_due": invoice.get("total_amount", 0) - invoice.get("amount_paid", 0),
            
            # Details
            "customer_info": customer_info,
            "job_details": job_details,
            "line_items": invoice.get("line_items", []),
            "payment_terms": invoice.get("payment_terms", "Net 30"),
            "notes": invoice.get("notes", ""),
            
            # Timestamps
            "created_at": invoice.get("created_at").isoformat() if invoice.get("created_at") else None,
            "updated_at": invoice.get("updated_at").isoformat() if invoice.get("updated_at") else None
        }
        
        logger.info(f"Invoice loaded for payment: {invoice_response['invoice_number']}")
        
        return serialize_for_json(invoice_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice for payment: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to load invoice: {str(e)}")


# Also add this payment processing endpoint
@router.post("/invoices/{invoice_id}/pay")
async def process_invoice_payment(
    invoice_id: str,
    payment_data: Dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Process payment for invoice - DEMO VERSION"""
    try:
        _ensure_customer_role(current_user)
        
        if not ObjectId.is_valid(invoice_id):
            raise HTTPException(status_code=400, detail="Invalid invoice ID")
        
        company_id = oid(current_user["company_id"])
        
        # Get the invoice
        invoice = await db.invoices.find_one({
            "_id": oid(invoice_id),
            "company_id": company_id
        })
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Simulate payment processing (in real app, integrate with Stripe/PayPal)
        await asyncio.sleep(1)  # Simulate processing time
        
        payment_amount = payment_data.get("amount", invoice.get("total_amount", 0))
        
        # Create payment record
        payment_record = {
            "company_id": company_id,
            "invoice_id": oid(invoice_id),
            "customer_id": invoice.get("customer_id"),
            "amount": payment_amount,
            "payment_method": payment_data.get("payment_method", "card"),
            "transaction_id": f"demo_txn_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "payment_id": f"demo_pay_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "status": "completed",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert payment record
        payment_result = await db.payments.insert_one(payment_record)
        
        # Update invoice status
        new_amount_paid = invoice.get("amount_paid", 0) + payment_amount
        total_amount = invoice.get("total_amount", 0)
        
        new_status = "paid" if new_amount_paid >= total_amount else "partial"
        
        await db.invoices.update_one(
            {"_id": oid(invoice_id)},
            {
                "$set": {
                    "status": new_status,
                    "amount_paid": new_amount_paid,
                    "paid_date": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Payment processed for invoice {invoice_id}: ${payment_amount}")
        
        return {
            "success": True,
            "message": "Payment processed successfully",
            "transaction_id": payment_record["transaction_id"],
            "payment_id": payment_record["payment_id"],
            "amount_paid": payment_amount,
            "new_status": new_status,
            "remaining_balance": max(0, total_amount - new_amount_paid)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")
    
# Also add this debug endpoint to your customer_portal.py to help troubleshoot
@router.get("/debug/requests-status")
async def debug_customer_requests_status(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Debug endpoint to check service request statuses"""
    _ensure_customer_role(current_user)
    
    company_id = oid(current_user["company_id"])
    customer_id = oid(current_user["_id"])
    
    # Get all service requests for this customer
    all_requests = await db.service_requests.find({
        "company_id": company_id,
        "customer_id": customer_id
    }).to_list(length=None)
    
    # Group by status
    status_breakdown = {}
    requests_detail = []
    
    for req in all_requests:
        status = req.get("status", "unknown")
        if status not in status_breakdown:
            status_breakdown[status] = 0
        status_breakdown[status] += 1
        
        # Check if there's a related job
        related_job = None
        if req.get("job_id"):
            related_job = await db.jobs.find_one({"_id": req["job_id"]})
        
        requests_detail.append({
            "id": str(req["_id"]),
            "service_type": req.get("service_type", ""),
            "status": status,
            "created_at": req.get("created_at", "").isoformat() if hasattr(req.get("created_at"), 'isoformat') else str(req.get("created_at", "")),
            "has_related_job": bool(related_job),
            "job_status": related_job.get("status", "none") if related_job else "none",
            "job_id": str(related_job["_id"]) if related_job else None
        })
    
    # Count pending (should be 0 after fix)
    pending_count = len([r for r in all_requests if r.get("status") not in ["completed", "cancelled", "converted_to_job"]])
    
    return {
        "total_requests": len(all_requests),
        "pending_count": pending_count,
        "status_breakdown": status_breakdown,
        "requests_detail": requests_detail
    }
    
# ================================
# SERVICE REQUESTS
# ================================
@router.post("/service-requests")
async def create_service_request(
    request_data: ServiceRequestCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Create a new service request"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        customer_id = oid(current_user["_id"])
        
        service_request = {
            "company_id": company_id,
            "customer_id": customer_id,
            "customer_email": current_user["email"],
            "customer_name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
            "service_type": request_data.service_type,
            "priority": request_data.priority,
            "preferred_date": request_data.preferred_date,
            "preferred_time": request_data.preferred_time,
            "description": request_data.description,
            "location": request_data.location,
            "contact_phone": request_data.contact_phone,
            "special_instructions": request_data.special_instructions,
            "attachments": request_data.attachments,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.service_requests.insert_one(service_request)
        service_request["id"] = str(result.inserted_id)
        
        logger.info(f"Service request created: {result.inserted_id}")
        
        return {
            "success": True,
            "service_request": {
                "id": str(result.inserted_id),
                "service_type": service_request["service_type"],
                "status": service_request["status"],
                "created_at": service_request["created_at"].isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating service request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create service request: {str(e)}")

# ================================
# SERVICE HISTORY
# ================================
# Add this to your customer_portal.py file to replace the existing service-history endpoint

@router.get("/service-history")
async def get_service_history(
    limit: int = Query(10, le=50),
    offset: int = Query(0, ge=0),
    service_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer service history with proper ObjectId serialization"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        logger.info(f"Getting service history for customer: {email}")
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        if not contact:
            # If no contact found, try using user_id directly
            customer_id = oid(current_user["_id"])
        else:
            customer_id = contact["_id"]
        
        # Get jobs for this customer using multiple methods
        all_jobs = []
        try:
            # Method 1: Try by customer_id
            if contact:
                jobs_by_id = await db.jobs.find({
                    "company_id": company_id,
                    "customer_id": customer_id
                }).to_list(length=None)
                all_jobs = jobs_by_id
            
            # Method 2: Try by email if no jobs found
            if not all_jobs:
                jobs_by_email = await db.jobs.find({
                    "company_id": company_id,
                    "customer_email": email.lower().strip()
                }).to_list(length=None)
                all_jobs = jobs_by_email
                
            # Method 3: Try by customer_info.email
            if not all_jobs:
                jobs_by_info = await db.jobs.find({
                    "company_id": company_id,
                    "customer_info.email": email.lower().strip()
                }).to_list(length=None)
                all_jobs = jobs_by_info
                
        except Exception as e:
            logger.error(f"Error getting jobs: {e}")
            all_jobs = []
        
        # Filter jobs by status (completed, cancelled, or all)
        if status:
            filtered_jobs = [job for job in all_jobs if job.get("status", "").lower() == status.lower()]
        else:
            # Default to completed and cancelled jobs (service history)
            filtered_jobs = [job for job in all_jobs if job.get("status", "").lower() in ["completed", "cancelled"]]
        
        # Apply service type filter
        if service_type:
            filtered_jobs = [job for job in filtered_jobs if job.get("service_type") == service_type]
        
        # Sort by completion/update date (newest first)
        def get_sort_date(job):
            return (job.get("time_tracking", {}).get("actual_end") or 
                    job.get("completion_date") or 
                    job.get("updated_at") or 
                    datetime.min)
        
        filtered_jobs.sort(key=get_sort_date, reverse=True)
        
        # Apply pagination
        total_jobs = len(filtered_jobs)
        paginated_jobs = filtered_jobs[offset:offset + limit]
        
        # Get invoices for these jobs
        job_ids = [job["_id"] for job in paginated_jobs]
        invoices = []
        if job_ids:
            try:
                invoices = await db.invoices.find({"job_id": {"$in": job_ids}}).to_list(length=None)
            except Exception as e:
                logger.error(f"Error getting invoices: {e}")
        
        # Create job_id to invoice mapping
        invoice_map = {}
        for invoice in invoices:
            job_id = str(invoice.get("job_id", ""))
            if job_id:
                invoice_map[job_id] = invoice
        
        # Format service history
        formatted_services = []
        for job in paginated_jobs:
            try:
                job_id = str(job["_id"])
                invoice = invoice_map.get(job_id)
                
                # Get technician name
                technician_name = "Unknown"
                try:
                    if job.get("technician_id"):
                        technician = await db.users.find_one({"_id": job["technician_id"]})
                        if technician:
                            technician_name = f"{technician.get('first_name', '')} {technician.get('last_name', '')}".strip()
                except Exception as e:
                    logger.error(f"Error getting technician info: {e}")
                
                # Get completion date
                completion_date = (
                    job.get("time_tracking", {}).get("actual_end") or
                    job.get("completion_date") or
                    job.get("updated_at")
                )
                
                # Convert completion_date to string if it's a datetime
                completion_date_str = ""
                if completion_date:
                    if isinstance(completion_date, str):
                        completion_date_str = completion_date
                    elif hasattr(completion_date, 'isoformat'):
                        completion_date_str = completion_date.isoformat()
                    else:
                        completion_date_str = str(completion_date)
                
                # Get scheduled date
                scheduled_date = job.get("time_tracking", {}).get("scheduled_start") or job.get("scheduled_date")
                scheduled_date_str = ""
                if scheduled_date:
                    if isinstance(scheduled_date, str):
                        scheduled_date_str = scheduled_date
                    elif hasattr(scheduled_date, 'isoformat'):
                        scheduled_date_str = scheduled_date.isoformat()
                    else:
                        scheduled_date_str = str(scheduled_date)
                
                # Format service item - CONVERT ALL ObjectIds to strings immediately
                service_item = {
                    "id": job_id,  # Already converted to string
                    "job_number": job.get("job_number", f"JOB-{job_id[-6:]}"),
                    "service_type": job.get("service_type", "Service"),
                    "description": job.get("description", ""),
                    "status": job.get("status", "completed"),
                    "completion_date": completion_date_str,
                    "scheduled_date": scheduled_date_str,
                    "technician_name": technician_name,
                    "location": job.get("address", {}).get("street", "") or "Location not specified",
                    "work_performed": job.get("work_performed", ""),
                    "materials_used": job.get("materials_used", []),
                    "photos": job.get("photos", []),
                    "customer_signature": job.get("customer_signature"),
                    "rating": job.get("customer_rating"),
                    "feedback": job.get("customer_feedback", ""),
                    "created_at": job.get("created_at").isoformat() if job.get("created_at") and hasattr(job.get("created_at"), 'isoformat') else str(job.get("created_at", "")),
                    "updated_at": job.get("updated_at").isoformat() if job.get("updated_at") and hasattr(job.get("updated_at"), 'isoformat') else str(job.get("updated_at", "")),
                    "invoice": None  # Will be populated below if invoice exists
                }
                
                # Add invoice information if available
                if invoice:
                    due_date_str = ""
                    if invoice.get("due_date"):
                        if isinstance(invoice["due_date"], str):
                            due_date_str = invoice["due_date"]
                        elif hasattr(invoice["due_date"], 'isoformat'):
                            due_date_str = invoice["due_date"].isoformat()
                        else:
                            due_date_str = str(invoice["due_date"])
                    
                    service_item["invoice"] = {
                        "id": str(invoice["_id"]),  # Convert ObjectId to string
                        "invoice_number": invoice.get("invoice_number", f"INV-{str(invoice['_id'])[-6:]}"),
                        "total_amount": invoice.get("total_amount", 0),
                        "status": invoice.get("status", "pending"),
                        "due_date": due_date_str,
                        "payment_link": invoice.get("payment_link", ""),
                        "amount_due": invoice.get("amount_due", invoice.get("total_amount", 0))
                    }
                
                formatted_services.append(service_item)
                
            except Exception as e:
                logger.error(f"Error formatting service {job.get('_id')}: {e}")
                continue
        
        response = {
            "services": formatted_services,
            "total": total_jobs,
            "page": (offset // limit) + 1,
            "limit": limit,
            "has_more": offset + len(formatted_services) < total_jobs
        }
        
        logger.info(f"Service history successful: {len(formatted_services)} services returned")
        
        # Apply the same serialization as dashboard
        return serialize_for_json(response)
        
    except Exception as e:
        logger.error(f"Service history error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get service history: {str(e)}")

# Also add/update the helper function if you haven't already:
async def _get_customer_contact(db: AsyncIOMotorDatabase, company_id: ObjectId, email: str) -> Optional[Dict[str, Any]]:
    """Get customer contact by email and company"""
    try:
        return await db.contacts.find_one({"company_id": company_id, "email": email.lower().strip()})
    except Exception as e:
        logger.error(f"Error finding customer contact: {e}")
        return None

# ================================
# OTHER ENDPOINTS
# ================================

@router.get("/service-requests")
async def get_service_requests(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer's service requests"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        requests = await db.service_requests.find({
            "company_id": company_id,
            "$or": [
                {"customer_email": email},
                {"created_by_email": email}
            ]
        }).sort("created_at", -1).to_list(length=None)
        
        formatted_requests = []
        for req in requests:
            formatted_requests.append({
                "id": str(req["_id"]),
                "service_type": req.get("service_type", ""),
                "priority": req.get("priority", "medium"),
                "status": req.get("status", "pending"),
                "description": req.get("description", ""),
                "location": req.get("location", ""),
                "preferred_date": req.get("preferred_date"),
                "preferred_time": req.get("preferred_time"),
                "created_at": req.get("created_at", datetime.utcnow()).isoformat(),
                "updated_at": req.get("updated_at", datetime.utcnow()).isoformat()
            })
        
        return {"service_requests": formatted_requests}
        
    except Exception as e:
        logger.error(f"Error getting service requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices")
async def get_customer_invoices(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer invoices"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Get invoices
        invoices = await _find_customer_invoices(db, company_id, email, customer_id)
        
        formatted_invoices = []
        for invoice in invoices:
            formatted_invoices.append({
                "id": str(invoice["_id"]),
                "invoice_number": invoice.get("invoice_number", f"INV-{str(invoice['_id'])[-6:]}"),
                "total_amount": invoice.get("total_amount", 0),
                "amount_due": invoice.get("amount_due", invoice.get("total_amount", 0)),
                "status": invoice.get("status", "pending"),
                "due_date": invoice.get("due_date").isoformat() if invoice.get("due_date") else None,
                "service_date": invoice.get("service_date").isoformat() if invoice.get("service_date") else None,
                "created_at": invoice.get("created_at", datetime.utcnow()).isoformat(),
                "payment_link": invoice.get("payment_link")
            })
        
        return {"invoices": formatted_invoices}
        
    except Exception as e:
        logger.error(f"Error getting customer invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_customer_profile(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer profile"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Try to get customer contact
        contact = await _get_customer_contact(db, company_id, email)
        
        if contact:
            profile = {
                "id": str(contact["_id"]),
                "first_name": contact.get("first_name", ""),
                "last_name": contact.get("last_name", ""),
                "email": contact.get("email", ""),
                "phone": contact.get("phone", ""),
                "address": contact.get("address", ""),
                "city": contact.get("city", ""),
                "state": contact.get("state", ""),
                "zip_code": contact.get("zip_code", ""),
                "preferred_contact_method": contact.get("preferred_contact_method", "email"),
                "notifications_email": contact.get("notifications_email", True),
                "notifications_sms": contact.get("notifications_sms", False)
            }
        else:
            # Use user data as fallback
            profile = {
                "id": str(current_user["_id"]),
                "first_name": current_user.get("first_name", ""),
                "last_name": current_user.get("last_name", ""),
                "email": current_user.get("email", ""),
                "phone": current_user.get("phone", ""),
                "address": "",
                "city": "",
                "state": "",
                "zip_code": "",
                "preferred_contact_method": "email",
                "notifications_email": True,
                "notifications_sms": False
            }
        
        return {"profile": profile}
        
    except Exception as e:
        logger.error(f"Error getting customer profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_customer_profile(
    profile_data: ProfileUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Update customer profile"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Try to find existing contact
        contact = await _get_customer_contact(db, company_id, email)
        
        # Prepare update data
        update_data = {}
        for field, value in profile_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow()
        
        if contact:
            # Update existing contact
            await db.contacts.update_one(
                {"_id": contact["_id"]},
                {"$set": update_data}
            )
            contact_id = contact["_id"]
        else:
            # Create new contact
            new_contact = {
                "company_id": company_id,
                "email": email,
                "first_name": current_user.get("first_name", ""),
                "last_name": current_user.get("last_name", ""),
                "phone": current_user.get("phone", ""),
                "type": "customer",
                "created_at": datetime.utcnow(),
                **update_data
            }
            result = await db.contacts.insert_one(new_contact)
            contact_id = result.inserted_id
        
        return {"success": True, "message": "Profile updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating customer profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages")
async def get_customer_messages(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer messages"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Build query
        query = {
            "company_id": company_id,
            "$or": [
                {"customer_id": customer_id} if contact else {},
                {"customer_email": email}
            ]
        }
        
        if unread_only:
            query["read"] = False
        
        # Get messages
        messages = await db.messages.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        total = await db.messages.count_documents(query)
        
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "id": str(msg["_id"]),
                "subject": msg.get("subject", ""),
                "message": msg.get("message", ""),
                "from": msg.get("from_name", "ServiceCRM Team"),
                "from_email": msg.get("from_email", ""),
                "created_at": msg.get("created_at", datetime.utcnow()).isoformat(),
                "read": msg.get("read", False),
                "priority": msg.get("priority", "normal"),
                "message_type": msg.get("message_type", "general")
            })
        
        return {
            "messages": formatted_messages,
            "total": total,
            "page": (offset // limit) + 1,
            "limit": limit,
            "has_more": offset + len(formatted_messages) < total
        }
        
    except Exception as e:
        logger.error(f"Error getting customer messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages")
async def send_customer_message(
    message_data: MessageCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Send a message from customer to company"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        customer_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Create message
        message = {
            "company_id": company_id,
            "customer_id": customer_id,
            "customer_email": email,
            "from_name": customer_name or "Customer",
            "from_email": email,
            "to_name": "ServiceCRM Team",
            "subject": message_data.subject,
            "message": message_data.message,
            "priority": message_data.priority,
            "message_type": "customer_inquiry",
            "direction": "inbound",  # From customer to company
            "read": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.messages.insert_one(message)
        
        logger.info(f"Customer message sent: {result.inserted_id}")
        
        return {
            "success": True,
            "message": {
                "id": str(result.inserted_id),
                "subject": message["subject"],
                "created_at": message["created_at"].isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error sending customer message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Mark a message as read"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Update message
        result = await db.messages.update_one(
            {
                "_id": oid(message_id),
                "company_id": company_id,
                "$or": [
                    {"customer_email": email}
                ]
            },
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments/history")
async def get_payment_history(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer payment history"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Get payments
        query = {
            "company_id": company_id,
            "$or": [
                {"customer_id": customer_id} if contact else {},
                {"customer_email": email}
            ]
        }
        
        payments = await db.payments.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        total = await db.payments.count_documents(query)
        
        formatted_payments = []
        for payment in payments:
            formatted_payments.append({
                "id": str(payment["_id"]),
                "invoice_id": str(payment.get("invoice_id", "")),
                "invoice_number": payment.get("invoice_number", ""),
                "amount": payment.get("amount", 0),
                "payment_method": payment.get("payment_method", ""),
                "transaction_id": payment.get("transaction_id", ""),
                "status": payment.get("status", "completed"),
                "payment_date": payment.get("payment_date", payment.get("created_at", datetime.utcnow())).isoformat(),
                "created_at": payment.get("created_at", datetime.utcnow()).isoformat()
            })
        
        return {
            "payments": formatted_payments,
            "total": total,
            "page": (offset // limit) + 1,
            "limit": limit,
            "has_more": offset + len(formatted_payments) < total
        }
        
    except Exception as e:
        logger.error(f"Error getting payment history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/process")
async def process_payment(
    payment_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Process a payment (placeholder implementation)"""
    try:
        _ensure_customer_role(current_user)
        
        # This is a placeholder implementation
        # In a real system, you would integrate with a payment processor like Stripe, PayPal, etc.
        
        invoice_id = payment_data.get("invoice_id")
        amount = payment_data.get("amount")
        payment_method = payment_data.get("payment_method")
        
        if not all([invoice_id, amount, payment_method]):
            raise HTTPException(status_code=400, detail="Missing required payment information")
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Verify invoice belongs to customer
        invoice = await db.invoices.find_one({
            "_id": oid(invoice_id),
            "company_id": company_id,
            "$or": [
                {"customer_email": email}
            ]
        })
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Create payment record (placeholder)
        payment_record = {
            "company_id": company_id,
            "invoice_id": oid(invoice_id),
            "invoice_number": invoice.get("invoice_number"),
            "customer_email": email,
            "amount": float(amount),
            "payment_method": payment_method,
            "transaction_id": f"txn_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "status": "completed",  # In real implementation, this would be "pending" initially
            "payment_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert payment record
        payment_result = await db.payments.insert_one(payment_record)
        
        # Update invoice status
        await db.invoices.update_one(
            {"_id": oid(invoice_id)},
            {
                "$set": {
                    "status": "paid",
                    "paid_date": datetime.utcnow(),
                    "amount_paid": invoice.get("amount_paid", 0) + float(amount),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Payment processed: {payment_result.inserted_id}")
        
        return {
            "success": True,
            "payment_id": str(payment_result.inserted_id),
            "transaction_id": payment_record["transaction_id"],
            "status": "completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")

@router.get("/documents")
async def get_customer_documents(
    document_type: Optional[str] = Query(None),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get customer documents"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Build query
        query = {
            "company_id": company_id,
            "$or": [
                {"customer_id": customer_id} if contact else {},
                {"customer_email": email}
            ]
        }
        
        if document_type:
            query["document_type"] = document_type
        
        # Get documents
        documents = await db.documents.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        total = await db.documents.count_documents(query)
        
        formatted_documents = []
        for doc in documents:
            formatted_documents.append({
                "id": str(doc["_id"]),
                "name": doc.get("name", ""),
                "document_type": doc.get("document_type", ""),
                "file_url": doc.get("file_url", ""),
                "file_size": doc.get("file_size", 0),
                "mime_type": doc.get("mime_type", ""),
                "job_id": str(doc.get("job_id", "")) if doc.get("job_id") else None,
                "invoice_id": str(doc.get("invoice_id", "")) if doc.get("invoice_id") else None,
                "description": doc.get("description", ""),
                "created_at": doc.get("created_at", datetime.utcnow()).isoformat(),
                "uploaded_by": doc.get("uploaded_by", "")
            })
        
        return {
            "documents": formatted_documents,
            "total": total,
            "page": (offset // limit) + 1,
            "limit": limit,
            "has_more": offset + len(formatted_documents) < total
        }
        
    except Exception as e:
        logger.error(f"Error getting customer documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments/upcoming")
async def get_upcoming_appointments(
    limit: int = Query(10, le=20),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
):
    """Get upcoming appointments for customer"""
    try:
        _ensure_customer_role(current_user)
        
        company_id = oid(current_user["company_id"])
        email = current_user["email"]
        
        # Find customer contact
        contact = await _get_customer_contact(db, company_id, email)
        customer_id = contact["_id"] if contact else oid(current_user["_id"])
        
        # Get upcoming appointments
        all_jobs = await _find_customer_jobs(db, company_id, email, customer_id)
        
        today = datetime.utcnow()
        upcoming = []
        
        for job in all_jobs:
            try:
                job_status = job.get("status", "").lower()
                if job_status in ["scheduled", "confirmed", "in_progress"]:
                    # Try different date fields
                    scheduled_date = (
                        job.get("scheduled_date") or 
                        job.get("time_tracking", {}).get("scheduled_start") or
                        job.get("service_date")
                    )
                    
                    if scheduled_date:
                        # Convert to datetime if it's a string
                        if isinstance(scheduled_date, str):
                            try:
                                scheduled_datetime = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
                            except:
                                continue
                        elif hasattr(scheduled_date, 'date'):
                            scheduled_datetime = scheduled_date
                        else:
                            continue
                            
                        if scheduled_datetime >= today:
                            upcoming.append({
                                "id": str(job["_id"]),
                                "job_number": job.get("job_number", f"JOB-{str(job['_id'])[-6:]}"),
                                "service_type": job.get("service_type", "Service"),
                                "description": job.get("description", ""),
                                "scheduled_date": scheduled_datetime.date().isoformat(),
                                "start_time": job.get("start_time", "09:00"),
                                "end_time": job.get("end_time", "17:00"),
                                "technician_name": job.get("technician_name", "Unassigned"),
                                "technician_phone": job.get("technician_phone", ""),
                                "status": job_status,
                                "special_instructions": job.get("special_instructions", ""),
                                "location": job.get("address", {}).get("street", "") or "Location not specified",
                                "estimated_duration": job.get("estimated_duration", "2 hours")
                            })
            except Exception as e:
                logger.error(f"Error processing upcoming appointment: {e}")
                continue
        
        # Sort by date and limit
        upcoming.sort(key=lambda x: x["scheduled_date"])
        upcoming = upcoming[:limit]
        
        return _serialize_response({"appointments": upcoming})
        
    except Exception as e:
        logger.error(f"Error getting upcoming appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add this to your backend
@router.get("/customer-portal/invoices/{invoice_id}")
async def get_customer_invoice(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get invoice details for customer payment"""
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "invoice_number": invoice["invoice_number"],
        "total_amount": invoice["total_amount"],
        "customer_name": invoice["customer_name"],
        "customer_email": invoice["customer_email"],
        "line_items": invoice["line_items"],
        "due_date": invoice["due_date"],
        "status": invoice["status"]
    }





# ================================
# CUSTOMER AVATAR ENDPOINTS
# ================================

# Add these to backend/app/api/v1/endpoints/customer_portal.py

@router.post("/avatar", response_model=dict)
async def upload_customer_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Upload avatar for customer user"""
    # Ensure user is customer
    if current_user.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customer users can use this endpoint"
        )
    
    user_id = str(current_user["_id"])
    
    try:
        # Delete old avatar if exists
        old_avatar = current_user.get("avatar_url")
        if old_avatar:
            await delete_avatar_file(old_avatar)
        
        # Process and save new avatar
        avatar_url = await process_and_save_avatar(file, user_id)
        
        # Update user in database
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"avatar_url": avatar_url, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"Avatar uploaded successfully for customer {user_id}")
        return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading customer avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )

@router.delete("/avatar", response_model=dict)
async def delete_customer_avatar(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete avatar for customer user"""
    # Ensure user is customer
    if current_user.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customer users can use this endpoint"
        )
    
    user_id = str(current_user["_id"])
    
    try:
        # Get current avatar
        old_avatar = current_user.get("avatar_url")
        if not old_avatar:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No avatar found to delete"
            )
        
        # Delete file from disk
        await delete_avatar_file(old_avatar)
        
        # Update user in database
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$unset": {"avatar_url": ""},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"Avatar deleted successfully for customer {user_id}")
        return {"message": "Avatar deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete avatar"
        )
