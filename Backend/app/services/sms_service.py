# app/services/sms_service.py
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import re
import asyncio
from urllib.parse import urlencode

from app.core.config import settings
from app.core.logger import get_logger
from app.models.contact import Contact
from app.models.lead import Lead

logger = get_logger(__name__)

class SMSService:
    """SMS service for sending and managing SMS messages"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize Twilio client"""
        try:
            if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
                self.client = Client(
                    settings.TWILIO_ACCOUNT_SID,
                    settings.TWILIO_AUTH_TOKEN
                )
                logger.info("✅ Twilio SMS client initialized successfully")
            else:
                logger.warning("⚠️ Twilio credentials not configured - SMS features disabled")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Twilio client: {e}")
    
    async def send_sms(
        self, 
        phone_number: str, 
        message: str, 
        company_id: str,
        contact_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        user_id: Optional[str] = None,
        template_id: Optional[str] = None,
        scheduled_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Send SMS message"""
        try:
            # Validate phone number
            formatted_phone = self._format_phone_number(phone_number)
            if not formatted_phone:
                raise ValueError(f"Invalid phone number: {phone_number}")
            
            # Check company SMS limits
            if not await self._check_sms_limits(company_id):
                raise ValueError("SMS limit exceeded for this month")
            
            # Validate message content
            if not message or len(message.strip()) == 0:
                raise ValueError("Message content cannot be empty")
            
            if len(message) > 1600:  # SMS limit
                logger.warning(f"Message truncated from {len(message)} to 1600 characters")
                message = message[:1597] + "..."
            
            # Send via Twilio if not scheduled
            twilio_sid = None
            status = "queued"
            
            if not scheduled_at or scheduled_at <= datetime.utcnow():
                if self.client and settings.TWILIO_PHONE_NUMBER:
                    try:
                        twilio_message = self.client.messages.create(
                            body=message,
                            from_=settings.TWILIO_PHONE_NUMBER,
                            to=formatted_phone
                        )
                        twilio_sid = twilio_message.sid
                        status = "sent"
                        logger.info(f"📱 SMS sent to {formatted_phone} - SID: {twilio_sid}")
                    except TwilioException as e:
                        logger.error(f"❌ Twilio error sending SMS to {formatted_phone}: {e}")
                        status = "failed"
                        await self._handle_sms_failure(formatted_phone, str(e), company_id)
                else:
                    logger.warning("⚠️ Twilio not configured, SMS stored but not sent")
                    status = "not_sent"
            else:
                status = "scheduled"
            
            # Store in database
            sms_data = {
                "company_id": ObjectId(company_id),
                "contact_id": ObjectId(contact_id) if contact_id else None,
                "lead_id": ObjectId(lead_id) if lead_id else None,
                "campaign_id": ObjectId(campaign_id) if campaign_id else None,
                "phone_number": formatted_phone,
                "message": message,
                "direction": "outbound",
                "status": status,
                "twilio_sid": twilio_sid,
                "template_id": template_id,
                "sent_by": ObjectId(user_id) if user_id else None,
                "scheduled_at": scheduled_at,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "metadata": {
                    "character_count": len(message),
                    "segment_count": self._calculate_sms_segments(message)
                }
            }
            
            result = await self.db.sms_messages.insert_one(sms_data)
            
            # Update company SMS usage
            if status == "sent":
                await self._increment_sms_usage(company_id)
            
            # Update contact last contact timestamp
            if contact_id:
                await self._update_contact_last_contact(contact_id, "sms")
            
            # Update lead communication tracking
            if lead_id:
                await self._update_lead_communication(lead_id, "sms")
            
            return {
                "id": str(result.inserted_id),
                "phone_number": formatted_phone,
                "message": message,
                "status": status,
                "twilio_sid": twilio_sid,
                "created_at": sms_data["created_at"],
                "character_count": len(message),
                "segment_count": self._calculate_sms_segments(message)
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending SMS to {phone_number}: {e}")
            raise
    
    async def send_bulk_sms(
        self,
        phone_numbers: List[str],
        message: str,
        company_id: str,
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        batch_size: int = 10,
        delay_seconds: int = 1
    ) -> Dict[str, Any]:
        """Send SMS to multiple recipients"""
        try:
            results = {
                "total": len(phone_numbers),
                "sent": 0,
                "failed": 0,
                "errors": []
            }
            
            # Process in batches to avoid rate limits
            for i in range(0, len(phone_numbers), batch_size):
                batch = phone_numbers[i:i + batch_size]
                
                # Send batch
                tasks = []
                for phone in batch:
                    task = self.send_sms(
                        phone_number=phone,
                        message=message,
                        company_id=company_id,
                        user_id=user_id,
                        campaign_id=campaign_id
                    )
                    tasks.append(task)
                
                # Execute batch
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for j, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        results["failed"] += 1
                        results["errors"].append({
                            "phone": batch[j],
                            "error": str(result)
                        })
                    else:
                        results["sent"] += 1
                
                # Add delay between batches
                if i + batch_size < len(phone_numbers):
                    await asyncio.sleep(delay_seconds)
            
            logger.info(f"📱 Bulk SMS completed - Sent: {results['sent']}, Failed: {results['failed']}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error sending bulk SMS: {e}")
            raise
    
    async def receive_sms_webhook(
        self,
        webhook_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle incoming SMS webhook from Twilio"""
        try:
            phone_number = self._format_phone_number(webhook_data.get("From", ""))
            message = webhook_data.get("Body", "")
            twilio_sid = webhook_data.get("MessageSid", "")
            
            if not phone_number or not message:
                raise ValueError("Invalid webhook data")
            
            # Find company by phone number or use default
            company = await self._find_company_by_phone(phone_number)
            if not company:
                logger.warning(f"⚠️ No company found for incoming SMS from {phone_number}")
                return {"status": "no_company_found"}
            
            company_id = str(company["_id"])
            
            # Store incoming message
            sms_data = {
                "company_id": ObjectId(company_id),
                "phone_number": phone_number,
                "message": message,
                "direction": "inbound",
                "status": "received",
                "twilio_sid": twilio_sid,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "metadata": {
                    "character_count": len(message),
                    "webhook_data": webhook_data
                }
            }
            
            # Find associated contact/lead
            contact = await self._find_contact_by_phone(phone_number, company_id)
            lead = await self._find_lead_by_phone(phone_number, company_id)
            
            if contact:
                sms_data["contact_id"] = ObjectId(contact["_id"])
                # Update contact last contact
                await self._update_contact_last_contact(str(contact["_id"]), "sms_received")
            
            if lead:
                sms_data["lead_id"] = ObjectId(lead["_id"])
                # Update lead response tracking
                await self._update_lead_communication(str(lead["_id"]), "sms_received")
            
            result = await self.db.sms_messages.insert_one(sms_data)
            
            # Check for AI auto-response
            auto_response = None
            if company.get("ai_settings", {}).get("sms_auto_respond", False):
                auto_response = await self._generate_auto_response(
                    message, phone_number, company_id, contact, lead
                )
            
            return {
                "id": str(result.inserted_id),
                "phone_number": phone_number,
                "message": message,
                "contact_id": str(contact["_id"]) if contact else None,
                "lead_id": str(lead["_id"]) if lead else None,
                "auto_response": auto_response,
                "status": "processed"
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing SMS webhook: {e}")
            raise
    
    async def get_conversation_history(
        self,
        phone_number: str,
        company_id: str,
        limit: int = 50,
        include_metadata: bool = False
    ) -> List[Dict[str, Any]]:
        """Get SMS conversation history for a phone number"""
        try:
            formatted_phone = self._format_phone_number(phone_number)
            
            query = {
                "company_id": ObjectId(company_id),
                "phone_number": formatted_phone
            }
            
            cursor = self.db.sms_messages.find(query).sort("created_at", 1).limit(limit)
            messages = await cursor.to_list(length=limit)
            
            conversation = []
            for msg in messages:
                message_data = {
                    "id": str(msg["_id"]),
                    "direction": msg["direction"],
                    "message": msg["message"],
                    "status": msg["status"],
                    "created_at": msg["created_at"],
                    "sender": "company" if msg["direction"] == "outbound" else "customer"
                }
                
                if include_metadata:
                    message_data["metadata"] = msg.get("metadata", {})
                    message_data["twilio_sid"] = msg.get("twilio_sid")
                
                conversation.append(message_data)
            
            return conversation
            
        except Exception as e:
            logger.error(f"❌ Error getting conversation history: {e}")
            raise
    
    async def get_sms_analytics(
        self,
        company_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get SMS analytics for a company"""
        try:
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=30)
            if not end_date:
                end_date = datetime.utcnow()
            
            pipeline = [
                {
                    "$match": {
                        "company_id": ObjectId(company_id),
                        "created_at": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "direction": "$direction",
                            "status": "$status"
                        },
                        "count": {"$sum": 1},
                        "total_characters": {"$sum": {"$strLenCP": "$message"}}
                    }
                }
            ]
            
            results = await self.db.sms_messages.aggregate(pipeline).to_list(length=None)
            
            analytics = {
                "total_sent": 0,
                "total_received": 0,
                "delivery_rate": 0.0,
                "total_characters": 0,
                "by_status": {},
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
            
            total_outbound = 0
            delivered_outbound = 0
            
            for result in results:
                direction = result["_id"]["direction"]
                status = result["_id"]["status"]
                count = result["count"]
                
                key = f"{direction}_{status}"
                analytics["by_status"][key] = count
                analytics["total_characters"] += result["total_characters"]
                
                if direction == "outbound":
                    total_outbound += count
                    analytics["total_sent"] += count
                    
                    if status in ["sent", "delivered"]:
                        delivered_outbound += count
                elif direction == "inbound":
                    analytics["total_received"] += count
            
            # Calculate delivery rate
            if total_outbound > 0:
                analytics["delivery_rate"] = (delivered_outbound / total_outbound) * 100
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting SMS analytics: {e}")
            raise
    
    async def schedule_sms(
        self,
        phone_number: str,
        message: str,
        scheduled_at: datetime,
        company_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Schedule SMS for future delivery"""
        try:
            if scheduled_at <= datetime.utcnow():
                raise ValueError("Scheduled time must be in the future")
            
            return await self.send_sms(
                phone_number=phone_number,
                message=message,
                company_id=company_id,
                scheduled_at=scheduled_at,
                **kwargs
            )
            
        except Exception as e:
            logger.error(f"❌ Error scheduling SMS: {e}")
            raise
    
    async def cancel_scheduled_sms(
        self,
        sms_id: str,
        company_id: str
    ) -> bool:
        """Cancel scheduled SMS"""
        try:
            result = await self.db.sms_messages.update_one(
                {
                    "_id": ObjectId(sms_id),
                    "company_id": ObjectId(company_id),
                    "status": "scheduled"
                },
                {
                    "$set": {
                        "status": "cancelled",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error cancelling scheduled SMS: {e}")
            return False
    
    async def process_scheduled_messages(self) -> Dict[str, Any]:
        """Process scheduled SMS messages that are due"""
        try:
            now = datetime.utcnow()
            
            # Find scheduled messages that are due
            query = {
                "status": "scheduled",
                "scheduled_at": {"$lte": now}
            }
            
            scheduled_messages = await self.db.sms_messages.find(query).to_list(length=100)
            
            results = {
                "processed": 0,
                "failed": 0,
                "errors": []
            }
            
            for msg in scheduled_messages:
                try:
                    # Send the message
                    if self.client and settings.TWILIO_PHONE_NUMBER:
                        twilio_message = self.client.messages.create(
                            body=msg["message"],
                            from_=settings.TWILIO_PHONE_NUMBER,
                            to=msg["phone_number"]
                        )
                        
                        # Update message status
                        await self.db.sms_messages.update_one(
                            {"_id": msg["_id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "twilio_sid": twilio_message.sid,
                                    "updated_at": now
                                }
                            }
                        )
                        
                        # Update company usage
                        await self._increment_sms_usage(str(msg["company_id"]))
                        
                        results["processed"] += 1
                        logger.info(f"📱 Sent scheduled SMS {msg['_id']}")
                    
                except Exception as e:
                    # Mark as failed
                    await self.db.sms_messages.update_one(
                        {"_id": msg["_id"]},
                        {
                            "$set": {
                                "status": "failed",
                                "error_message": str(e),
                                "updated_at": now
                            }
                        }
                    )
                    
                    results["failed"] += 1
                    results["errors"].append({
                        "message_id": str(msg["_id"]),
                        "error": str(e)
                    })
                    logger.error(f"❌ Failed to send scheduled SMS {msg['_id']}: {e}")
            
            if results["processed"] > 0 or results["failed"] > 0:
                logger.info(f"📱 Processed scheduled SMS - Sent: {results['processed']}, Failed: {results['failed']}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error processing scheduled messages: {e}")
            raise
    
    # Helper methods
    def _format_phone_number(self, phone: str) -> Optional[str]:
        """Format phone number to E.164 format"""
        if not phone:
            return None
        
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        if not digits:
            return None
        
        # Add country code if missing
        if len(digits) == 10:  # US number without country code
            digits = "1" + digits
        elif len(digits) == 11 and digits.startswith("1"):  # US number with country code
            pass
        elif len(digits) > 11:  # International number
            pass
        else:
            return None  # Invalid length
        
        return "+" + digits
    
    def _calculate_sms_segments(self, message: str) -> int:
        """Calculate number of SMS segments"""
        if len(message) <= 160:
            return 1
        elif len(message) <= 306:
            return 2
        else:
            return (len(message) + 152) // 153  # 153 chars per segment for multi-part
    
    async def _check_sms_limits(self, company_id: str) -> bool:
        """Check if company has SMS sends remaining"""
        try:
            company = await self.db.companies.find_one({"_id": ObjectId(company_id)})
            if not company:
                return False
            
            billing_info = company.get("billing_info", {})
            monthly_limit = billing_info.get("monthly_sms_limit", 0)
            monthly_used = billing_info.get("monthly_sms_used", 0)
            
            return monthly_used < monthly_limit
            
        except Exception as e:
            logger.error(f"❌ Error checking SMS limits: {e}")
            return False
    
    async def _increment_sms_usage(self, company_id: str) -> None:
        """Increment SMS usage counter"""
        try:
            await self.db.companies.update_one(
                {"_id": ObjectId(company_id)},
                {
                    "$inc": {"billing_info.monthly_sms_used": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        except Exception as e:
            logger.error(f"❌ Error incrementing SMS usage: {e}")
    
    async def _handle_sms_failure(self, phone_number: str, error: str, company_id: str) -> None:
        """Handle SMS delivery failure"""
        try:
            # Update contact SMS delivery status
            await self.db.contacts.update_one(
                {
                    "company_id": ObjectId(company_id),
                    "$or": [
                        {"phone": phone_number},
                        {"phone_mobile": phone_number},
                        {"phone_work": phone_number}
                    ]
                },
                {
                    "$set": {
                        "sms_delivery_failed": True,
                        "sms_failure_reason": error,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            logger.error(f"❌ Error handling SMS failure: {e}")
    
    async def _update_contact_last_contact(self, contact_id: str, contact_type: str) -> None:
        """Update contact last contact timestamp"""
        try:
            await self.db.contacts.update_one(
                {"_id": ObjectId(contact_id)},
                {
                    "$set": {
                        "last_contact": datetime.utcnow(),
                        "last_contact_type": contact_type,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            logger.error(f"❌ Error updating contact last contact: {e}")
    
    async def _update_lead_communication(self, lead_id: str, communication_type: str) -> None:
        """Update lead communication tracking"""
        try:
            update_data = {"updated_at": datetime.utcnow()}
            
            if communication_type == "sms":
                update_data["last_sms_sent"] = datetime.utcnow()
            elif communication_type == "sms_received":
                update_data["last_response_received"] = datetime.utcnow()
            
            await self.db.leads.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"❌ Error updating lead communication: {e}")
    
    async def _find_company_by_phone(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Find company by phone number"""
        try:
            # For now, return the first active company
            # In production, you might have phone number routing logic
            return await self.db.companies.find_one({"status": "active"})
        except Exception as e:
            logger.error(f"❌ Error finding company by phone: {e}")
            return None
    
    async def _find_contact_by_phone(self, phone_number: str, company_id: str) -> Optional[Dict[str, Any]]:
        """Find contact by phone number"""
        try:
            return await self.db.contacts.find_one({
                "company_id": ObjectId(company_id),
                "$or": [
                    {"phone": phone_number},
                    {"phone_mobile": phone_number},
                    {"phone_work": phone_number}
                ]
            })
        except Exception as e:
            logger.error(f"❌ Error finding contact by phone: {e}")
            return None
    
    async def _find_lead_by_phone(self, phone_number: str, company_id: str) -> Optional[Dict[str, Any]]:
        """Find lead by phone number via contact"""
        try:
            contact = await self._find_contact_by_phone(phone_number, company_id)
            if contact:
                return await self.db.leads.find_one({
                    "company_id": ObjectId(company_id),
                    "contact_id": contact["_id"],
                    "status": {"$nin": ["closed_won", "closed_lost"]}
                })
            return None
        except Exception as e:
            logger.error(f"❌ Error finding lead by phone: {e}")
            return None
    
    async def _generate_auto_response(
        self,
        message: str,
        phone_number: str,
        company_id: str,
        contact: Optional[Dict[str, Any]],
        lead: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Generate AI auto-response"""
        try:
            # Import AI service here to avoid circular imports
            from app.services.ai_service import AIService
            
            ai_service = AIService(self.db)
            company = await self.db.companies.find_one({"_id": ObjectId(company_id)})
            
            if not company:
                return None
            
            # Get conversation history
            conversation = await self.get_conversation_history(phone_number, company_id, limit=10)
            
            # Generate response
            response = await ai_service.generate_sms_response(
                conversation_history=conversation,
                lead_data=lead or {},
                company_settings=company.get("ai_settings", {})
            )
            
            if response:
                # Send auto-response
                result = await self.send_sms(
                    phone_number=phone_number,
                    message=response,
                    company_id=company_id,
                    contact_id=str(contact["_id"]) if contact else None,
                    lead_id=str(lead["_id"]) if lead else None
                )
                
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error generating auto-response: {e}")
            return None

# Export the service
__all__ = ["SMSService"]