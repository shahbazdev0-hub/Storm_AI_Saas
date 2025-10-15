# app/services/estimate_service.py
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging

from app.schemas.estimate import EstimateCreate, EstimateUpdate, EstimateSearch
from app.models.estimate import Estimate, EstimateStatus, EstimateLineItem
from app.core.config import settings

logger = logging.getLogger(__name__)

class EstimateService:
    """Service for estimate business logic"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = self.db.estimates
    
    async def create_estimate(
        self, 
        estimate_in: EstimateCreate, 
        company_id: str,
        created_by: str
    ) -> Dict[str, Any]:
        """Create a new estimate"""
        try:
            # Convert line items
            line_items = []
            for item_data in estimate_in.line_items:
                line_item = EstimateLineItem(
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit=item_data.unit or "each",
                    unit_price=item_data.unit_price,
                    total_price=item_data.quantity * item_data.unit_price,
                    sku=item_data.sku,
                    category=item_data.category,
                    notes=item_data.notes
                )
                line_items.append(line_item)
            
            # Create estimate data
            estimate_data = {
                "company_id": ObjectId(company_id),
                "customer_id": ObjectId(estimate_in.customer_id),
                "title": estimate_in.title,
                "description": estimate_in.description,
                "status": EstimateStatus.DRAFT,
                "line_items": [item.model_dump() for item in line_items],
                "tax_rate": estimate_in.tax_rate or 0.0,
                "discount_percentage": estimate_in.discount_percentage or 0.0,
                "valid_until": estimate_in.valid_until,
                "terms_and_conditions": estimate_in.terms_and_conditions,
                "payment_terms": estimate_in.payment_terms,
                "custom_fields": estimate_in.custom_fields or {},
                "notes": estimate_in.notes,
                "created_by": ObjectId(created_by),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Generate estimate number
            estimate_number = await self._generate_estimate_number(company_id)
            estimate_data["estimate_number"] = estimate_number
            
            # Calculate totals
            estimate_data = self._calculate_totals(estimate_data)
            
            # Insert estimate
            result = await self.collection.insert_one(estimate_data)
            estimate_data["_id"] = result.inserted_id
            
            logger.info(f"Created estimate {estimate_number} for company {company_id}")
            return self._format_estimate_response(estimate_data)
            
        except Exception as e:
            logger.error(f"Error creating estimate: {e}")
            raise
    
    async def get_estimate(
        self, 
        estimate_id: str, 
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get estimate by ID"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return None
            
            estimate = await self.collection.find_one({
                "_id": ObjectId(estimate_id),
                "company_id": ObjectId(company_id)
            })
            
            if not estimate:
                return None
            
            # Get customer information
            estimate = await self._populate_customer_info(estimate)
            
            return self._format_estimate_response(estimate)
            
        except Exception as e:
            logger.error(f"Error getting estimate {estimate_id}: {e}")
            raise
    
    async def get_estimates(
        self,
        company_id: str,
        search: EstimateSearch
    ) -> Dict[str, Any]:
        """Get estimates with filtering and pagination"""
        try:
            # Build query
            query = {"company_id": ObjectId(company_id)}
            
            # Add filters
            if search.q:
                query["$or"] = [
                    {"title": {"$regex": search.q, "$options": "i"}},
                    {"estimate_number": {"$regex": search.q, "$options": "i"}},
                    {"description": {"$regex": search.q, "$options": "i"}}
                ]
            
            if search.status:
                query["status"] = search.status
            
            if search.customer_id:
                query["customer_id"] = ObjectId(search.customer_id)
            
            if search.created_after:
                query.setdefault("created_at", {})["$gte"] = search.created_after
            
            if search.created_before:
                query.setdefault("created_at", {})["$lte"] = search.created_before
            
            if search.min_amount is not None:
                query["total_amount"] = {"$gte": search.min_amount}
            
            if search.max_amount is not None:
                query.setdefault("total_amount", {})["$lte"] = search.max_amount
            
            if search.expired is not None:
                if search.expired:
                    query["valid_until"] = {"$lt": date.today()}
                else:
                    query["$or"] = [
                        {"valid_until": {"$gte": date.today()}},
                        {"valid_until": None}
                    ]
            
            # Count total documents
            total = await self.collection.count_documents(query)
            
            # Calculate pagination
            skip = (search.page - 1) * search.size
            pages = (total + search.size - 1) // search.size
            
            # Build sort
            sort_field = search.sort_by
            sort_direction = 1 if search.sort_order == "asc" else -1
            
            # Execute query
            cursor = self.collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(search.size)
            estimates = await cursor.to_list(length=search.size)
            
            # Populate customer info
            for estimate in estimates:
                estimate = await self._populate_customer_info(estimate)
            
            # Format response
            return {
                "estimates": [self._format_estimate_response(est) for est in estimates],
                "total": total,
                "page": search.page,
                "size": search.size,
                "pages": pages,
                "has_next": search.page < pages,
                "has_prev": search.page > 1
            }
            
        except Exception as e:
            logger.error(f"Error getting estimates: {e}")
            raise
    
    async def update_estimate(
        self,
        estimate_id: str,
        estimate_in: EstimateUpdate,
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update estimate"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return None
            
            # Build update data
            update_data = {"updated_at": datetime.utcnow()}
            
            # Update fields if provided
            if estimate_in.title is not None:
                update_data["title"] = estimate_in.title
            
            if estimate_in.description is not None:
                update_data["description"] = estimate_in.description
            
            if estimate_in.status is not None:
                update_data["status"] = estimate_in.status
            
            if estimate_in.tax_rate is not None:
                update_data["tax_rate"] = estimate_in.tax_rate
            
            if estimate_in.discount_percentage is not None:
                update_data["discount_percentage"] = estimate_in.discount_percentage
            
            if estimate_in.valid_until is not None:
                update_data["valid_until"] = estimate_in.valid_until
            
            if estimate_in.terms_and_conditions is not None:
                update_data["terms_and_conditions"] = estimate_in.terms_and_conditions
            
            if estimate_in.payment_terms is not None:
                update_data["payment_terms"] = estimate_in.payment_terms
            
            if estimate_in.custom_fields is not None:
                update_data["custom_fields"] = estimate_in.custom_fields
            
            if estimate_in.notes is not None:
                update_data["notes"] = estimate_in.notes
            
            # Update line items if provided
            if estimate_in.line_items is not None:
                line_items = []
                for item_data in estimate_in.line_items:
                    line_item = EstimateLineItem(
                        description=item_data.description or "",
                        quantity=item_data.quantity or 1,
                        unit=item_data.unit or "each",
                        unit_price=item_data.unit_price or 0,
                        total_price=(item_data.quantity or 1) * (item_data.unit_price or 0),
                        sku=item_data.sku,
                        category=item_data.category,
                        notes=item_data.notes
                    )
                    line_items.append(line_item)
                
                update_data["line_items"] = [item.model_dump() for item in line_items]
            
            # Recalculate totals if line items or rates changed
            if any(field in update_data for field in ["line_items", "tax_rate", "discount_percentage"]):
                # Get current estimate to recalculate
                current_estimate = await self.collection.find_one({
                    "_id": ObjectId(estimate_id),
                    "company_id": ObjectId(company_id)
                })
                
                if current_estimate:
                    # Merge update data with current data
                    for key, value in update_data.items():
                        current_estimate[key] = value
                    
                    # Recalculate totals
                    current_estimate = self._calculate_totals(current_estimate)
                    
                    # Update totals in update_data
                    update_data.update({
                        "subtotal": current_estimate["subtotal"],
                        "tax_amount": current_estimate["tax_amount"],
                        "discount_amount": current_estimate["discount_amount"],
                        "total_amount": current_estimate["total_amount"]
                    })
            
            # Update estimate
            result = await self.collection.update_one(
                {"_id": ObjectId(estimate_id), "company_id": ObjectId(company_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return None
            
            # Return updated estimate
            return await self.get_estimate(estimate_id, company_id)
            
        except Exception as e:
            logger.error(f"Error updating estimate {estimate_id}: {e}")
            raise
    
    async def delete_estimate(
        self,
        estimate_id: str,
        company_id: str
    ) -> bool:
        """Delete estimate"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return False
            
            result = await self.collection.delete_one({
                "_id": ObjectId(estimate_id),
                "company_id": ObjectId(company_id)
            })
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting estimate {estimate_id}: {e}")
            raise
    
    async def send_estimate(
        self,
        estimate_id: str,
        company_id: str,
        email_template: Optional[str] = None
    ) -> bool:
        """Send estimate to customer"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return False
            
            # Get estimate
            estimate = await self.collection.find_one({
                "_id": ObjectId(estimate_id),
                "company_id": ObjectId(company_id)
            })
            
            if not estimate:
                return False
            
            # Generate PDF if not exists
            if not estimate.get("pdf_url"):
                pdf_url = await self._generate_pdf(estimate)
                await self.collection.update_one(
                    {"_id": ObjectId(estimate_id)},
                    {"$set": {"pdf_url": pdf_url}}
                )
                estimate["pdf_url"] = pdf_url
            
            # Get customer info
            customer = await self.db.contacts.find_one({
                "_id": estimate["customer_id"]
            })
            
            if not customer or not customer.get("email"):
                logger.error(f"Customer not found or no email for estimate {estimate_id}")
                return False
            
            # Send email (would integrate with email service)
            # For now, just update the sent status
            await self.collection.update_one(
                {"_id": ObjectId(estimate_id)},
                {
                    "$set": {
                        "status": EstimateStatus.SENT,
                        "sent_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Estimate {estimate['estimate_number']} sent to {customer['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending estimate {estimate_id}: {e}")
            raise
    
    async def accept_estimate(
        self,
        estimate_id: str,
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Accept estimate and convert to job"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return None
            
            # Update estimate status
            result = await self.collection.update_one(
                {"_id": ObjectId(estimate_id), "company_id": ObjectId(company_id)},
                {
                    "$set": {
                        "status": EstimateStatus.ACCEPTED,
                        "accepted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count == 0:
                return None
            
            # Create job from estimate
            estimate = await self.collection.find_one({
                "_id": ObjectId(estimate_id)
            })
            
            if estimate:
                job_data = await self._create_job_from_estimate(estimate)
                return job_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error accepting estimate {estimate_id}: {e}")
            raise
    
    async def decline_estimate(
        self,
        estimate_id: str,
        company_id: str,
        reason: Optional[str] = None
    ) -> bool:
        """Decline estimate"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return False
            
            update_data = {
                "status": EstimateStatus.DECLINED,
                "declined_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if reason:
                update_data["decline_reason"] = reason
            
            result = await self.collection.update_one(
                {"_id": ObjectId(estimate_id), "company_id": ObjectId(company_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error declining estimate {estimate_id}: {e}")
            raise
    
    async def generate_pdf(
        self,
        estimate_id: str,
        company_id: str
    ) -> Optional[str]:
        """Generate PDF for estimate"""
        try:
            if not ObjectId.is_valid(estimate_id):
                return None
            
            estimate = await self.collection.find_one({
                "_id": ObjectId(estimate_id),
                "company_id": ObjectId(company_id)
            })
            
            if not estimate:
                return None
            
            pdf_url = await self._generate_pdf(estimate)
            
            # Update estimate with PDF URL
            await self.collection.update_one(
                {"_id": ObjectId(estimate_id)},
                {"$set": {"pdf_url": pdf_url, "updated_at": datetime.utcnow()}}
            )
            
            return pdf_url
            
        except Exception as e:
            logger.error(f"Error generating PDF for estimate {estimate_id}: {e}")
            raise
    
    # Private helper methods
    async def _generate_estimate_number(self, company_id: str) -> str:
        """Generate unique estimate number"""
        today = datetime.now().strftime("%Y%m%d")
        
        # Count estimates created today
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        count = await self.collection.count_documents({
            "company_id": ObjectId(company_id),
            "created_at": {"$gte": start_of_day, "$lt": end_of_day}
        })
        
        sequence = count + 1
        return f"EST-{today}-{sequence:04d}"
    
    def _calculate_totals(self, estimate_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate estimate totals"""
        line_items = estimate_data.get("line_items", [])
        
        # Calculate subtotal
        subtotal = sum(item.get("total_price", 0) for item in line_items)
        
        # Calculate discount
        discount_percentage = estimate_data.get("discount_percentage", 0)
        discount_amount = subtotal * (discount_percentage / 100)
        
        # Calculate tax
        taxable_amount = subtotal - discount_amount
        tax_rate = estimate_data.get("tax_rate", 0)
        tax_amount = taxable_amount * (tax_rate / 100)
        
        # Calculate total
        total_amount = taxable_amount + tax_amount
        
        estimate_data.update({
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_amount": tax_amount,
            "total_amount": total_amount
        })
        
        return estimate_data
    
    async def _populate_customer_info(self, estimate: Dict[str, Any]) -> Dict[str, Any]:
        """Populate customer information"""
        try:
            customer = await self.db.contacts.find_one({
                "_id": estimate["customer_id"]
            })
            
            if customer:
                estimate["customer_name"] = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                estimate["customer_email"] = customer.get("email")
            
            return estimate
            
        except Exception as e:
            logger.error(f"Error populating customer info: {e}")
            return estimate
    
    async def _generate_pdf(self, estimate: Dict[str, Any]) -> str:
        """Generate PDF document"""
        # This would integrate with a PDF generation service
        # For now, return a placeholder URL
        estimate_number = estimate.get("estimate_number", "unknown")
        return f"/estimates/{estimate_number}.pdf"
    
    async def _create_job_from_estimate(self, estimate: Dict[str, Any]) -> Dict[str, Any]:
        """Create job from accepted estimate"""
        # This would create a job record from the estimate
        # For now, return basic job data
        return {
            "id": str(ObjectId()),
            "estimate_id": str(estimate["_id"]),
            "customer_id": str(estimate["customer_id"]),
            "title": estimate["title"],
            "total_amount": estimate["total_amount"],
            "status": "scheduled"
        }
    
    def _format_estimate_response(self, estimate: Dict[str, Any]) -> Dict[str, Any]:
        """Format estimate for API response"""
        # Convert ObjectIds to strings
        estimate["id"] = str(estimate["_id"])
        estimate["company_id"] = str(estimate["company_id"])
        estimate["customer_id"] = str(estimate["customer_id"])
        
        if estimate.get("created_by"):
            estimate["created_by"] = str(estimate["created_by"])
        
        return estimate