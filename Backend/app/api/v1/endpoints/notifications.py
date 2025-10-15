# backend/app/api/v1/endpoints/notifications.py - ADD THIS ENDPOINT

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.services.email_service import EmailService

router = APIRouter()
logger = logging.getLogger(__name__)

class CustomerNotificationRequest(BaseModel):
    customer_email: str
    customer_name: str
    booking_id: str
    service_type: str
    scheduled_time: str
    location: str
    notification_type: str = "booking_confirmed"

@router.post("/send-customer-notification")
async def send_customer_notification(
    notification_data: CustomerNotificationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Send notification to customer about booking confirmation"""
    try:
        logger.info(f"📧 Sending customer notification for booking: {notification_data.booking_id}")
        
        # Create email content
        if notification_data.notification_type == "booking_confirmed":
            subject = f"Booking Confirmed - {notification_data.service_type}"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🎉 Booking Confirmed!</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333;">Hi {notification_data.customer_name},</h2>
                    
                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Great news! Your booking has been confirmed and our team is ready to serve you.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="margin: 0 0 15px 0; color: #333;">📋 Booking Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: bold;">Service:</td>
                                <td style="padding: 8px 0; color: #333;">{notification_data.service_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                                <td style="padding: 8px 0; color: #333;">{notification_data.location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: bold;">Time:</td>
                                <td style="padding: 8px 0; color: #333;">{notification_data.scheduled_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: bold;">Booking ID:</td>
                                <td style="padding: 8px 0; color: #333; font-family: monospace;">{notification_data.booking_id}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #1976d2;">
                            <strong>📱 What's Next?</strong><br>
                            Our team will arrive at the scheduled time. If you need to make any changes or have questions, 
                            please contact us as soon as possible.
                        </p>
                    </div>
                    
                    <p style="color: #555;">
                        Thank you for choosing our services! We look forward to providing you with excellent service.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p style="color: #666; margin: 0;">Best regards,<br><strong>Your Service Team</strong></p>
                    </div>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #fff; margin: 0; font-size: 12px;">
                        This is an automated confirmation email for your booking.
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_content = f"""
            Booking Confirmed!
            
            Hi {notification_data.customer_name},
            
            Great news! Your booking has been confirmed and our team is ready to serve you.
            
            Booking Details:
            - Service: {notification_data.service_type}
            - Location: {notification_data.location}
            - Time: {notification_data.scheduled_time}
            - Booking ID: {notification_data.booking_id}
            
            What's Next?
            Our team will arrive at the scheduled time. If you need to make any changes or have questions, 
            please contact us as soon as possible.
            
            Thank you for choosing our services! We look forward to providing you with excellent service.
            
            Best regards,
            Your Service Team
            """
        
        # Send email using your email service
        email_service = EmailService()
        email_sent = await email_service.send_email(
            to_email=notification_data.customer_email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content
        )
        
        if email_sent:
            logger.info(f"✅ Customer notification sent to: {notification_data.customer_email}")
            
            # Create in-app notification record
            try:
                notification_record = {
                    "_id": ObjectId(),
                    "company_id": ObjectId(current_user["company_id"]),
                    "type": "customer_notified",
                    "title": "Customer Notified",
                    "message": f"Customer {notification_data.customer_name} notified about booking confirmation",
                    "data": {
                        "booking_id": notification_data.booking_id,
                        "customer_email": notification_data.customer_email,
                        "notification_type": notification_data.notification_type
                    },
                    "is_read": False,
                    "priority": "medium",
                    "created_at": datetime.utcnow()
                }
                
                await db.notifications.insert_one(notification_record)
                logger.info(f"✅ In-app notification created for customer notification")
                
            except Exception as notification_error:
                logger.error(f"❌ Error creating in-app notification: {notification_error}")
                # Don't fail the whole operation
            
            return {
                "success": True,
                "message": "Customer notification sent successfully",
                "email_sent": True,
                "customer_email": notification_data.customer_email
            }
        else:
            logger.error(f"❌ Failed to send email to: {notification_data.customer_email}")
            return {
                "success": False,
                "message": "Failed to send customer notification",
                "email_sent": False
            }
        
    except Exception as e:
        logger.error(f"❌ Error sending customer notification: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Error sending customer notification")

# Also add this endpoint for portal notifications (if you have a customer portal)
@router.get("/customer-notifications/{customer_email}")
async def get_customer_notifications(
    customer_email: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get notifications for customer portal (if implemented)"""
    try:
        # Find notifications related to this customer
        notifications = await db.notifications.find({
            "data.customer_email": customer_email,
            "type": {"$in": ["booking_confirmed", "booking_updated", "booking_cancelled"]}
        }).sort("created_at", -1).limit(10).to_list(length=10)
        
        # Convert ObjectIds to strings
        for notification in notifications:
            notification["_id"] = str(notification["_id"])
            notification["company_id"] = str(notification["company_id"])
        
        return {
            "notifications": notifications,
            "total": len(notifications)
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting customer notifications: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving notifications")