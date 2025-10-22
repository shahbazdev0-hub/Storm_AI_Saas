# backend/app/api/v1/endpoints/invoices.py
from __future__ import annotations

from typing import Any, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.services import invoice_service  # <-- make sure __init__.py imports create_invoice, etc.

router = APIRouter()

# ---------- LIST ----------
@router.get("/", response_model=Dict[str, Any])
async def list_invoices(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=100),
) -> Dict[str, Any]:
    """
    List invoices with basic filters & pagination.
    Returns JSON-safe values (no raw ObjectIds).
    """
    try:
        query: Dict[str, Any] = {"company_id": ObjectId(current_user["company_id"])}
        if status and status != "all":
            query["status"] = status
        if search:
            query["$or"] = [
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]

        total = await db.invoices.count_documents(query)
        pages = max(1, (total + size - 1) // size)
        skip = (page - 1) * size

        # ✅ USE AGGREGATION PIPELINE TO JOIN CUSTOMER DATA
        pipeline = [
            {"$match": query},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": size},
            # ✅ Join with users collection to get customer info
            {
                "$lookup": {
                    "from": "users",
                    "localField": "customer_id",
                    "foreignField": "_id",
                    "as": "customer_info"
                }
            },
            # ✅ Also join with contacts collection as fallback
            {
                "$lookup": {
                    "from": "contacts",
                    "localField": "contact_id",
                    "foreignField": "_id",
                    "as": "contact_info"
                }
            }
        ]
        
        rows = await db.invoices.aggregate(pipeline).to_list(length=size)

        # JSON-safe formatting
        def _to_str(v): return str(v) if isinstance(v, ObjectId) else v
        def _dt(v): return v.isoformat() if isinstance(v, datetime) else v

        data = []
        for r in rows:
            # ✅ GET CUSTOMER NAME FROM LOOKUP
            customer_name = "Unknown Customer"
            
            # Try to get from users collection first
            if r.get("customer_info") and len(r["customer_info"]) > 0:
                customer = r["customer_info"][0]
                first_name = customer.get("first_name", "")
                last_name = customer.get("last_name", "")
                customer_name = f"{first_name} {last_name}".strip()
                if not customer_name:
                    customer_name = customer.get("email", "Unknown Customer")
            
            # Fallback to contacts collection
            elif r.get("contact_info") and len(r["contact_info"]) > 0:
                contact = r["contact_info"][0]
                first_name = contact.get("first_name", "")
                last_name = contact.get("last_name", "")
                customer_name = f"{first_name} {last_name}".strip()
                if not customer_name:
                    customer_name = contact.get("name", contact.get("email", "Unknown Customer"))
            
            data.append({
                "id": str(r["_id"]),
                "company_id": _to_str(r.get("company_id")),
                "customer_id": _to_str(r.get("customer_id")),
                "contact_id": _to_str(r.get("contact_id")),
                "created_by": _to_str(r.get("created_by")),
                "customer_name": customer_name,  # ✅ ADD CUSTOMER NAME
                "invoice_number": r.get("invoice_number"),
                "title": r.get("title", ""),
                "description": r.get("description", ""),
                "status": r.get("status", "draft"),
                "line_items": [
                    {
                        "description": it.get("description", ""),
                        "quantity": float(it.get("quantity", 0) or 0),
                        "unit_price": float(it.get("unit_price", 0) or 0),
                        "total": float((it.get("quantity", 0) or 0) * (it.get("unit_price", 0) or 0)),
                    } for it in (r.get("line_items") or [])
                ],
                "subtotal": float(r.get("subtotal", 0) or 0),
                "discount_amount": float(r.get("discount_amount", 0) or 0),
                "tax_rate": float(r.get("tax_rate", 0) or 0),
                "tax_amount": float(r.get("tax_amount", 0) or 0),
                "total_amount": float(r.get("total_amount", 0) or 0),
                "issue_date": _dt(r.get("issue_date")),
                "due_date": _dt(r.get("due_date")),
                "created_at": _dt(r.get("created_at")),
                "updated_at": _dt(r.get("updated_at")),
                "paid_at": _dt(r.get("paid_at")),
                "sent_at": _dt(r.get("sent_at")),
                "notes": r.get("notes", ""),
                "terms_and_conditions": r.get("terms_and_conditions", ""),
            })

        return {
            "invoices": data,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list invoices: {e}")

# ---------- CREATE ----------
@router.post("/", response_model=Dict[str, Any])
async def create_invoice(
    payload: Dict[str, Any] = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Create an invoice. Accepts either the minimal fields or full details.
    Body must include contact_id and line_items (desc/qty/unit_price).
    """
    try:
        created = await invoice_service.create_invoice(db, current_user, payload)
        return created
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {e}")


# ---------- GET ONE ----------
@router.get("/{invoice_id}", response_model=Dict[str, Any])
async def get_invoice(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        if not ObjectId.is_valid(invoice_id):
            raise HTTPException(status_code=400, detail="Invalid invoice ID")

        doc = await db.invoices.find_one({
            "_id": ObjectId(invoice_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        if not doc:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Reuse the service serializer for consistency
        from app.services.invoice_service import _serialize_invoice  # local import to avoid cycle
        return _serialize_invoice(doc)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get invoice: {e}")


# ---------- SEND (stub that just marks as sent) ----------
@router.post("/{invoice_id}/send", response_model=Dict[str, Any])
async def send_invoice(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        if not ObjectId.is_valid(invoice_id):
            raise HTTPException(status_code=400, detail="Invalid invoice ID")

        result = await db.invoices.update_one(
            {"_id": ObjectId(invoice_id), "company_id": ObjectId(current_user["company_id"])},
            {"$set": {"status": "sent", "sent_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")

        return {"message": "Invoice sent (status updated)"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send invoice: {e}")
