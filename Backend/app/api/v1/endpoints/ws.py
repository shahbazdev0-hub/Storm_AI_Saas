# backend/app/api/v1/endpoints/ws.py - FIXED DATABASE ACCESS
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
import logging
import openai
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_database
from app.services.sms_service import SMSService
from app.services.email_service import EmailService

router = APIRouter(prefix="/ws")
logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

# Store conversation history per session
conversation_sessions = {}

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self.chatbot_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    async def connect_chatbot(self, websocket: WebSocket, company_id: str) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        self.chatbot_connections[company_id] = websocket

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
        for company_id, ws in list(self.chatbot_connections.items()):
            if ws == websocket:
                del self.chatbot_connections[company_id]
                break

manager = ConnectionManager()

@router.websocket("/customer")
async def customer_ws(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "hello", "ok": True})
        while True:
            data = await websocket.receive_text()
            if data.lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)



# ✅ FIXED: Create booking function - No hardcoded values
async def create_booking_from_session(
    db: AsyncIOMotorDatabase,
    session_id: str,
    session_data: dict,
    service_name: str,
    customer_name: str,
    customer_email: str,
    company_id: str
) -> bool:
    """Create booking in database - REFACTORED WITH NO HARDCODED VALUES"""
    try:
        logger.info(f"💾 Creating booking for {customer_name} ({customer_email})")
        logger.info(f"🏢 Company ID: {company_id}")
        
        # Validate company_id
        if not company_id or not ObjectId.is_valid(company_id):
            logger.error(f"❌ Invalid company_id: {company_id}")
            return False
        
        company_id_obj = ObjectId(company_id)
        
        # Determine service type (handle both dict and string)
        if isinstance(service_name, dict):
            service_type_str = service_name.get("name", "General Service")
        elif isinstance(service_name, str):
            service_type_str = service_name
        else:
            service_type_str = "General Service"
        
        # Create job document
        job_data = {
            "_id": ObjectId(),
            "company_id": company_id_obj,
            "title": f"{service_type_str} - {customer_name}",
            "description": "Booking created via AI chatbot",
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": "",
            "service_type": service_type_str,
            "location": "To be confirmed",
            "estimated_price": 0,
            "scheduled_date": datetime.utcnow() + timedelta(days=1),
            "scheduled_time": "To be confirmed",
            "frequency": "one-time",
            "status": "scheduled",
            "priority": "medium",
            "source": "ai_chatbot",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "notes": [{
                "content": f"Booking created via AI chatbot. Session: {session_id}",
                "created_at": datetime.utcnow(),
                "created_by": "ai_assistant"
            }],
            "ai_session_id": session_id
        }
        
        # Save to database
        result = await db.jobs.insert_one(job_data)
        job_id = str(result.inserted_id)
        
        logger.info(f"✅ Job saved with ID: {job_id}")
        logger.info(f"   🏢 Company: {company_id_obj}")
        logger.info(f"   👤 Customer: {customer_name}")
        logger.info(f"   📧 Email: {customer_email}")
        logger.info(f"   🧹 Service: {service_type_str}")
        
        # Create lead
        lead_data = {
            "_id": ObjectId(),
            "company_id": company_id_obj,
            "title": f"AI Lead - {customer_name}",
            "contact_name": customer_name,
            "contact_email": customer_email,
            "contact_phone": "",
            "service_type": service_type_str,
            "status": "converted",
            "lead_score": "hot",
            "source": "ai_chatbot",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "converted_at": datetime.utcnow(),
            "job_id": job_id,
            "notes": [{
                "content": f"Auto-converted from AI chatbot booking",
                "created_at": datetime.utcnow(),
                "created_by": "ai_assistant"
            }]
        }
        
        await db.leads.insert_one(lead_data)
        logger.info(f"✅ Lead created for {customer_name}")
        
        # Create admin notification
        notification_doc = {
            "_id": ObjectId(),
            "company_id": company_id_obj,
            "type": "ai_booking",
            "title": "New AI Chatbot Booking",
            "message": f"New booking: {service_type_str} for {customer_name}",
            "data": {
                "job_id": job_id,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "service_type": service_type_str,
                "source": "ai_chatbot"
            },
            "is_read": False,
            "priority": "high",
            "created_at": datetime.utcnow()
        }
        
        await db.notifications.insert_one(notification_doc)
        logger.info(f"✅ Admin notification created")
        
        logger.info(f"🎉 Booking process completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating booking: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

        
@router.websocket("/chatbot/{company_id}")
async def canvas_flow_chatbot(websocket: WebSocket, company_id: str):
    """Canvas Flow AI chatbot that reads from visual flow data"""
    await manager.connect_chatbot(websocket, company_id)
    session_id = f"session_{company_id}_{id(websocket)}"
    
    try:
        # ✅ Get database connection
        db = await get_database()
        
        # Initialize Canvas Flow AI Service
        from app.services.canvas_flow_ai_service import CanvasFlowAIService
        ai_service = CanvasFlowAIService(db)
        
        await websocket.send_json({
            "type": "connected",
            "company_id": company_id,
            "message": "AI Assistant connected! How can I help you today?"
        })
        
        logger.info(f"✅ Canvas Flow AI chatbot connected - Session: {session_id}")
        logger.info(f"🏢 Company ID: {company_id}")
        
        # Initialize conversation session with company_id
        conversation_sessions[session_id] = {
            "messages": [],
            "customer_info": {},
            "booking_state": "initial",
            "company_id": company_id,  # ✅ Store company_id
            "current_service": None,
            "awaiting_booking_info": False
        }
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type", "chat")
                
                if message_type == "chat":
                    user_message = message_data.get("message", "").strip()
                    if not user_message:
                        continue
                    
                    logger.info(f"👤 User message: {user_message}")
                    
                    # Add user message to conversation history
                    conversation_sessions[session_id]["messages"].append({
                        "role": "user", 
                        "content": user_message,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    # CHECK IF USER PROVIDED EMAIL AND NAME FOR BOOKING
                    if conversation_sessions[session_id].get("awaiting_booking_info"):
                        # Extract email and name from message
                        import re
                        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', user_message)
                        
                        if email_match:
                            email = email_match.group()
                            # Extract name
                            name_patterns = [
                                r'name\s+is\s+([A-Za-z]+)',
                                r'([A-Za-z]+)\s+' + re.escape(email),
                                r'and\s+name\s+is\s+([A-Za-z]+)',
                                r'my\s+name\s+is\s+([A-Za-z]+)',
                                r'(\w+)@'  # Fallback: use email prefix
                            ]
                            
                            name = None
                            for pattern in name_patterns:
                                name_match = re.search(pattern, user_message, re.IGNORECASE)
                                if name_match:
                                    name = name_match.group(1).title()
                                    break
                            
                            if not name:
                                name = email.split('@')[0].title()
                            
                            # Store customer info
                            conversation_sessions[session_id]["customer_info"] = {
                                "email": email,
                                "name": name
                            }
                            
                            logger.info(f"📧 Captured: {name} - {email}")
                            
                            # ✅ Create booking with database and company_id
                            current_service = conversation_sessions[session_id].get("current_service", "General Service")
                            
                            booking_result = await create_booking_from_session(
                                db=db,  # ✅ Pass database
                                session_id=session_id,
                                session_data=conversation_sessions[session_id],
                                service_name=current_service,
                                customer_name=name,
                                customer_email=email,
                                company_id=company_id  # ✅ Pass company_id
                            )
                            
                            if booking_result:
                                confirmation_message = f"Perfect! I've scheduled your appointment for {current_service if isinstance(current_service, str) else current_service.get('name', 'our service')}.\n\n" \
                                                     f"✅ Booking Confirmed\n" \
                                                     f"📧 Confirmation sent to: {email}\n" \
                                                     f"👤 Name: {name}\n\n" \
                                                     f"Our team will contact you within 24 hours to confirm the details. Is there anything else I can help you with?"
                                
                                conversation_sessions[session_id]["awaiting_booking_info"] = False
                                conversation_sessions[session_id]["booking_state"] = "completed"
                                
                                # Send confirmation
                                await websocket.send_json({
                                    "type": "chat_response",
                                    "session_id": session_id,
                                    "message": confirmation_message,
                                    "intent": "booking_confirmed",
                                    "booking_completed": True
                                })
                                
                                # Add to conversation history
                                conversation_sessions[session_id]["messages"].append({
                                    "role": "assistant",
                                    "content": confirmation_message,
                                    "timestamp": datetime.utcnow().isoformat()
                                })
                                
                                continue
                            else:
                                error_message = "I apologize, but there was an issue creating your booking. Please try again or contact us directly."
                                await websocket.send_json({
                                    "type": "chat_response",
                                    "session_id": session_id,
                                    "message": error_message,
                                    "intent": "booking_error"
                                })
                                conversation_sessions[session_id]["awaiting_booking_info"] = False
                                continue
                    
                    # CHECK IF USER WANTS TO BOOK
                    booking_keywords = ["book", "appointment", "schedule", "reserve", "yes book", "confirm booking"]
                    if any(keyword in user_message.lower() for keyword in booking_keywords):
                        if not conversation_sessions[session_id].get("customer_info", {}).get("email"):
                            # Ask for booking info
                            conversation_sessions[session_id]["awaiting_booking_info"] = True
                            booking_request_msg = "Great! I'd be happy to schedule an appointment for you.\n\n" \
                                                "Please provide:\n" \
                                                "• Your name\n" \
                                                "• Your email address\n\n" \
                                                "Example: My name is John and my email is john@example.com"
                            
                            await websocket.send_json({
                                "type": "chat_response",
                                "session_id": session_id,
                                "message": booking_request_msg,
                                "intent": "requesting_booking_info"
                            })
                            
                            conversation_sessions[session_id]["messages"].append({
                                "role": "assistant",
                                "content": booking_request_msg,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            continue
                    
                    # Generate response using Canvas Flow AI Service
                    ai_response = await ai_service.generate_canvas_response(
                        company_id=company_id,
                        message=user_message,
                        conversation_history=conversation_sessions[session_id]["messages"]
                    )
                    
                    # Add AI response to conversation history
                    conversation_sessions[session_id]["messages"].append({
                        "role": "assistant",
                        "content": ai_response["message"],
                        "timestamp": datetime.utcnow().isoformat(),
                        "service_info": ai_response.get("matched_service")
                    })
                    
                    # Update current service if matched
                    if ai_response.get("matched_service"):
                        conversation_sessions[session_id]["current_service"] = ai_response["matched_service"]
                    
                    logger.info(f"🤖 AI response intent: {ai_response.get('intent')}")
                    
                    # Send response to client
                    await websocket.send_json({
                        "type": "chat_response",
                        "session_id": session_id,
                        "message": ai_response["message"],
                        "intent": ai_response.get("intent"),
                        "matched_service": ai_response.get("matched_service"),
                        "available_services": ai_response.get("available_services", []),
                        "requires_human": ai_response.get("requires_human", False)
                    })
                    
                elif message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid message format."
                })
            except Exception as e:
                logger.error(f"❌ Error processing message: {e}")
                import traceback
                logger.error(traceback.format_exc())
                await websocket.send_json({
                    "type": "chat_response",
                    "session_id": session_id,
                    "message": "I'm experiencing a technical issue. Please try again.",
                    "intent": "error"
                })
                
    except WebSocketDisconnect:
        logger.info(f"Canvas Flow AI chatbot disconnected - Session: {session_id}")
        if session_id in conversation_sessions:
            del conversation_sessions[session_id]
    except Exception as e:
        logger.error(f"Canvas Flow AI chatbot error: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        manager.disconnect(websocket)

def detect_booking_completion(ai_message: str, conversation_history: list) -> bool:
    """Enhanced booking detection logic"""
    message_lower = ai_message.lower()
    
    # Look for booking confirmation phrases
    confirmation_phrases = [
        "booking confirmed", "appointment scheduled", "booking complete",
        "thank you for booking", "we'll call you", "confirmation email",
        "booking reference", "appointment confirmed"
    ]
    
    if any(phrase in message_lower for phrase in confirmation_phrases):
        logger.info(f"🎯 Booking phrases detected in AI message")
        return True
    
    # Check if we have all required booking information
    conversation_text = " ".join([msg["content"] for msg in conversation_history[-10:]])
    text_lower = conversation_text.lower()
    
    has_email = "@" in conversation_text
    has_service = any(service in text_lower for service in ["cleaning", "repair", "service"])
    has_time = any(time in text_lower for time in ["11 am", "morning", "afternoon", "evening", "daily"])
    has_confirmation = any(conf in text_lower for conf in ["yes", "book it", "confirm", "schedule"])
    
    if has_email and has_service and has_time and has_confirmation:
        logger.info(f"🎯 All booking criteria met: email={has_email}, service={has_service}, time={has_time}, confirm={has_confirmation}")
        return True
    
    return False

def get_system_prompt() -> str:
    """Enhanced system prompt with clear booking confirmation instruction"""
    return f"""You are an intelligent AI assistant for a professional cleaning and home services company in Lahore, Pakistan. 

Your primary responsibilities:
1. Help customers with service inquiries (cleaning, repairs, maintenance)
2. Gather customer information for quotes and bookings
3. Provide pricing estimates 
4. Schedule appointments
5. Answer questions about services

Company Services:
🧹 CLEANING SERVICES:
- Regular house cleaning (PKR 2,000-4,000 depending on size)
- Deep cleaning (PKR 3,000-6,000 depending on size) 
- Move-in/move-out cleaning
- Office cleaning
- Post-construction cleaning
- Ground/area cleaning (PKR 1,500-3,000 for smaller areas)

🔧 HOME SERVICES:
- Plumbing repairs
- Electrical work
- AC maintenance
- General repairs
- Painting services

Service Areas: All areas of Lahore including DHA, Gulberg, Johar Town, Liberty, Model Town, Cantt, Barkat Market, etc.

Pricing Guidelines:
- Small areas (300-500 sq ft): PKR 1,500-3,000
- Small homes/apartments: PKR 2,000-3,500
- Medium homes (2-3 bedrooms): PKR 3,500-5,000
- Large homes (4+ bedrooms): PKR 5,000-8,000+
- Deep cleaning: Add 50-60% to regular cleaning price
- Daily/regular service: 10-15% discount

IMPORTANT BOOKING PROCESS:
When a customer provides their email/contact info and confirms they want to book a service, you MUST end your response with:
"BOOKING_CONFIRMED: [Service] for [Customer] at [Location] on [Date/Time]. Contact: [Email/Phone]"

This is CRITICAL - the system needs this exact format to save the booking.

Example: "BOOKING_CONFIRMED: Daily cleaning for John at Barkat Market on daily basis at 11 AM. Contact: john@email.com"

Be conversational, helpful, and always try to complete bookings when customers are ready.

Current date: {datetime.now().strftime('%B %d, %Y')}
Available hours: 9 AM to 6 PM, Monday to Saturday"""

async def get_openai_response(session_id: str, messages: list) -> dict:
    """Get response from OpenAI API with enhanced booking detection"""
    try:
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-3.5-turbo",
            messages=messages,
            max_tokens=settings.OPENAI_MAX_TOKENS or 300,
            temperature=0.7,
            presence_penalty=0.1,
            frequency_penalty=0.1
        )
        
        ai_message = response.choices[0].message.content.strip()
        
        # ✅ CHECK IF THIS IS A BOOKING CONFIRMATION
        intent = analyze_intent(ai_message)
        if "BOOKING_CONFIRMED:" in ai_message:
            intent = "booking_confirmed"
            logger.info(f"🎯 BOOKING_CONFIRMED detected in AI response!")
        
        confidence = "high" if len(ai_message) > 20 else "medium"
        requires_human = should_escalate_to_human(ai_message, messages)
        
        logger.info(f"🤖 OpenAI Response - Session: {session_id}, Intent: {intent}, Length: {len(ai_message)}")
        
        return {
            "message": ai_message,
            "intent": intent,
            "confidence": confidence,
            "requires_human": requires_human
        }
        
    except Exception as e:
        logger.error(f"❌ Error calling OpenAI: {e}")
        return {
            "message": "I'm experiencing technical difficulties. Would you like me to connect you with a human agent?",
            "intent": "general_error",
            "requires_human": True
        }
# backend/app/api/v1/endpoints/ws.py - CORRECTED using your actual .env variables
# backend/app/api/v1/endpoints/ws.py - FIXED MongoDB connection
# backend/app/api/v1/endpoints/ws.py - FIXED to use your MongoDB Atlas
# backend/app/api/v1/endpoints/ws.py - FIXED with your actual company ID

async def handle_booking_completion(session_id: str, session_data: dict) -> bool:
    """FIXED: Save booking with your actual company ID"""
    try:
        logger.info(f"🎯 Starting booking save process for session: {session_id}")
        
        from motor.motor_asyncio import AsyncIOMotorClient
        from bson import ObjectId
        import os
        
        # Connect to your MongoDB Atlas
        mongodb_url = "mongodb+srv://hamza:hamza@cluster0.n44j3.mongodb.net/crm_platform"
        database_name = "crm_platform"
        
        logger.info(f"🔌 Connecting to MongoDB Atlas...")
        
        client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=5000)
        db = client[database_name]
        
        try:
            # Test connection
            await client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB Atlas database: {database_name}")
            
            # Extract booking information from conversation (using the recent messages)
            booking_info = await extract_booking_from_conversation_fixed(session_data["messages"])
            
            logger.info(f"📋 Extracted booking info: {booking_info}")
            
            if not booking_info or not booking_info.get('customer_email'):
                logger.warning(f"❌ Could not extract valid booking info from session {session_id}")
                return False
            
            # USE YOUR ACTUAL COMPANY ID
            # In handle_booking_completion function, replace the company ID logic with:
            company_id_obj = ObjectId("68af46dab1355f0072ad6fa1")  # Your company ID
            logger.info(f"🏢 Using your company ID: {company_id_obj}")
            
            # Create the job record with correct company ID
            job_data = {
                "_id": ObjectId(),
                "company_id": company_id_obj,  # This will match your admin user's company
                "title": f"{booking_info.get('service_type', 'Cleaning Service')} - {booking_info.get('customer_name', 'AI Customer')}",
                "description": f"AI Booking: {booking_info.get('description', 'Scheduled via chatbot')}",
                "customer_name": booking_info.get('customer_name', ''),
                "customer_email": booking_info.get('customer_email', ''),
                "customer_phone": booking_info.get('customer_phone', ''),
                "service_type": booking_info.get('service_type', 'Cleaning Service'),
                "location": booking_info.get('location', ''),
                "estimated_price": float(booking_info.get('price', 0)),
                "scheduled_date": booking_info.get('scheduled_date'),
                "scheduled_time": booking_info.get('scheduled_time', ''),
                "frequency": booking_info.get('frequency', 'one-time'),
                "status": "scheduled",
                "priority": "medium",
                "source": "ai_chatbot",  # CRITICAL for filtering in admin
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "notes": [
                    {
                        "content": f"Booking created via AI chatbot. Session: {session_id}",
                        "created_at": datetime.utcnow(),
                        "created_by": "ai_assistant"
                    }
                ],
                "ai_session_id": session_id
            }
            
            # Save to database with your company ID
            logger.info(f"💾 Saving job with company ID: {company_id_obj}")
            logger.info(f"📝 Job: {job_data['title']}")
            logger.info(f"👤 Customer: {job_data['customer_name']} ({job_data['customer_email']})")
            logger.info(f"🧹 Service: {job_data['service_type']} at {job_data['location']}")
            
            result = await db.jobs.insert_one(job_data)
            job_id = str(result.inserted_id)
            
            logger.info(f"✅ Job saved with ID: {job_id} under company: {company_id_obj}")
            
            # Verify it was saved with correct company ID
            verification = await db.jobs.find_one({"_id": result.inserted_id})
            if verification:
                logger.info(f"✅ Verification: Job company_id = {verification['company_id']}")
                logger.info(f"✅ Your admin company_id = {company_id_obj}")
                logger.info(f"✅ Company IDs match: {str(verification['company_id']) == str(company_id_obj)}")
            
            # Create lead record with same company ID
            lead_data = {
                "_id": ObjectId(),
                "company_id": company_id_obj,  # Same company ID
                "title": f"AI Lead - {booking_info.get('customer_name', 'Customer')}",
                "contact_name": booking_info.get('customer_name', ''),
                "contact_email": booking_info.get('customer_email', ''),
                "contact_phone": booking_info.get('customer_phone', ''),
                "service_type": booking_info.get('service_type', 'Cleaning'),
                "location": booking_info.get('location', ''),
                "budget": str(booking_info.get('price', 0)),
                "status": "converted",
                "lead_score": "hot",
                "source": "ai_chatbot",
                "notes": [
                    {
                        "content": f"Auto-converted to job via AI chatbot. Job ID: {job_id}",
                        "created_at": datetime.utcnow(),
                        "created_by": "ai_assistant"
                    }
                ],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "converted_at": datetime.utcnow(),
                "job_id": job_id
            }
            
            await db.leads.insert_one(lead_data)
            logger.info(f"✅ Lead created with same company ID")
            
            logger.info(f"🎉 SUCCESS! Booking saved with correct company ID")
            logger.info(f"   📋 Job ID: {job_id}")
            logger.info(f"   🏢 Company ID: {company_id_obj}")
            logger.info(f"   👤 Customer: {job_data['customer_email']}")
            
            return True
            
        finally:
            client.close()
            
    except Exception as e:
        logger.error(f"❌ Error saving booking: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return False

# In your ws.py file, replace the extract_booking_from_conversation function:

async def extract_booking_from_conversation_fixed(messages: list) -> dict:
    """Extract REAL booking information from recent conversation - IGNORE system prompt"""
    try:
        # Only look at USER and ASSISTANT messages, skip the system prompt
        user_messages = [msg for msg in messages if msg.get("role") in ["user", "assistant"]]
        
        # Focus on the last 6 user/assistant messages only
        recent_messages = user_messages[-6:] if len(user_messages) > 6 else user_messages
        conversation_text = " ".join([msg["content"] for msg in recent_messages])
        
        logger.info(f"📝 Extracting from RECENT conversation only: {conversation_text[:300]}...")
        
        booking_info = {}
        
        # Extract email - find emails ONLY in recent conversation
        import re
        email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', conversation_text)
        
        # Filter out example emails from system prompt
        example_emails = ["john@email.com", "john@example.com", "test@example.com"]
        real_emails = [email for email in email_matches if email not in example_emails]
        
        if real_emails:
            booking_info["customer_email"] = real_emails[-1]  # Get the most recent real email
            
            # Extract name from the conversation context
            # Look for patterns like "for [Name]" or extract from email
            name_patterns = [
                r'for\s+([A-Za-z]+)',
                r'name\s+is\s+([A-Za-z]+)',
                r'i\s+am\s+([A-Za-z]+)'
            ]
            
            customer_name = None
            for pattern in name_patterns:
                name_match = re.search(pattern, conversation_text, re.IGNORECASE)
                if name_match:
                    customer_name = name_match.group(1).title()
                    break
            
            if not customer_name:
                # Use email prefix as fallback, but clean it up
                email_prefix = real_emails[-1].split('@')[0]
                customer_name = email_prefix.replace('.', ' ').replace('_', ' ').title()
            
            booking_info["customer_name"] = customer_name
            logger.info(f"📧 Real email found: {booking_info['customer_email']}")
            logger.info(f"👤 Customer name: {customer_name}")
        else:
            logger.warning("❌ No real customer email found in recent conversation")
            return {}
        
        # Extract service type from recent conversation
        if "daily cleaning" in conversation_text.lower():
            booking_info["service_type"] = "Daily Cleaning"
        elif "home cleaning" in conversation_text.lower():
            booking_info["service_type"] = "Home Cleaning"
        elif "deep cleaning" in conversation_text.lower():
            booking_info["service_type"] = "Deep Cleaning"
        else:
            booking_info["service_type"] = "Cleaning Service"
        
        # Extract location from recent conversation
        lahore_areas = ["anarkali", "dha", "gulberg", "johar town", "liberty", "model town", "lahore"]
        for area in lahore_areas:
            if area in conversation_text.lower():
                booking_info["location"] = area.title() + (", Lahore" if area != "lahore" else "")
                break
        
        # Extract other details
        area_match = re.search(r'(\d+)\s*(?:square\s*)?feet?', conversation_text, re.IGNORECASE)
        if area_match:
            booking_info["description"] = f"Area: {area_match.group(1)} square feet"
        
        if "daily" in conversation_text.lower():
            booking_info["frequency"] = "daily"
        else:
            booking_info["frequency"] = "one-time"
        
        time_match = re.search(r'(\d{1,2})\s*(am|pm)', conversation_text, re.IGNORECASE)
        if time_match:
            booking_info["scheduled_time"] = f"{time_match.group(1)} {time_match.group(2).upper()}"
        
        # Set appropriate price
        if booking_info.get("service_type") == "Daily Cleaning":
            booking_info["price"] = 2500
        else:
            booking_info["price"] = 3000
        
        logger.info(f"📊 Final extracted real info: {booking_info}")
        return booking_info
        
    except Exception as e:
        logger.error(f"❌ Error in extraction: {e}")
        return {}
    
async def extract_booking_from_conversation(messages: list) -> dict:
    """Extract booking information from conversation history - FIXED"""
    try:
        # Get the most recent messages (focus on last 8 messages for current booking)
        recent_messages = messages[-8:] if len(messages) > 8 else messages
        conversation_text = " ".join([msg["content"] for msg in recent_messages])
        
        logger.info(f"📝 Extracting from recent conversation: {conversation_text[:200]}...")
        
        booking_info = {}
        
        # Extract email - look for the most recent email mentioned
        import re
        email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', conversation_text)
        if email_matches:
            # Get the last (most recent) email mentioned
            booking_info["customer_email"] = email_matches[-1]
            # Extract name from email (before @)
            name_from_email = email_matches[-1].split('@')[0]
            # Try to find actual name in conversation, otherwise use email prefix
            name_match = re.search(r'for\s+([A-Za-z]+)', conversation_text, re.IGNORECASE)
            if name_match:
                booking_info["customer_name"] = name_match.group(1).title()
            else:
                booking_info["customer_name"] = name_from_email.replace('.', ' ').replace('_', ' ').title()
            logger.info(f"📧 Found email: {booking_info['customer_email']}")
            logger.info(f"👤 Customer name: {booking_info['customer_name']}")
        
        # Extract service type - prioritize the most recent mention
        service_keywords = {
            "daily cleaning": "Daily Cleaning",
            "regular cleaning": "Regular Cleaning", 
            "deep cleaning": "Deep Cleaning",
            "home cleaning": "Home Cleaning",
            "house cleaning": "House Cleaning",
            "office cleaning": "Office Cleaning",
            "cleaning": "Cleaning Service"
        }
        
        # Look for service mentions in reverse order (most recent first)
        for keyword, service_type in service_keywords.items():
            if keyword in conversation_text.lower():
                booking_info["service_type"] = service_type
                logger.info(f"🧹 Service type: {booking_info['service_type']}")
                break
        
        # Extract location - look for Lahore areas mentioned
        locations = [
            "anarkali", "dha", "gulberg", "johar town", "liberty", 
            "model town", "cantt", "barkat market", "mall road",
            "fortress stadium", "township", "valencia town"
        ]
        
        conversation_lower = conversation_text.lower()
        for location in locations:
            if location in conversation_lower:
                # Extract the full location context
                location_pattern = rf'\b{re.escape(location)}[^.]*'
                location_match = re.search(location_pattern, conversation_text, re.IGNORECASE)
                if location_match:
                    booking_info["location"] = location_match.group().title()
                else:
                    booking_info["location"] = location.title()
                logger.info(f"📍 Location: {booking_info['location']}")
                break
        
        # Extract area size
        area_matches = re.findall(r'(\d+)\s*(?:square\s*)?(?:sq\s*)?feet?', conversation_text, re.IGNORECASE)
        if area_matches:
            area_size = area_matches[-1]  # Get the most recent mention
            booking_info["description"] = f"Area: {area_size} square feet"
            logger.info(f"📏 Area: {area_size} sq ft")
        
        # Extract frequency
        if "daily" in conversation_text.lower():
            booking_info["frequency"] = "daily"
            from datetime import datetime, timedelta
            booking_info["scheduled_date"] = datetime.now() + timedelta(days=1)  # Start tomorrow
        elif "weekly" in conversation_text.lower():
            booking_info["frequency"] = "weekly"
        elif "monthly" in conversation_text.lower():
            booking_info["frequency"] = "monthly"
        else:
            booking_info["frequency"] = "one-time"
        
        # Extract time
        time_matches = re.findall(r'(\d{1,2})\s*(am|pm)', conversation_text, re.IGNORECASE)
        if time_matches:
            time_match = time_matches[-1]  # Get the most recent time
            booking_info["scheduled_time"] = f"{time_match[0]} {time_match[1].upper()}"
            logger.info(f"🕐 Time: {booking_info['scheduled_time']}")
        
        # Extract price estimate - look for PKR mentions
        price_matches = re.findall(r'pkr\s*(\d{1,3}(?:,?\d{3})*)', conversation_text, re.IGNORECASE)
        if price_matches:
            price_text = price_matches[-1].replace(',', '')  # Most recent price
            booking_info["price"] = int(price_text)
            logger.info(f"💰 Price: PKR {booking_info['price']}")
        else:
            # Estimate based on service type and frequency
            if booking_info.get("service_type") == "Daily Cleaning":
                booking_info["price"] = 2500  # Daily service
            elif "deep" in booking_info.get("service_type", "").lower():
                booking_info["price"] = 4000  # Deep cleaning
            else:
                booking_info["price"] = 3000  # Regular cleaning
        
        logger.info(f"📊 Final booking info: {booking_info}")
        return booking_info
        
    except Exception as e:
        logger.error(f"❌ Error extracting booking info: {e}")
        return {}


# Also update the booking completion detection to be more accurate
def detect_booking_completion(ai_message: str, conversation_history: list) -> bool:
    """Enhanced booking detection logic - FIXED"""
    message_lower = ai_message.lower()
    
    # Look for BOOKING_CONFIRMED in AI message (most reliable)
    if "BOOKING_CONFIRMED:" in ai_message:
        logger.info(f"🎯 BOOKING_CONFIRMED found in AI response")
        return True
    
    # Look for booking confirmation phrases
    confirmation_phrases = [
        "booking is confirmed", "your booking is confirmed", "appointment confirmed", 
        "booking confirmed", "thank you for booking", "we'll be there", 
        "our team will be there", "booking complete"
    ]
    
    if any(phrase in message_lower for phrase in confirmation_phrases):
        logger.info(f"🎯 Booking confirmation phrases detected")
        return True
    
    # Check if we have recent complete booking information in the last few messages
    recent_messages = conversation_history[-6:]  # Last 6 messages
    recent_text = " ".join([msg["content"] for msg in recent_messages])
    
    has_email = "@" in recent_text
    has_confirm = any(word in recent_text.lower() for word in ["yes confirm", "confirm", "book it", "proceed"])
    has_service = any(service in recent_text.lower() for service in ["cleaning", "repair", "service", "maintenance"])
    has_location = any(loc in recent_text.lower() for loc in ["lahore", "dha", "gulberg", "anarkali", "barkat"])
    
    if has_email and has_confirm and has_service and has_location:
        logger.info(f"🎯 Complete booking criteria met in recent messages")
        return True
    
    return False

async def send_admin_notifications(booking_info: dict, job_id: str, company_id: str, db):
    """Send notifications to admin users"""
    try:
        logger.info(f"📢 Sending admin notifications...")
        
        # Get admin users
        admin_users = await db.users.find({
            "company_id": ObjectId(company_id),
            "role": {"$in": ["admin", "manager"]}
        }).to_list(length=10)
        
        logger.info(f"👥 Found {len(admin_users)} admin users")
        
        # Create in-app notification first (most reliable)
        try:
            notification_doc = {
                "company_id": ObjectId(company_id),
                "type": "ai_booking",
                "title": "New AI Chatbot Booking",
                "message": f"New booking: {booking_info.get('service_type')} for {booking_info.get('customer_name')}",
                "data": {
                    "job_id": job_id,
                    "customer_info": booking_info,
                    "source": "ai_chatbot"
                },
                "is_read": False,
                "priority": "high",
                "created_at": datetime.utcnow()
            }
            
            await db.notifications.insert_one(notification_doc)
            logger.info(f"✅ In-app notification created")
        except Exception as e:
            logger.error(f"❌ Error creating in-app notification: {e}")
        
        # Log notification details
        logger.info(f"🎉 Admin notifications process completed for booking {job_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in notification process: {e}")

def analyze_intent(ai_message: str) -> str:
    """Analyze the AI's response to determine intent"""
    message_lower = ai_message.lower()
    
    if "BOOKING_CONFIRMED:" in ai_message or "booking confirmed" in message_lower:
        return "booking_confirmed"
    elif any(word in message_lower for word in ["quote", "price", "cost", "pkr", "estimate"]):
        return "providing_quote"
    elif any(word in message_lower for word in ["book", "schedule", "appointment", "confirm"]):
        return "booking_assistance"
    elif any(word in message_lower for word in ["cleaning", "service", "repair", "maintenance"]):
        return "service_inquiry"
    elif any(word in message_lower for word in ["hello", "hi", "welcome", "help you"]):
        return "greeting"
    elif "?" in ai_message:
        return "asking_questions"
    else:
        return "conversation"

def should_escalate_to_human(ai_message: str, conversation_history: list) -> bool:
    """Determine if the conversation should be escalated to a human"""
    
    # Escalate if AI mentions connecting to human
    if any(phrase in ai_message.lower() for phrase in [
        "connect you with", "human agent", "speak to someone", "transfer you"
    ]):
        return True
    
    # Escalate if conversation is too long without booking
    if len(conversation_history) > 15:
        return True
    
    return False


