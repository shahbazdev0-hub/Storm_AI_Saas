# backend/app/services/canvas_flow_ai_service.py - FINAL VERSION NO DUPLICATES
import logging
import openai
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)

class CanvasFlowAIService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_canvas_response(
        self, 
        company_id: str, 
        message: str, 
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        try:
            intent = self._analyze_intent(message)
            
            # Handle booking requests
            if intent == "booking_request":
                has_email = "@" in " ".join([msg.get("content", "") for msg in (conversation_history or [])])
                
                if has_email:
                    # Check for duplicates before creating booking
                    customer_email = self._extract_email_from_conversation(conversation_history or [])
                    if customer_email:
                        duplicate_exists = await self._check_duplicate_booking(customer_email, company_id)
                        
                        if not duplicate_exists:
                            # Create booking only if no duplicate
                            await self._save_booking(conversation_history or [], company_id)
                            return {
                                "message": f"Perfect! I've scheduled your appointment. Our team will contact you soon to confirm the details.\n\nBOOKING_CONFIRMED: Service for {self._extract_name_from_conversation(conversation_history or [])} at Lahore. Contact: {customer_email}",
                                "intent": intent,
                                "matched_service": None,
                                "available_services": [],
                                "requires_human": False,
                                "booking_completed": True
                            }
                        else:
                            return {
                                "message": "I see you already have a recent booking with us. Our team will contact you soon to confirm the details. Is there anything else I can help you with?",
                                "intent": intent,
                                "matched_service": None,
                                "available_services": [],
                                "requires_human": False,
                                "booking_completed": False
                            }
                    else:
                        return {
                            "message": "I'd be happy to help you schedule an appointment! Could you please provide your email address and name so I can proceed with your booking?",
                            "intent": intent,
                            "matched_service": None,
                            "available_services": [],
                            "requires_human": False,
                            "booking_completed": False
                        }
                else:
                    return {
                        "message": "I'd be happy to help you schedule an appointment! Could you please provide your email address and name so I can proceed with your booking?",
                        "intent": intent,
                        "matched_service": None,
                        "available_services": [],
                        "requires_human": False,
                        "booking_completed": False
                    }
            
            # Handle service inquiries
            elif intent == "service_inquiry":
                services = await self._get_canvas_services(company_id)
                if services:
                    service_list = "\n".join([f"• {s['name']}: {s['description']}" for s in services])
                    response_msg = f"I can help you with these services:\n\n{service_list}\n\nWhich service interests you, or would you like to book an appointment?"
                else:
                    response_msg = "I can help you with our services. What specific service are you looking for?"
                
                return {
                    "message": response_msg,
                    "intent": intent,
                    "matched_service": services[0] if services else None,
                    "available_services": services,
                    "requires_human": False,
                    "booking_completed": False
                }
            
            # All other messages
            else:
                response_msg = self._get_openai_response(message, conversation_history or [])
                return {
                    "message": response_msg,
                    "intent": intent,
                    "matched_service": None,
                    "available_services": [],
                    "requires_human": False,
                    "booking_completed": False
                }
                
        except Exception as e:
            logger.error(f"Error: {e}")
            return {
                "message": "I'm here to help you with our services. How can I assist you today?",
                "intent": "error",
                "matched_service": None,
                "available_services": [],
                "requires_human": False,
                "booking_completed": False
            }

    def _get_openai_response(self, message: str, conversation_history: List[Dict]) -> str:
        try:
            messages = [
                {"role": "system", "content": "You are a professional AI assistant for a home services company in Lahore, Pakistan. Be conversational, helpful, and professional. Keep responses concise and focused on customer needs."},
                {"role": "user", "content": message}
            ]
            
            # NO AWAIT HERE - This is the fix
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return "I'm here to help you with our services. How can I assist you today?"

    async def _get_canvas_services(self, company_id: str) -> List[Dict]:
        try:
            flows = await self.db.conversation_flows.find({
                "company_id": ObjectId(company_id),
                "active": True
            }).to_list(length=50)
            
            services = []
            seen_names = set()  # Track unique service names to prevent duplicates
            
            for flow in flows:
                nodes = flow.get('nodes', [])
                for node in nodes:
                    title = node.get('data', {}).get('title', '')
                    if title and title not in ['Begin', 'Welcome Node', 'Services'] and title.lower() not in seen_names:
                        services.append({
                            "name": title,
                            "description": f"We provide {title.lower()} services"
                        })
                        seen_names.add(title.lower())
                
                connections = flow.get('connections', [])
                for conn in connections:
                    transition = conn.get('transition', '')
                    if transition and transition.strip() and transition.lower() not in seen_names:
                        services.append({
                            "name": transition,
                            "description": f"We provide {transition.lower()} services"
                        })
                        seen_names.add(transition.lower())
            
            # Remove any remaining duplicates and filter out common words
            unique_services = []
            excluded_words = {'begin', 'welcome', 'node', 'services', 'start', 'end'}
            
            for service in services:
                if service['name'].lower() not in excluded_words:
                    unique_services.append(service)
            
            return unique_services[:5]  # Return max 5 unique services
            
        except Exception as e:
            logger.error(f"Canvas services error: {e}")
            return []

    def _analyze_intent(self, message: str) -> str:
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["book", "schedule", "appointment"]):
            return "booking_request"
        elif any(word in message_lower for word in ["services", "what do you offer", "provide"]):
            return "service_inquiry"
        elif any(word in message_lower for word in ["hi", "hello", "hey"]):
            return "greeting"
        else:
            return "conversation"

    def _extract_email_from_conversation(self, conversation_history: List[Dict]) -> Optional[str]:
        """Extract email from conversation history"""
        conversation_text = " ".join([msg.get("content", "") for msg in conversation_history])
        
        import re
        email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', conversation_text)
        
        # Filter out example emails
        real_emails = [email for email in email_matches if not any(ex in email for ex in ["example.com", "john@email.com"])]
        
        return real_emails[-1] if real_emails else None

    def _extract_name_from_conversation(self, conversation_history: List[Dict]) -> str:
        """Extract customer name from conversation"""
        conversation_text = " ".join([msg.get("content", "") for msg in conversation_history])
        
        import re
        # Look for name patterns
        name_match = re.search(r'(?:name is|my name is|i am)\s+([A-Za-z]+)', conversation_text, re.IGNORECASE)
        if name_match:
            return name_match.group(1).title()
        
        # Fallback to email prefix
        email = self._extract_email_from_conversation(conversation_history)
        if email:
            return email.split('@')[0].title()
        
        return "Customer"

    async def _check_duplicate_booking(self, customer_email: str, company_id: str) -> bool:
        """Check if customer has a recent booking to prevent duplicates"""
        try:
            # Check for bookings in the last hour
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            existing_booking = await self.db.jobs.find_one({
                "company_id": ObjectId(company_id),
                "customer_email": customer_email,
                "source": "canvas_ai_chatbot",
                "created_at": {"$gte": cutoff_time}
            })
            
            if existing_booking:
                logger.info(f"Duplicate booking prevented for {customer_email}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking duplicate booking: {e}")
            return False

    async def _save_booking(self, conversation_history: List[Dict], company_id: str):
        try:
            conversation_text = " ".join([msg.get("content", "") for msg in conversation_history])
            
            customer_email = self._extract_email_from_conversation(conversation_history)
            if not customer_email:
                logger.warning("No email found in conversation")
                return
            
            customer_name = self._extract_name_from_conversation(conversation_history)
            
            # Extract service type from conversation
            service_type = "General Service"
            if "gardening" in conversation_text.lower():
                service_type = "Gardening Service"
            elif "repairing" in conversation_text.lower() or "repair" in conversation_text.lower():
                service_type = "Repairing Service"
            elif "plumbing" in conversation_text.lower():
                service_type = "Plumbing Service"
            elif "cleaning" in conversation_text.lower():
                service_type = "Cleaning Service"
            
            job_data = {
                "_id": ObjectId(),
                "company_id": ObjectId(company_id),
                "title": f"{service_type} - {customer_name}",
                "description": "Booking created via Canvas Flow AI Assistant",
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": "",
                "service_type": service_type,
                "location": "Lahore",
                "estimated_price": 3000,
                "scheduled_date": None,
                "scheduled_time": "",
                "frequency": "one-time",
                "status": "scheduled",
                "priority": "medium",
                "source": "canvas_ai_chatbot",  # Make sure this matches your AI bookings endpoint
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "notes": [{
                    "content": "Booking created via Canvas Flow AI chatbot",
                    "created_at": datetime.utcnow(),
                    "created_by": "canvas_ai_assistant"
                }],
                "ai_session_id": f"canvas_{datetime.utcnow().timestamp()}"
            }
            
            result = await self.db.jobs.insert_one(job_data)
            logger.info(f"✅ Canvas AI booking saved with ID: {result.inserted_id}")
            logger.info(f"✅ Customer: {customer_name} ({customer_email})")
            logger.info(f"✅ Service: {service_type}")
            
        except Exception as e:
            logger.error(f"Booking save error: {e}")

    async def get_flow_statistics(self, company_id: str) -> Dict[str, Any]:
        try:
            total = await self.db.conversation_flows.count_documents({"company_id": ObjectId(company_id)})
            active = await self.db.conversation_flows.count_documents({"company_id": ObjectId(company_id), "active": True})
            return {"total_services": total, "active_services": active, "company_id": company_id}
        except:
            return {"total_services": 0, "active_services": 0, "company_id": company_id}