# backend/app/api/v1/endpoints/webhooks.py
from fastapi import APIRouter, Request, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import stripe, os, json
from datetime import datetime
from bson import ObjectId

from app.core.database import get_database
from .realtime import broker  # to push real-time events

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/stripe")
async def stripe_webhook(request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    etype = event["type"]

    if etype in ("checkout.session.completed", "payment_intent.succeeded"):
        data = event["data"]["object"]
        metadata = data.get("metadata", {})
        invoice_id = metadata.get("invoice_id")
        company_id = metadata.get("company_id")
        customer_id = metadata.get("customer_id")

        if invoice_id and company_id:
            await db.invoices.update_one(
                {"_id": ObjectId(invoice_id), "company_id": ObjectId(company_id)},
                {"$set": {
                    "status": "Paid",
                    "paid_at": datetime.utcnow(),
                    "payment_provider": "stripe",
                    "payment_intent_id": data.get("payment_intent"),
                    "updated_at": datetime.utcnow()
                }}
            )

            # Try to find a linked portal user to notify
            user = await db.contacts.find_one({"_id": ObjectId(customer_id)}) if customer_id else None
            user_id = str(user.get("user_id")) if user and user.get("user_id") else None

            # Push real-time event to the customer (and optionally to admins later)
            event_json = {
                "type": "invoice.paid",
                "invoice_id": invoice_id,
                "status": "paid",
                "paid_at": datetime.utcnow().isoformat()
            }
            if user_id:
                await broker.push_to_user(user_id, event_json)

    # You can handle other event types similarly (refunds, failures)
    return {"received": True}
