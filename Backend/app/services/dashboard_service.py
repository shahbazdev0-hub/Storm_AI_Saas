# backend/app/services/dashboard_service.py
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.logger import get_logger

logger = get_logger(__name__)

class DashboardService:
    """Service for dashboard-related operations"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
    
    def oid(self, i: Any) -> ObjectId:
        """Convert string to ObjectId"""
        return i if isinstance(i, ObjectId) else ObjectId(str(i))
    
    async def get_revenue_stats(self, company_id: str) -> Dict[str, Any]:
        """Get revenue statistics"""
        try:
            company_oid = self.oid(company_id)
            
            # Date calculations
            now = datetime.utcnow()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
            
            # Current month revenue
            monthly_revenue = await self._get_revenue_for_period(
                company_oid, start_of_month, now
            )
            
            # Last month revenue
            last_month_revenue = await self._get_revenue_for_period(
                company_oid, start_of_last_month, start_of_month
            )
            
            # Calculate change percentage
            revenue_change = self._calculate_percentage_change(monthly_revenue, last_month_revenue)
            
            return {
                "monthly_revenue": round(monthly_revenue, 2),
                "revenue_change": round(revenue_change, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting revenue stats: {e}")
            return {"monthly_revenue": 0, "revenue_change": 0}
    
    async def get_leads_stats(self, company_id: str) -> Dict[str, Any]:
        """Get leads statistics"""
        try:
            company_oid = self.oid(company_id)
            
            # Active leads count
            active_leads = await self.db.leads.count_documents({
                "company_id": company_oid,
                "status": {"$in": ["new", "contacted", "qualified", "proposal_sent"]}
            })
            
            # Last month leads for comparison
            start_of_last_month = datetime.utcnow().replace(day=1) - timedelta(days=1)
            start_of_last_month = start_of_last_month.replace(day=1)
            
            last_month_leads = await self.db.leads.count_documents({
                "company_id": company_oid,
                "status": {"$in": ["new", "contacted", "qualified", "proposal_sent"]},
                "created_at": {
                    "$gte": start_of_last_month,
                    "$lt": datetime.utcnow().replace(day=1)
                }
            })
            
            leads_change = self._calculate_percentage_change(active_leads, last_month_leads)
            
            return {
                "active_leads": active_leads,
                "leads_change": round(leads_change, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting leads stats: {e}")
            return {"active_leads": 0, "leads_change": 0}
    
    async def get_customers_stats(self, company_id: str) -> Dict[str, Any]:
        """Get customer statistics"""
        try:
            company_oid = self.oid(company_id)
            
            # Total customers
            total_customers = await self.db.contacts.count_documents({
                "company_id": company_oid,
                "type": {"$in": ["customer", "lead"]}
            })
            
            # Last month customers
            start_of_month = datetime.utcnow().replace(day=1)
            last_month_customers = await self.db.contacts.count_documents({
                "company_id": company_oid,
                "type": {"$in": ["customer", "lead"]},
                "created_at": {"$lt": start_of_month}
            })
            
            customers_change = self._calculate_percentage_change(total_customers, last_month_customers)
            
            return {
                "total_customers": total_customers,
                "customers_change": round(customers_change, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting customers stats: {e}")
            return {"total_customers": 0, "customers_change": 0}
    
    async def get_jobs_stats(self, company_id: str) -> Dict[str, Any]:
        """Get jobs statistics"""
        try:
            company_oid = self.oid(company_id)
            
            # Weekly jobs
            start_of_week = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
            weekly_jobs = await self.db.jobs.count_documents({
                "company_id": company_oid,
                "created_at": {"$gte": start_of_week}
            })
            
            # Last week jobs
            start_of_last_week = start_of_week - timedelta(days=7)
            last_week_jobs = await self.db.jobs.count_documents({
                "company_id": company_oid,
                "created_at": {
                    "$gte": start_of_last_week,
                    "$lt": start_of_week
                }
            })
            
            jobs_change = self._calculate_percentage_change(weekly_jobs, last_week_jobs)
            
            return {
                "weekly_jobs": weekly_jobs,
                "jobs_change": round(jobs_change, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting jobs stats: {e}")
            return {"weekly_jobs": 0, "jobs_change": 0}
    
    async def get_revenue_chart_data(self, company_id: str, months: int = 12) -> List[Dict[str, Any]]:
        """Get revenue data for chart"""
        try:
            company_oid = self.oid(company_id)
            revenue_data = []
            
            now = datetime.utcnow()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            for i in range(months):
                # Calculate month boundaries
                month_start = (start_of_month - timedelta(days=32*i)).replace(day=1)
                month_end = (month_start + timedelta(days=32)).replace(day=1)
                
                # Get revenue for this month
                month_revenue = await self._get_revenue_for_period(
                    company_oid, month_start, month_end
                )
                
                revenue_data.append({
                    "month": month_start.strftime("%b"),
                    "revenue": round(month_revenue, 2),
                    "target": 50000  # Make this configurable later
                })
            
            # Reverse to get chronological order
            return list(reversed(revenue_data))
            
        except Exception as e:
            logger.error(f"Error getting revenue chart data: {e}")
            return []
    
    async def get_recent_activities(self, company_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities"""
        try:
            company_oid = self.oid(company_id)
            activities = []
            
            # Get recent jobs
            activities.extend(await self._get_job_activities(company_oid, limit // 2))
            
            # Get recent leads
            activities.extend(await self._get_lead_activities(company_oid, limit // 3))
            
            # Get recent payments
            activities.extend(await self._get_payment_activities(company_oid, limit // 4))
            
            # Get recent estimates
            activities.extend(await self._get_estimate_activities(company_oid, limit // 4))
            
            # Sort by timestamp and limit
            activities.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
            
            # Remove timestamp and return
            for activity in activities:
                activity.pop("timestamp", None)
            
            return activities[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recent activities: {e}")
            return []
    
    async def get_quick_stats(self, company_id: str) -> Dict[str, Any]:
        """Get quick dashboard stats"""
        try:
            company_oid = self.oid(company_id)
            
            # Today's boundaries
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            # Parallel queries for better performance
            today_jobs = await self.db.jobs.count_documents({
                "company_id": company_oid,
                "scheduled_date": {"$gte": today_start, "$lt": today_end}
            })
            
            pending_invoices = await self.db.invoices.count_documents({
                "company_id": company_oid,
                "status": {"$in": ["draft", "sent", "overdue"]}
            })
            
            overdue_invoices = await self.db.invoices.count_documents({
                "company_id": company_oid,
                "status": "overdue",
                "due_date": {"$lt": datetime.utcnow()}
            })
            
            technicians_count = await self.db.users.count_documents({
                "company_id": company_oid,
                "role": "technician",
                "is_active": True
            })
            
            return {
                "today_jobs": today_jobs,
                "pending_invoices": pending_invoices,
                "overdue_invoices": overdue_invoices,
                "technicians_on_duty": technicians_count
            }
            
        except Exception as e:
            logger.error(f"Error getting quick stats: {e}")
            return {
                "today_jobs": 0,
                "pending_invoices": 0,
                "overdue_invoices": 0,
                "technicians_on_duty": 0
            }
    
    # Private helper methods
    
    async def _get_revenue_for_period(self, company_id: ObjectId, start_date: datetime, end_date: datetime) -> float:
        """Get revenue for a specific period"""
        pipeline = [
            {
                "$match": {
                    "company_id": company_id,
                    "status": {"$in": ["paid", "partially_paid"]},
                    "created_at": {"$gte": start_date, "$lt": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount_paid"}
                }
            }
        ]
        
        result = await self.db.invoices.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
    
    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """Calculate percentage change between two values"""
        if previous > 0:
            return ((current - previous) / previous) * 100
        elif current > 0:
            return 100  # If no previous data but current has value
        else:
            return 0
    
    async def _get_job_activities(self, company_id: ObjectId, limit: int) -> List[Dict[str, Any]]:
        """Get recent job activities"""
        jobs = await self.db.jobs.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(limit).to_list(length=None)
        
        activities = []
        for job in jobs:
            status = job.get("status", "unknown")
            customer_name = job.get("customer_name", "Unknown Customer")
            service_type = job.get("service_type", "Service")
            created_at = job.get("created_at", datetime.utcnow())
            
            # Create description based on status
            if status == "completed":
                description = f"Job completed for {customer_name} - {service_type}"
                activity_type = "job_completed"
            elif status == "scheduled":
                description = f"Job scheduled for {customer_name} - {service_type}"
                activity_type = "job_scheduled"
            elif status == "in_progress":
                description = f"Job started for {customer_name} - {service_type}"
                activity_type = "job_started"
            else:
                description = f"New job created for {customer_name} - {service_type}"
                activity_type = "job_created"
            
            activities.append({
                "id": str(job["_id"]),
                "description": description,
                "time": self._format_time_ago(created_at),
                "type": activity_type,
                "timestamp": created_at
            })
        
        return activities
    
    async def _get_lead_activities(self, company_id: ObjectId, limit: int) -> List[Dict[str, Any]]:
        """Get recent lead activities"""
        leads = await self.db.leads.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(limit).to_list(length=None)
        
        activities = []
        for lead in leads:
            # Get contact info for the lead
            contact_id = lead.get("contact_id")
            contact_name = "Unknown Contact"
            if contact_id:
                contact = await self.db.contacts.find_one({"_id": self.oid(contact_id)})
                if contact:
                    contact_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
                    if not contact_name:
                        contact_name = contact.get('email', 'Unknown Contact')
            
            source = lead.get("source", "website")
            created_at = lead.get("created_at", datetime.utcnow())
            
            activities.append({
                "id": str(lead["_id"]),
                "description": f"New lead from {source}: {contact_name}",
                "time": self._format_time_ago(created_at),
                "type": "lead",
                "timestamp": created_at
            })
        
        return activities
    
    async def _get_payment_activities(self, company_id: ObjectId, limit: int) -> List[Dict[str, Any]]:
        """Get recent payment activities"""
        invoices = await self.db.invoices.find({
            "company_id": company_id,
            "status": {"$in": ["paid", "partially_paid"]}
        }).sort("updated_at", -1).limit(limit).to_list(length=None)
        
        activities = []
        for invoice in invoices:
            invoice_number = invoice.get("invoice_number", f"INV-{str(invoice['_id'])[-6:]}")
            amount = invoice.get("amount_paid", invoice.get("total_amount", 0))
            updated_at = invoice.get("updated_at", datetime.utcnow())
            
            activities.append({
                "id": str(invoice["_id"]),
                "description": f"Payment received for {invoice_number} - ${amount:,.2f}",
                "time": self._format_time_ago(updated_at),
                "type": "payment",
                "timestamp": updated_at
            })
        
        return activities
    
    async def _get_estimate_activities(self, company_id: ObjectId, limit: int) -> List[Dict[str, Any]]:
        """Get recent estimate activities"""
        estimates = await self.db.estimates.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(limit).to_list(length=None)
        
        activities = []
        for estimate in estimates:
            estimate_number = estimate.get("estimate_number", f"EST-{str(estimate['_id'])[-6:]}")
            status = estimate.get("status", "draft")
            created_at = estimate.get("created_at", datetime.utcnow())
            
            if status == "accepted":
                description = f"Estimate {estimate_number} accepted by customer"
                activity_type = "estimate_accepted"
            elif status == "sent":
                description = f"Estimate {estimate_number} sent to customer"
                activity_type = "estimate_sent"
            else:
                description = f"New estimate {estimate_number} created"
                activity_type = "estimate_created"
            
            activities.append({
                "id": str(estimate["_id"]),
                "description": description,
                "time": self._format_time_ago(created_at),
                "type": activity_type,
                "timestamp": created_at
            })
        
        return activities
    
    def _format_time_ago(self, dt: datetime) -> str:
        """Format datetime as human-readable time ago"""
        if not dt:
            return "Unknown time"
        
        now = datetime.utcnow()
        diff = now - dt
        
        if diff.days > 7:
            return dt.strftime("%B %d, %Y")
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"