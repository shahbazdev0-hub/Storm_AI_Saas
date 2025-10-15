# app/services/ai_service.py
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import asyncio
import json
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """Service for AI-powered features"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.openai_client = None
        self.anthropic_client = None
        self._initialize_ai_clients()
    
    def _initialize_ai_clients(self):
        """Initialize AI service clients"""
        try:
            if settings.OPENAI_API_KEY:
                import openai
                self.openai_client = openai.AsyncOpenAI(
                    api_key=settings.OPENAI_API_KEY
                )
                logger.info("OpenAI client initialized")
            
            if settings.ANTHROPIC_API_KEY:
                # Anthropic client initialization would go here
                logger.info("Anthropic client initialized")
                
        except ImportError as e:
            logger.warning(f"AI client libraries not available: {e}")
        except Exception as e:
            logger.error(f"Error initializing AI clients: {e}")
    
    async def score_lead(
        self, 
        lead_data: Dict[str, Any],
        company_settings: Optional[Dict[str, Any]] = None
    ) -> float:
        """Score lead using AI algorithms"""
        try:
            # Get company AI settings
            if not company_settings:
                company = await self.db.companies.find_one({
                    "_id": ObjectId(lead_data.get("company_id"))
                })
                company_settings = company.get("ai_settings", {}) if company else {}
            
            # Use AI-based scoring if enabled
            if company_settings.get("enable_lead_scoring", True) and self.openai_client:
                score = await self._ai_lead_scoring(lead_data, company_settings)
                if score is not None:
                    return score
            
            # Fallback to rule-based scoring
            return self._rule_based_lead_scoring(lead_data)
            
        except Exception as e:
            logger.error(f"Error scoring lead: {e}")
            # Return default score on error
            return 50.0
    
    async def _ai_lead_scoring(
        self, 
        lead_data: Dict[str, Any],
        company_settings: Dict[str, Any]
    ) -> Optional[float]:
        """AI-based lead scoring using LLM"""
        try:
            if not self.openai_client:
                return None
            
            # Prepare lead data for AI analysis
            lead_info = {
                "source": lead_data.get("source", "unknown"),
                "service_type": lead_data.get("service_type", "unknown"),
                "estimated_value": lead_data.get("estimated_value", 0),
                "budget_range": {
                    "min": lead_data.get("budget_range_min", 0),
                    "max": lead_data.get("budget_range_max", 0)
                },
                "has_budget": lead_data.get("has_budget", False),
                "decision_maker": lead_data.get("decision_maker", False),
                "urgency": lead_data.get("urgency_level", "unknown"),
                "pain_points": lead_data.get("pain_points", []),
                "competitors": lead_data.get("competitors", []),
                "lead_source_detail": lead_data.get("source_detail", ""),
                "created_days_ago": (datetime.utcnow() - lead_data.get("created_at", datetime.utcnow())).days
            }
            
            # Create prompt for lead scoring
            prompt = f"""
            You are an expert sales analyst. Score this lead from 0-100 based on likelihood to convert to a paying customer.
            
            Lead Information:
            - Source: {lead_info['source']}
            - Service Type: {lead_info['service_type']}
            - Estimated Value: ${lead_info['estimated_value']:,.2f}
            - Budget Range: ${lead_info['budget_range']['min']:,.2f} - ${lead_info['budget_range']['max']:,.2f}
            - Has Confirmed Budget: {lead_info['has_budget']}
            - Is Decision Maker: {lead_info['decision_maker']}
            - Urgency Level: {lead_info['urgency']}
            - Pain Points: {', '.join(lead_info['pain_points']) if lead_info['pain_points'] else 'None specified'}
            - Known Competitors: {', '.join(lead_info['competitors']) if lead_info['competitors'] else 'None'}
            - Days Since Created: {lead_info['created_days_ago']}
            - Source Detail: {lead_info['lead_source_detail']}
            
            Consider these factors:
            1. Budget Authority (25%) - Do they have budget and decision-making power?
            2. Need (25%) - How urgent is their need and do they have clear pain points?
            3. Timeline (20%) - How quickly do they need a solution?
            4. Fit (15%) - How well does their need match the service type?
            5. Source Quality (15%) - How reliable is the lead source?
            
            Return only a number between 0-100 (no explanation needed).
            """
            
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.1
            )
            
            score_text = response.choices[0].message.content.strip()
            score = float(score_text)
            
            # Ensure score is within valid range
            return max(0, min(100, score))
            
        except Exception as e:
            logger.error(f"Error in AI lead scoring: {e}")
            return None
    
    def _rule_based_lead_scoring(self, lead_data: Dict[str, Any]) -> float:
        """Rule-based lead scoring as fallback"""
        score = 0.0
        
        # Source scoring (0-25 points)
        source_scores = {
            "referral": 25,
            "existing_customer": 23,
            "website": 20,
            "google_ads": 18,
            "facebook_ads": 15,
            "social_media": 12,
            "cold_call": 8,
            "trade_show": 15,
            "direct_mail": 10,
            "other": 10
        }
        score += source_scores.get(lead_data.get("source", "other"), 10)
        
        # Budget scoring (0-25 points)
        if lead_data.get("has_budget"):
            score += 15
        if lead_data.get("budget_confirmed"):
            score += 10
        
        estimated_value = lead_data.get("estimated_value", 0)
        if estimated_value > 10000:
            score += 15
        elif estimated_value > 5000:
            score += 10
        elif estimated_value > 1000:
            score += 5
        
        # Authority scoring (0-20 points)
        if lead_data.get("decision_maker"):
            score += 20
        elif lead_data.get("decision_maker") is False:
            score += 5  # At least we know
        
        # Need/Pain points scoring (0-15 points)
        pain_points = lead_data.get("pain_points", [])
        score += min(len(pain_points) * 3, 15)
        
        # Urgency scoring (0-10 points)
        urgency_scores = {
            "immediate": 10,
            "1-2 weeks": 8,
            "1 month": 6,
            "3 months": 4,
            "6+ months": 2
        }
        score += urgency_scores.get(lead_data.get("urgency_level", ""), 3)
        
        # Competition scoring (0-5 points penalty)
        competitors = lead_data.get("competitors", [])
        score -= min(len(competitors) * 1, 5)
        
        return max(0, min(100, score))
    
    async def generate_sms_response(
        self,
        conversation_history: List[Dict[str, Any]],
        lead_data: Dict[str, Any],
        company_settings: Dict[str, Any],
        contact_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate AI-powered SMS response"""
        try:
            if not self.openai_client or not company_settings.get("enable_sms_automation", True):
                return self._get_default_sms_response(conversation_history, lead_data)
            
            # Get company information
            company = await self.db.companies.find_one({
                "_id": ObjectId(lead_data.get("company_id"))
            })
            
            # Build context for AI
            context = self._build_conversation_context(
                conversation_history, lead_data, company_settings, company, contact_data
            )
            
            # Generate response using AI
            response = await self._generate_ai_sms_response(context, company_settings)
            
            # Validate and clean response
            return self._validate_sms_response(response)
            
        except Exception as e:
            logger.error(f"Error generating SMS response: {e}")
            return self._get_default_sms_response(conversation_history, lead_data)
    
    async def _generate_ai_sms_response(
        self,
        context: str,
        company_settings: Dict[str, Any]
    ) -> str:
        """Generate SMS response using AI"""
        try:
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": context}],
                max_tokens=company_settings.get("ai_max_tokens", 150),
                temperature=company_settings.get("ai_temperature", 0.7)
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error in AI SMS generation: {e}")
            raise
    
    def _build_conversation_context(
        self,
        conversation_history: List[Dict[str, Any]],
        lead_data: Dict[str, Any],
        company_settings: Dict[str, Any],
        company: Optional[Dict[str, Any]],
        contact_data: Optional[Dict[str, Any]]
    ) -> str:
        """Build context for AI conversation"""
        
        # Company information
        company_name = company.get("name", "our company") if company else "our company"
        industry = company.get("industry", "service") if company else "service"
        
        # Contact information
        contact_name = "there"
        if contact_data:
            contact_name = f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')}".strip() or "there"
        
        # Service information
        service_type = lead_data.get("service_type", "our services")
        
        # Response tone
        tone = company_settings.get("sms_response_tone", "friendly")
        
        # Build conversation history
        conversation_text = ""
        for msg in conversation_history[-5:]:  # Last 5 messages
            sender = "Customer" if msg.get("direction") == "inbound" else "Us"
            conversation_text += f"{sender}: {msg.get('message', '')}\n"
        
        context = f"""
You are a helpful AI assistant for {company_name}, a {industry} company. 
Your job is to respond to customer SMS messages in a {tone} and professional manner.

Customer Information:
- Name: {contact_name}
- Service Interest: {service_type}
- Lead Source: {lead_data.get('source', 'Unknown')}

Company Guidelines:
- Keep responses under 160 characters when possible
- Be helpful and try to move the conversation forward
- Offer to schedule a consultation when appropriate
- Ask qualifying questions about their needs
- Maintain a {tone} tone
- Always be professional and courteous

Conversation History:
{conversation_text}

Generate an appropriate response to continue this conversation. Focus on:
1. Acknowledging their message
2. Providing helpful information
3. Moving toward scheduling or qualification
4. Keeping it conversational and {tone}

Response:"""
        
        return context
    
    def _validate_sms_response(self, response: str) -> str:
        """Validate and clean SMS response"""
        if not response:
            return "Thanks for your message! We'll get back to you soon."
        
        # Remove any quotes or formatting
        response = response.strip().strip('"').strip("'")
        
        # Ensure reasonable length (SMS limit)
        if len(response) > 160:
            # Try to truncate at sentence boundary
            sentences = response.split('. ')
            truncated = sentences[0]
            if len(truncated) <= 160:
                response = truncated + ('.' if not truncated.endswith('.') else '')
            else:
                response = response[:157] + "..."
        
        return response
    
    def _get_default_sms_response(
        self,
        conversation_history: List[Dict[str, Any]],
        lead_data: Dict[str, Any]
    ) -> str:
        """Get default SMS response when AI is not available"""
        
        # Analyze last message for keywords
        last_message = ""
        if conversation_history:
            last_message = conversation_history[-1].get("message", "").lower()
        
        # Service type
        service_type = lead_data.get("service_type", "service")
        
        # Default responses based on keywords
        if any(word in last_message for word in ["price", "cost", "quote", "estimate"]):
            return f"I'd be happy to provide a free estimate for your {service_type} needs. When would be a good time to schedule a quick consultation?"
        
        elif any(word in last_message for word in ["schedule", "appointment", "time", "when"]):
            return "Great! I can help you schedule. What days work best for you this week? Morning or afternoon?"
        
        elif any(word in last_message for word in ["emergency", "urgent", "asap", "now"]):
            return "I understand this is urgent. Let me connect you with our team right away. Can you share your address?"
        
        elif any(word in last_message for word in ["question", "help", "info", "tell me"]):
            return f"I'm here to help with your {service_type} questions! What specific information can I provide?"
        
        else:
            return f"Thanks for reaching out! We'd love to help with your {service_type} needs. Would you like to schedule a free consultation?"
    
    async def detect_objection(
        self,
        message: str,
        company_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Detect and categorize objections in customer messages"""
        try:
            if not self.openai_client or not company_settings:
                return self._rule_based_objection_detection(message)
            
            prompt = f"""
            Analyze this customer message for sales objections:
            "{message}"
            
            If there's an objection, return JSON with:
            {{
                "has_objection": true,
                "type": "price|timing|trust|need|authority|other",
                "confidence": 0.8,
                "objection_text": "specific objection phrase",
                "suggested_response": "how to address this objection"
            }}
            
            If no objection, return: {{"has_objection": false}}
            
            Common objection types:
            - price: concerns about cost, budget, too expensive
            - timing: not the right time, need to wait, busy
            - trust: concerns about company, previous bad experiences
            - need: don't really need the service, not a priority
            - authority: need to check with spouse/boss, not decision maker
            - other: any other type of objection
            """
            
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            logger.error(f"Error detecting objection: {e}")
            return self._rule_based_objection_detection(message)
    
    def _rule_based_objection_detection(self, message: str) -> Dict[str, Any]:
        """Rule-based objection detection as fallback"""
        message_lower = message.lower()
        
        # Price objections
        price_keywords = ["expensive", "too much", "budget", "cost", "afford", "cheap", "price"]
        if any(keyword in message_lower for keyword in price_keywords):
            return {
                "has_objection": True,
                "type": "price",
                "confidence": 0.7,
                "objection_text": message,
                "suggested_response": "I understand budget is important. Let me show you our value and see if we can work within your budget."
            }
        
        # Timing objections
        timing_keywords = ["busy", "later", "not now", "bad time", "wait", "next month", "next year"]
        if any(keyword in message_lower for keyword in timing_keywords):
            return {
                "has_objection": True,
                "type": "timing",
                "confidence": 0.6,
                "objection_text": message,
                "suggested_response": "I understand timing is important. When would be a better time to discuss this?"
            }
        
        # Authority objections
        authority_keywords = ["spouse", "husband", "wife", "boss", "manager", "discuss", "think about"]
        if any(keyword in message_lower for keyword in authority_keywords):
            return {
                "has_objection": True,
                "type": "authority",
                "confidence": 0.6,
                "objection_text": message,
                "suggested_response": "That makes sense. Would it be helpful if I provided some information you could share with them?"
            }
        
        # Trust objections
        trust_keywords = ["scam", "trust", "reliable", "reviews", "references", "burned before"]
        if any(keyword in message_lower for keyword in trust_keywords):
            return {
                "has_objection": True,
                "type": "trust",
                "confidence": 0.8,
                "objection_text": message,
                "suggested_response": "I completely understand. Let me share some references and reviews from our satisfied customers."
            }
        
        return {"has_objection": False}
    
    async def predict_churn(
        self,
        customer_data: Dict[str, Any],
        company_settings: Optional[Dict[str, Any]] = None
    ) -> float:
        """Predict customer churn probability"""
        try:
            # Use AI prediction if available and enabled
            if (self.openai_client and 
                company_settings and 
                company_settings.get("enable_churn_prediction", True)):
                
                ai_prediction = await self._ai_churn_prediction(customer_data, company_settings)
                if ai_prediction is not None:
                    return ai_prediction
            
            # Fallback to rule-based prediction
            return self._rule_based_churn_prediction(customer_data)
            
        except Exception as e:
            logger.error(f"Error predicting churn: {e}")
            return 0.0
    
    async def _ai_churn_prediction(
        self,
        customer_data: Dict[str, Any],
        company_settings: Dict[str, Any]
    ) -> Optional[float]:
        """AI-based churn prediction"""
        try:
            prompt = f"""
            Analyze this customer data and predict churn probability (0.0 to 1.0):
            
            Customer Metrics:
            - Days since last service: {customer_data.get('days_since_last_service', 0)}
            - Total services: {customer_data.get('total_services', 0)}
            - Average service value: ${customer_data.get('avg_service_value', 0):,.2f}
            - Complaint count: {customer_data.get('complaint_count', 0)}
            - Payment delays: {customer_data.get('payment_delays', 0)}
            - Satisfaction score (1-5): {customer_data.get('satisfaction_score', 3)}
            - Last contact response time: {customer_data.get('response_time_hours', 24)} hours
            - Service frequency: {customer_data.get('service_frequency', 'unknown')}
            
            Return only a decimal number between 0.0 and 1.0 representing churn probability.
            """
            
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=10,
                temperature=0.1
            )
            
            probability = float(response.choices[0].message.content.strip())
            return max(0.0, min(1.0, probability))
            
        except Exception as e:
            logger.error(f"Error in AI churn prediction: {e}")
            return None
    
    def _rule_based_churn_prediction(self, customer_data: Dict[str, Any]) -> float:
        """Rule-based churn prediction as fallback"""
        churn_score = 0.0
        
        # Days since last service (strong indicator)
        days_since_service = customer_data.get("days_since_last_service", 0)
        if days_since_service > 365:
            churn_score += 0.4
        elif days_since_service > 180:
            churn_score += 0.2
        elif days_since_service > 90:
            churn_score += 0.1
        
        # Service frequency
        total_services = customer_data.get("total_services", 0)
        if total_services < 2:
            churn_score += 0.3
        elif total_services < 5:
            churn_score += 0.1
        
        # Satisfaction score
        satisfaction = customer_data.get("satisfaction_score", 5)
        if satisfaction < 3:
            churn_score += 0.3
        elif satisfaction < 4:
            churn_score += 0.1
        
        # Complaints and payment issues
        complaints = customer_data.get("complaint_count", 0)
        churn_score += min(complaints * 0.1, 0.2)
        
        payment_delays = customer_data.get("payment_delays", 0)
        churn_score += min(payment_delays * 0.05, 0.1)
        
        # Response time to communications
        response_time = customer_data.get("response_time_hours", 24)
        if response_time > 72:
            churn_score += 0.1
        
        return min(churn_score, 1.0)
    
    async def generate_email_subject(
        self,
        email_content: str,
        email_type: str = "general",
        company_settings: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate optimized email subject line"""
        try:
            if not self.openai_client or not company_settings:
                return self._get_default_email_subject(email_type)
            
            prompt = f"""
            Create an engaging email subject line for this email content:
            
            Email Type: {email_type}
            Content: {email_content[:500]}...
            
            Guidelines:
            - Keep under 50 characters
            - Make it compelling and clickable
            - Include action words when appropriate
            - Avoid spam trigger words
            - Make it relevant to the content
            
            Return only the subject line, no quotes or extra text.
            """
            
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0.8
            )
            
            subject = response.choices[0].message.content.strip().strip('"').strip("'")
            return subject[:50]  # Ensure length limit
            
        except Exception as e:
            logger.error(f"Error generating email subject: {e}")
            return self._get_default_email_subject(email_type)
    
    def _get_default_email_subject(self, email_type: str) -> str:
        """Get default email subject lines"""
        subjects = {
            "estimate": "Your Service Estimate",
            "invoice": "Invoice for Your Service",
            "follow_up": "Following Up on Your Service",
            "appointment": "Service Appointment Confirmation",
            "reminder": "Upcoming Service Reminder",
            "thank_you": "Thank You for Choosing Us",
            "general": "Important Update for You"
        }
        return subjects.get(email_type, "Message from Our Team")
    
    async def analyze_customer_sentiment(
        self,
        text: str,
        company_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze customer sentiment from text"""
        try:
            if not self.openai_client or not company_settings:
                return self._rule_based_sentiment_analysis(text)
            
            prompt = f"""
            Analyze the sentiment of this customer message:
            "{text}"
            
            Return JSON with:
            {{
                "sentiment": "positive|negative|neutral",
                "confidence": 0.8,
                "emotion": "happy|angry|frustrated|satisfied|worried|excited",
                "urgency": "low|medium|high",
                "key_phrases": ["phrase1", "phrase2"]
            }}
            """
            
            response = await self.openai_client.chat.completions.create(
                model=company_settings.get("ai_model", "gpt-3.5-turbo"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return self._rule_based_sentiment_analysis(text)
    
    def _rule_based_sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """Rule-based sentiment analysis as fallback"""
        text_lower = text.lower()
        
        # Positive keywords
        positive_words = ["great", "excellent", "happy", "satisfied", "good", "love", "amazing", "perfect"]
        positive_count = sum(1 for word in positive_words if word in text_lower)
        
        # Negative keywords
        negative_words = ["bad", "terrible", "awful", "hate", "angry", "frustrated", "disappointed", "worst"]
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # Urgency keywords
        urgent_words = ["urgent", "emergency", "asap", "immediately", "now", "problem"]
        urgency_count = sum(1 for word in urgent_words if word in text_lower)
        
        # Determine sentiment
        if positive_count > negative_count:
            sentiment = "positive"
            emotion = "satisfied"
        elif negative_count > positive_count:
            sentiment = "negative"
            emotion = "frustrated"
        else:
            sentiment = "neutral"
            emotion = "neutral"
        
        # Determine urgency
        if urgency_count > 0:
            urgency = "high"
        elif negative_count > 0:
            urgency = "medium"
        else:
            urgency = "low"
        
        return {
            "sentiment": sentiment,
            "confidence": 0.6,
            "emotion": emotion,
            "urgency": urgency,
            "key_phrases": []
        }
    
    async def generate_follow_up_recommendations(
        self,
        lead_data: Dict[str, Any],
        interaction_history: List[Dict[str, Any]],
        company_settings: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate personalized follow-up recommendations"""
        try:
            # Analyze lead data and history
            days_since_contact = (datetime.utcnow() - lead_data.get("last_contact", datetime.utcnow())).days
            lead_score = lead_data.get("total_score", 50)
            lead_status = lead_data.get("status", "new")
            
            recommendations = []
            
            # Time-based recommendations
            if days_since_contact > 7:
                recommendations.append({
                    "type": "call",
                    "priority": "high",
                    "title": "Overdue Follow-up Call",
                    "description": f"It's been {days_since_contact} days since last contact. Call to re-engage.",
                    "suggested_time": "within 24 hours"
                })
            
            # Score-based recommendations
            if lead_score > 80:
                recommendations.append({
                    "type": "meeting",
                    "priority": "high", 
                    "title": "Schedule In-Person Meeting",
                    "description": "High-score lead - schedule face-to-face meeting to close.",
                    "suggested_time": "within 48 hours"
                })
            elif lead_score > 60:
                recommendations.append({
                    "type": "email",
                    "priority": "medium",
                    "title": "Send Detailed Proposal",
                    "description": "Good lead score - send comprehensive proposal with pricing.",
                    "suggested_time": "within 3 days"
                })
            
            # Status-based recommendations
            if lead_status == "proposal_sent":
                recommendations.append({
                    "type": "call",
                    "priority": "high",
                    "title": "Follow Up on Proposal",
                    "description": "Check if they received proposal and answer any questions.",
                    "suggested_time": "2-3 days after sending"
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating follow-up recommendations: {e}")
            return []