# =============================================================================
# app/api/v1/endpoints/ai_automation.py
# =============================================================================
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.services.ai_service import AIService
from app.services.sms_service import SMSService
from app.dependencies.auth import get_current_user

router = APIRouter()

@router.post("/sms/send")
async def send_ai_sms(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    phone_number: str,
    lead_id: str,
    message: Optional[str] = None
) -> Any:
    """Send AI-generated SMS to lead"""
    ai_service = AIService(db)
    sms_service = SMSService(db)
    
    # Get lead data
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    lead = await db.leads.find_one({
        "_id": ObjectId(lead_id), 
        "company_id": ObjectId(current_user["company_id"])
    })
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get conversation history
    conversation = await sms_service.get_conversation_history(
        phone_number, str(current_user["company_id"])
    )
    
    # Generate AI response if no message provided
    if not message:
        company = await db.companies.find_one({"_id": ObjectId(current_user["company_id"])})
        message = await ai_service.generate_sms_response(
            conversation_history=conversation,
            lead_data=lead,
            company_settings=company.get("settings", {}) if company else {}
        )
    
    # Send SMS in background
    background_tasks.add_task(
        sms_service.send_sms,
        phone_number=phone_number,
        message=message,
        company_id=str(current_user["company_id"]),
        lead_id=lead_id
    )
    
    return {"message": "SMS queued for sending", "content": message}

@router.post("/leads/{lead_id}/score")
async def score_lead(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    lead_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Re-score lead with AI"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    ai_service = AIService(db)
    
    # Get lead
    lead = await db.leads.find_one({
        "_id": ObjectId(lead_id), 
        "company_id": ObjectId(current_user["company_id"])
    })
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Score lead
    score = await ai_service.score_lead(lead)
    
    # Update lead score
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"ai_score": score, "updated_at": datetime.utcnow()}}
    )
    
    return {"lead_id": lead_id, "ai_score": score}

@router.get("/conversations/{phone_number}")
async def get_conversation(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    phone_number: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get SMS conversation history"""
    sms_service = SMSService(db)
    conversation = await sms_service.get_conversation_history(
        phone_number=phone_number,
        company_id=str(current_user["company_id"])
    )
    return conversation

@router.post("/flows")
async def create_ai_flow(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    name: str,
    description: str,
    trigger_conditions: Dict[str, Any],
    flow_steps: List[Dict[str, Any]]
) -> Any:
    """Create AI automation flow"""
    flow_data = {
        "company_id": ObjectId(current_user["company_id"]),
        "name": name,
        "description": description,
        "trigger_conditions": trigger_conditions,
        "flow_steps": flow_steps,
        "is_active": True,
        "created_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.ai_flows.insert_one(flow_data)
    flow_data["id"] = str(result.inserted_id)
    flow_data["company_id"] = str(flow_data["company_id"])
    flow_data["created_by"] = str(flow_data["created_by"])
    
    return flow_data

@router.get("/flows")
async def get_ai_flows(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Get all AI flows for company"""
    flows = await db.ai_flows.find({
        "company_id": ObjectId(current_user["company_id"])
    }).to_list(length=None)
    
    for flow in flows:
        flow["id"] = str(flow["_id"])
        flow["company_id"] = str(flow["company_id"])
        flow["created_by"] = str(flow["created_by"])
    
    return flows

@router.put("/flows/{flow_id}")
async def update_ai_flow(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    flow_id: str,
    current_user: dict = Depends(get_current_user),
    name: Optional[str] = None,
    description: Optional[str] = None,
    trigger_conditions: Optional[Dict[str, Any]] = None,
    flow_steps: Optional[List[Dict[str, Any]]] = None,
    is_active: Optional[bool] = None
) -> Any:
    """Update AI flow"""
    if not ObjectId.is_valid(flow_id):
        raise HTTPException(status_code=400, detail="Invalid flow ID")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if trigger_conditions is not None:
        update_data["trigger_conditions"] = trigger_conditions
    if flow_steps is not None:
        update_data["flow_steps"] = flow_steps
    if is_active is not None:
        update_data["is_active"] = is_active
    
    result = await db.ai_flows.update_one(
        {"_id": ObjectId(flow_id), "company_id": ObjectId(current_user["company_id"])},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    return {"message": "Flow updated successfully"}

@router.delete("/flows/{flow_id}")
async def delete_ai_flow(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    flow_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Delete AI flow"""
    if not ObjectId.is_valid(flow_id):
        raise HTTPException(status_code=400, detail="Invalid flow ID")
    
    result = await db.ai_flows.delete_one({
        "_id": ObjectId(flow_id),
        "company_id": ObjectId(current_user["company_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    return {"message": "Flow deleted successfully"}

@router.post("/customers/{customer_id}/churn-prediction")
async def predict_customer_churn(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    customer_id: str,
    current_user: dict = Depends(get_current_user),
) -> Any:
    """Predict customer churn probability"""
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    ai_service = AIService(db)
    
    # Get customer data
    customer = await db.contacts.find_one({
        "_id": ObjectId(customer_id),
        "company_id": ObjectId(current_user["company_id"])
    })
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get customer history for churn prediction
    jobs = await db.jobs.find({
        "customer_id": ObjectId(customer_id),
        "company_id": ObjectId(current_user["company_id"])
    }).to_list(length=None)
    
    invoices = await db.invoices.find({
        "customer_id": ObjectId(customer_id),
        "company_id": ObjectId(current_user["company_id"])
    }).to_list(length=None)
    
    # Calculate customer metrics
    if jobs:
        last_service = max(job["scheduled_date"] for job in jobs)
        days_since_last_service = (datetime.utcnow() - last_service).days
    else:
        days_since_last_service = 365  # No service history
    
    total_services = len(jobs)
    completed_services = len([j for j in jobs if j["status"] == "completed"])
    avg_service_value = sum(j.get("total_cost", 0) for j in jobs) / len(jobs) if jobs else 0
    
    # Payment behavior
    paid_invoices = [i for i in invoices if i["status"] == "paid"]
    overdue_invoices = [i for i in invoices if i["status"] == "overdue"]
    payment_delays = len(overdue_invoices)
    
    customer_data = {
        "days_since_last_service": days_since_last_service,
        "total_services": total_services,
        "completed_services": completed_services,
        "avg_service_value": avg_service_value,
        "payment_delays": payment_delays,
        "satisfaction_score": 5  # Default - could be from surveys
    }
    
    # Predict churn
    churn_probability = await ai_service.predict_churn(customer_data)
    
    # Update customer record with churn score
    await db.contacts.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": {
            "churn_score": churn_probability,
            "churn_updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "customer_id": customer_id,
        "churn_probability": churn_probability,
        "risk_level": "high" if churn_probability > 0.7 else "medium" if churn_probability > 0.4 else "low",
        "metrics": customer_data
    }

@router.post("/message/analyze")
async def analyze_message(
    *,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    message: str,
    phone_number: Optional[str] = None
) -> Any:
    """Analyze customer message for objections and sentiment"""
    ai_service = AIService(db)
    
    # Detect objections
    objection_analysis = await ai_service.detect_objection(message)
    
    # Store analysis if phone number provided
    if phone_number:
        analysis_data = {
            "company_id": ObjectId(current_user["company_id"]),
            "phone_number": phone_number,
            "message": message,
            "objection_analysis": objection_analysis,
            "analyzed_at": datetime.utcnow()
        }
        await db.message_analysis.insert_one(analysis_data)
    
    return objection_analysis