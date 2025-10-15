# backend/app/api/v1/endpoints/estimates.py
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.utils.emailer import send_email

router = APIRouter()


def _json_ok(payload: Any, status_code: int = 200) -> JSONResponse:
    """Encode payload safely (ObjectId, datetime) and return JSONResponse."""
    safe = jsonable_encoder(payload, custom_encoder={ObjectId: str})
    return JSONResponse(content=safe, status_code=status_code)


@router.get("/", response_model=Dict[str, Any])
async def get_estimates(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, le=100, ge=1),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=100),
) -> Dict[str, Any]:
    """Get estimates with pagination and filtering."""
    try:
        query: Dict[str, Any] = {"company_id": ObjectId(current_user["company_id"])}

        if status and status != "all":
            query["status"] = status

        if search:
            query["$or"] = [
                {"estimate_number": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"service_type": {"$regex": search, "$options": "i"}},
            ]

        total = await db.estimates.count_documents(query)
        skip_items = (page - 1) * size
        pages = (total + size - 1) // size if total > 0 else 1

        cursor = (
            db.estimates.find(query)
            .sort("created_at", -1)
            .skip(skip_items)
            .limit(size)
        )
        estimates = await cursor.to_list(length=size)

        formatted: List[Dict[str, Any]] = []
        for est in estimates:
            # lookup customer from users collection
            customer_name = "Unknown Customer"
            customer_email = ""
            customer_phone = ""

            if est.get("customer_id"):
                if ObjectId.is_valid(str(est["customer_id"])):
                    # Fetch from users collection where role="customer"
                    customer = await db.users.find_one({
                        "_id": ObjectId(est["customer_id"]),
                        "role": "customer"
                    })
                    if customer:
                        customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                        customer_email = customer.get("email", "")
                        customer_phone = customer.get("phone", "")

            formatted.append({
                "id": str(est["_id"]),
                "estimate_number": est.get("estimate_number", f"EST-{str(est['_id'])[-6:]}"),
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
                "customer_id": str(est.get("customer_id", "")),
                "service_type": est.get("service_type", "Service"),
                "description": est.get("description", ""),
                "status": est.get("status", "draft"),
                "subtotal": float(est.get("subtotal", 0)),
                "tax_amount": float(est.get("tax_amount", 0)),
                "discount_amount": float(est.get("discount_amount", 0)),
                "total_amount": float(est.get("total_amount", 0)),
                "valid_until": (
                    est.get("valid_until", (datetime.utcnow() + timedelta(days=30))).isoformat()
                    if isinstance(est.get("valid_until"), datetime)
                    else est.get("valid_until", (datetime.utcnow() + timedelta(days=30)).isoformat())
                ),
                "created_at": (
                    est.get("created_at", datetime.utcnow()).isoformat()
                    if isinstance(est.get("created_at"), datetime)
                    else est.get("created_at", datetime.utcnow()).isoformat()
                ),
                "updated_at": (
                    est.get("updated_at", datetime.utcnow()).isoformat()
                    if isinstance(est.get("updated_at"), datetime)
                    else est.get("updated_at", datetime.utcnow()).isoformat()
                ),
                "line_items": est.get("line_items", []),
                "terms_and_conditions": est.get("terms_and_conditions", ""),
                "notes": est.get("notes", ""),
            })

        return _json_ok({
            "estimates": formatted,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        })

    except Exception as e:
        print(f"Error in get_estimates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve estimates: {e}")

@router.post("/", response_model=Dict[str, Any])
async def create_estimate(
    estimate_data: Dict[str, Any] = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create new estimate and automatically send to customer."""
    import asyncio
    
    try:
        if not estimate_data.get("customer_id"):
            raise HTTPException(status_code=400, detail="customer_id is required")

        # Verify customer exists and get their email
        customer = await db.users.find_one({
            "_id": ObjectId(estimate_data["customer_id"]),
            "role": "customer",
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        if not customer.get("email"):
            raise HTTPException(status_code=400, detail="Customer has no email address")

        estimate_number = f"EST-{datetime.now().strftime('%Y%m%d')}-{str(ObjectId())[-4:]}"

        line_items = estimate_data.get("line_items", [])
        subtotal = sum(
            (item.get("quantity", 0) or 0) * (item.get("unit_price", 0) or 0)
            for item in line_items
        )
        discount_amount = estimate_data.get("discount_amount", 0) or 0
        discounted_subtotal = subtotal - discount_amount
        tax_rate = estimate_data.get("tax_rate", 0) or 0
        tax_amount = (discounted_subtotal * tax_rate) / 100
        total_amount = discounted_subtotal + tax_amount

        valid_days = estimate_data.get("valid_days", 30) or 30

        estimate_doc: Dict[str, Any] = {
            "company_id": ObjectId(current_user["company_id"]),
            "customer_id": ObjectId(estimate_data["customer_id"]),
            "estimate_number": estimate_number,
            "service_type": estimate_data.get("service_type", "Service"),
            "title": estimate_data.get("service_type", "Service Estimate"),
            "description": estimate_data.get("description", ""),
            "status": "pending",  # Start with pending status
            "line_items": line_items,
            "subtotal": float(subtotal),
            "discount_amount": float(discount_amount),
            "tax_rate": float(tax_rate),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "valid_days": int(valid_days),
            "valid_until": datetime.utcnow() + timedelta(days=int(valid_days)),
            "terms_and_conditions": estimate_data.get("terms_and_conditions", ""),
            "notes": estimate_data.get("notes", ""),
            "created_by": ObjectId(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = await db.estimates.insert_one(estimate_doc)

        # Prepare email content
        customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or "there"
        subject = f"Your Estimate {estimate_number} from Storm AI Services"
        
        # Generate line items HTML
        line_items_html = ""
        for item in line_items:
            item_total = (item.get("quantity", 0) or 0) * (item.get("unit_price", 0) or 0)
            line_items_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{item.get('description', '')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 0)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.get('unit_price', 0):,.2f}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item_total:,.2f}</td>
            </tr>
            """

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center;">
                <h1 style="color: #333; margin: 0;">Storm AI Services</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Professional Service Estimate</p>
            </div>
            
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333;">Hello {customer_name},</p>
                
                <p style="color: #666; line-height: 1.6;">
                    Thank you for considering our services. Please find your detailed estimate below:
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h2 style="color: #333; margin: 0 0 10px 0;">Estimate #{estimate_number}</h2>
                    <p style="margin: 5px 0; color: #666;"><strong>Service:</strong> {estimate_doc['service_type']}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>Valid Until:</strong> {estimate_doc['valid_until'].strftime('%B %d, %Y')}</p>
                    {f'<p style="margin: 10px 0; color: #666;"><strong>Description:</strong> {estimate_doc["description"]}</p>' if estimate_doc.get("description") else ''}
                </div>
                
                {f'''
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #f1f3f4;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {line_items_html}
                    </tbody>
                </table>
                ''' if line_items else ''}
                
                <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 5px;">
                    <div style="text-align: right;">
                        <p style="margin: 5px 0; color: #666;">Subtotal: <strong>${subtotal:,.2f}</strong></p>
                        {f'<p style="margin: 5px 0; color: #666;">Discount: <strong>-${discount_amount:,.2f}</strong></p>' if discount_amount > 0 else ''}
                        {f'<p style="margin: 5px 0; color: #666;">Tax ({tax_rate}%): <strong>${tax_amount:,.2f}</strong></p>' if tax_amount > 0 else ''}
                        <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="margin: 10px 0; color: #333; font-size: 18px;"><strong>Total: ${total_amount:,.2f}</strong></p>
                    </div>
                </div>
                
                {f'<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0; color: #856404;"><strong>Notes:</strong> {estimate_doc["notes"]}</p></div>' if estimate_doc.get("notes") else ''}
                
                <div style="margin: 30px 0; padding: 20px; background: #e8f5e8; border-radius: 5px;">
                    <h3 style="color: #2d5a2d; margin: 0 0 10px 0;">Next Steps</h3>
                    <p style="color: #2d5a2d; margin: 0; line-height: 1.6;">
                        Please review this estimate and let us know if you have any questions. 
                        We're here to help and look forward to working with you!
                    </p>
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                    Best regards,<br>
                    <strong>Storm AI Services Team</strong>
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                <p style="margin: 0;">This estimate is valid until {estimate_doc['valid_until'].strftime('%B %d, %Y')}</p>
                <p style="margin: 5px 0 0 0;">Thank you for choosing Storm AI Services</p>
            </div>
        </div>
        """

        # Send email in background (async)
        async def send_email_async():
            try:
                send_email(customer["email"], subject, html_content)
                
                # Update estimate status to sent after email succeeds
                await db.estimates.update_one(
                    {"_id": result.inserted_id},
                    {
                        "$set": {
                            "status": "sent",
                            "sent_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                print(f"✅ Estimate {estimate_number} sent successfully to {customer['email']}")
                
            except Exception as email_error:
                # Update estimate status to failed if email fails
                await db.estimates.update_one(
                    {"_id": result.inserted_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": str(email_error),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                print(f"❌ Email failed for estimate {estimate_number}: {email_error}")

        # Start background email task
        asyncio.create_task(send_email_async())
            
        # Build response - return immediately with pending status
        resp = {
            "id": str(result.inserted_id),
            "company_id": str(estimate_doc["company_id"]),
            "customer_id": str(estimate_doc["customer_id"]),
            "estimate_number": estimate_doc["estimate_number"],
            "service_type": estimate_doc["service_type"],
            "title": estimate_doc["title"],
            "description": estimate_doc["description"],
            "status": "pending",  # Will be updated to "sent" or "failed" by background task
            "line_items": estimate_doc["line_items"],
            "subtotal": estimate_doc["subtotal"],
            "discount_amount": estimate_doc["discount_amount"],
            "tax_rate": estimate_doc["tax_rate"],
            "tax_amount": estimate_doc["tax_amount"],
            "total_amount": estimate_doc["total_amount"],
            "valid_days": estimate_doc["valid_days"],
            "valid_until": estimate_doc["valid_until"],
            "terms_and_conditions": estimate_doc["terms_and_conditions"],
            "notes": estimate_doc["notes"],
            "created_by": str(estimate_doc["created_by"]),
            "created_at": estimate_doc["created_at"],
            "updated_at": estimate_doc["updated_at"],
            "customer_email": customer["email"],
            "customer_name": customer_name
        }

        return _json_ok(resp, status_code=200)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_estimate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create estimate: {e}")


@router.get("/{estimate_id}", response_model=Dict[str, Any])
async def get_estimate(
    estimate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get estimate by ID."""
    try:
        if not ObjectId.is_valid(estimate_id):
            raise HTTPException(status_code=400, detail="Invalid estimate ID")

        est = await db.estimates.find_one(
            {"_id": ObjectId(estimate_id), "company_id": ObjectId(current_user["company_id"])}
        )
        if not est:
            raise HTTPException(status_code=404, detail="Estimate not found")

        customer_name = "Unknown Customer"
        customer_email = ""

        if est.get("customer_id"):
            # Fetch from users collection
            customer = await db.users.find_one({
                "_id": est["customer_id"],
                "role": "customer"
            })
            if customer:
                customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                customer_email = customer.get("email", "")

        resp = {
            "id": str(est["_id"]),
            "company_id": str(est["company_id"]),
            "customer_id": str(est.get("customer_id", "")),
            "customer_name": customer_name,
            "customer_email": customer_email,
            "estimate_number": est.get("estimate_number"),
            "service_type": est.get("service_type", ""),
            "title": est.get("title", ""),
            "description": est.get("description", ""),
            "status": est.get("status", "draft"),
            "line_items": est.get("line_items", []),
            "subtotal": float(est.get("subtotal", 0)),
            "tax_amount": float(est.get("tax_amount", 0)),
            "discount_amount": float(est.get("discount_amount", 0)),
            "total_amount": float(est.get("total_amount", 0)),
            "terms_and_conditions": est.get("terms_and_conditions", ""),
            "notes": est.get("notes", ""),
            "created_at": est.get("created_at", datetime.utcnow()),
            "updated_at": est.get("updated_at", datetime.utcnow()),
            "valid_until": est.get("valid_until", datetime.utcnow()),
        }
        return _json_ok(resp)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_estimate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get estimate: {e}")


# Add endpoint to get customers
@router.get("/customers/list", response_model=Dict[str, Any])
async def get_customers(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get list of customers for estimate creation."""
    try:
        customers = await db.users.find({
            "company_id": ObjectId(current_user["company_id"]),
            "role": "customer",
            "status": "active"
        }).to_list(length=None)

        formatted_customers = []
        for customer in customers:
            formatted_customers.append({
                "id": str(customer["_id"]),
                "first_name": customer.get("first_name", ""),
                "last_name": customer.get("last_name", ""),
                "email": customer.get("email", ""),
                "phone": customer.get("phone", ""),
                "full_name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
            })

        return _json_ok({"customers": formatted_customers})

    except Exception as e:
        print(f"Error in get_customers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customers: {e}")


# Keep existing endpoints for update, delete, send, duplicate...
@router.put("/{estimate_id}", response_model=Dict[str, Any])
async def update_estimate(
    estimate_id: str,
    estimate_data: Dict[str, Any] = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update estimate."""
    try:
        if not ObjectId.is_valid(estimate_id):
            raise HTTPException(status_code=400, detail="Invalid estimate ID")

        existing = await db.estimates.find_one(
            {"_id": ObjectId(estimate_id), "company_id": ObjectId(current_user["company_id"])}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Estimate not found")

        line_items = estimate_data.get("line_items", existing.get("line_items", []))
        subtotal = sum(
            (i.get("quantity", 0) or 0) * (i.get("unit_price", 0) or 0) for i in line_items
        )
        discount_amount = estimate_data.get("discount_amount", existing.get("discount_amount", 0)) or 0
        discounted_subtotal = subtotal - discount_amount
        tax_rate = estimate_data.get("tax_rate", existing.get("tax_rate", 0)) or 0
        tax_amount = (discounted_subtotal * tax_rate) / 100
        total_amount = discounted_subtotal + tax_amount

        update_doc = {
            "service_type": estimate_data.get("service_type", existing.get("service_type")),
            "description": estimate_data.get("description", existing.get("description")),
            "line_items": line_items,
            "subtotal": float(subtotal),
            "discount_amount": float(discount_amount),
            "tax_rate": float(tax_rate),
            "tax_amount": float(tax_amount),
            "total_amount": float(total_amount),
            "terms_and_conditions": estimate_data.get(
                "terms_and_conditions", existing.get("terms_and_conditions")
            ),
            "notes": estimate_data.get("notes", existing.get("notes")),
            "updated_at": datetime.utcnow(),
        }

        result = await db.estimates.update_one(
            {"_id": ObjectId(estimate_id), "company_id": ObjectId(current_user["company_id"])},
            {"$set": update_doc},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Estimate not found")

        return await get_estimate(estimate_id, db, current_user)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_estimate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update estimate: {e}")


@router.delete("/{estimate_id}")
async def delete_estimate(
    estimate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, str]:
    """Delete estimate."""
    try:
        if not ObjectId.is_valid(estimate_id):
            raise HTTPException(status_code=400, detail="Invalid estimate ID")

        result = await db.estimates.delete_one(
            {"_id": ObjectId(estimate_id), "company_id": ObjectId(current_user["company_id"])}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Estimate not found")

        return _json_ok({"message": "Estimate deleted successfully"})

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_estimate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete estimate: {e}")


@router.post("/{estimate_id}/send")
async def send_estimate(
    estimate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, str]:
    """Send estimate to customer via email."""
    if not ObjectId.is_valid(estimate_id):
        raise HTTPException(status_code=400, detail="Invalid estimate ID")

    estimate = await db.estimates.find_one({
        "_id": ObjectId(estimate_id),
        "company_id": ObjectId(current_user["company_id"])
    })
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    if not estimate.get("customer_id"):
        raise HTTPException(status_code=400, detail="Estimate missing customer_id")

    # Fetch customer from users collection
    customer = await db.users.find_one({
        "_id": ObjectId(estimate["customer_id"]),
        "role": "customer"
    })
    if not customer or not customer.get("email"):
        raise HTTPException(status_code=400, detail="Customer has no email on file")

    customer_name = f"{customer.get('first_name','').strip()} {customer.get('last_name','').strip()}".strip() or "there"
    estimate_number = estimate.get("estimate_number", f"EST-{str(estimate['_id'])[-6:]}")
    total = float(estimate.get("total_amount", 0.0))

    subject = f"Your Estimate {estimate_number} from Storm AI Services"
    html = f"""
    <div style="font-family:Arial,sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center;">
        <h1 style="color: #333;">Storm AI Services</h1>
      </div>
      <div style="padding: 30px;">
        <p>Hi {customer_name},</p>
        <p>Here is your estimate <b>{estimate_number}</b>.</p>
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <p><b>Total:</b> ${total:,.2f}</p>
          <p><b>Service:</b> {estimate.get('service_type', '')}</p>
          <p>{estimate.get('description','')}</p>
        </div>
        <p>Thank you for considering our services!</p>
        <p>Best regards,<br><b>Storm AI Services Team</b></p>
      </div>
    </div>
    """

    try:
        send_email(customer["email"], subject, html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email send failed: {e}")

    await db.estimates.update_one(
        {"_id": ObjectId(estimate_id)},
        {"$set": {"status": "sent", "sent_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    return {"message": "Estimate sent successfully"}


@router.post("/{estimate_id}/duplicate")
async def duplicate_estimate(
    estimate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Duplicate an existing estimate."""
    try:
        if not ObjectId.is_valid(estimate_id):
            raise HTTPException(status_code=400, detail="Invalid estimate ID")

        original = await db.estimates.find_one(
            {"_id": ObjectId(estimate_id), "company_id": ObjectId(current_user["company_id"])}
        )
        if not original:
            raise HTTPException(status_code=404, detail="Estimate not found")

        dup = original.copy()
        dup.pop("_id", None)
        dup["estimate_number"] = f"EST-{datetime.now().strftime('%Y%m%d')}-{str(ObjectId())[-4:]}"
        dup["status"] = "draft"
        dup["created_at"] = datetime.utcnow()
        dup["updated_at"] = datetime.utcnow()
        dup["sent_at"] = None
        dup["viewed_at"] = None
        dup["accepted_at"] = None

        result = await db.estimates.insert_one(dup)
        return _json_ok({"message": "Estimate duplicated successfully", "id": str(result.inserted_id)})

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in duplicate_estimate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to duplicate estimate: {e}")