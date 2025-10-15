# app/api/v1/endpoints/ai_assistant.py
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, JSONResponse
from typing import Dict, Any, Optional
from datetime import datetime
import json
import re

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.core.database import get_database
from app.core.logger import get_logger

# ✅ use your existing services
from app.services.sms_service import SMSService            # :contentReference[oaicite:4]{index=4}
from app.services.ai_service import AIService              # :contentReference[oaicite:5]{index=5}
from app.services.crm_service import CRMService            # :contentReference[oaicite:6]{index=6}
from app.services.scheduling_service import SchedulingService  # :contentReference[oaicite:7]{index=7}

logger = get_logger("endpoints.ai_assistant")
router = APIRouter(prefix="/ai", tags=["ai"])


def _normalize_phone(p: Optional[str]) -> str:
    return re.sub(r"\D", "", p or "")


async def _extract_fields_with_ai(ai: AIService, text: str) -> Dict[str, Any]:
    """
    Minimal JSON extractor using your AI client.
    Returns keys we need to qualify & book.
    """
    prompt = f"""
Return ONLY valid JSON (no prose) with:
{{"intent":"qualify|book|confirm_slot|hesitant|human_handoff|unknown",
 "name":"","phone":"","email":"",
 "service_type":"","zip":"","date":"","budget":0,"slot":"","confidence":0.0}}
User: {text}
"""
    try:
        if not ai.openai_client:
            # Fallback (no OpenAI client configured): treat as qualify
            return {"intent": "qualify", "confidence": 0.5}

        resp = await ai.openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=150,
        )
        raw = resp.choices[0].message.content.strip()
        data = json.loads(raw)
        data.setdefault("intent", "unknown")
        data.setdefault("confidence", 0.0)
        return data
    except Exception as e:
        logger.warning(f"AI extract fallback: {e}")
        return {"intent": "unknown", "confidence": 0.0}


def _is_contact_ready(ex: Dict[str, Any]) -> bool:
    name = (ex.get("name") or "").strip()
    phone = (ex.get("phone") or "").strip()
    email = (ex.get("email") or "").strip()
    return bool(name and (phone or email))


# === 1) Twilio Webhook (Inbound SMS) ===
@router.post("/webhooks/twilio", response_class=PlainTextResponse)
async def twilio_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Handles inbound SMS from Twilio. Uses your SMSService.receive_sms_webhook()
    which stores inbound + optionally auto-responds via AI if enabled.
    """
    form = dict(await request.form())

    sms = SMSService(db)
    ai = AIService(db)
    crm = CRMService(db)
    sched = SchedulingService(db)

    # 1) Store inbound & (optionally) auto-reply internally
    result = await sms.receive_sms_webhook(form)  # writes to db.sms_messages, finds company/contact/lead :contentReference[oaicite:8]{index=8}
    if result.get("status") != "processed":
        return PlainTextResponse("<Response></Response>", media_type="text/xml")

    phone = result["phone_number"]
    message = result["message"]

    # 2) Resolve company from the stored inbound record
    #    (receive_sms_webhook internally figured out the company; we re-fetch for settings)
    #    If your sms_service returns company_id directly, use that; otherwise lookup by last message.
    #    Here we infer via last inserted message (safe: we have inserted_id).
    msg_doc = await db.sms_messages.find_one({"_id": ObjectId(result["id"])})
    if not msg_doc:
        return PlainTextResponse("<Response></Response>", media_type="text/xml")
    company_id = str(msg_doc["company_id"])

    # 3) Try to extract structured intent/fields
    extracted = await _extract_fields_with_ai(ai, message)

    # 4) If customer shared name + (phone/email), create or update a Lead using your CRM service
    if _is_contact_ready(extracted):
        try:
            first_name, last_name = (extracted["name"].strip() + " ").split(" ", 1)
            lead_payload = {
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "email": (extracted.get("email") or "").lower().strip() or None,
                "phone": _normalize_phone(extracted.get("phone")) or _normalize_phone(phone),
                "source": "sms",
                "notes": "",
                "tags": list(filter(None, [extracted.get("service_type"), extracted.get("zip")])),
            }
            # Your CRMService uses Pydantic schemas (LeadCreate/ContactCreate). We’ll call its create method.
            # If your method signature differs, adjust here.
            lead_service = crm
            # try to create new lead (schema-driven inside service)  :contentReference[oaicite:9]{index=9}
            await lead_service.create_lead(company_id=company_id, lead_data=lead_payload)  # expects schema inside service
        except Exception as e:
            logger.warning(f"Lead upsert skipped (adjust to your create_lead signature): {e}")

    # 5) If intent is "book", offer simple slots (pull from SchedulingService)
    if extracted.get("intent") == "book":
        try:
            # Minimal slot finder: next 3 jobs-free windows (implement a helper if you have one)
            # Here, we just send a friendly ask since slot helper can vary by implementation.
            await sms.send_sms(
                phone_number=phone,
                message="Great! Please share a preferred date & time (e.g., 2025-09-01 10:00).",
                company_id=company_id,
            )
        except Exception as e:
            logger.warning(f"Slot offer skipped: {e}")

    # 6) If intent is "confirm_slot", you can add the matching & job create here
    # (left as future step since SchedulingService helpers vary per tenant)

    # TwiML empty (we already responded if auto-reply was enabled)
    return PlainTextResponse("<Response></Response>", media_type="text/xml")


# === 2) Frontend Chat (Customer Portal / Marketing site) ===
@router.post("/chat")
async def web_chat(payload: Dict[str, Any], db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Frontend calls this endpoint to chat with AI.
    Persists messages to sms_messages for unified history:
      phone_number = "web:{peer}"
    """
    company_id = payload.get("company_id")
    peer = payload.get("peer") or "anon"
    text = (payload.get("text") or "").strip()

    if not company_id or not text:
        raise HTTPException(status_code=400, detail="company_id and text are required")

    ai = AIService(db)
    phone_stub = f"web:{peer}"

    # Store inbound (like SMS inbound) into sms_messages
    inbound_doc = {
        "company_id": ObjectId(company_id),
        "phone_number": phone_stub,
        "message": text,
        "direction": "inbound",
        "status": "received",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {"channel": "web"},
    }
    await db.sms_messages.insert_one(inbound_doc)

    # Build a minimal conversation history (last 5 messages)
    history_cursor = db.sms_messages.find(
        {"company_id": ObjectId(company_id), "phone_number": phone_stub}
    ).sort("created_at", 1)
    history = await history_cursor.to_list(length=10)
    conversation_history = [
        {
            "direction": "inbound" if h["direction"] == "inbound" else "outbound",
            "message": h["message"],
            "created_at": h["created_at"],
            "status": h.get("status", "sent"),
        }
        for h in history[-5:]
    ]

    # Company AI settings (optional)
    company = await db.companies.find_one({"_id": ObjectId(company_id)})
    company_settings = (company or {}).get("ai_settings", {})

    # Lead context (very light for now)
    lead_data = {"company_id": company_id, "source": "web_chat"}

    # Generate reply using your AIService SMS-style generator (short, helpful) :contentReference[oaicite:10]{index=10} :contentReference[oaicite:11]{index=11}
    reply = await ai.generate_sms_response(
        conversation_history=conversation_history,
        lead_data=lead_data,
        company_settings=company_settings,
        contact_data=None,
    )

    # Store outbound
    outbound_doc = {
        "company_id": ObjectId(company_id),
        "phone_number": phone_stub,
        "message": reply,
        "direction": "outbound",
        "status": "sent",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "metadata": {"channel": "web"},
    }
    await db.sms_messages.insert_one(outbound_doc)

    return JSONResponse({"reply": reply})
