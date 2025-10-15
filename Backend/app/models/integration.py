# backend/app/models/integration.py
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum

class IntegrationStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"

class IntegrationType(str, Enum):
    PAYMENT = "payment"
    COMMUNICATION = "communication"
    MAPPING = "mapping"
    ACCOUNTING = "accounting"
    CRM = "crm"
    MARKETING = "marketing"
    STORAGE = "storage"
    PRODUCTIVITY = "productivity"
    AUTOMATION = "automation"

class AuthType(str, Enum):
    OAUTH2 = "oauth2"
    API_KEY = "api_key"
    BASIC = "basic"
    WEBHOOK = "webhook"

class IntegrationProvider(BaseModel):
    id: str
    name: str
    type: IntegrationType
    description: str
    logo_url: str
    auth_type: AuthType
    required_fields: List[Dict[str, Any]]
    webhook_url: Optional[str] = None
    documentation_url: Optional[str] = None
    setup_url: Optional[str] = None
    features: List[str]
    is_active: bool = True

class Integration(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    company_id: str
    provider_id: str
    name: str
    type: IntegrationType
    status: IntegrationStatus = IntegrationStatus.DISCONNECTED
    config: Dict[str, Any] = Field(default_factory=dict)
    encrypted_config: Dict[str, str] = Field(default_factory=dict)  # For sensitive data
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    is_enabled: bool = True
    webhook_url: Optional[str] = None
    rate_limit_config: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Webhook(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    company_id: str
    integration_id: Optional[str] = None  # Optional for custom webhooks
    name: str
    url: str
    events: List[str]
    secret: Optional[str] = None
    is_active: bool = True
    last_triggered: Optional[datetime] = None
    success_count: int = 0
    error_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class IntegrationLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    integration_id: str
    company_id: str
    action: str
    status: str  # success, error, warning
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    duration_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class ApiKey(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    company_id: str
    name: str
    key: str
    key_hash: str  # Hashed version for security
    permissions: List[str]
    rate_limit: str
    is_active: bool = True
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class SyncResult(BaseModel):
    integration_id: str
    status: str  # success, error, partial
    records_synced: int
    errors: List[str] = Field(default_factory=list)
    duration_ms: int
    last_sync: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)