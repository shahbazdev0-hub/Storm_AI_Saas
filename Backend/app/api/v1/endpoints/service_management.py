# backend/app/api/v1/endpoints/service_management.py
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
# Add this import to the top of your file if not already present:
from pydantic import Field
from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.core.logger import get_logger

logger = get_logger("endpoints.service_management")
router = APIRouter(prefix="/service-management", tags=["service-management"])


# Add these new Pydantic models after your existing models (around line 20):

class FlowNode(BaseModel):
    id: str
    type: str
    x: float
    y: float
    data: Dict[str, Any]

class FlowConnection(BaseModel):
    id: str
    from_: str = Field(..., alias="from")  # Handle 'from' keyword
    to: str
    transition: Optional[str] = None

class ConversationFlowCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    nodes: List[FlowNode]
    connections: List[FlowConnection]
    active: bool = True

class ConversationFlowResponse(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[FlowNode]
    connections: List[FlowConnection]
    active: bool
    company_id: str
    created_at: datetime
    updated_at: datetime
# Pydantic Models
class ServicePricing(BaseModel):
    min: int
    max: int
    currency: str = "PKR"

class ServiceAvailability(BaseModel):
    hours: str
    days: str

class ServicePromptResponses(BaseModel):
    pricing: str
    booking: str

class ServicePrompts(BaseModel):
    greeting: str
    questions: List[str] = []
    responses: ServicePromptResponses

class ServiceBase(BaseModel):
    name: str
    category: str
    description: str
    pricing: ServicePricing
    availability: ServiceAvailability
    keywords: List[str]
    prompts: ServicePrompts
    active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/services", response_model=List[ServiceResponse])
async def get_company_services(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    active_only: bool = Query(False, description="Return only active services")
):
    """Get all services for the company"""
    try:
        query = {"company_id": ObjectId(current_user["company_id"])}
        if active_only:
            query["active"] = True
            
        services = await db.ai_services.find(query).sort("created_at", -1).to_list(length=100)
        
        return [
            ServiceResponse(
                id=str(service["_id"]),
                company_id=str(service["company_id"]),
                name=service["name"],
                category=service["category"],
                description=service["description"],
                pricing=ServicePricing(**service["pricing"]),
                availability=ServiceAvailability(**service["availability"]),
                keywords=service["keywords"],
                prompts=ServicePrompts(**service["prompts"]),
                active=service["active"],
                created_at=service["created_at"],
                updated_at=service["updated_at"]
            )
            for service in services
        ]
        
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/services", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new service"""
    try:
        # Check if service name already exists
        existing = await db.ai_services.find_one({
            "company_id": ObjectId(current_user["company_id"]),
            "name": service_data.name
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Service with this name already exists")
        
        service_doc = {
            "_id": ObjectId(),
            "company_id": ObjectId(current_user["company_id"]),
            "name": service_data.name,
            "category": service_data.category,
            "description": service_data.description,
            "pricing": service_data.pricing.dict(),
            "availability": service_data.availability.dict(),
            "keywords": service_data.keywords,
            "prompts": service_data.prompts.dict(),
            "active": service_data.active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": ObjectId(current_user["id"])
        }
        
        result = await db.ai_services.insert_one(service_doc)
        
        # Fetch the created service
        created_service = await db.ai_services.find_one({"_id": result.inserted_id})
        
        logger.info(f"Service created: {service_data.name} for company {current_user['company_id']}")
        
        return ServiceResponse(
            id=str(created_service["_id"]),
            company_id=str(created_service["company_id"]),
            **service_data.dict(),
            created_at=created_service["created_at"],
            updated_at=created_service["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing service"""
    try:
        # Verify service exists and belongs to company
        service = await db.ai_services.find_one({
            "_id": ObjectId(service_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Update service data
        update_data = {
            "name": service_data.name,
            "category": service_data.category,
            "description": service_data.description,
            "pricing": service_data.pricing.dict(),
            "availability": service_data.availability.dict(),
            "keywords": service_data.keywords,
            "prompts": service_data.prompts.dict(),
            "active": service_data.active,
            "updated_at": datetime.utcnow()
        }
        
        await db.ai_services.update_one(
            {"_id": ObjectId(service_id)},
            {"$set": update_data}
        )
        
        logger.info(f"Service updated: {service_data.name} for company {current_user['company_id']}")
        
        return ServiceResponse(
            id=service_id,
            company_id=str(service["company_id"]),
            **service_data.dict(),
            created_at=service["created_at"],
            updated_at=update_data["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a service"""
    try:
        result = await db.ai_services.delete_one({
            "_id": ObjectId(service_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Service not found")
        
        logger.info(f"Service deleted: {service_id} for company {current_user['company_id']}")
        return {"message": "Service deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/services/{service_id}/toggle")
async def toggle_service_status(
    service_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Toggle service active/inactive status"""
    try:
        service = await db.ai_services.find_one({
            "_id": ObjectId(service_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        new_status = not service["active"]
        
        await db.ai_services.update_one(
            {"_id": ObjectId(service_id)},
            {
                "$set": {
                    "active": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Service {service_id} status changed to: {new_status}")
        return {"message": f"Service {'activated' if new_status else 'deactivated'} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling service status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI Assistant Integration Endpoints

@router.get("/ai/available-services")
async def get_available_services_for_ai(
    company_id: str = Query(..., description="Company ID for service lookup"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get active services for AI assistant (no auth required for AI calls)"""
    try:
        services = await db.ai_services.find({
            "company_id": ObjectId(company_id),
            "active": True
        }).to_list(length=100)
        
        # Format for AI consumption
        ai_services = []
        for service in services:
            ai_services.append({
                "id": str(service["_id"]),
                "name": service["name"],
                "category": service["category"],
                "description": service["description"],
                "keywords": service["keywords"],
                "pricing": service["pricing"],
                "availability": service["availability"],
                "prompts": service["prompts"]
            })
        
        return {
            "services": ai_services,
            "total": len(ai_services),
            "company_id": company_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching AI services: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/match-service")
async def match_user_query_to_service(
    request_data: Dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Match user message to available services"""
    try:
        company_id = request_data.get("company_id")
        user_message = request_data.get("message", "").lower()
        
        if not company_id or not user_message:
            raise HTTPException(status_code=400, detail="company_id and message are required")
        
        # Get active services
        services = await db.ai_services.find({
            "company_id": ObjectId(company_id),
            "active": True
        }).to_list(length=100)
        
        # Find matching service based on keywords
        matched_service = None
        for service in services:
            if any(keyword.lower() in user_message for keyword in service["keywords"]):
                matched_service = service
                break
        
        if matched_service:
            return {
                "matched": True,
                "service": {
                    "id": str(matched_service["_id"]),
                    "name": matched_service["name"],
                    "category": matched_service["category"],
                    "greeting": matched_service["prompts"]["greeting"],
                    "pricing_response": matched_service["prompts"]["responses"]["pricing"],
                    "booking_response": matched_service["prompts"]["responses"]["booking"],
                    "pricing": matched_service["pricing"],
                    "availability": matched_service["availability"]
                }
            }
        else:
            # Return available services list
            available_services = [s["name"] for s in services]
            return {
                "matched": False,
                "message": f"I'm sorry, we currently only provide the following services: {', '.join(available_services)}. How can I help you with one of these services?",
                "available_services": available_services
            }
            
    except Exception as e:
        logger.error(f"Error matching service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/service-stats/{company_id}")
async def get_service_statistics(
    company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get service usage statistics for AI optimization"""
    try:
        # Get service counts
        total_services = await db.ai_services.count_documents({
            "company_id": ObjectId(company_id)
        })
        
        active_services = await db.ai_services.count_documents({
            "company_id": ObjectId(company_id),
            "active": True
        })
        
        # Get services by category
        pipeline = [
            {"$match": {"company_id": ObjectId(company_id), "active": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        categories = await db.ai_services.aggregate(pipeline).to_list(length=10)
        
        return {
            "total_services": total_services,
            "active_services": active_services,
            "inactive_services": total_services - active_services,
            "categories": [{"category": cat["_id"], "count": cat["count"]} for cat in categories],
            "company_id": company_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching service stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Add these to your existing backend/app/api/v1/endpoints/service_management.py file
# Add these imports to the top of your backend/app/api/v1/endpoints/service_management.py file



# Add these endpoints at the END of your service_management.py file (before the last line):
# FIXED: Update this section in your service_management.py file

@router.post("/flows")
async def create_conversation_flow(
    flow_data: ConversationFlowCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new conversation flow"""
    try:
        logger.info(f"Creating conversation flow for user: {current_user.get('_id') or current_user.get('id')}")
        
        # Convert connections to handle 'from' field properly
        connections_data = []
        for conn in flow_data.connections:
            conn_dict = conn.dict(by_alias=True)
            connections_data.append(conn_dict)
        
        # ✅ FIXED: Handle both _id and id fields for user identification
        user_id = current_user.get("_id") or current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in authentication")
        
        # ✅ FIXED: Ensure user_id is converted to ObjectId if it's a string
        if isinstance(user_id, str):
            user_object_id = ObjectId(user_id)
        else:
            user_object_id = user_id
        
        flow_doc = {
            "_id": ObjectId(),
            "company_id": ObjectId(current_user["company_id"]),
            "name": flow_data.name,
            "description": flow_data.description,
            "nodes": [node.dict() for node in flow_data.nodes],
            "connections": connections_data,
            "active": flow_data.active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": user_object_id  # ✅ FIXED: Use the properly handled user_id
        }
        
        # Insert into database
        result = await db.conversation_flows.insert_one(flow_doc)
        
        logger.info(f"✅ Conversation flow created with ID: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "Conversation flow created successfully",
            "flow_id": str(result.inserted_id),
            "name": flow_data.name,
            "created_at": flow_doc["created_at"]
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating conversation flow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create conversation flow: {str(e)}")

# ✅ ALSO FIX THE UPDATE ENDPOINT
@router.put("/flows/{flow_id}")
async def update_conversation_flow(
    flow_id: str,
    flow_data: ConversationFlowCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing conversation flow"""
    try:
        # Convert connections to handle 'from' field properly
        connections_data = []
        for conn in flow_data.connections:
            conn_dict = conn.dict(by_alias=True)
            connections_data.append(conn_dict)
        
        update_doc = {
            "name": flow_data.name,
            "description": flow_data.description,
            "nodes": [node.dict() for node in flow_data.nodes],
            "connections": connections_data,
            "active": flow_data.active,
            "updated_at": datetime.utcnow()
        }
        
        result = await db.conversation_flows.update_one(
            {
                "_id": ObjectId(flow_id),
                "company_id": ObjectId(current_user["company_id"])
            },
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Flow not found")
        
        return {
            "success": True,
            "message": "Flow updated successfully",
            "flow_id": flow_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating flow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update flow: {str(e)}")

# ✅ FIX ALL OTHER ENDPOINTS THAT USE current_user["id"]
@router.get("/flows/{flow_id}")
async def get_conversation_flow(
    flow_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific conversation flow"""
    try:
        flow = await db.conversation_flows.find_one({
            "_id": ObjectId(flow_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not flow:
            raise HTTPException(status_code=404, detail="Flow not found")
        
        # Convert ObjectIds to strings
        flow["id"] = str(flow["_id"])
        flow["company_id"] = str(flow["company_id"])
        flow["created_by"] = str(flow["created_by"])
        del flow["_id"]
        
        return flow
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching flow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve flow: {str(e)}")
    
@router.get("/flows")
async def get_conversation_flows(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all conversation flows for the company"""
    try:
        flows = await db.conversation_flows.find({
            "company_id": ObjectId(current_user["company_id"])
        }).sort("created_at", -1).to_list(length=100)
        
        # Convert ObjectIds to strings
        for flow in flows:
            flow["id"] = str(flow["_id"])
            flow["company_id"] = str(flow["company_id"])
            flow["created_by"] = str(flow["created_by"])
            del flow["_id"]
        
        return {"flows": flows}
        
    except Exception as e:
        logger.error(f"Error fetching flows: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve flows: {str(e)}")


@router.delete("/flows/{flow_id}")
async def delete_conversation_flow(
    flow_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a conversation flow"""
    try:
        result = await db.conversation_flows.delete_one({
            "_id": ObjectId(flow_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Flow not found")
        
        return {
            "success": True,
            "message": "Flow deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete flow: {str(e)}")