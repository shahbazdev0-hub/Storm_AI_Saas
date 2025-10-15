# app/services/invoice_service.py
from __future__ import annotations
from typing import Any, Dict, List, Union
from datetime import datetime, timedelta
import asyncio

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

# If you have a Pydantic schema, import it; otherwise we treat input as dict
try:
    from app.schemas.invoice import InvoiceCreate  # optional
except Exception:  # pragma: no cover
    InvoiceCreate = BaseModel  # fallback so typing still works


def _as_objid(value: Any) -> ObjectId | None:
    """Convert a string to ObjectId if valid; pass through ObjectId; else None."""
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str) and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def _money(n: Any) -> float:
    try:
        return float(n or 0)
    except Exception:
        return 0.0


def _serialize_id(v: Any) -> str | None:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, (str, type(None))):
        return v
    return str(v)


def _serialize_invoice(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Make a Mongo document safe for JSON (strings for ObjectIds & datetimes)."""
    out = dict(doc)
    # ids
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for k in ("company_id", "customer_id", "contact_id", "created_by"):
        if k in out:
            out[k] = _serialize_id(out[k])
    # datetimes
    for k in ("created_at", "updated_at", "due_date", "valid_until", "paid_at", "sent_at"):
        if k in out and isinstance(out[k], datetime):
            out[k] = out[k].isoformat()
    # line items: ensure numeric totals
    items = []
    for it in out.get("line_items", []) or []:
        items.append({
            "description": it.get("description", ""),
            "quantity": _money(it.get("quantity")),
            "unit_price": _money(it.get("unit_price")),
            "total": _money(it.get("quantity")) * _money(it.get("unit_price")),
        })
    out["line_items"] = items
    # numeric fields
    for k in ("subtotal", "tax_amount", "discount_amount", "total_amount", "tax_rate"):
        if k in out:
            out[k] = _money(out[k])
    return out


async def create_invoice(
    db: AsyncIOMotorDatabase,
    current_user: Dict[str, Any],
    invoice_in: Union[InvoiceCreate, Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Create an invoice from either a Pydantic model or a plain dict and return a JSON-safe dict.
    Automatically sends payment portal email to customer.
    """
    # Normalize input to a dict
    if isinstance(invoice_in, BaseModel):
        data: Dict[str, Any] = invoice_in.model_dump()
    elif isinstance(invoice_in, dict):
        data = dict(invoice_in)
    else:
        # Defensive: unsupported type
        raise TypeError("invoice_in must be a pydantic model or dict")

    # Required: a contact/customer id
    contact_id = data.get("contact_id") or data.get("customer_id")
    oid_contact = _as_objid(contact_id)
    if oid_contact is None:
        raise ValueError("customer_id is required and must be a valid ObjectId string")

    # Verify customer exists and get their email
    customer = await db.users.find_one({
        "_id": oid_contact,
        "role": "customer",
        "company_id": ObjectId(current_user["company_id"])
    })
    
    if not customer:
        raise ValueError("Customer not found")
    
    if not customer.get("email"):
        raise ValueError("Customer has no email address")

    # Company & creator
    company_oid = _as_objid(current_user.get("company_id"))
    if company_oid is None:
        raise ValueError("Invalid company_id on current_user")

    created_by_oid = _as_objid(current_user.get("_id"))

    # Line items & totals
    raw_items = data.get("line_items") or data.get("items") or []
    items: List[Dict[str, Any]] = []
    subtotal = 0.0
    for it in raw_items:
        desc = (it.get("description") or "").strip()
        qty = _money(it.get("quantity"))
        price = _money(it.get("unit_price"))
        total = qty * price
        items.append({"description": desc, "quantity": qty, "unit_price": price, "total": total})
        subtotal += total

    discount = _money(data.get("discount_amount"))
    tax_rate = _money(data.get("tax_rate"))
    taxable_base = max(0.0, subtotal - discount)
    tax_amount = (taxable_base * tax_rate) / 100.0
    total_amount = max(0.0, taxable_base + tax_amount)

    # Dates
    issue_date = datetime.utcnow()
    payment_terms_days = int(data.get("payment_terms_days") or 30)
    due_date = issue_date + timedelta(days=payment_terms_days)

    invoice_number = data.get("invoice_number")
    if not invoice_number:
        # Simple sequential-ish number; adapt to your needs
        invoice_number = f"INV-{issue_date.strftime('%Y%m%d')}-{str(ObjectId())[-4:]}"

    doc: Dict[str, Any] = {
        "company_id": company_oid,
        "customer_id": oid_contact,
        "contact_id": oid_contact,
        "created_by": created_by_oid,
        "invoice_number": invoice_number,
        "title": data.get("title") or data.get("service_type") or "Service Invoice",
        "description": data.get("description", ""),
        "status": "pending",  # Start with pending status
        "line_items": items,
        "subtotal": subtotal,
        "discount_amount": discount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "issue_date": issue_date,
        "due_date": due_date,
        "notes": data.get("notes", ""),
        "terms_and_conditions": data.get("terms_and_conditions", ""),
        "created_at": issue_date,
        "updated_at": issue_date,
        # Optional lifecycle fields
        "paid_at": None,
        "sent_at": None,
    }

    result = await db.invoices.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Prepare customer info for email
    customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or "there"
    
    # Generate payment portal URL
    payment_url = f"https://app.stormai.net/payment/{result.inserted_id}"  # Adjust domain as needed
    
    # Create email content
    subject = f"Invoice {invoice_number} - Payment Required"
    
    # Generate line items for email
    line_items_html = ""
    for item in items:
        line_items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{item['description']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item['unit_price']:,.2f}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item['total']:,.2f}</td>
        </tr>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Storm AI Services</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Invoice & Payment Portal</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello {customer_name},</p>
            
            <p style="color: #666; line-height: 1.6;">
                Your service has been completed and your invoice is ready. Please review the details below and make your payment using our secure online portal.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h2 style="color: #333; margin: 0 0 10px 0;">Invoice #{invoice_number}</h2>
                <p style="margin: 5px 0; color: #666;"><strong>Service:</strong> {doc['title']}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Due Date:</strong> {due_date.strftime('%B %d, %Y')}</p>
                {f'<p style="margin: 10px 0; color: #666;"><strong>Description:</strong> {doc["description"]}</p>' if doc.get("description") else ''}
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
            ''' if items else ''}
            
            <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 5px;">
                <div style="text-align: right;">
                    <p style="margin: 5px 0; color: #666;">Subtotal: <strong>${subtotal:,.2f}</strong></p>
                    {f'<p style="margin: 5px 0; color: #666;">Discount: <strong>-${discount:,.2f}</strong></p>' if discount > 0 else ''}
                    {f'<p style="margin: 5px 0; color: #666;">Tax ({tax_rate}%): <strong>${tax_amount:,.2f}</strong></p>' if tax_amount > 0 else ''}
                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="margin: 10px 0; color: #333; font-size: 18px;"><strong>Total: ${total_amount:,.2f}</strong></p>
                </div>
            </div>
            
            <!-- Payment Portal Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{payment_url}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    💳 Pay Now - ${total_amount:,.2f}
                </a>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
                    Secure payment portal • Credit cards, bank transfers, and more
                </p>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: #e8f5e8; border-radius: 5px;">
                <h3 style="color: #2d5a2d; margin: 0 0 10px 0;">Easy Online Payment</h3>
                <p style="color: #2d5a2d; margin: 0; line-height: 1.6;">
                    Click the "Pay Now" button above to access our secure payment portal. 
                    You can pay with credit cards, debit cards, or bank transfer. 
                    Your payment will be processed immediately and you'll receive a confirmation email.
                </p>
            </div>
            
            {f'<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0; color: #856404;"><strong>Notes:</strong> {doc["notes"]}</p></div>' if doc.get("notes") else ''}
            
            <p style="color: #666; line-height: 1.6;">
                Thank you for choosing Storm AI Services. If you have any questions about this invoice, 
                please don't hesitate to contact us.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
                Best regards,<br>
                <strong>Storm AI Services Team</strong>
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">Invoice #{invoice_number} • Due: {due_date.strftime('%B %d, %Y')}</p>
            <p style="margin: 5px 0 0 0;">Storm AI Services • Professional Service Solutions</p>
        </div>
    </div>
    """

    # Send email in background (async)
    async def send_email_async():
        try:
            from app.utils.emailer import send_email
            send_email(customer["email"], subject, html_content)
            
            # Update invoice status to sent after email succeeds
            await db.invoices.update_one(
                {"_id": result.inserted_id},
                {
                    "$set": {
                        "status": "sent",
                        "sent_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "payment_url": payment_url
                    }
                }
            )
            print(f"✅ Invoice {invoice_number} sent successfully to {customer['email']}")
            
        except Exception as email_error:
            # Update invoice status to failed if email fails
            await db.invoices.update_one(
                {"_id": result.inserted_id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(email_error),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"❌ Email failed for invoice {invoice_number}: {email_error}")

    # Start background email task
    asyncio.create_task(send_email_async())

    # Return response immediately with pending status
    response = _serialize_invoice(doc)
    response["status"] = "pending"  # Will be updated to "sent" or "failed" by background task
    response["customer_email"] = customer["email"]
    response["customer_name"] = customer_name
    response["payment_url"] = payment_url
    
    return response