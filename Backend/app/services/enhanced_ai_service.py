# backend/app/services/enhanced_ai_service.py
import openai
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.config import settings

logger = logging.getLogger(__name__)

class EnhancedAIService:
    """Enhanced AI Service with Dynamic Service Management Integration"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        
    async def get_company_services(self, company_id: str) -> List[Dict[str, Any]]:
        """Fetch active services for a company"""
        try:
            services = await self.db.ai_services.find({
                "company_id": ObjectId(company_id),
                "active": True
            }).to_list(length=100)
            
            return [{
                "id": str(service["_id"]),
                "name": service["name"],
                "category": service["category"],
                "description": service["description"],
                "keywords": service["keywords"],
                "pricing": service["pricing"],
                "availability": service["availability"],
                "prompts": service["prompts"]
            } for service in services]
            
        except Exception as e:
            logger.error(f"Error fetching company services: {e}")
            return []
    
    async def match_service_from_message(self, company_id: str, message: str) -> Optional[Dict[str, Any]]:
        """Match user message to available services based on keywords"""
        try:
            services = await self.get_company_services(company_id)
            message_lower = message.lower()
            
            # Try exact keyword matching first
            for service in services:
                if any(keyword.lower() in message_lower for keyword in service["keywords"]):
                    return service
            
            # If no exact match, try fuzzy matching with OpenAI
            if self.openai_client and services:
                return await self._ai_service_matching(services, message)
                
            return None
            
        except Exception as e:
            logger.error(f"Error matching service: {e}")
            return None
    
    async def _ai_service_matching(self, services: List[Dict], message: str) -> Optional[Dict[str, Any]]:
        """Use OpenAI to intelligently match services when keyword matching fails"""
        try:
            service_descriptions = []
            for i, service in enumerate(services):
                service_descriptions.append(
                    f"{i}: {service['name']} - {service['description']} "
                    f"(Keywords: {', '.join(service['keywords'])})"
                )
            
            prompt = f"""
Given these available services:
{chr(10).join(service_descriptions)}

User message: "{message}"

Return ONLY the number (0, 1, 2, etc.) of the best matching service, or "none" if no service matches.
Consider synonyms, related terms, and context. Be strict - only match if reasonably certain.
"""

            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            
            if result.isdigit() and 0 <= int(result) < len(services):
                return services[int(result)]
                
            return None
            
        except Exception as e:
            logger.error(f"Error in AI service matching: {e}")
            return None
    
    async def generate_dynamic_response(
        self, 
        company_id: str, 
        message: str, 
        conversation_history: List[Dict] = None,
        customer_info: Dict = None
    ) -> Dict[str, Any]:
        """Generate AI response based on dynamic service configuration"""
        try:
            # Get available services
            services = await self.get_company_services(company_id)
            
            if not services:
                return {
                    "message": "I apologize, but our services are currently being updated. Please contact us directly for assistance.",
                    "intent": "no_services_configured",
                    "matched_service": None,
                    "requires_human": True
                }
            
            # Try to match the message to a service
            matched_service = await self.match_service_from_message(company_id, message)
            
            if matched_service:
                # Generate response using the matched service's configuration
                return await self._generate_service_response(
                    matched_service, message, conversation_history, customer_info
                )
            else:
                # No service matched - provide available services
                return await self._generate_fallback_response(services, message)
                
        except Exception as e:
            logger.error(f"Error generating dynamic response: {e}")
            return {
                "message": "I'm experiencing technical difficulties. Please try again or contact our support team.",
                "intent": "error",
                "matched_service": None,
                "requires_human": True
            }
    
    async def _generate_service_response(
        self, 
        service: Dict[str, Any], 
        message: str,
        conversation_history: List[Dict] = None,
        customer_info: Dict = None
    ) -> Dict[str, Any]:
        """Generate response using matched service configuration"""
        try:
            # Determine intent from message
            intent = self._analyze_intent(message)
            
            # Base response using service prompts
            if intent == "pricing_inquiry":
                base_response = service["prompts"]["responses"]["pricing"]
            elif intent == "booking_request":
                base_response = service["prompts"]["responses"]["booking"]
            else:
                base_response = service["prompts"]["greeting"]
            
            # Enhance with OpenAI if available
            if self.openai_client:
                enhanced_response = await self._enhance_response_with_ai(
                    service, message, base_response, conversation_history, customer_info
                )
            else:
                enhanced_response = base_response
            
            # Check if booking completion criteria are met
            booking_ready = self._check_booking_completion(
                message, conversation_history, customer_info
            )
            
            if booking_ready:
                enhanced_response += f"\n\nBOOKING_CONFIRMED: {service['name']} service for customer. Contact: {customer_info.get('email', 'N/A')}"
            
            return {
                "message": enhanced_response,
                "intent": intent,
                "matched_service": {
                    "id": service["id"],
                    "name": service["name"],
                    "category": service["category"],
                    "pricing": service["pricing"]
                },
                "requires_human": intent == "complex_request",
                "booking_ready": booking_ready
            }
            
        except Exception as e:
            logger.error(f"Error generating service response: {e}")
            return {
                "message": service["prompts"]["greeting"],
                "intent": "general",
                "matched_service": {"name": service["name"]},
                "requires_human": False
            }
    
    async def _enhance_response_with_ai(
        self,
        service: Dict[str, Any],
        message: str,
        base_response: str,
        conversation_history: List[Dict] = None,
        customer_info: Dict = None
    ) -> str:
        """Use OpenAI to enhance the base response with context"""
        try:
            # Build context
            context_parts = [
                f"Service: {service['name']} - {service['description']}",
                f"Pricing: PKR {service['pricing']['min']} - PKR {service['pricing']['max']}",
                f"Availability: {service['availability']['hours']}, {service['availability']['days']}",
                f"Base response template: {base_response}"
            ]
            
            if customer_info:
                context_parts.append(f"Customer info: {json.dumps(customer_info)}")
            
            if conversation_history:
                recent_history = conversation_history[-3:]  # Last 3 messages
                history_text = "\n".join([
                    f"{msg.get('role', 'user')}: {msg.get('content', msg.get('message', ''))}"
                    for msg in recent_history
                ])
                context_parts.append(f"Recent conversation:\n{history_text}")
            
            prompt = f"""
You are a professional customer service AI for a home services company in Lahore, Pakistan.

Context:
{chr(10).join(context_parts)}

Current customer message: "{message}"

Instructions:
1. Use the base response as a foundation but make it more natural and conversational
2. Include relevant pricing and availability information
3. Ask appropriate follow-up questions based on the service type
4. Maintain a helpful, professional tone
5. Keep response under 150 words
6. If customer provides email and confirms booking, end with "BOOKING_CONFIRMED:" format

Generate a natural, helpful response:
"""

            response = await self.openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error enhancing response: {e}")
            return base_response
    
    async def _generate_fallback_response(
        self, 
        services: List[Dict[str, Any]], 
        message: str
    ) -> Dict[str, Any]:
        """Generate response when no service matches"""
        try:
            service_names = [service["name"] for service in services]
            service_list = ", ".join(service_names[:-1]) + f", and {service_names[-1]}" if len(service_names) > 1 else service_names[0]
            
            fallback_message = f"I understand you're looking for assistance. Currently, we provide the following services: {service_list}. Which of these services would you like to know more about?"
            
            return {
                "message": fallback_message,
                "intent": "service_not_available",
                "matched_service": None,
                "available_services": service_names,
                "requires_human": False
            }
            
        except Exception as e:
            logger.error(f"Error generating fallback response: {e}")
            return {
                "message": "I'm here to help! Could you please let me know what type of service you're looking for?",
                "intent": "general",
                "matched_service": None,
                "requires_human": False
            }
    
    def _analyze_intent(self, message: str) -> str:
        """Analyze message intent"""
        message_lower = message.lower()
        
        # Pricing keywords
        if any(word in message_lower for word in ["price", "cost", "rate", "charge", "fee", "how much", "pkr"]):
            return "pricing_inquiry"
        
        # Booking keywords
        if any(word in message_lower for word in ["book", "schedule", "appointment", "when can", "available", "confirm"]):
            return "booking_request"
        
        # Complex requests
        if any(word in message_lower for word in ["emergency", "urgent", "problem", "issue", "broken", "not working"]):
            return "complex_request"
        
        # General inquiry
        return "general_inquiry"
    
    def _check_booking_completion(
        self, 
        message: str, 
        conversation_history: List[Dict] = None,
        customer_info: Dict = None
    ) -> bool:
        """Check if booking can be completed"""
        if not customer_info:
            return False
        
        has_email = customer_info.get("email") and "@" in customer_info["email"]
        has_confirmation = any(word in message.lower() for word in ["yes", "confirm", "book", "schedule"])
        
        return has_email and has_confirmation
    
    async def log_interaction(
        self,
        company_id: str,
        service_id: Optional[str],
        message: str,
        response: str,
        intent: str,
        customer_info: Dict = None
    ):
        """Log AI interactions for analytics"""
        try:
            log_doc = {
                "company_id": ObjectId(company_id),
                "service_id": ObjectId(service_id) if service_id else None,
                "user_message": message,
                "ai_response": response,
                "intent": intent,
                "customer_info": customer_info or {},
                "timestamp": datetime.utcnow(),
                "session_date": datetime.utcnow().date().isoformat()
            }
            
            await self.db.ai_interactions.insert_one(log_doc)
            
        except Exception as e:
            logger.error(f"Error logging interaction: {e}")
    
    async def get_service_analytics(self, company_id: str, days: int = 30) -> Dict[str, Any]:
        """Get analytics for service usage"""
        try:
            from datetime import timedelta
            
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Total interactions
            total_interactions = await self.db.ai_interactions.count_documents({
                "company_id": ObjectId(company_id),
                "timestamp": {"$gte": start_date}
            })
            
            # Service usage
            pipeline = [
                {"$match": {
                    "company_id": ObjectId(company_id),
                    "timestamp": {"$gte": start_date},
                    "service_id": {"$ne": None}
                }},
                {"$group": {"_id": "$service_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            service_usage = await self.db.ai_interactions.aggregate(pipeline).to_list(length=20)
            
            # Intent distribution
            intent_pipeline = [
                {"$match": {
                    "company_id": ObjectId(company_id),
                    "timestamp": {"$gte": start_date}
                }},
                {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            
            intent_distribution = await self.db.ai_interactions.aggregate(intent_pipeline).to_list(length=10)
            
            return {
                "total_interactions": total_interactions,
                "service_usage": [{"service_id": str(item["_id"]), "count": item["count"]} for item in service_usage],
                "intent_distribution": [{"intent": item["_id"], "count": item["count"]} for item in intent_distribution],
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"Error fetching service analytics: {e}")
            return {
                "total_interactions": 0,
                "service_usage": [],
                "intent_distribution": [],
                "period_days": days
            }