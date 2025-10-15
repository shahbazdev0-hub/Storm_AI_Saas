# app/api/v1/endpoints/pipeline.py - SEPARATE PIPELINE ROUTER
from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
import logging

from app.core.database import get_database
from app.dependencies.auth import get_current_user

router = APIRouter()

def get_empty_pipeline_response(period: str = "this_month") -> Dict[str, Any]:
    """Return empty pipeline structure for frontend"""
    return {
        "stages": [
            {"id": "new", "name": "New Leads", "color": "bg-blue-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "contacted", "name": "Contacted", "color": "bg-yellow-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "qualified", "name": "Qualified", "color": "bg-purple-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "proposal", "name": "Proposal Sent", "color": "bg-orange-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "won", "name": "Won", "color": "bg-green-500", "leads": [], "total_value": 0, "count": 0},
            {"id": "lost", "name": "Lost", "color": "bg-red-500", "leads": [], "total_value": 0, "count": 0}
        ],
        "summary": {
            "total_value": 0,
            "total_leads": 0,
            "average_deal_size": 0,
            "period": period
        }
    }

@router.get("/")
async def get_pipeline(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
    period: str = Query(default="this_month", description="Time period filter")
) -> Dict[str, Any]:
    """Get leads organized by pipeline stages for drag-and-drop view"""
    logger = logging.getLogger("pipeline")
    
    try:
        logger.info(f"Pipeline request - Period: {period}, User: {current_user.get('email', 'unknown')}")
        
        # Step 1: Validate user object
        if not current_user:
            logger.error("No current_user provided")
            return get_empty_pipeline_response(period)
        
        logger.info(f"Current user keys: {list(current_user.keys())}")
        
        # Step 2: Extract company_id with multiple fallbacks
        company_id = None
        possible_fields = ['company_id', '_company_id', 'companyId', 'company']
        
        for field in possible_fields:
            if field in current_user and current_user[field]:
                company_id = current_user[field]
                logger.info(f"Found company_id in field '{field}': {company_id}")
                break
        
        if not company_id:
            logger.error(f"No company_id found in user object. Available fields: {list(current_user.keys())}")
            return get_empty_pipeline_response(period)
        
        # Step 3: Convert to ObjectId safely
        try:
            if isinstance(company_id, str):
                company_obj_id = ObjectId(company_id)
            elif isinstance(company_id, ObjectId):
                company_obj_id = company_id
            else:
                logger.error(f"Invalid company_id type: {type(company_id)}")
                return get_empty_pipeline_response(period)
                
            logger.info(f"Company ObjectId: {company_obj_id}")
            
        except Exception as e:
            logger.error(f"Failed to convert company_id to ObjectId: {e}")
            return get_empty_pipeline_response(period)
        
        # Step 4: Test database connection
        try:
            total_leads_count = await db.leads.count_documents({"company_id": company_obj_id})
            logger.info(f"Found {total_leads_count} leads for company {company_obj_id}")
            
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            return get_empty_pipeline_response(period)
        
        # Step 5: Get leads for company
        try:
            all_leads = await db.leads.find({"company_id": company_obj_id}).to_list(length=None)
            logger.info(f"Retrieved {len(all_leads)} leads from database")
            
        except Exception as e:
            logger.error(f"Failed to retrieve leads: {e}")
            return get_empty_pipeline_response(period)
        
        # Step 6: Process leads into pipeline stages
        pipeline_stages = [
            {"id": "new", "name": "New Leads", "color": "bg-blue-500"},
            {"id": "contacted", "name": "Contacted", "color": "bg-yellow-500"},
            {"id": "qualified", "name": "Qualified", "color": "bg-purple-500"},
            {"id": "proposal", "name": "Proposal Sent", "color": "bg-orange-500"},
            {"id": "won", "name": "Won", "color": "bg-green-500"},
            {"id": "lost", "name": "Lost", "color": "bg-red-500"}
        ]
        
        stages_data = []
        
        for stage in pipeline_stages:
            stage_leads = []
            stage_value = 0.0
            
            # Filter leads for this stage
            stage_leads_raw = [lead for lead in all_leads if lead.get("status", "new") == stage["id"]]
            logger.info(f"Stage '{stage['id']}': {len(stage_leads_raw)} leads")
            
            for lead in stage_leads_raw:
                try:
                    # Safe lead processing with defaults
                    lead_id = str(lead.get("_id", "unknown"))
                    
                    # Default contact info
                    first_name = "Unknown"
                    last_name = "Lead"
                    email = None
                    phone = None
                    
                    # Try to get contact info if contact_id exists
                    contact_id = lead.get("contact_id")
                    if contact_id:
                        try:
                            contact = await db.contacts.find_one({"_id": contact_id})
                            if contact:
                                first_name = contact.get("first_name", "Unknown")
                                last_name = contact.get("last_name", "Lead")
                                email = contact.get("email")
                                phone = contact.get("phone")
                        except Exception as contact_err:
                            logger.warning(f"Contact lookup failed for {contact_id}: {contact_err}")
                    
                    # Handle dates safely
                    created_at = lead.get("created_at")
                    if hasattr(created_at, 'isoformat'):
                        created_at_str = created_at.isoformat()
                    else:
                        created_at_str = datetime.utcnow().isoformat()
                    
                    # Handle estimated value safely
                    estimated_value = lead.get("estimated_value")
                    if estimated_value and isinstance(estimated_value, (int, float)) and estimated_value > 0:
                        stage_value += float(estimated_value)
                    else:
                        estimated_value = None
                    
                    # Handle AI score safely
                    ai_score = None
                    scoring = lead.get("scoring")
                    if scoring and isinstance(scoring, dict):
                        ai_score = scoring.get("ai_score")
                        if ai_score and not isinstance(ai_score, (int, float)):
                            ai_score = None
                    
                    # Create lead object for pipeline
                    pipeline_lead = {
                        "id": lead_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": email,
                        "phone": phone,
                        "estimated_value": estimated_value,
                        "ai_score": ai_score,
                        "created_at": created_at_str,
                        "last_contact": None,
                        "priority": lead.get("priority", 3)
                    }
                    
                    stage_leads.append(pipeline_lead)
                    
                except Exception as lead_err:
                    logger.error(f"Error processing lead {lead.get('_id')}: {lead_err}")
                    continue
            
            # Add stage data
            stages_data.append({
                "id": stage["id"],
                "name": stage["name"],
                "color": stage["color"],
                "leads": stage_leads,
                "total_value": stage_value,
                "count": len(stage_leads)
            })
        
        # Step 7: Calculate totals
        total_value = sum(float(stage["total_value"]) for stage in stages_data)
        total_leads = sum(int(stage["count"]) for stage in stages_data)
        
        response = {
            "stages": stages_data,
            "summary": {
                "total_value": total_value,
                "total_leads": total_leads,
                "average_deal_size": total_value / total_leads if total_leads > 0 else 0.0,
                "period": period
            }
        }
        
        logger.info(f"Pipeline response ready: {total_leads} leads, ${total_value:,.2f} total value")
        return response
        
    except Exception as e:
        logger.error(f"Critical pipeline error: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        # Always return empty pipeline instead of raising exception
        return get_empty_pipeline_response(period)

@router.get("/test")
async def test_pipeline():
    """Test pipeline endpoint"""
    return {
        "status": "success",
        "message": "Pipeline endpoint is working",
        "endpoint": "/api/v1/pipeline"
    }