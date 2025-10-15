# # backend/app/api/v1/api.py - UPDATED VERSION WITH TECHNICIAN PORTAL

from fastapi import APIRouter
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints import (
    auth, users, contacts, leads, jobs,
    scheduling, estimates, invoices,
    ai_automation, analytics, integrations,
    dashboard, notifications, ws, email, documents , 
    mobile, customer_portal, realtime, technician_portal, service_requests, technicians   
)
from app.api.v1.endpoints.ai_chatbot import router as ai_chatbot_router
from app.api.v1.endpoints import service_management 
# In app/api/v1/api.py (or wherever you register routers)
from app.api.v1.endpoints import pipeline
api_router = APIRouter()

# Core business endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(scheduling.router, prefix="/scheduling", tags=["scheduling"])
api_router.include_router(estimates.router, prefix="/estimates", tags=["estimates"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(ai_automation.router, prefix="/ai", tags=["ai-automation"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

# Integration routes - NEW
# api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])

# Dashboard
api_router.include_router(dashboard.router, tags=["dashboard"])

# Customer & Technician portals
api_router.include_router(customer_portal.router, prefix="/customer-portal", tags=["customer-portal"])
api_router.include_router(technician_portal.router, prefix="/technician-portal", tags=["technician-portal"])

# ✅ NEW - Document management
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

# Realtime features
api_router.include_router(realtime.router)
api_router.include_router(ws.router, tags=["websocket"])

# Notifications
api_router.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])

# Mobile API
api_router.include_router(mobile.router, prefix="/mobile", tags=["mobile"])

# Service Requests Management for Admin
api_router.include_router(service_requests.router, prefix="/service-requests", tags=["service-requests"])

# Technician Management for Admin
api_router.include_router(technicians.router, prefix="/technicians", tags=["technicians"])

# AI Chatbot
api_router.include_router(ai_chatbot_router, prefix="/ai-chatbot", tags=["ai-chatbot"])

# Email Management
api_router.include_router(email.router, prefix="/email", tags=["Email Management"])

# ✅ FIXED: Service Management Router - Remove the extra /v1 prefix
api_router.include_router(service_management.router, tags=["service-management"])

# Add this line
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])








