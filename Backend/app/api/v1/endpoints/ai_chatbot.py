# backend/app/api/v1/endpoints/ai_chatbot.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional
from pydantic import BaseModel
import json
import logging

from app.core.database import get_database
from app.services.ai_chatbot_service import AIChatbotService
from app.dependencies.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    company_id: str
    customer_info: Optional[Dict[str, Any]] = None

class ScheduleAppointment(BaseModel):
    session_id: str
    slot_datetime: str
    customer_info: Dict[str, Any]
    company_id: str

# WebSocket connection manager for real-time chat
class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_connections: Dict[str, str] = {}  # session_id -> connection_id

    async def connect(self, websocket: WebSocket, connection_id: str, session_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        if session_id:
            self.session_connections[session_id] = connection_id
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "connection_id": connection_id,
            "message": "Connected to AI assistant"
        })

    def disconnect(self, connection_id: str, session_id: Optional[str] = None):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if session_id and session_id in self.session_connections:
            del self.session_connections[session_id]

    async def send_message(self, connection_id: str, message: Dict[str, Any]):
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)

    async def send_to_session(self, session_id: str, message: Dict[str, Any]):
        connection_id = self.session_connections.get(session_id)
        if connection_id:
            await self.send_message(connection_id, message)

manager = ChatConnectionManager()

# REST API endpoints
@router.post("/chat")
async def process_chat_message(
    chat_data: ChatMessage,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Process chat message via REST API (for non-websocket clients)"""
    try:
        chatbot_service = AIChatbotService(db)
        
        response = await chatbot_service.process_message(
            message=chat_data.message,
            session_id=chat_data.session_id or "",
            company_id=chat_data.company_id
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error processing message")

@router.post("/schedule")
async def schedule_appointment(
    schedule_data: ScheduleAppointment,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Schedule appointment from chatbot conversation"""
    try:
        chatbot_service = AIChatbotService(db)
        
        result = await chatbot_service.schedule_appointment(
            session_id=schedule_data.session_id,
            slot_datetime=schedule_data.slot_datetime,
            customer_info=schedule_data.customer_info,
            company_id=schedule_data.company_id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in schedule endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error scheduling appointment")

@router.get("/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get chat session history (for admin users)"""
    try:
        from bson import ObjectId
        
        session = await db.chat_sessions.find_one({
            "_id": ObjectId(session_id),
            "company_id": ObjectId(current_user["company_id"])
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert ObjectIds to strings for JSON response
        session["_id"] = str(session["_id"])
        session["company_id"] = str(session["company_id"])
        
        return session
        
    except Exception as e:
        logger.error(f"Error getting chat session: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving session")

@router.get("/sessions")
async def get_chat_sessions(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20
):
    """Get all chat sessions for company (for admin users)"""
    try:
        from bson import ObjectId
        
        sessions = await db.chat_sessions.find(
            {"company_id": ObjectId(current_user["company_id"])}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        # Convert ObjectIds to strings
        for session in sessions:
            session["_id"] = str(session["_id"])
            session["company_id"] = str(session["company_id"])
        
        return {"sessions": sessions}
        
    except Exception as e:
        logger.error(f"Error getting chat sessions: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving sessions")

# WebSocket endpoint for real-time chat
@router.websocket("/ws/{company_id}")
async def websocket_chat(
    websocket: WebSocket,
    company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """WebSocket endpoint for real-time AI chatbot"""
    connection_id = f"{company_id}_{id(websocket)}"
    session_id = None
    
    try:
        await manager.connect(websocket, connection_id)
        chatbot_service = AIChatbotService(db)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type", "chat")
            
            if message_type == "chat":
                # Process chat message
                user_message = message_data.get("message", "")
                session_id = message_data.get("session_id", session_id)
                
                if not session_id:
                    # Create new session
                    import uuid
                    session_id = str(uuid.uuid4())
                    manager.session_connections[session_id] = connection_id
                
                # Process message with AI
                response = await chatbot_service.process_message(
                    message=user_message,
                    session_id=session_id,
                    company_id=company_id
                )
                
                # Send response back to client
                await websocket.send_json({
                    "type": "chat_response",
                    "session_id": session_id,
                    "message": response["message"],
                    "intent": response.get("intent"),
                    "actions": response.get("actions"),
                    "requires_human": response.get("requires_human", False)
                })
                
            elif message_type == "schedule":
                # Handle appointment scheduling
                slot_datetime = message_data.get("slot_datetime")
                customer_info = message_data.get("customer_info", {})
                
                if not session_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session for scheduling"
                    })
                    continue
                
                result = await chatbot_service.schedule_appointment(
                    session_id=session_id,
                    slot_datetime=slot_datetime,
                    customer_info=customer_info,
                    company_id=company_id
                )
                
                await websocket.send_json({
                    "type": "schedule_response",
                    "result": result
                })
                
            elif message_type == "ping":
                # Keep connection alive
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "An error occurred. Please try again."
        })
    finally:
        manager.disconnect(connection_id, session_id)