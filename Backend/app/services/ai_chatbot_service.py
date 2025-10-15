# backend/app/services/ai_chatbot_service.py
import openai
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.config import settings
from app.services.sms_service import SMSService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

class AIChatbotService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.sms_service = SMSService(database)
        self.email_service = EmailService(database)

    async def process_message(self, message: str, session_id: str, company_id: str) -> Dict[str, Any]:
        """Process incoming chat message with AI"""
        try:
            # Get or create chat session
            session = await self._get_or_create_session(session_id, company_id)
            
            # Add user message to conversation
            await self._add_message_to_session(session_id, "user", message)
            
            # Get conversation context
            conversation_history = await self._get_conversation_history(session_id)
            
            # Determine intent and extract information
            ai_response = await self._get_ai_response(conversation_history)
            
            # Add AI response to conversation
            await self._add_message_to_session(session_id, "assistant", ai_response["message"])
            
            # Process any actions (lead creation, scheduling, etc.)
            actions_result = await self._process_actions(ai_response, session, company_id)
            
            return {
                "message": ai_response["message"],
                "intent": ai_response.get("intent"),
                "actions": actions_result,
                "session_id": session_id,
                "requires_human": ai_response.get("requires_human", False)
            }
            
        except Exception as e:
            logger.error(f"Error processing chatbot message: {e}")
            return {
                "message": "I apologize, but I'm having trouble processing your request right now. Let me connect you with a human agent.",
                "requires_human": True,
                "session_id": session_id
            }

    async def _get_ai_response(self, conversation_history: List[Dict]) -> Dict[str, Any]:
        """Get AI response using OpenAI GPT"""
        system_prompt = """
        You are an AI sales assistant for a service company CRM. Your goal is to:
        1. Greet customers warmly
        2. Gather service type, location, preferred date/time, and budget
        3. Qualify leads (Hot/Warm/Cold)
        4. Schedule appointments when ready
        5. Handle objections professionally
        6. Escalate to human for price negotiations or complex issues

        Always be helpful, professional, and concise. Extract structured data when possible.
        
        Respond in JSON format with:
        {
            "message": "Your response to the customer",
            "intent": "greeting|service_inquiry|scheduling|objection|escalation",
            "extracted_data": {
                "service_type": "...",
                "location": "...",
                "preferred_date": "...",
                "budget": "...",
                "customer_info": {"name": "...", "phone": "...", "email": "..."}
            },
            "lead_score": "hot|warm|cold",
            "requires_human": false,
            "next_action": "gather_info|offer_schedule|create_lead|escalate"
        }
        """
        
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        
        response = self.openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=0.7
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            # Fallback if AI doesn't return proper JSON
            return {
                "message": response.choices[0].message.content,
                "intent": "general",
                "requires_human": False
            }

    async def _process_actions(self, ai_response: Dict, session: Dict, company_id: str) -> Dict[str, Any]:
        """Process AI-determined actions"""
        results = {"actions_taken": []}
        next_action = ai_response.get("next_action")
        extracted_data = ai_response.get("extracted_data", {})
        
        if next_action == "create_lead":
            lead_result = await self._create_lead(extracted_data, session, company_id)
            results["actions_taken"].append(lead_result)
        
        elif next_action == "offer_schedule":
            schedule_result = await self._offer_available_slots(extracted_data, company_id)
            results["actions_taken"].append(schedule_result)
            
        elif next_action == "escalate":
            escalation_result = await self._escalate_to_human(session, company_id)
            results["actions_taken"].append(escalation_result)
        
        return results

    async def _create_lead(self, extracted_data: Dict, session: Dict, company_id: str) -> Dict[str, Any]:
        """Create a lead from extracted data"""
        try:
            customer_info = extracted_data.get("customer_info", {})
            
            lead_data = {
                "_id": ObjectId(),
                "company_id": ObjectId(company_id),
                "title": f"{extracted_data.get('service_type', 'Service Request')} - {customer_info.get('name', 'Prospect')}",
                "contact_name": customer_info.get("name", ""),
                "contact_phone": customer_info.get("phone", ""),
                "contact_email": customer_info.get("email", ""),
                "service_type": extracted_data.get("service_type", ""),
                "location": extracted_data.get("location", ""),
                "budget": extracted_data.get("budget", ""),
                "preferred_date": extracted_data.get("preferred_date", ""),
                "lead_score": extracted_data.get("lead_score", "warm"),
                "source": "ai_chatbot",
                "status": "new",
                "priority": "medium",
                "notes": [
                    {
                        "content": f"Lead created via AI chatbot. Session: {session['_id']}",
                        "created_at": datetime.utcnow(),
                        "created_by": "ai_system"
                    }
                ],
                "tags": ["ai_generated", extracted_data.get("service_type", "").lower()],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.db.leads.insert_one(lead_data)
            
            return {
                "type": "lead_created",
                "success": True,
                "lead_id": str(result.inserted_id),
                "message": "Lead created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating lead: {e}")
            return {"type": "lead_created", "success": False, "error": str(e)}

    async def _offer_available_slots(self, extracted_data: Dict, company_id: str) -> Dict[str, Any]:
        """Get available time slots from Google Calendar"""
        try:
            # Get company's calendar integration
            integration = await self.db.integrations.find_one({
                "company_id": ObjectId(company_id),
                "type": "google_calendar",
                "is_active": True
            })
            
            if not integration:
                return {
                    "type": "calendar_check",
                    "success": False,
                    "message": "Calendar integration not available. Please contact us directly."
                }
            
            # Get next 7 days of available slots
            available_slots = await self._get_google_calendar_slots(integration["config"])
            
            return {
                "type": "calendar_check",
                "success": True,
                "available_slots": available_slots,
                "message": "Here are some available time slots:"
            }
            
        except Exception as e:
            logger.error(f"Error checking calendar availability: {e}")
            return {
                "type": "calendar_check",
                "success": False,
                "message": "Unable to check calendar availability right now."
            }

    async def _get_google_calendar_slots(self, config: Dict) -> List[Dict]:
        """Get available slots from Google Calendar"""
        try:
            import httpx
            
            headers = {
                "Authorization": f"Bearer {config['access_token']}",
                "Content-Type": "application/json"
            }
            
            # Get busy times for next 7 days
            start_time = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(days=7)
            
            freebusy_query = {
                "timeMin": start_time.isoformat() + "Z",
                "timeMax": end_time.isoformat() + "Z",
                "items": [{"id": "primary"}]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.googleapis.com/calendar/v3/freeBusy",
                    headers=headers,
                    json=freebusy_query
                )
            
            if response.status_code != 200:
                return []
            
            freebusy_data = response.json()
            busy_times = freebusy_data.get("calendars", {}).get("primary", {}).get("busy", [])
            
            # Generate available slots (avoiding busy times)
            available_slots = []
            current_time = start_time
            
            while current_time < end_time and len(available_slots) < 10:
                # Skip weekends and non-business hours
                if current_time.weekday() < 5 and 9 <= current_time.hour < 17:
                    slot_end = current_time + timedelta(hours=2)
                    
                    # Check if slot conflicts with busy times
                    is_available = True
                    for busy_period in busy_times:
                        busy_start = datetime.fromisoformat(busy_period["start"].replace("Z", "+00:00"))
                        busy_end = datetime.fromisoformat(busy_period["end"].replace("Z", "+00:00"))
                        
                        if (current_time < busy_end and slot_end > busy_start):
                            is_available = False
                            break
                    
                    if is_available:
                        available_slots.append({
                            "datetime": current_time.isoformat(),
                            "display": current_time.strftime("%B %d, %Y at %I:%M %p"),
                            "duration": "2 hours"
                        })
                
                current_time += timedelta(hours=1)
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting Google Calendar slots: {e}")
            return []

    async def schedule_appointment(self, session_id: str, slot_datetime: str, customer_info: Dict, company_id: str) -> Dict[str, Any]:
        """Schedule appointment and create calendar event"""
        try:
            # Create job/appointment record
            appointment_data = {
                "_id": ObjectId(),
                "company_id": ObjectId(company_id),
                "title": f"Service Appointment - {customer_info.get('name', 'Customer')}",
                "customer_name": customer_info.get("name", ""),
                "customer_phone": customer_info.get("phone", ""),
                "customer_email": customer_info.get("email", ""),
                "scheduled_date": datetime.fromisoformat(slot_datetime),
                "duration_minutes": 120,  # 2 hours default
                "status": "scheduled",
                "type": "consultation",
                "source": "ai_chatbot",
                "notes": f"Scheduled via AI chatbot. Session: {session_id}",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.db.jobs.insert_one(appointment_data)
            
            # Create Google Calendar event
            await self._create_google_calendar_event(appointment_data, company_id)
            
            # Send notifications to admin
            await self._send_appointment_notifications(appointment_data, company_id)
            
            return {
                "success": True,
                "appointment_id": str(result.inserted_id),
                "scheduled_datetime": slot_datetime,
                "message": "Appointment scheduled successfully! You'll receive a confirmation email shortly."
            }
            
        except Exception as e:
            logger.error(f"Error scheduling appointment: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Sorry, there was an error scheduling your appointment. Please try again or contact us directly."
            }

    async def _create_google_calendar_event(self, appointment_data: Dict, company_id: str):
        """Create Google Calendar event for appointment"""
        try:
            integration = await self.db.integrations.find_one({
                "company_id": ObjectId(company_id),
                "type": "google_calendar",
                "is_active": True
            })
            
            if not integration:
                return
            
            import httpx
            
            headers = {
                "Authorization": f"Bearer {integration['config']['access_token']}",
                "Content-Type": "application/json"
            }
            
            event_data = {
                "summary": appointment_data["title"],
                "description": f"Customer: {appointment_data['customer_name']}\nPhone: {appointment_data['customer_phone']}\nEmail: {appointment_data['customer_email']}\n\nNotes: {appointment_data['notes']}",
                "start": {
                    "dateTime": appointment_data["scheduled_date"].isoformat(),
                    "timeZone": "America/New_York"
                },
                "end": {
                    "dateTime": (appointment_data["scheduled_date"] + timedelta(minutes=appointment_data["duration_minutes"])).isoformat(),
                    "timeZone": "America/New_York"
                },
                "attendees": [
                    {"email": appointment_data["customer_email"]}
                ] if appointment_data["customer_email"] else []
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers=headers,
                    json=event_data
                )
            
            if response.status_code == 200:
                event = response.json()
                # Update appointment with calendar event ID
                await self.db.jobs.update_one(
                    {"_id": appointment_data["_id"]},
                    {"$set": {"calendar_event_id": event["id"]}}
                )
                
        except Exception as e:
            logger.error(f"Error creating Google Calendar event: {e}")

    async def _send_appointment_notifications(self, appointment_data: Dict, company_id: str):
        """Send notifications to admin about new appointment"""
        try:
            # Get company admin users
            admin_users = await self.db.users.find({
                "company_id": ObjectId(company_id),
                "role": {"$in": ["admin", "manager"]}
            }).to_list(length=10)
            
            notification_message = f"""
            🎯 NEW APPOINTMENT SCHEDULED via AI Chatbot!
            
            📅 Date: {appointment_data['scheduled_date'].strftime('%B %d, %Y at %I:%M %p')}
            👤 Customer: {appointment_data['customer_name']}
            📱 Phone: {appointment_data['customer_phone']}
            📧 Email: {appointment_data['customer_email']}
            
            Appointment ID: {appointment_data['_id']}
            """
            
            for admin in admin_users:
                # Send email notification
                if admin.get("email"):
                    await self.email_service.send_notification_email(
                        to_email=admin["email"],
                        subject="🎯 New AI Chatbot Appointment Scheduled",
                        message=notification_message
                    )
                
                # Send SMS notification
                if admin.get("phone"):
                    await self.sms_service.send_sms(
                        phone_number=admin["phone"],
                        message=f"🎯 New appointment scheduled via AI: {appointment_data['customer_name']} on {appointment_data['scheduled_date'].strftime('%m/%d at %I:%M%p')}",
                        company_id=company_id
                    )
            
            # Create in-app notification
            await self._create_in_app_notification(appointment_data, company_id)
            
        except Exception as e:
            logger.error(f"Error sending appointment notifications: {e}")

    async def _create_in_app_notification(self, appointment_data: Dict, company_id: str):
        """Create in-app notification for admin users"""
        notification_data = {
            "company_id": ObjectId(company_id),
            "type": "appointment_scheduled",
            "title": "New AI Chatbot Appointment",
            "message": f"Appointment scheduled with {appointment_data['customer_name']} for {appointment_data['scheduled_date'].strftime('%B %d, %Y at %I:%M %p')}",
            "data": {
                "appointment_id": str(appointment_data["_id"]),
                "customer_name": appointment_data["customer_name"],
                "scheduled_date": appointment_data["scheduled_date"].isoformat()
            },
            "is_read": False,
            "priority": "high",
            "created_at": datetime.utcnow()
        }
        
        await self.db.notifications.insert_one(notification_data)

    async def _escalate_to_human(self, session: Dict, company_id: str) -> Dict[str, Any]:
        """Escalate conversation to human agent"""
        try:
            # Update session to require human intervention
            await self.db.chat_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"requires_human": True, "escalated_at": datetime.utcnow()}}
            )
            
            # Notify admins about escalation
            admin_users = await self.db.users.find({
                "company_id": ObjectId(company_id),
                "role": {"$in": ["admin", "manager"]}
            }).to_list(length=5)
            
            escalation_message = f"🚨 AI Chatbot Escalation Required\n\nSession ID: {session['_id']}\nCustomer needs human assistance."
            
            for admin in admin_users:
                if admin.get("email"):
                    await self.email_service.send_notification_email(
                        to_email=admin["email"],
                        subject="🚨 AI Chatbot Escalation Required",
                        message=escalation_message
                    )
            
            return {
                "type": "escalation",
                "success": True,
                "message": "Conversation escalated to human agent"
            }
            
        except Exception as e:
            logger.error(f"Error escalating to human: {e}")
            return {"type": "escalation", "success": False, "error": str(e)}

    async def _get_or_create_session(self, session_id: str, company_id: str) -> Dict[str, Any]:
        """Get existing chat session or create new one"""
        try:
            if session_id:
                session = await self.db.chat_sessions.find_one({"_id": ObjectId(session_id)})
                if session:
                    return session
            
            # Create new session
            session_data = {
                "_id": ObjectId(),
                "company_id": ObjectId(company_id),
                "messages": [],
                "requires_human": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.chat_sessions.insert_one(session_data)
            return session_data
            
        except Exception as e:
            logger.error(f"Error managing chat session: {e}")
            raise

    async def _add_message_to_session(self, session_id: str, role: str, content: str):
        """Add message to chat session"""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.chat_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    async def _get_conversation_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for context"""
        session = await self.db.chat_sessions.find_one({"_id": ObjectId(session_id)})
        
        if not session:
            return []
        
        # Convert to OpenAI format
        history = []
        for msg in session.get("messages", [])[-10:]:  # Last 10 messages for context
            history.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        return history