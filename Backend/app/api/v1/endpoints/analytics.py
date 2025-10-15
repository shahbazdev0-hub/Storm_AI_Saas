from typing import Any, Dict, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()

def _days_from_period(p: str) -> int:
    p = (p or "30d").lower().strip()
    if p.endswith("d") and p[:-1].isdigit():
        return max(1, int(p[:-1]))
    return 30

def _company_match(cid: str) -> Dict[str, Any]:
    try:
        oid = ObjectId(cid)
    except Exception:
        oid = None
    ors = []
    if oid:
        ors.append({"company_id": oid})
    ors.append({"company_id": cid})
    return {"$or": ors}

@router.get("/overview")
async def analytics_overview(
    period: str = Query("30d"),
    debug: int = Query(0, ge=0, le=1),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        days = _days_from_period(period)
        now = datetime.utcnow()
        start = now - timedelta(days=days)

        cmp = _company_match(str(current_user["company_id"]))

        # ---------- Invoices ----------
        inv_add = {
            "$addFields": {
                "_created_at": {"$ifNull": ["$created_at", {"$toDate": "$_id"}]},
                "_total": {"$toDouble": {"$ifNull": ["$total_amount", 0]}},
                "_service": {"$ifNull": ["$service_type", "General"]},
            }
        }
        inv_window = {"$match": {"_created_at": {"$gte": start, "$lte": now}}}

        # summary numbers
        inv_count = await db.invoices.aggregate(
            [{"$match": cmp}, inv_add, inv_window, {"$count": "c"}]
        ).to_list(1)
        invoices_count = int(inv_count[0]["c"]) if inv_count else 0

        rev = await db.invoices.aggregate(
            [{"$match": cmp}, inv_add, inv_window, {"$group": {"_id": None, "sum": {"$sum": "$_total"}}}]
        ).to_list(1)
        revenue = float(rev[0]["sum"]) if rev else 0.0

        trend_raw = await db.invoices.aggregate([
            {"$match": cmp}, inv_add, inv_window,
            {"$project": {"day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$_created_at"}}, "_total": 1}},
            {"$group": {"_id": "$day", "revenue": {"$sum": "$_total"}}},
            {"$sort": {"_id": 1}}
        ]).to_list(None)
        trend_map = {r["_id"]: float(r["revenue"]) for r in trend_raw}
        trend: List[Dict[str, Any]] = []
        for i in range(days):
            d = (start + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            trend.append({"date": d, "revenue": trend_map.get(d, 0.0)})

        services = await db.invoices.aggregate([
            {"$match": cmp}, inv_add, inv_window,
            {"$group": {"_id": "$_service", "revenue": {"$sum": "$_total"}, "count": {"$sum": 1}}},
            {"$sort": {"revenue": -1}}
        ]).to_list(None)
        services = [{"service_type": s["_id"] or "General",
                     "revenue": float(s.get("revenue", 0.0)),
                     "count": int(s.get("count", 0))} for s in services]

        # ---------- Estimates ----------
        est_count = await db.estimates.aggregate([
            {"$match": cmp},
            {"$addFields": {"_created_at": {"$ifNull": ["$created_at", {"$toDate": "$_id"}]}}},
            {"$match": {"_created_at": {"$gte": start, "$lte": now}}},
            {"$count": "c"}
        ]).to_list(1)
        estimates_count = int(est_count[0]["c"]) if est_count else 0

        # ---------- Leads ----------
        leads_count = await db.contacts.aggregate([
            {"$match": cmp},
            {"$addFields": {"_created_at": {"$ifNull": ["$created_at", {"$toDate": "$_id"}]}}},
            {"$match": {
                "_created_at": {"$gte": start, "$lte": now},
                "$or": [
                    {"contact_type": {"$regex": "^lead$", "$options": "i"}},
                    {"type": {"$regex": "^lead$", "$options": "i"}},
                ]
            }},
            {"$count": "c"}
        ]).to_list(1)
        leads_count = int(leads_count[0]["c"]) if leads_count else 0

        # Optional diagnostics so we can SEE what’s happening
        diagnostics: Dict[str, Any] = {}
        if debug:
            all_inv = await db.invoices.count_documents({})
            all_est = await db.estimates.count_documents({})
            all_leads = await db.contacts.count_documents({"$or": [{"contact_type": {"$regex": "^lead$", "$options": "i"}},
                                                                   {"type": {"$regex": "^lead$", "$options": "i"}}]})
            company_only_inv = await db.invoices.count_documents(cmp)
            company_only_est = await db.estimates.count_documents(cmp)
            company_only_leads = await db.contacts.count_documents(cmp)

            diagnostics = {
                "now": now.isoformat(),
                "start": start.isoformat(),
                "counts": {
                    "invoices_all": all_inv,
                    "invoices_company": company_only_inv,
                    "estimates_all": all_est,
                    "estimates_company": company_only_est,
                    "leads_all_like_type": all_leads,
                    "leads_company_like_type": company_only_leads,
                },
                "current_user_company_id": str(current_user["company_id"]),
                "company_match_or": cmp["$or"],
            }

        return {
            "period": period,
            "from": start.isoformat(),
            "to": now.isoformat(),
            "summary": {
                "revenue": revenue,
                "invoices": invoices_count,
                "estimates": estimates_count,
                "leads": leads_count,
            },
            "trend": trend,
            "services": services,
            **({"_diagnostics": diagnostics} if debug else {}),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics failed: {e}")
