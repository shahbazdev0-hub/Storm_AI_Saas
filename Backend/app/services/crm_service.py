# app/services/crm_service.py
from typing import Optional, Dict, Any, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from fastapi import HTTPException, status

from app.core.logger import get_logger
from app.schemas.contact import ContactCreate, ContactUpdate, ContactSearch
from app.schemas.lead import LeadCreate, LeadUpdate, LeadSearch
from app.models.contact import Contact, ContactType, ContactStatus
from app.models.lead import Lead, LeadStatus, LeadPriority

logger = get_logger("services.crm")

class CRMService:
    """Customer Relationship Management service"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.contacts_collection = database.contacts
        self.leads_collection = database.leads
        self.activities_collection = database.activities
        self.notes_collection = database.notes
    
    # Contact Management Methods
    
    async def get_contacts(
        self, 
        company_id: str, 
        search: ContactSearch = None,
        skip: int = 0, 
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get contacts with filtering and pagination"""
        try:
            # Build query
            query = {"company_id": ObjectId(company_id)}
            
            if search:
                # Text search
                if search.q:
                    query["$or"] = [
                        {"first_name": {"$regex": search.q, "$options": "i"}},
                        {"last_name": {"$regex": search.q, "$options": "i"}},
                        {"email": {"$regex": search.q, "$options": "i"}},
                        {"phone": {"$regex": search.q, "$options": "i"}},
                        {"company": {"$regex": search.q, "$options": "i"}}
                    ]
                
                # Filters
                if search.type:
                    query["type"] = search.type
                if search.status:
                    query["status"] = search.status
                if search.tag:
                    query["tags"] = search.tag
                if search.assigned_to:
                    query["assigned_to"] = ObjectId(search.assigned_to)
                if search.lead_source:
                    query["lead_source"] = search.lead_source
                if search.has_email is not None:
                    if search.has_email:
                        query["email"] = {"$ne": None, "$ne": ""}
                    else:
                        query["$or"] = [{"email": None}, {"email": ""}]
                if search.has_phone is not None:
                    if search.has_phone:
                        query["phone"] = {"$ne": None, "$ne": ""}
                    else:
                        query["$or"] = [{"phone": None}, {"phone": ""}]
                
                # Date filters
                if search.created_after or search.created_before:
                    date_filter = {}
                    if search.created_after:
                        date_filter["$gte"] = search.created_after
                    if search.created_before:
                        date_filter["$lte"] = search.created_before
                    query["created_at"] = date_filter
            
            # Get total count
            total = await self.contacts_collection.count_documents(query)
            
            # Build sort criteria
            sort_field = search.sort_by if search else "created_at"
            sort_order = -1 if (search and search.sort_order == "desc") else 1
            
            # Get contacts
            cursor = self.contacts_collection.find(query).sort(sort_field, sort_order).skip(skip).limit(limit)
            contacts = await cursor.to_list(length=limit)
            
            # Format contacts
            formatted_contacts = [self._format_contact_response(contact) for contact in contacts]
            
            # Calculate pagination
            page = (skip // limit) + 1 if limit > 0 else 1
            pages = (total + limit - 1) // limit if limit > 0 else 1
            
            logger.info(f"Retrieved {len(contacts)} contacts for company {company_id}")
            
            return {
                "contacts": formatted_contacts,
                "total": total,
                "page": page,
                "size": limit,
                "pages": pages,
                "has_next": skip + limit < total,
                "has_prev": skip > 0
            }
            
        except Exception as e:
            logger.error(f"Error getting contacts for company {company_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve contacts"
            )
    
    async def get_contact(self, contact_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """Get contact by ID"""
        try:
            if not ObjectId.is_valid(contact_id):
                return None
            
            contact = await self.contacts_collection.find_one({
                "_id": ObjectId(contact_id),
                "company_id": ObjectId(company_id)
            })
            
            return self._format_contact_response(contact) if contact else None
            
        except Exception as e:
            logger.error(f"Error getting contact {contact_id}: {e}")
            return None
    
    async def create_contact(self, contact_data: ContactCreate, company_id: str) -> Dict[str, Any]:
        """Create new contact"""
        try:
            # Check for duplicates
            duplicate_query = {
                "company_id": ObjectId(company_id),
                "$or": []
            }
            
            if contact_data.email:
                duplicate_query["$or"].append({"email": contact_data.email.lower()})
            if contact_data.phone:
                duplicate_query["$or"].append({"phone": contact_data.phone})
            
            if duplicate_query["$or"]:
                existing = await self.contacts_collection.find_one(duplicate_query)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Contact with this email or phone already exists"
                    )
            
            # Prepare contact document
            contact_doc = {
                "company_id": ObjectId(company_id),
                "type": contact_data.type or ContactType.LEAD,
                "status": contact_data.status or ContactStatus.ACTIVE,
                "first_name": contact_data.first_name,
                "last_name": contact_data.last_name,
                "middle_name": contact_data.middle_name,
                "title": contact_data.title,
                "job_title": contact_data.job_title,
                "email": contact_data.email.lower() if contact_data.email else None,
                "phone": contact_data.phone,
                "phone_mobile": contact_data.phone_mobile,
                "phone_work": contact_data.phone_work,
                "company": contact_data.company,
                "department": contact_data.department,
                "website": contact_data.website,
                "preferred_contact_method": contact_data.preferred_contact_method,
                "email_opt_in": contact_data.email_opt_in,
                "sms_opt_in": contact_data.sms_opt_in,
                "marketing_opt_in": contact_data.marketing_opt_in,
                "lead_source": contact_data.lead_source,
                "lead_source_detail": contact_data.lead_source_detail,
                "referral_source": contact_data.referral_source,
                "assigned_to": ObjectId(contact_data.assigned_to) if contact_data.assigned_to else None,
                "tags": contact_data.tags or [],
                "categories": contact_data.categories or [],
                "custom_fields": contact_data.custom_fields or {},
                "spouse_name": contact_data.spouse_name,
                "children": contact_data.children or [],
                "birthday": contact_data.birthday,
                "anniversary": contact_data.anniversary,
                "addresses": [addr.model_dump() for addr in contact_data.addresses] if contact_data.addresses else [],
                "social_media": {},
                "notes": [],
                "activities": [],
                "email_engagement_score": 0.0,
                "sms_engagement_score": 0.0,
                "total_revenue": 0.0,
                "job_count": 0,
                "invoice_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert contact
            result = await self.contacts_collection.insert_one(contact_doc)
            contact_doc["_id"] = result.inserted_id
            
            logger.info(f"Created contact: {contact_data.email} for company {company_id}")
            
            return self._format_contact_response(contact_doc)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating contact: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create contact"
            )
    
    async def update_contact(
        self, 
        contact_id: str, 
        contact_data: ContactUpdate, 
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update contact"""
        try:
            if not ObjectId.is_valid(contact_id):
                return None
            
            update_doc = {"updated_at": datetime.utcnow()}
            
            # Update only provided fields
            for field, value in contact_data.model_dump(exclude_unset=True).items():
                if field == "assigned_to" and value:
                    update_doc[field] = ObjectId(value)
                elif field == "email" and value:
                    update_doc[field] = value.lower()
                elif value is not None:
                    update_doc[field] = value
            
            result = await self.contacts_collection.update_one(
                {"_id": ObjectId(contact_id), "company_id": ObjectId(company_id)},
                {"$set": update_doc}
            )
            
            if result.modified_count:
                updated_contact = await self.contacts_collection.find_one({"_id": ObjectId(contact_id)})
                logger.info(f"Updated contact: {contact_id}")
                return self._format_contact_response(updated_contact)
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating contact {contact_id}: {e}")
            return None
    
    async def delete_contact(self, contact_id: str, company_id: str) -> bool:
        """Delete contact (soft delete)"""
        try:
            if not ObjectId.is_valid(contact_id):
                return False
            
            result = await self.contacts_collection.update_one(
                {"_id": ObjectId(contact_id), "company_id": ObjectId(company_id)},
                {
                    "$set": {
                        "deleted_at": datetime.utcnow(),
                        "status": ContactStatus.INACTIVE,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count:
                logger.info(f"Deleted contact: {contact_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting contact {contact_id}: {e}")
            return False
    
    async def add_contact_note(
        self, 
        contact_id: str, 
        content: str, 
        user_id: str, 
        company_id: str,
        note_type: str = "general"
    ) -> bool:
        """Add note to contact"""
        try:
            note_data = {
                "id": str(ObjectId()),
                "content": content,
                "note_type": note_type,
                "is_important": False,
                "is_customer_visible": True,
                "created_by": ObjectId(user_id),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.contacts_collection.update_one(
                {"_id": ObjectId(contact_id), "company_id": ObjectId(company_id)},
                {
                    "$push": {"notes": note_data},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            if result.modified_count:
                logger.info(f"Added note to contact: {contact_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error adding note to contact {contact_id}: {e}")
            return False
    
    async def add_contact_activity(
        self, 
        contact_id: str, 
        activity_type: str, 
        description: str,
        user_id: str, 
        company_id: str,
        activity_data: Dict[str, Any] = None
    ) -> bool:
        """Add activity to contact"""
        try:
            activity = {
                "id": str(ObjectId()),
                "activity_type": activity_type,
                "description": description,
                "created_at": datetime.utcnow(),
                "created_by": ObjectId(user_id),
                "data": activity_data or {}
            }
            
            update_doc = {
                "$push": {"activities": activity},
                "$set": {
                    "last_contact": datetime.utcnow(),
                    "last_contact_type": activity_type,
                    "last_contacted_by": ObjectId(user_id),
                    "updated_at": datetime.utcnow()
                }
            }
            
            result = await self.contacts_collection.update_one(
                {"_id": ObjectId(contact_id), "company_id": ObjectId(company_id)},
                update_doc
            )
            
            if result.modified_count:
                logger.info(f"Added activity to contact: {contact_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error adding activity to contact {contact_id}: {e}")
            return False
    
    # Lead Management Methods
    
    async def get_leads(
        self, 
        company_id: str, 
        search: LeadSearch = None,
        skip: int = 0, 
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get leads with filtering and pagination"""
        try:
            # Build query
            query = {"company_id": ObjectId(company_id)}
            
            if search:
                # Text search
                if search.q:
                    # Search in related contact data
                    contact_ids = await self._search_contacts_for_leads(company_id, search.q)
                    query["$or"] = [
                        {"contact_id": {"$in": contact_ids}},
                        {"service_details": {"$regex": search.q, "$options": "i"}},
                        {"lead_number": {"$regex": search.q, "$options": "i"}}
                    ]
                
                # Filters
                if search.status:
                    query["status"] = search.status
                if search.priority:
                    query["priority"] = search.priority
                if search.quality:
                    query["quality"] = search.quality
                if search.stage:
                    query["stage"] = search.stage
                if search.source:
                    query["source"] = search.source
                if search.service_type:
                    query["service_type"] = search.service_type
                if search.assigned_to:
                    query["assigned_to"] = ObjectId(search.assigned_to)
                if search.tag:
                    query["tags"] = search.tag
                
                # Value filters
                if search.min_value is not None or search.max_value is not None:
                    value_filter = {}
                    if search.min_value is not None:
                        value_filter["$gte"] = search.min_value
                    if search.max_value is not None:
                        value_filter["$lte"] = search.max_value
                    query["estimated_value"] = value_filter
                
                # Probability filters
                if search.min_probability is not None or search.max_probability is not None:
                    prob_filter = {}
                    if search.min_probability is not None:
                        prob_filter["$gte"] = search.min_probability
                    if search.max_probability is not None:
                        prob_filter["$lte"] = search.max_probability
                    query["probability"] = prob_filter
                
                # Score filter
                if search.min_score is not None:
                    query["scoring.ai_score"] = {"$gte": search.min_score}
                
                # Boolean filters
                if search.has_budget is not None:
                    query["has_budget"] = search.has_budget
                if search.decision_maker is not None:
                    query["decision_maker"] = search.decision_maker
                if search.overdue_follow_up is not None and search.overdue_follow_up:
                    query["next_follow_up"] = {"$lt": datetime.utcnow()}
                
                # Date filters
                if search.created_after or search.created_before:
                    date_filter = {}
                    if search.created_after:
                        date_filter["$gte"] = search.created_after
                    if search.created_before:
                        date_filter["$lte"] = search.created_before
                    query["created_at"] = date_filter
                
                if search.expected_close_after or search.expected_close_before:
                    close_filter = {}
                    if search.expected_close_after:
                        close_filter["$gte"] = search.expected_close_after
                    if search.expected_close_before:
                        close_filter["$lte"] = search.expected_close_before
                    query["expected_close_date"] = close_filter
            
            # Get total count
            total = await self.leads_collection.count_documents(query)
            
            # Build sort criteria
            sort_field = search.sort_by if search else "created_at"
            sort_order = -1 if (search and search.sort_order == "desc") else 1
            
            # Get leads
            cursor = self.leads_collection.find(query).sort(sort_field, sort_order).skip(skip).limit(limit)
            leads = await cursor.to_list(length=limit)
            
            # Format leads with contact information
            formatted_leads = []
            for lead in leads:
                formatted_lead = await self._format_lead_response(lead)
                formatted_leads.append(formatted_lead)
            
            # Calculate pagination
            page = (skip // limit) + 1 if limit > 0 else 1
            pages = (total + limit - 1) // limit if limit > 0 else 1
            
            logger.info(f"Retrieved {len(leads)} leads for company {company_id}")
            
            return {
                "leads": formatted_leads,
                "total": total,
                "page": page,
                "size": limit,
                "pages": pages,
                "has_next": skip + limit < total,
                "has_prev": skip > 0
            }
            
        except Exception as e:
            logger.error(f"Error getting leads for company {company_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leads"
            )
    
    async def get_lead(self, lead_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """Get lead by ID"""
        try:
            if not ObjectId.is_valid(lead_id):
                return None
            
            lead = await self.leads_collection.find_one({
                "_id": ObjectId(lead_id),
                "company_id": ObjectId(company_id)
            })
            
            return await self._format_lead_response(lead) if lead else None
            
        except Exception as e:
            logger.error(f"Error getting lead {lead_id}: {e}")
            return None
    
    # Add this at the very beginning of your create_lead method:
    async def create_lead(self, lead_data: LeadCreate, company_id: str) -> Dict[str, Any]:
        """Create new lead - with debugging"""
        try:
            # ✅ ADD EXTENSIVE DEBUGGING
            logger.info(f"🔧 === LEAD CREATION DEBUG START ===")
            logger.info(f"🔧 Company ID: {company_id}")
            logger.info(f"🔧 Lead Data Type: {type(lead_data)}")
            logger.info(f"🔧 Lead Data: {lead_data}")
        
                   # Test database connection
            test_count = await self.leads_collection.count_documents({})
            logger.info(f"🔧 Total leads in DB: {test_count}")
        
                 # Your existing code continues...
            logger.info(f"🔧 Creating lead for company {company_id}")
            logger.info(f"🔧 Lead data received: {lead_data}")
            
            contact_id = None
            
            # ✅ CHECK: Does lead_data have contact_id?
            if hasattr(lead_data, 'contact_id') and lead_data.contact_id:
                # Verify existing contact
                contact = await self.contacts_collection.find_one({
                    "_id": ObjectId(lead_data.contact_id),
                    "company_id": ObjectId(company_id)
                })
                
                if contact:
                    contact_id = ObjectId(lead_data.contact_id)
                    logger.info(f"✅ Using existing contact: {contact_id}")
                else:
                    logger.warning(f"⚠️ Contact {lead_data.contact_id} not found, will create new one")
            
            # ✅ CREATE CONTACT: If no valid contact_id, create a new contact
            if not contact_id:
                logger.info("🔧 Creating new contact for lead")
                
                # Extract contact info from lead data
                contact_doc = {
                    "company_id": ObjectId(company_id),
                    "first_name": getattr(lead_data, 'first_name', 'Unknown'),
                    "last_name": getattr(lead_data, 'last_name', 'Lead'),
                    "email": getattr(lead_data, 'email', None),
                    "phone": getattr(lead_data, 'phone', None),
                    "address": getattr(lead_data, 'address', ''),
                    "city": getattr(lead_data, 'city', ''),
                    "state": getattr(lead_data, 'state', ''),
                    "type": "lead",
                    "status": "active",
                    "tags": [],
                    "custom_fields": {},
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                logger.info(f"🔧 Inserting contact: {contact_doc}")
                contact_result = await self.contacts_collection.insert_one(contact_doc)
                contact_id = contact_result.inserted_id
                logger.info(f"✅ Contact created with ID: {contact_id}")
            
            # ✅ GENERATE LEAD NUMBER
            lead_number = f"LEAD-{datetime.now().strftime('%Y%m%d')}-{str(ObjectId())[-4:]}"
            
            # ✅ PREPARE LEAD DOCUMENT
            lead_doc = {
                "company_id": ObjectId(company_id),
                "contact_id": contact_id,  # Now we definitely have this!
                "lead_number": lead_number,
                "status": getattr(lead_data, 'status', 'new'),
                "priority": getattr(lead_data, 'priority', 5),
                "source": getattr(lead_data, 'source', 'website'),
                "estimated_value": getattr(lead_data, 'estimated_value', None),
                "tags": getattr(lead_data, 'tags', []),
                "notes": getattr(lead_data, 'notes', ''),
                "service_type": "other",  # Default
                "scoring": {
                    "ai_score": getattr(lead_data, 'ai_score', None),
                    "ai_confidence": None,
                    "total_score": None,
                    "quality_grade": None,
                    "last_calculated": None
                },
                "interactions": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # ✅ ADD OPTIONAL FIELDS (only if they exist in lead_data)
            optional_fields = [
                'quality', 'stage', 'source_detail', 'source_url', 'utm_source', 
                'utm_medium', 'utm_campaign', 'utm_content', 'service_details', 
                'service_location', 'budget_range_min', 'budget_range_max',
                'expected_close_date', 'decision_timeline', 'project_start_date',
                'has_budget', 'budget_confirmed', 'decision_maker', 'pain_points',
                'current_solution', 'competitors', 'competitive_advantage',
                'probability', 'forecast_category', 'next_follow_up', 
                'follow_up_reason', 'custom_fields'
            ]
            
            for field in optional_fields:
                if hasattr(lead_data, field):
                    value = getattr(lead_data, field)
                    if value is not None:
                        lead_doc[field] = value
            
            # Handle assigned_to
            if hasattr(lead_data, 'assigned_to') and lead_data.assigned_to:
                lead_doc["assigned_to"] = ObjectId(lead_data.assigned_to)
            
            # ✅ CALCULATE WEIGHTED VALUE
            if lead_doc.get("estimated_value") and lead_doc.get("probability"):
                lead_doc["weighted_value"] = lead_doc["estimated_value"] * (lead_doc["probability"] / 100)
            
            logger.info(f"🔧 Inserting lead into database: {lead_doc}")
            
            # ✅ INSERT LEAD INTO DATABASE
            result = await self.leads_collection.insert_one(lead_doc)
            lead_doc["_id"] = result.inserted_id
            
            logger.info(f"✅ Lead created in database: {lead_number} with ID: {result.inserted_id}")
            
            # ✅ FORMAT AND RETURN RESPONSE
            formatted_lead = await self._format_lead_response(lead_doc)
            logger.info(f"✅ Returning formatted lead: {formatted_lead}")
            
            return formatted_lead
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating lead: {e}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create lead: {str(e)}"
            )
    
    async def update_lead(
        self, 
        lead_id: str, 
        lead_data: LeadUpdate, 
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Update lead"""
        try:
            if not ObjectId.is_valid(lead_id):
                return None
            
            update_doc = {"updated_at": datetime.utcnow()}
            
            # Update only provided fields
            for field, value in lead_data.model_dump(exclude_unset=True).items():
                if field == "assigned_to" and value:
                    update_doc[field] = ObjectId(value)
                elif value is not None:
                    update_doc[field] = value
            
            # Recalculate weighted value if needed
            if "estimated_value" in update_doc or "probability" in update_doc:
                lead = await self.leads_collection.find_one({"_id": ObjectId(lead_id)})
                if lead:
                    estimated_value = update_doc.get("estimated_value", lead.get("estimated_value"))
                    probability = update_doc.get("probability", lead.get("probability"))
                    if estimated_value and probability:
                        update_doc["weighted_value"] = estimated_value * (probability / 100)
            
            result = await self.leads_collection.update_one(
                {"_id": ObjectId(lead_id), "company_id": ObjectId(company_id)},
                {"$set": update_doc}
            )
            
            if result.modified_count:
                updated_lead = await self.leads_collection.find_one({"_id": ObjectId(lead_id)})
                logger.info(f"Updated lead: {lead_id}")
                return await self._format_lead_response(updated_lead)
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating lead {lead_id}: {e}")
            return None
    
    async def update_lead_score(self, lead_id: str, ai_score: float, confidence: float = None) -> bool:
        """Update lead AI score"""
        try:
            update_doc = {
                "scoring.ai_score": ai_score,
                "scoring.ai_last_scored": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if confidence is not None:
                update_doc["scoring.ai_confidence"] = confidence
            
            # Calculate quality grade
            if ai_score >= 90:
                grade = "A+"
            elif ai_score >= 80:
                grade = "A"
            elif ai_score >= 70:
                grade = "B"
            elif ai_score >= 60:
                grade = "C"
            elif ai_score >= 50:
                grade = "D"
            else:
                grade = "F"
            
            update_doc["scoring.quality_grade"] = grade
            
            result = await self.leads_collection.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": update_doc}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating lead score for {lead_id}: {e}")
            return False
    
    # Helper Methods
    
    async def _search_contacts_for_leads(self, company_id: str, query: str) -> List[ObjectId]:
        """Search contacts and return IDs for lead search"""
        try:
            contacts = await self.contacts_collection.find({
                "company_id": ObjectId(company_id),
                "$or": [
                    {"first_name": {"$regex": query, "$options": "i"}},
                    {"last_name": {"$regex": query, "$options": "i"}},
                    {"email": {"$regex": query, "$options": "i"}},
                    {"company": {"$regex": query, "$options": "i"}}
                ]
            }).to_list(length=None)
            
            return [contact["_id"] for contact in contacts]
            
        except Exception as e:
            logger.error(f"Error searching contacts for leads: {e}")
            return []
    
    async def _format_lead_response(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        """Format lead for response with contact information"""
        if not lead:
            return None
        
        # Convert ObjectIds to strings
        lead["id"] = str(lead["_id"])
        lead["company_id"] = str(lead["company_id"])
        lead["contact_id"] = str(lead["contact_id"])
        
        if lead.get("assigned_to"):
            lead["assigned_to"] = str(lead["assigned_to"])
        
        # Get contact information
        try:
            contact = await self.contacts_collection.find_one({"_id": lead["contact_id"]})
            if contact:
                lead["contact_name"] = f"{contact['first_name']} {contact['last_name']}"
                lead["contact_email"] = contact.get("email")
                lead["contact_phone"] = contact.get("phone")
        except:
            pass
        
        # Add computed fields
        lead["is_active"] = lead["status"] not in [LeadStatus.CLOSED_WON, LeadStatus.CLOSED_LOST]
        lead["is_qualified"] = lead["status"] in [LeadStatus.QUALIFIED, LeadStatus.PROPOSAL_SENT, LeadStatus.NEGOTIATION]
        lead["is_overdue"] = (lead.get("next_follow_up") and 
                             lead["next_follow_up"] < datetime.utcnow())
        
        # Calculate days in pipeline
        lead["days_in_pipeline"] = (datetime.utcnow() - lead["created_at"]).days
        
        # Calculate total score
        scoring = lead.get("scoring", {})
        if scoring.get("ai_score"):
            lead["total_score"] = scoring["ai_score"]
        else:
            lead["total_score"] = 0.0
        
        # Quality grade
        lead["quality_grade"] = scoring.get("quality_grade", "F")
        
        return lead
    
    def _format_contact_response(self, contact: Dict[str, Any]) -> Dict[str, Any]:
        """Format contact for response"""
        if not contact:
            return None
        
        # Convert ObjectIds to strings
        contact["id"] = str(contact["_id"])
        contact["company_id"] = str(contact["company_id"])
        
        if contact.get("assigned_to"):
            contact["assigned_to"] = str(contact["assigned_to"])
        
        # Add computed fields
        contact["full_name"] = f"{contact['first_name']} {contact['last_name']}"
        contact["display_name"] = contact["full_name"]
        contact["primary_phone"] = (contact.get("phone_mobile") or 
                                   contact.get("phone") or 
                                   contact.get("phone_work"))
        contact["is_active"] = contact["status"] == ContactStatus.ACTIVE
        contact["can_contact_email"] = (contact.get("email") and 
                                       contact.get("email_opt_in", True) and
                                       not contact.get("email_bounced", False))
        contact["can_contact_sms"] = (contact.get("phone") and 
                                     contact.get("sms_opt_in", True) and
                                     not contact.get("sms_delivery_failed", False))
        
        # Calculate engagement score
        email_score = contact.get("email_engagement_score", 0.0)
        sms_score = contact.get("sms_engagement_score", 0.0)
        contact["engagement_score"] = (email_score * 0.6 + sms_score * 0.4)
        
        return contact