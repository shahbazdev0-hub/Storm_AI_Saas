# backend/app/api/v1/endpoints/email.py - CREATE THIS FILE

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import hashlib
import base64
import logging
from datetime import datetime

from app.core.database import get_database
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

def verify_unsubscribe_token(email: str, token: str, secret_key: str) -> bool:
    """Verify the unsubscribe token"""
    try:
        # Decode the token
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        token_email, token_hash = decoded.split(':', 1)
        
        # Verify email matches
        if token_email != email:
            return False
        
        # Generate expected hash
        data = f"{email}:general:{secret_key}"
        expected_hash = hashlib.sha256(data.encode()).hexdigest()[:32]
        
        return token_hash == expected_hash
    except Exception as e:
        logger.error(f"❌ Token verification failed: {e}")
        return False

@router.get("/unsubscribe")
async def unsubscribe_email(
    request: Request,
    token: str = Query(..., description="Unsubscribe token"),
    email_type: str = Query("general", description="Type of email to unsubscribe from"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Handle email unsubscribe requests"""
    try:
        # Decode token to get email
        try:
            decoded = base64.urlsafe_b64decode(token.encode()).decode()
            email, _ = decoded.split(':', 1)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid unsubscribe token")
        
        # Verify token (you'd implement this with your secret key)
        import os
        secret_key = os.getenv("SECRET_KEY", "default_secret_key")
        if not verify_unsubscribe_token(email, token, secret_key):
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        
        # Store unsubscribe preference in database
        unsubscribe_data = {
            "email": email,
            "email_type": email_type,
            "unsubscribed_at": datetime.utcnow(),
            "ip_address": request.client.host,
            "user_agent": request.headers.get("user-agent", "")
        }
        
        # Update or insert unsubscribe record
        await db.email_unsubscribes.update_one(
            {"email": email, "email_type": email_type},
            {"$set": unsubscribe_data},
            upsert=True
        )
        
        # Also update contact preferences if contact exists
        await db.contacts.update_many(
            {"email": email},
            {
                "$set": {
                    f"email_preferences.{email_type}_emails": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Email {email} unsubscribed from {email_type} emails")
        
        # Return a nice HTML page
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unsubscribed - Storm AI</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f8f9fa;
                    color: #333;
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }}
                .success-icon {{
                    font-size: 48px;
                    color: #28a745;
                    margin-bottom: 20px;
                }}
                h1 {{ color: #333; margin-bottom: 20px; }}
                .email {{ 
                    background: #e3f2fd; 
                    padding: 10px; 
                    border-radius: 5px; 
                    font-family: monospace;
                    margin: 20px 0;
                }}
                .resubscribe-btn {{
                    display: inline-block;
                    padding: 12px 24px;
                    background: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }}
                .resubscribe-btn:hover {{ background: #0056b3; }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Successfully Unsubscribed</h1>
                <p>You have been unsubscribed from <strong>{email_type}</strong> emails.</p>
                <div class="email">{email}</div>
                <p>You will no longer receive {email_type} notifications at this email address.</p>
                
                <div style="margin: 30px 0; padding: 20px; background: #fff3cd; border-radius: 5px;">
                    <strong>Note:</strong> You may still receive important service-related communications
                    such as booking confirmations, cancellations, and account security notifications.
                </div>
                
                <p>Changed your mind?</p>
                <a href="/api/v1/email/resubscribe?email={email}&type={email_type}" class="resubscribe-btn">
                    🔔 Resubscribe to Email Notifications
                </a>
                
                <div class="footer">
                    <p>Storm AI Services<br>
                    If you have any questions, contact us at 
                    <a href="mailto:support@stormai.com">support@stormai.com</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unsubscribe error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/resubscribe")
async def resubscribe_email(
    email: str = Query(..., description="Email address"),
    email_type: str = Query("general", description="Type of email to resubscribe to"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Handle email resubscribe requests"""
    try:
        # Remove unsubscribe record
        await db.email_unsubscribes.delete_one({
            "email": email,
            "email_type": email_type
        })
        
        # Update contact preferences
        await db.contacts.update_many(
            {"email": email},
            {
                "$set": {
                    f"email_preferences.{email_type}_emails": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Email {email} resubscribed to {email_type} emails")
        
        # Return success page
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Resubscribed - Storm AI</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    background: #f8f9fa;
                    color: #333;
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }}
                .success-icon {{
                    font-size: 48px;
                    color: #28a745;
                    margin-bottom: 20px;
                }}
                h1 {{ color: #333; margin-bottom: 20px; }}
                .email {{ 
                    background: #d4edda; 
                    padding: 10px; 
                    border-radius: 5px; 
                    font-family: monospace;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">🔔</div>
                <h1>Welcome Back!</h1>
                <p>You have been resubscribed to <strong>{email_type}</strong> emails.</p>
                <div class="email">{email}</div>
                <p>You will now receive {email_type} notifications at this email address.</p>
                
                <div style="margin: 30px 0; padding: 20px; background: #d1ecf1; border-radius: 5px;">
                    <strong>Thanks!</strong> We're glad to have you back. You'll receive relevant 
                    updates and notifications to help you stay informed about your services.
                </div>
                
                <div class="footer">
                    <p>Storm AI Services<br>
                    If you have any questions, contact us at 
                    <a href="mailto:support@stormai.com">support@stormai.com</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"❌ Resubscribe error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Helper function to check if email is unsubscribed
async def is_email_unsubscribed(db: AsyncIOMotorDatabase, email: str, email_type: str = "general") -> bool:
    """Check if an email address is unsubscribed from a specific email type"""
    unsubscribe_record = await db.email_unsubscribes.find_one({
        "email": email,
        "email_type": email_type
    })
    return unsubscribe_record is not None