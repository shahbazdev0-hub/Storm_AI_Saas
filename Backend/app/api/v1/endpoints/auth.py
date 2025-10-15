# backend/app/api/v1/endpoints/auth.py

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status,Request
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
import bcrypt
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.core.config import settings
from app.core import security
from app.core.logger import get_logger
from app.dependencies.auth import get_current_user
from app.utils.user_serializer import serialize_user  # ✅ central serializer

router = APIRouter()
logger = get_logger("auth")
# ADD THESE IMPORTS (if not already present)

from typing import Any, Dict, List
import stripe
from app.core.config import settings

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# ADD THESE PYDANTIC MODELS (after your imports, before your endpoints)
class SubscriptionUpdateRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"

class SubscriptionResponse(BaseModel):
    plan_id: str
    plan_name: str
    status: str
    billing_cycle: str
    price: float
    features: List[str]
    expires_at: datetime
    created_at: datetime
# -------------------------------
# Schemas
# -------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

# -------------------------------
# Password utils
# -------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def get_password_from_user(user_doc: dict) -> str:
    return user_doc.get("hashed_password") or user_doc.get("password_hash") or ""

# -------------------------------
# Register (customer only)
# -------------------------------
@router.post("/register")
async def register(
    user_data: RegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    logger.info(f"🔥 Registering new customer: {user_data.email}")

    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Always create a company
    company_doc = {
        "name": f"{user_data.first_name} {user_data.last_name} - Customer",
        "industry": "customer",
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    company_result = await db.companies.insert_one(company_doc)
    company_id = company_result.inserted_id

    # Create user
    user_doc = {
        "email": user_data.email.lower(),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "hashed_password": hash_password(user_data.password),
        "role": "customer",
        "status": "active",
        "company_id": company_id,
        "permissions": ["read", "customer_portal"],
        "is_superuser": False,
        "is_email_verified": False,
        "is_phone_verified": False,
        "login_count": 0,
        "failed_login_attempts": 0,
        "profile": {},
        "preferences": {
            "theme": "light",
            "language": "en",
            "timezone": "UTC",
            "notifications": {"email": True, "sms": True, "push": True},
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": None,
    }
    user_result = await db.users.insert_one(user_doc)
    user_id = user_result.inserted_id

    # Serialize
    user_response = serialize_user({**user_doc, "_id": user_id, "company_id": company_id})

    # Tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    response = {
        "user": user_response,
        "access_token": security.create_access_token(str(user_id), expires_delta=access_token_expires),
        "refresh_token": security.create_refresh_token(str(user_id), expires_delta=access_token_expires),
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }

    logger.info(f"🎉 Customer registration successful for {user_data.email}")
    return response

# -------------------------------
# Login (all roles)
# -------------------------------
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    logger.info(f"🔐 Login attempt for: {form_data.username}")

    user = await db.users.find_one({"email": form_data.username.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is not active")

    password_hash = get_password_from_user(user)
    if not password_hash or not verify_password(form_data.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update login stats
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}, "$inc": {"login_count": 1}},
    )

    # Serialize
    user_response = serialize_user(user)

    # Tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    response = {
        "user": user_response,
        "access_token": security.create_access_token(str(user["_id"]), expires_delta=access_token_expires),
        "refresh_token": security.create_refresh_token(str(user["_id"]), expires_delta=access_token_expires),
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }

    logger.info(f"🎉 Login successful for {user['email']} (role: {user.get('role')})")
    return response

# -------------------------------
# Current user
# -------------------------------
# -------------------------------
# Current user - ✅ FIXED to fetch fresh data from DB
# -------------------------------
@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """Get current user with latest data including subscription"""
    try:
        # ✅ Fetch fresh user data from database (includes subscription)
        user_id = ObjectId(current_user["_id"])
        fresh_user = await db.users.find_one({"_id": user_id})
        
        if not fresh_user:
            logger.error(f"❌ User not found in database: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # ✅ Serialize and return (includes subscription)
        user_response = serialize_user(fresh_user)
        
        logger.info(f"✅ /me endpoint called for {fresh_user.get('email')} - Subscription: {fresh_user.get('subscription', {}).get('status', 'none')}")
        
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user data")

# -------------------------------
# Logout
# -------------------------------
@router.post("/logout")
async def logout() -> Any:
    return {"message": "Successfully logged out"}



# # backend/app/api/v1/endpoints/auth.py
import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError
from fastapi import Query
# Add this after your existing endpoints

@router.get("/google/url")
async def get_google_auth_url():
    """Get Google OAuth authorization URL"""
    try:
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"response_type=code&"
            f"client_id={settings.GOOGLE_CLIENT_ID}&"
            f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
            f"scope=openid email profile&"
            f"access_type=offline&"
            f"prompt=consent"
        )
        
        return {"auth_url": auth_url}
        
    except Exception as e:
        logger.error(f"❌ Failed to generate Google auth URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate Google auth URL")

from fastapi.responses import RedirectResponse
import urllib.parse

@router.get("/google/callback")
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(None, description="State parameter for CSRF protection"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Handle Google OAuth callback and redirect to frontend"""
    try:
        logger.info(f"🔐 Processing Google OAuth callback with code: {code[:10]}...")
        
        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
            "code": code,
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
        
        # Verify and decode the ID token
        try:
            id_info = id_token.verify_oauth2_token(
                tokens["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
        except GoogleAuthError as e:
            logger.error(f"❌ Google token verification failed: {str(e)}")
            error_url = f"{settings.FRONTEND_URL}/auth/callback?error=token_verification_failed"
            return RedirectResponse(url=error_url)
        
        email = id_info.get("email")
        name = id_info.get("name", "")
        google_id = id_info.get("sub")
        avatar_url = id_info.get("picture")
        
        if not email:
            error_url = f"{settings.FRONTEND_URL}/auth/callback?error=no_email"
            return RedirectResponse(url=error_url)
        
        logger.info(f"🔐 Google user info: {email}, {name}")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email.lower().strip()})
        
        if existing_user:
            # User exists, update Google info and login
            update_data = {
                "google_id": google_id,
                "avatar_url": avatar_url,
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": update_data}
            )
            
            user_id = str(existing_user["_id"])
            user = existing_user
            logger.info(f"✅ Existing user logged in via Google: {email}")
            
        else:
            # Create new user account
            name_parts = name.strip().split(' ', 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            # Create company for the new user
            company_id = ObjectId()
            company_doc = {
                "_id": company_id,
                "name": f"{first_name}'s Company",
                "industry": "Other",
                "size": "1-10",
                "phone": "",
                "address": {},
                "settings": {
                    "timezone": "UTC",
                    "currency": "USD",
                    "date_format": "MM/DD/YYYY",
                    "business_hours": {
                        "monday": {"start": "09:00", "end": "17:00"},
                        "tuesday": {"start": "09:00", "end": "17:00"},
                        "wednesday": {"start": "09:00", "end": "17:00"},
                        "thursday": {"start": "09:00", "end": "17:00"},
                        "friday": {"start": "09:00", "end": "17:00"}
                    }
                },
                "subscription": {
                    "plan": "basic",
                    "status": "trial",
                    "trial_ends_at": datetime.utcnow() + timedelta(days=14)
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.companies.insert_one(company_doc)
            
            # Create user document
            user_id = ObjectId()
            user_doc = {
                "_id": user_id,
                "company_id": company_id,
                "email": email.lower().strip(),
                "first_name": first_name,
                "last_name": last_name,
                "hashed_password": "",
                "role": "customer",  # Default role for OAuth users
                "status": "active",
                "permissions": ["read", "customer_portal"],
                "google_id": google_id,
                "avatar_url": avatar_url,
                "is_email_verified": True,
                "is_phone_verified": False,
                "preferences": {
                    "language": "en",
                    "timezone": "UTC",
                    "notifications": {
                        "email": True,
                        "sms": False,
                        "push": True
                    }
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
            await db.users.insert_one(user_doc)
            user_id = str(user_id)
            user = user_doc
            
            logger.info(f"✅ New user created via Google OAuth: {email}")
        
        # Generate tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(user_id, expires_delta=access_token_expires)
        refresh_token = security.create_refresh_token(user_id, expires_delta=access_token_expires)
        
        # Serialize user data
        user_data = serialize_user(user)
        
        # Base64 encode user data to pass in URL (secure for this use case)
        import base64
        import json
        user_data_json = json.dumps(user_data)
        user_data_encoded = base64.b64encode(user_data_json.encode()).decode()
        
        # Redirect to frontend with all necessary data
        success_url = (
            f"{settings.FRONTEND_URL}/auth/callback?"
            f"success=true&"
            f"token={access_token}&"
            f"refresh_token={refresh_token}&"
            f"user_data={user_data_encoded}"
        )
        
        logger.info(f"🎉 Google OAuth successful for {email}, redirecting to frontend")
        return RedirectResponse(url=success_url)
        
    except HTTPException:
        error_url = f"{settings.FRONTEND_URL}/auth/callback?error=http_exception"
        return RedirectResponse(url=error_url)
    except Exception as e:
        logger.error(f"❌ Google OAuth callback failed: {str(e)}")
        error_url = f"{settings.FRONTEND_URL}/auth/callback?error=server_error"
        return RedirectResponse(url=error_url)
    


# Add this helper function first (if not already present)
async def get_or_create_stripe_customer(user_data: dict, db: AsyncIOMotorDatabase):
    """Get or create Stripe customer for user"""
    try:
        user_id = ObjectId(user_data["_id"])
        user = await db.users.find_one({"_id": user_id})
        
        if user and user.get("stripe_customer_id"):
            return stripe.Customer.retrieve(user["stripe_customer_id"])
        
        stripe_customer = stripe.Customer.create(
            email=user_data["email"],
            name=f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}",
            metadata={
                "user_id": str(user_id),
                "company_id": str(user_data.get("company_id", ""))
            }
        )
        
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"stripe_customer_id": stripe_customer.id}}
        )
        
        return stripe_customer
        
    except Exception as e:
        logger.error(f"❌ Error creating Stripe customer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment customer: {str(e)}")

@router.post("/subscription/update")
async def update_subscription(
    request: SubscriptionUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Create subscription with real Stripe payment"""
    try:
        user_id = ObjectId(current_user["_id"])
        
        plans = {
            "starter": {
                "name": "Starter",
                "monthly_price": 39,
                "yearly_price": 375,
                "stripe_monthly_price_id": "price_1SDaaKCcX0FmDNEaqwD3MVKd",
                "stripe_yearly_price_id": "price_1SDaaKCcX0FmDNEaloarw6Xh",
                "features": [
                    "Contact & Lead Management",
                    "Estimate & Invoice Builder",
                    "Sales Dashboard & Conversion Reports",
                    "QuickBooks + Google Calendar Sync",
                    "Job Scheduling Calendar",
                    "Customer Notes & History",
                    "Customer Portal Access",
                    "Zapier Hooks + Custom AI Workflows",
                    "Email Notifications"
                ]
            },
            "growth": {
                "name": "Growth",
                "monthly_price": 79,
                "yearly_price": 759,
                "stripe_monthly_price_id": "price_1SDaceCcX0FmDNEaGVdmWpdX",
                "stripe_yearly_price_id": "price_1SDad4CcX0FmDNEax5pbyQqB",
                "features": [
                    "Everything in Starter",
                    "AI-Powered SMS Assistant",
                    "Route Optimization",
                    "Technician Assignment",
                    "Role-Based User Permissions",
                    "Document Review & Management",
                    "Team & Department Reporting"
                ]
            }
        }
        
        if request.plan_id not in plans:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        plan = plans[request.plan_id]
        stripe_customer = await get_or_create_stripe_customer(current_user, db)
        
        price_id = (plan["stripe_yearly_price_id"] 
                   if request.billing_cycle == "yearly" 
                   else plan["stripe_monthly_price_id"])
        
        stripe_subscription = stripe.Subscription.create(
            customer=stripe_customer.id,
            items=[{"price": price_id}],
            trial_period_days=7,
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            metadata={
                "user_id": str(user_id),
                "plan_id": request.plan_id,
                "billing_cycle": request.billing_cycle
            }
        )
        
        expires_at = datetime.utcnow() + timedelta(days=365 if request.billing_cycle == "yearly" else 30)
        
        subscription = {
            "plan_id": request.plan_id,
            "plan_name": plan["name"],
            "status": "trialing",
            "billing_cycle": request.billing_cycle,
            "price": plan["yearly_price"] if request.billing_cycle == "yearly" else plan["monthly_price"],
            "features": plan["features"],
            "stripe_subscription_id": stripe_subscription.id,
            "stripe_customer_id": stripe_customer.id,
            "trial_end": datetime.utcnow() + timedelta(days=7),
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"subscription": subscription, "updated_at": datetime.utcnow()}}
        )
        
        # Safely extract client_secret
        client_secret = None
        try:
            if hasattr(stripe_subscription, 'latest_invoice') and stripe_subscription.latest_invoice:
                invoice = stripe_subscription.latest_invoice
                if hasattr(invoice, 'payment_intent') and invoice.payment_intent:
                    payment_intent = invoice.payment_intent
                    if hasattr(payment_intent, 'client_secret'):
                        client_secret = payment_intent.client_secret
        except (AttributeError, KeyError) as e:
            logger.warning(f"No payment intent available during trial: {e}")
        
        logger.info(f"✅ Subscription created for {current_user['email']} - Plan: {plan['name']}")
        
        return {
            "message": f"Successfully subscribed to {plan['name']} plan",
            "subscription": subscription,
            "requires_payment": False,  # No payment required during trial
            "client_secret": client_secret,
            "stripe_subscription_id": stripe_subscription.id,
            "trial_days": 7,
            "success": True
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error: {e}")
        raise HTTPException(status_code=400, detail=f"Payment processing failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")
    
# ADD TO: backend/app/api/v1/endpoints/auth.py

# ===== ADD THESE IMPORTS AT THE TOP =====
import stripe
from app.core.config import settings

# Initialize Stripe with YOUR secret key from .env
stripe.api_key = settings.STRIPE_SECRET_KEY

# ===== ADD THESE HELPER FUNCTIONS =====

# async def get_or_create_stripe_customer(user_data: dict, db: AsyncIOMotorDatabase):
#     """Get or create Stripe customer for user"""
#     try:
#         # Check if user already has a Stripe customer ID
#         user_id = ObjectId(user_data["_id"])
#         user = await db.users.find_one({"_id": user_id})
        
#         if user and user.get("stripe_customer_id"):
#             # Return existing Stripe customer
#             return stripe.Customer.retrieve(user["stripe_customer_id"])
        
#         # Create new Stripe customer
#         stripe_customer = stripe.Customer.create(
#             email=user_data["email"],
#             name=f"{user_data['first_name']} {user_data['last_name']}",
#             metadata={
#                 "user_id": str(user_id),
#                 "company_id": str(user_data.get("company_id", ""))
#             }
#         )
        
#         # Save Stripe customer ID to user record
#         await db.users.update_one(
#             {"_id": user_id},
#             {"$set": {"stripe_customer_id": stripe_customer.id}}
#         )
        
#         return stripe_customer
        
#     except Exception as e:
#         logger.error(f"❌ Error creating Stripe customer: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to create payment customer: {str(e)}")

# # ===== REPLACE YOUR EXISTING update_subscription ENDPOINT WITH THIS =====
# # ADD TO: backend/app/api/v1/endpoints/auth.py

# # UPDATED SUBSCRIPTION ENDPOINT WITH REAL STRIPE INTEGRATION

# @router.post("/subscription/update")
# async def update_subscription(
#     request: SubscriptionUpdateRequest,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ) -> Dict[str, Any]:
#     """Create subscription with Stripe payment"""
#     try:
#         user_id = ObjectId(current_user["_id"])
        
#         # Plan definitions (you'll need to create these prices in Stripe Dashboard)
#         plans = {
#             "starter": {
#                 "name": "Starter",
#                 "monthly_price": 39,
#                 "yearly_price": 375,
#                 "stripe_monthly_price_id": "price_1SDaaKCcX0FmDNEaqwD3MVKd",  # ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PRICE ID
#                 "stripe_yearly_price_id": "price_1SDaaKCcX0FmDNEaloarw6Xh",   # ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PRICE ID
#                 "features": [
#                     "Contact & Lead Management",
#                     "Estimate & Invoice Builder",
#                     "Sales Dashboard & Conversion Reports",
#                     "QuickBooks + Google Calendar Sync",
#                     "Job Scheduling Calendar",
#                     "Customer Notes & History",
#                     "Customer Portal Access",
#                     "Zapier Hooks + Custom AI Workflows",
#                     "Email Notifications"
#                 ]
#             },
#             "growth": {
#                 "name": "Growth",
#                 "monthly_price": 79,
#                 "yearly_price": 759,
#                 "stripe_monthly_price_id": "price_1SDaceCcX0FmDNEaGVdmWpdX",  # ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PRICE ID
#                 "stripe_yearly_price_id": "price_1SDad4CcX0FmDNEax5pbyQqB",   # ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PRICE ID
#                 "features": [
#                     "Everything in Starter",
#                     "AI-Powered SMS Assistant",
#                     "Route Optimization",
#                     "Technician Assignment",
#                     "Role-Based User Permissions",
#                     "Document Review & Management",
#                     "Team & Department Reporting"
#                 ]
#             }
#         }
        
#         if request.plan_id not in plans:
#             raise HTTPException(status_code=400, detail="Invalid plan ID")
        
#         plan = plans[request.plan_id]
        
#         # Get or create Stripe customer
#         stripe_customer = await get_or_create_stripe_customer(current_user, db)
        
#         # Select Stripe Price ID
#         price_id = (plan["stripe_yearly_price_id"] 
#                    if request.billing_cycle == "yearly" 
#                    else plan["stripe_monthly_price_id"])
        
#         # Create Stripe subscription with trial
#         stripe_subscription = stripe.Subscription.create(
#             customer=stripe_customer.id,
#             items=[{"price": price_id}],
#             trial_period_days=7,  # 7-day free trial
#             payment_behavior="default_incomplete",
#             payment_settings={"save_default_payment_method": "on_subscription"},
#             expand=["latest_invoice.payment_intent"],
#             metadata={
#                 "user_id": str(user_id),
#                 "plan_id": request.plan_id,
#                 "billing_cycle": request.billing_cycle
#             }
#         )
        
#         # Calculate subscription period
#         if request.billing_cycle == "yearly":
#             expires_at = datetime.utcnow() + timedelta(days=365)
#         else:
#             expires_at = datetime.utcnow() + timedelta(days=30)
        
#         # Create subscription in database
#         subscription = {
#             "plan_id": request.plan_id,
#             "plan_name": plan["name"],
#             "status": "trialing",  # 7-day trial starts immediately
#             "billing_cycle": request.billing_cycle,
#             "price": plan["yearly_price"] if request.billing_cycle == "yearly" else plan["monthly_price"],
#             "features": plan["features"],
#             "stripe_subscription_id": stripe_subscription.id,
#             "stripe_customer_id": stripe_customer.id,
#             "trial_end": datetime.utcnow() + timedelta(days=7),
#             "expires_at": expires_at,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
        
#         # Update user with subscription
#         await db.users.update_one(
#             {"_id": user_id},
#             {
#                 "$set": {
#                     "subscription": subscription,
#                     "updated_at": datetime.utcnow()
#                 }
#             }
#         )
        
#         # Get payment intent for frontend
#         payment_intent = stripe_subscription.latest_invoice.payment_intent
        
#         logger.info(f"✅ Subscription created for {current_user['email']} - Plan: {plan['name']}")
        
#         return {
#             "message": f"Successfully subscribed to {plan['name']} plan",
#             "subscription": subscription,
#             "requires_payment": True,
#             "client_secret": payment_intent.client_secret,
#             "stripe_subscription_id": stripe_subscription.id,
#             "trial_days": 7
#         }
        
#     except stripe.error.StripeError as e:
#         logger.error(f"❌ Stripe error: {e}")
#         raise HTTPException(status_code=400, detail=f"Payment processing failed: {str(e)}")
#     except Exception as e:
#         logger.error(f"❌ Error creating subscription: {e}")
#         raise HTTPException(status_code=500, detail="Failed to create subscription")




# @router.post("/subscription/update")
# async def update_subscription(
#     request: SubscriptionUpdateRequest,
#     current_user: dict = Depends(get_current_user),
#     db: AsyncIOMotorDatabase = Depends(get_database)
# ) -> Dict[str, Any]:
#     try:
#         user_id = ObjectId(current_user["_id"])
        
#         plans = {
#             "starter": {
#                 "name": "Starter",
#                 "monthly_price": 39,
#                 "yearly_price": 375,
#                 "features": [
#                     "Contact & Lead Management",
#                     "Estimate & Invoice Builder",
#                     "Sales Dashboard & Conversion Reports",
#                     "QuickBooks + Google Calendar Sync",
#                     "Job Scheduling Calendar",
#                     "Customer Notes & History",
#                     "Customer Portal Access",
#                     "Zapier Hooks + Custom AI Workflows",
#                     "Email Notifications"
#                 ]
#             },
#             "growth": {
#                 "name": "Growth",
#                 "monthly_price": 79,
#                 "yearly_price": 759,
#                 "features": [
#                     "Everything in Starter",
#                     "AI-Powered SMS Assistant",
#                     "Route Optimization",
#                     "Technician Assignment",
#                     "Role-Based User Permissions",
#                     "Document Review & Management",
#                     "Team & Department Reporting"
#                 ]
#             }
#         }
        
#         if request.plan_id not in plans:
#             raise HTTPException(status_code=400, detail="Invalid plan")
        
#         plan = plans[request.plan_id]
#         price = plan["yearly_price"] if request.billing_cycle == "yearly" else plan["monthly_price"]
        
#         subscription = {
#             "plan_id": request.plan_id,
#             "plan_name": plan["name"],
#             "status": "active",
#             "billing_cycle": request.billing_cycle,
#             "price": price,
#             "features": plan["features"],
#             "expires_at": datetime.utcnow() + timedelta(days=365 if request.billing_cycle == "yearly" else 30),
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
        
#         await db.users.update_one(
#             {"_id": user_id},
#             {"$set": {"subscription": subscription, "updated_at": datetime.utcnow()}}
#         )
        
#         logger.info(f"Subscription updated for {current_user['email']} to {plan['name']}")
        
#         return {
#             "message": f"Successfully subscribed to {plan['name']}",
#             "subscription": subscription,
#             "success": True
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


        
# ADD PAYMENT CONFIRMATION ENDPOINT
@router.post("/subscription/confirm-payment")
async def confirm_payment(
    payment_intent_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Confirm payment and activate subscription"""
    try:
        # Retrieve payment intent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == "succeeded":
            # Update subscription status to active
            await db.users.update_one(
                {"_id": ObjectId(current_user["_id"])},
                {
                    "$set": {
                        "subscription.status": "active",
                        "subscription.payment_confirmed_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"✅ Payment confirmed for user {current_user['email']}")
            
            return {
                "status": "success",
                "message": "Payment confirmed and subscription activated"
            }
        else:
            return {
                "status": "failed",
                "message": "Payment not completed"
            }
            
    except Exception as e:
        logger.error(f"❌ Error confirming payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
    
# ===== ADD STRIPE WEBHOOK HANDLER =====

@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        logger.error("❌ Invalid payload in Stripe webhook")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("❌ Invalid signature in Stripe webhook")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'invoice.payment_succeeded':
        # Payment succeeded - activate subscription
        invoice = event['data']['object']
        subscription_id = invoice['subscription']
        
        # Update subscription status in database
        await db.users.update_one(
            {"subscription.stripe_subscription_id": subscription_id},
            {
                "$set": {
                    "subscription.status": "active",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        logger.info(f"✅ Subscription activated: {subscription_id}")
        
    elif event['type'] == 'invoice.payment_failed':
        # Payment failed
        invoice = event['data']['object']
        subscription_id = invoice['subscription']
        
        await db.users.update_one(
            {"subscription.stripe_subscription_id": subscription_id},
            {
                "$set": {
                    "subscription.status": "payment_failed",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        logger.warning(f"⚠️ Payment failed for subscription: {subscription_id}")
        
    elif event['type'] == 'customer.subscription.deleted':
        # Subscription cancelled
        subscription = event['data']['object']
        subscription_id = subscription['id']
        
        await db.users.update_one(
            {"subscription.stripe_subscription_id": subscription_id},
            {
                "$set": {
                    "subscription.status": "cancelled",
                    "subscription.cancelled_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        logger.info(f"✅ Subscription cancelled: {subscription_id}")
    
    return {"status": "success"}