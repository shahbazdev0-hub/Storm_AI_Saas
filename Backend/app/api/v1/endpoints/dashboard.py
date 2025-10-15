# backend/app/api/v1/endpoints/dashboard.py - COMPLETE REPLACEMENT
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Dict, Any, List
from bson import ObjectId

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def oid(i: Any) -> ObjectId:
    """Convert string to ObjectId"""
    return i if isinstance(i, ObjectId) else ObjectId(str(i))

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get dashboard statistics - REAL DATA ONLY"""
    company_id = oid(current_user["company_id"])
    
    # Monthly revenue from paid invoices
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_revenue_result = await db.invoices.aggregate([
        {
            "$match": {
                "company_id": company_id,
                "status": {"$in": ["paid", "partially_paid"]},
                "created_at": {"$gte": start_of_month}
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$total_amount"}
            }
        }
    ]).to_list(1)
    
    monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
    
    # Active leads
    active_leads = await db.leads.count_documents({
        "company_id": company_id,
        "status": {"$in": ["new", "contacted", "qualified", "proposal_sent"]}
    })
    
    # Total customers
    total_customers = await db.contacts.count_documents({
        "company_id": company_id,
        "type": {"$in": ["customer", "lead"]}
    })
    
    # Weekly jobs
    start_of_week = now - timedelta(days=now.weekday())
    weekly_jobs = await db.jobs.count_documents({
        "company_id": company_id,
        "created_at": {"$gte": start_of_week}
    })
    
    # Revenue chart data (last 6 months)
    revenue_data = []
    for i in range(6):
        month_start = (start_of_month - timedelta(days=32*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        month_result = await db.invoices.aggregate([
            {
                "$match": {
                    "company_id": company_id,
                    "status": {"$in": ["paid", "partially_paid"]},
                    "created_at": {"$gte": month_start, "$lt": month_end}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$total_amount"}
                }
            }
        ]).to_list(1)
        
        month_revenue = month_result[0]["total"] if month_result else 0
        revenue_data.append({
            "month": month_start.strftime("%b"),
            "revenue": round(float(month_revenue), 2)
        })
    
    revenue_data.reverse()
    
    return {
        "monthly_revenue": round(float(monthly_revenue), 2),
        "revenue_change": 0,  # Calculate if needed
        "active_leads": active_leads,
        "leads_change": 0,    # Calculate if needed
        "total_customers": total_customers,
        "customers_change": 0, # Calculate if needed
        "weekly_jobs": weekly_jobs,
        "jobs_change": 0,     # Calculate if needed
        "revenue_data": revenue_data
    }

@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get recent activity - REAL DATA ONLY"""
    company_id = oid(current_user["company_id"])
    activities = []
    
    # Recent jobs
    recent_jobs = await db.jobs.find({
        "company_id": company_id
    }).sort("created_at", -1).limit(5).to_list(length=None)
    
    for job in recent_jobs:
        activities.append({
            "id": str(job["_id"]),
            "description": f"Job: {job.get('customer_name', 'Unknown')} - {job.get('service_type', 'Service')}",
            "time": "Recently",
            "type": "job"
        })
    
    return activities[:limit]

@router.get("/quick-stats")
async def get_quick_stats(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get quick stats - REAL DATA ONLY"""
    company_id = oid(current_user["company_id"])
    
    # Today's jobs
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    today_jobs = await db.jobs.count_documents({
        "company_id": company_id,
        "scheduled_date": {"$gte": today_start, "$lt": today_end}
    })
    
    # Pending invoices
    pending_invoices = await db.invoices.count_documents({
        "company_id": company_id,
        "status": {"$in": ["draft", "sent", "pending"]}
    })
    
    # Overdue invoices
    overdue_invoices = await db.invoices.count_documents({
        "company_id": company_id,
        "due_date": {"$lt": datetime.utcnow()},
        "status": {"$nin": ["paid", "cancelled"]}
    })
    
    # Active technicians
    technicians_count = await db.users.count_documents({
        "company_id": company_id,
        "role": "technician",
        "is_active": True
    })
    
    return {
        "today_jobs": today_jobs,
        "pending_invoices": pending_invoices,
        "overdue_invoices": overdue_invoices,
        "technicians_on_duty": technicians_count
    }