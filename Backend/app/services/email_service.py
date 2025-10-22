# app/services/email_service.py
from typing import List, Dict, Any, Optional, Union
from motor.motor_asyncio import AsyncIOMotorDatabase
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import asyncio
import base64
import mimetypes
from pathlib import Path
from jinja2 import Template, Environment, BaseLoader
import re

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

class EmailService:
    """Email service for sending and managing emails"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.sendgrid_client = None
        self.jinja_env = Environment(loader=BaseLoader())
        self._initialize_clients()
    
    def _initialize_clients(self) -> None:
        """Initialize email clients"""
        try:
            # Initialize SendGrid if configured
            if settings.SENDGRID_API_KEY:
                self.sendgrid_client = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
                logger.info("✅ SendGrid email client initialized successfully")
            elif settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
                logger.info("✅ SMTP email configuration available")
            else:
                logger.warning("⚠️ No email service configured - email features disabled")
        except Exception as e:
            logger.error(f"❌ Failed to initialize email clients: {e}")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: str,
        company_id: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        content_type: str = "html",
        contact_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        template_id: Optional[str] = None,
        user_id: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        scheduled_at: Optional[datetime] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send email message"""
        try:
            # Validate email address
            if not self._validate_email(to_email):
                raise ValueError(f"Invalid email address: {to_email}")
            
            # Check company email limits
            if not await self._check_email_limits(company_id):
                raise ValueError("Email limit exceeded for this month")
            
            # Set default from email/name
            if not from_email:
                from_email = settings.EMAILS_FROM_EMAIL or f"noreply@company.com"
            if not from_name:
                from_name = settings.EMAILS_FROM_NAME or "CRM System"
            
            # Validate content
            if not content or len(content.strip()) == 0:
                raise ValueError("Email content cannot be empty")
            
            # Process template variables if needed
            processed_content = await self._process_template_variables(
                content,
                company_id,
                contact_id,
                lead_id
            )
            
            # Send email if not scheduled
            email_id = None
            status = "queued"
            
            if not scheduled_at or scheduled_at <= datetime.utcnow():
                if self.sendgrid_client:
                    email_id = await self._send_via_sendgrid(
                        to_email=to_email,
                        subject=subject,
                        content=processed_content,
                        from_email=from_email,
                        from_name=from_name,
                        content_type=content_type,
                        attachments=attachments,
                        reply_to=reply_to,
                        cc=cc,
                        bcc=bcc
                    )
                    status = "sent"
                elif settings.SMTP_HOST:
                    await self._send_via_smtp(
                        to_email=to_email,
                        subject=subject,
                        content=processed_content,
                        from_email=from_email,
                        from_name=from_name,
                        content_type=content_type,
                        attachments=attachments,
                        reply_to=reply_to,
                        cc=cc,
                        bcc=bcc
                    )
                    status = "sent"
                else:
                    logger.warning("⚠️ No email service configured, email stored but not sent")
                    status = "not_sent"
            else:
                status = "scheduled"
            
            # Store in database
            email_data = {
                "company_id": ObjectId(company_id),
                "contact_id": ObjectId(contact_id) if contact_id else None,
                "lead_id": ObjectId(lead_id) if lead_id else None,
                "campaign_id": ObjectId(campaign_id) if campaign_id else None,
                "to_email": to_email,
                "from_email": from_email,
                "from_name": from_name,
                "subject": subject,
                "content": processed_content,
                "content_type": content_type,
                "status": status,
                "email_id": email_id,  # SendGrid message ID
                "template_id": template_id,
                "sent_by": ObjectId(user_id) if user_id else None,
                "scheduled_at": scheduled_at,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "metadata": {
                    "character_count": len(processed_content),
                    "has_attachments": bool(attachments),
                    "attachment_count": len(attachments) if attachments else 0
                },
                "tracking": {
                    "opens": 0,
                    "clicks": 0,
                    "bounced": False,
                    "spam_reported": False
                }
            }
            
            # Add CC/BCC if provided
            if cc:
                email_data["cc"] = cc
            if bcc:
                email_data["bcc"] = bcc
            if reply_to:
                email_data["reply_to"] = reply_to
            
            result = await self.db.email_messages.insert_one(email_data)
            
            # Update company email usage
            if status == "sent":
                await self._increment_email_usage(company_id)
            
            # Update contact last contact timestamp
            if contact_id:
                await self._update_contact_last_contact(contact_id, "email")
            
            # Update lead communication tracking
            if lead_id:
                await self._update_lead_communication(lead_id, "email")
            
            return {
                "id": str(result.inserted_id),
                "to_email": to_email,
                "subject": subject,
                "status": status,
                "email_id": email_id,
                "created_at": email_data["created_at"],
                "character_count": len(processed_content)
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending email to {to_email}: {e}")
            raise
    
    async def send_bulk_email(
        self,
        recipients: List[Dict[str, Any]],  # [{"email": "...", "name": "...", "contact_id": "..."}]
        subject: str,
        content: str,
        company_id: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        template_id: Optional[str] = None,
        batch_size: int = 50,
        delay_seconds: int = 1
    ) -> Dict[str, Any]:
        """Send email to multiple recipients"""
        try:
            results = {
                "total": len(recipients),
                "sent": 0,
                "failed": 0,
                "errors": []
            }
            
            # Process in batches to avoid rate limits
            for i in range(0, len(recipients), batch_size):
                batch = recipients[i:i + batch_size]
                
                # Send batch
                tasks = []
                for recipient in batch:
                    task = self.send_email(
                        to_email=recipient["email"],
                        subject=subject,
                        content=content,
                        company_id=company_id,
                        from_email=from_email,
                        from_name=from_name,
                        user_id=user_id,
                        contact_id=recipient.get("contact_id"),
                        campaign_id=campaign_id,
                        template_id=template_id
                    )
                    tasks.append(task)
                
                # Execute batch
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for j, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        results["failed"] += 1
                        results["errors"].append({
                            "email": batch[j]["email"],
                            "error": str(result)
                        })
                    else:
                        results["sent"] += 1
                
                # Add delay between batches
                if i + batch_size < len(recipients):
                    await asyncio.sleep(delay_seconds)
            
            logger.info(f"📧 Bulk email completed - Sent: {results['sent']}, Failed: {results['failed']}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error sending bulk email: {e}")
            raise
    
    async def track_email_open(
        self,
        email_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Track email open event"""
        try:
            result = await self.db.email_messages.update_one(
                {"_id": ObjectId(email_id)},
                {
                    "$inc": {"tracking.opens": 1},
                    "$set": {
                        "tracking.first_opened_at": datetime.utcnow(),
                        "tracking.last_opened_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    },
                    "$push": {
                        "tracking.open_events": {
                            "timestamp": datetime.utcnow(),
                            "user_agent": user_agent,
                            "ip_address": ip_address
                        }
                    }
                }
            )
            
            if result.modified_count > 0:
                # Update contact engagement score
                email_doc = await self.db.email_messages.find_one({"_id": ObjectId(email_id)})
                if email_doc and email_doc.get("contact_id"):
                    await self._update_contact_engagement(str(email_doc["contact_id"]), "email_opened")
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error tracking email open: {e}")
            return False

    
    async def track_email_click(
        self,
        email_id: str,
        url: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Track email click event"""
        try:
            result = await self.db.email_messages.update_one(
                {"_id": ObjectId(email_id)},
                {
                    "$inc": {"tracking.clicks": 1},
                    "$set": {
                        "tracking.first_clicked_at": datetime.utcnow(),
                        "tracking.last_clicked_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    },
                    "$push": {
                        "tracking.click_events": {
                            "timestamp": datetime.utcnow(),
                            "url": url,
                            "user_agent": user_agent,
                            "ip_address": ip_address
                        }
                    }
                }
            )
            
            if result.modified_count > 0:
                # Update contact engagement score
                email_doc = await self.db.email_messages.find_one({"_id": ObjectId(email_id)})
                if email_doc and email_doc.get("contact_id"):
                    await self._update_contact_engagement(str(email_doc["contact_id"]), "email_clicked")
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error tracking email click: {e}")
            return False
    
    async def handle_bounce(
        self,
        email_id: str,
        bounce_type: str,
        bounce_reason: str
    ) -> bool:
        """Handle email bounce"""
        try:
            result = await self.db.email_messages.update_one(
                {"_id": ObjectId(email_id)},
                {
                    "$set": {
                        "status": "bounced",
                        "tracking.bounced": True,
                        "tracking.bounce_type": bounce_type,
                        "tracking.bounce_reason": bounce_reason,
                        "tracking.bounced_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                # Update contact email bounce status
                email_doc = await self.db.email_messages.find_one({"_id": ObjectId(email_id)})
                if email_doc and email_doc.get("contact_id"):
                    await self._handle_contact_bounce(
                        str(email_doc["contact_id"]),
                        email_doc["to_email"],
                        bounce_type,
                        bounce_reason
                    )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error handling email bounce: {e}")
            return False
    
    async def get_email_analytics(
        self,
        company_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get email analytics for a company"""
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
                        "_id": "$status",
                        "count": {"$sum": 1},
                        "total_opens": {"$sum": "$tracking.opens"},
                        "total_clicks": {"$sum": "$tracking.clicks"},
                        "bounced_count": {
                            "$sum": {"$cond": ["$tracking.bounced", 1, 0]}
                        }
                    }
                }
            ]
            
            results = await self.db.email_messages.aggregate(pipeline).to_list(length=None)
            
            analytics = {
                "total_sent": 0,
                "total_delivered": 0,
                "total_opens": 0,
                "total_clicks": 0,
                "total_bounced": 0,
                "delivery_rate": 0.0,
                "open_rate": 0.0,
                "click_rate": 0.0,
                "bounce_rate": 0.0,
                "by_status": {},
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
            
            for result in results:
                status = result["_id"]
                count = result["count"]
                
                analytics["by_status"][status] = count
                analytics["total_opens"] += result["total_opens"]
                analytics["total_clicks"] += result["total_clicks"]
                analytics["total_bounced"] += result["bounced_count"]
                
                if status in ["sent", "delivered"]:
                    analytics["total_sent"] += count
                    analytics["total_delivered"] += count
            
            # Calculate rates
            if analytics["total_sent"] > 0:
                analytics["delivery_rate"] = (analytics["total_delivered"] / analytics["total_sent"]) * 100
                analytics["bounce_rate"] = (analytics["total_bounced"] / analytics["total_sent"]) * 100
            
            if analytics["total_delivered"] > 0:
                analytics["open_rate"] = (analytics["total_opens"] / analytics["total_delivered"]) * 100
            
            if analytics["total_opens"] > 0:
                analytics["click_rate"] = (analytics["total_clicks"] / analytics["total_opens"]) * 100
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting email analytics: {e}")
            raise
    
    async def create_email_template(
        self,
        name: str,
        subject: str,
        content: str,
        company_id: str,
        description: Optional[str] = None,
        category: Optional[str] = None,
        variables: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create email template"""
        try:
            template_data = {
                "company_id": ObjectId(company_id),
                "name": name,
                "subject": subject,
                "content": content,
                "description": description,
                "category": category or "general",
                "variables": variables or [],
                "is_active": True,
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.db.email_templates.insert_one(template_data)
            template_data["id"] = str(result.inserted_id)
            template_data["company_id"] = str(template_data["company_id"])
            
            return template_data
            
        except Exception as e:
            logger.error(f"❌ Error creating email template: {e}")
            raise
    
    async def get_email_templates(
        self,
        company_id: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get email templates"""
        try:
            query = {
                "company_id": ObjectId(company_id),
                "is_active": True
            }
            
            if category:
                query["category"] = category
            
            templates = await self.db.email_templates.find(query).sort("name", 1).to_list(length=None)
            
            for template in templates:
                template["id"] = str(template["_id"])
                template["company_id"] = str(template["company_id"])
            
            return templates
            
        except Exception as e:
            logger.error(f"❌ Error getting email templates: {e}")
            raise
    
    async def process_scheduled_emails(self) -> Dict[str, Any]:
        """Process scheduled emails that are due"""
        try:
            now = datetime.utcnow()
            
            # Find scheduled emails that are due
            query = {
                "status": "scheduled",
                "scheduled_at": {"$lte": now}
            }
            
            scheduled_emails = await self.db.email_messages.find(query).limit(100).to_list(length=100)
            
            results = {
                "processed": 0,
                "failed": 0,
                "errors": []
            }
            
            for email in scheduled_emails:
                try:
                    # Send the email
                    if self.sendgrid_client:
                        email_id = await self._send_via_sendgrid(
                            to_email=email["to_email"],
                            subject=email["subject"],
                            content=email["content"],
                            from_email=email["from_email"],
                            from_name=email["from_name"],
                            content_type=email["content_type"]
                        )
                        
                        # Update email status
                        await self.db.email_messages.update_one(
                            {"_id": email["_id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "email_id": email_id,
                                    "updated_at": now
                                }
                            }
                        )
                    elif settings.SMTP_HOST:
                        await self._send_via_smtp(
                            to_email=email["to_email"],
                            subject=email["subject"],
                            content=email["content"],
                            from_email=email["from_email"],
                            from_name=email["from_name"],
                            content_type=email["content_type"]
                        )
                        
                        # Update email status
                        await self.db.email_messages.update_one(
                            {"_id": email["_id"]},
                            {
                                "$set": {
                                    "status": "sent",
                                    "updated_at": now
                                }
                            }
                        )
                    
                    # Update company usage
                    await self._increment_email_usage(str(email["company_id"]))
                    
                    results["processed"] += 1
                    logger.info(f"📧 Sent scheduled email {email['_id']}")
                
                except Exception as e:
                    # Mark as failed
                    await self.db.email_messages.update_one(
                        {"_id": email["_id"]},
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
                        "email_id": str(email["_id"]),
                        "error": str(e)
                    })
                    logger.error(f"❌ Failed to send scheduled email {email['_id']}: {e}")
            
            if results["processed"] > 0 or results["failed"] > 0:
                logger.info(f"📧 Processed scheduled emails - Sent: {results['processed']}, Failed: {results['failed']}")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Error processing scheduled emails: {e}")
            raise
    
    # Helper methods
    async def _send_via_sendgrid(
        self,
        to_email: str,
        subject: str,
        content: str,
        from_email: str,
        from_name: str,
        content_type: str = "html",
        attachments: Optional[List[Dict[str, Any]]] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> str:
        """Send email via SendGrid"""
        try:
            from_email_obj = Email(from_email, from_name)
            to_email_obj = To(to_email)
            
            if content_type == "html":
                content_obj = Content("text/html", content)
            else:
                content_obj = Content("text/plain", content)
            
            mail = Mail(from_email_obj, to_email_obj, subject, content_obj)
            
            # Add reply-to
            if reply_to:
                mail.reply_to = Email(reply_to)
            
            # Add CC/BCC
            if cc:
                for cc_email in cc:
                    mail.add_cc(Email(cc_email))
            
            if bcc:
                for bcc_email in bcc:
                    mail.add_bcc(Email(bcc_email))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    att = Attachment()
                    att.file_content = FileContent(attachment["content"])
                    att.file_type = FileType(attachment.get("type", "application/octet-stream"))
                    att.file_name = FileName(attachment["filename"])
                    att.disposition = Disposition("attachment")
                    mail.add_attachment(att)
            
            response = self.sendgrid_client.send(mail)
            
            if response.status_code in [200, 202]:
                return response.headers.get("X-Message-Id", "")
            else:
                raise Exception(f"SendGrid error: {response.status_code} - {response.body}")
            
        except Exception as e:
            logger.error(f"❌ SendGrid send error: {e}")
            raise
    
    async def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        content: str,
        from_email: str,
        from_name: str,
        content_type: str = "html",
        attachments: Optional[List[Dict[str, Any]]] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> None:
        """Send email via SMTP"""
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            
            if reply_to:
                msg["Reply-To"] = reply_to
            
            if cc:
                msg["Cc"] = ", ".join(cc)
            
            # Add content
            if content_type == "html":
                msg.attach(MIMEText(content, "html"))
            else:
                msg.attach(MIMEText(content, "plain"))
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(base64.b64decode(attachment["content"]))
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename= {attachment['filename']}"
                    )
                    msg.attach(part)
            
            # Send email
            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)
            
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=settings.SMTP_TLS,
                recipients=recipients
            )
            
        except Exception as e:
            logger.error(f"❌ SMTP send error: {e}")
            raise
    
    def _validate_email(self, email: str) -> bool:
        """Validate email address format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    async def _process_template_variables(
        self,
        content: str,
        company_id: str,
        contact_id: Optional[str] = None,
        lead_id: Optional[str] = None
    ) -> str:
        """Process template variables in email content"""
        try:
            template = self.jinja_env.from_string(content)
            
            # Build context
            context = {}
            
            # Add company data
            company = await self.db.companies.find_one({"_id": ObjectId(company_id)})
            if company:
                context["company"] = {
                    "name": company.get("name", ""),
                    "phone": company.get("phone", ""),
                    "email": company.get("email", ""),
                    "website": company.get("website", "")
                }
            
            # Add contact data
            if contact_id:
                contact = await self.db.contacts.find_one({"_id": ObjectId(contact_id)})
                if contact:
                    context["contact"] = {
                        "first_name": contact.get("first_name", ""),
                        "last_name": contact.get("last_name", ""),
                        "full_name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
                        "email": contact.get("email", ""),
                        "phone": contact.get("phone", ""),
                        "company": contact.get("company", "")
                    }
            
            # Add lead data
            if lead_id:
                lead = await self.db.leads.find_one({"_id": ObjectId(lead_id)})
                if lead:
                    context["lead"] = {
                        "status": lead.get("status", ""),
                        "source": lead.get("source", ""),
                        "service_type": lead.get("service_type", ""),
                        "estimated_value": lead.get("estimated_value", 0)
                    }
            
            return template.render(**context)
            
        except Exception as e:
            logger.error(f"❌ Error processing template variables: {e}")
            return content  # Return original content if processing fails
    
    async def _check_email_limits(self, company_id: str) -> bool:
        """Check if company has email sends remaining"""
        try:
            company = await self.db.companies.find_one({"_id": ObjectId(company_id)})
            if not company:
                return False
            
            billing_info = company.get("billing_info", {})
            monthly_limit = billing_info.get("monthly_email_limit", 0)
            monthly_used = billing_info.get("monthly_email_used", 0)
            
            return monthly_used < monthly_limit
            
        except Exception as e:
            logger.error(f"❌ Error checking email limits: {e}")
            return False
    
    async def _increment_email_usage(self, company_id: str) -> None:
        """Increment email usage counter"""
        try:
            await self.db.companies.update_one(
                {"_id": ObjectId(company_id)},
                {
                    "$inc": {"billing_info.monthly_email_used": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        except Exception as e:
            logger.error(f"❌ Error incrementing email usage: {e}")
    
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
            
            if communication_type == "email":
                update_data["last_email_sent"] = datetime.utcnow()
            
            await self.db.leads.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"❌ Error updating lead communication: {e}")
    
    async def _update_contact_engagement(self, contact_id: str, engagement_type: str) -> None:
        """Update contact engagement score"""
        try:
            # Simple engagement scoring
            score_increment = 0.1 if engagement_type == "email_opened" else 0.2
            
            await self.db.contacts.update_one(
                {"_id": ObjectId(contact_id)},
                {
                    "$inc": {"email_engagement_score": score_increment},
                    "$set": {
                        f"last_{engagement_type}": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            logger.error(f"❌ Error updating contact engagement: {e}")
    
    async def _handle_contact_bounce(
        self,
        contact_id: str,
        email: str,
        bounce_type: str,
        bounce_reason: str
    ) -> None:
        """Handle contact email bounce"""
        try:
            update_data = {
                "email_bounced": True,
                "email_bounce_reason": bounce_reason,
                "updated_at": datetime.utcnow()
            }
            
            # For hard bounces, mark email as invalid
            if bounce_type == "hard":
                update_data["email_opt_in"] = False
            
            await self.db.contacts.update_one(
                {"_id": ObjectId(contact_id)},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"❌ Error handling contact bounce: {e}")
async def send_booking_confirmation(
    self,
    customer_email: str,
    customer_name: str,
    service_type: str,
    location: str = "To be confirmed",
    scheduled_time: str = "To be confirmed",
    booking_id: str = "",
    admin_notes: str = ""
) -> bool:
    """Send booking confirmation email to customer"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        logger.info(f"📧 Preparing confirmation email for {customer_email}")

        subject = f"✅ Booking Confirmed - {service_type}"

        # Simple HTML email
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">🎉 Booking Confirmed!</h2>

            <p>Dear {customer_name},</p>

            <p>Great news! Your booking has been confirmed by our team.</p>

            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0;">
                <h3 style="margin-top: 0;">Booking Details</h3>
                <p><strong>Service:</strong> {service_type}</p>
                <p><strong>Location:</strong> {location}</p>
                <p><strong>Time:</strong> {scheduled_time}</p>
                <p><strong>Booking ID:</strong> {booking_id}</p>
                {f'<div style="margin-top: 15px; padding: 10px; background: #FEF3C7; border-radius: 4px;"><strong>Admin Note:</strong> {admin_notes}</div>' if admin_notes else ''}
            </div>

            <p>Our team will contact you within 24 hours to finalize details.</p>

            <p>Best regards,<br><strong>Your Service Team</strong></p>
        </body>
        </html>
        """

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Service Team <{settings.EMAIL_USER}>"
        msg['To'] = customer_email

        # Attach HTML
        msg.attach(MIMEText(html_body, 'html'))

        # Use a thread to run the blocking SMTP operations to avoid blocking the event loop
        def _send():
            logger.info(f"📧 Connecting to SMTP: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                server.starttls()
                logger.info(f"📧 Logging in as: {settings.EMAIL_USER}")
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
                server.send_message(msg)

        await asyncio.to_thread(_send)

        logger.info(f"✅ Confirmation email sent to {customer_email}")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to send confirmation email: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


# Export the service
__all__ = ["EmailService"]