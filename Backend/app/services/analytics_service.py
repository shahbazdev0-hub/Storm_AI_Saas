# app/services/analytics_service.py
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from bson import ObjectId

class AnalyticsService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database

    async def get_dashboard_metrics(
        self, 
        company_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get dashboard metrics"""
        company_obj_id = ObjectId(company_id)
        
        # Pipeline for aggregated metrics
        pipeline = [
            {"$match": {
                "company_id": company_obj_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            }}
        ]
        
        # Get lead metrics
        lead_metrics = await self._get_lead_metrics(company_obj_id, start_date, end_date)
        
        # Get job metrics
        job_metrics = await self._get_job_metrics(company_obj_id, start_date, end_date)
        
        # Get revenue metrics
        revenue_metrics = await self._get_revenue_metrics(company_obj_id, start_date, end_date)
        
        return {
            "leads": lead_metrics,
            "jobs": job_metrics,
            "revenue": revenue_metrics,
            "period": {
                "start_date": start_date,
                "end_date": end_date
            }
        }

    async def _get_lead_metrics(
        self, 
        company_id: ObjectId, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get lead-specific metrics"""
        pipeline = [
            {"$match": {
                "company_id": company_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            }},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "avg_value": {"$avg": "$estimated_value"}
            }}
        ]
        
        results = await self.db.leads.aggregate(pipeline).to_list(length=None)
        
        metrics = {
            "total_leads": sum(r["count"] for r in results),
            "by_status": {r["_id"]: r["count"] for r in results},
            "avg_lead_value": sum(r["avg_value"] or 0 for r in results) / len(results) if results else 0,
            "conversion_rate": 0  # Calculate separately
        }
        
        # Calculate conversion rate
        won_leads = next((r["count"] for r in results if r["_id"] == "won"), 0)
        if metrics["total_leads"] > 0:
            metrics["conversion_rate"] = (won_leads / metrics["total_leads"]) * 100
        
        return metrics

    async def _get_job_metrics(
        self, 
        company_id: ObjectId, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get job-specific metrics"""
        pipeline = [
            {"$match": {
                "company_id": company_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            }},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_value": {"$sum": "$total_cost"}
            }}
        ]
        
        results = await self.db.jobs.aggregate(pipeline).to_list(length=None)
        
        return {
            "total_jobs": sum(r["count"] for r in results),
            "by_status": {r["_id"]: r["count"] for r in results},
            "total_job_value": sum(r["total_value"] or 0 for r in results),
            "completed_jobs": next((r["count"] for r in results if r["_id"] == "completed"), 0)
        }

    async def _get_revenue_metrics(
        self, 
        company_id: ObjectId, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get revenue metrics"""
        # This would integrate with invoices/payments
        pipeline = [
            {"$match": {
                "company_id": company_id,
                "created_at": {"$gte": start_date, "$lte": end_date},
                "status": "paid"
            }},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$amount"},
                "avg_invoice": {"$avg": "$amount"},
                "invoice_count": {"$sum": 1}
            }}
        ]
        
        results = await self.db.invoices.aggregate(pipeline).to_list(length=1)
        
        if results:
            result = results[0]
            return {
                "total_revenue": result["total_revenue"],
                "avg_invoice_value": result["avg_invoice"],
                "total_invoices": result["invoice_count"]
            }
        
        return {
            "total_revenue": 0,
            "avg_invoice_value": 0,
            "total_invoices": 0
        }

    async def get_revenue_analytics(
        self, 
        company_id: str, 
        period: str = "month"
    ) -> Dict[str, Any]:
        """Get revenue analytics by period"""
        company_obj_id = ObjectId(company_id)
        
        # Define date grouping based on period
        if period == "day":
            group_format = "%Y-%m-%d"
            date_add = {"days": 1}
        elif period == "week":
            group_format = "%Y-%U"
            date_add = {"weeks": 1}
        elif period == "month":
            group_format = "%Y-%m"
            date_add = {"days": 30}
        else:  # year
            group_format = "%Y"
            date_add = {"days": 365}
        
        # Get data for the last period
        end_date = datetime.now()
        start_date = end_date - timedelta(**date_add)
        
        pipeline = [
            {"$match": {
                "company_id": company_obj_id,
                "created_at": {"$gte": start_date, "$lte": end_date},
                "status": "paid"
            }},
            {"$group": {
                "_id": {"$dateToString": {"format": group_format, "date": "$created_at"}},
                "revenue": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        results = await self.db.invoices.aggregate(pipeline).to_list(length=None)
        
        return {
            "period": period,
            "data": [{"period": r["_id"], "revenue": r["revenue"], "count": r["count"]} for r in results],
            "total_revenue": sum(r["revenue"] for r in results),
            "total_invoices": sum(r["count"] for r in results)
        }