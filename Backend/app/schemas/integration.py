# backend/app/schemas/integration.py
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from app.models.integration import IntegrationStatus, IntegrationType, AuthType

# Request Schemas
class IntegrationConfigRequest(BaseModel):
    api_key: str
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class IntegrationConnectRequest(BaseModel):
    provider_id: str
    config: IntegrationConfigRequest

class WebhookCreateRequest(BaseModel):
    name: str
    url: str
    events: List[str]
    is_active: bool = True
    
    @validator('events')
    def validate_events(cls, v):
        if not v:
            raise ValueError('At least one event must be specified')
        return v

class ApiKeyCreateRequest(BaseModel):
    name: str
    permissions: List[str]
    rate_limit: str = "1000 requests/hour"
    expires_in_days: Optional[int] = None

# Response Schemas
class IntegrationProviderResponse(BaseModel):
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
    is_active: bool

class IntegrationResponse(BaseModel):
    id: str
    company_id: str
    provider_id: str
    name: str
    type: IntegrationType
    status: IntegrationStatus
    config: Dict[str, Any]  # Non-sensitive config only
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    is_enabled: bool
    webhook_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class WebhookResponse(BaseModel):
    id: str
    company_id: str
    integration_id: Optional[str] = None
    name: str
    url: str
    events: List[str]
    is_active: bool
    last_triggered: Optional[datetime] = None
    success_count: int
    error_count: int
    created_at: datetime
    updated_at: datetime

class IntegrationLogResponse(BaseModel):
    id: str
    integration_id: str
    action: str
    status: str
    message: str
    metadata: Dict[str, Any]
    duration_ms: Optional[int] = None
    created_at: datetime

class ApiKeyResponse(BaseModel):
    id: str
    company_id: str
    name: str
    key: str  # This will be masked in the service
    permissions: List[str]
    rate_limit: str
    is_active: bool
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

class SyncResultResponse(BaseModel):
    integration_id: str
    status: str
    records_synced: int
    errors: List[str]
    duration_ms: int
    last_sync: datetime
    metadata: Dict[str, Any]

class TestResultResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
    response_time_ms: Optional[int] = None

# Batch Operation Schemas
class BatchResponse(BaseModel):
    success_count: int
    error_count: int
    errors: List[Dict[str, Any]]

# Provider-specific config schemas
class StripeConfigRequest(BaseModel):
    publishable_key: str
    secret_key: str
    webhook_secret: Optional[str] = None
    default_currency: str = "usd"

class TwilioConfigRequest(BaseModel):
    account_sid: str
    auth_token: str
    phone_number: str
    webhook_url: Optional[str] = None

class QuickBooksConfigRequest(BaseModel):
    client_id: str
    client_secret: str
    sandbox: bool = True
    company_id: Optional[str] = None

class GoogleConfigRequest(BaseModel):
    client_id: str
    client_secret: str
    api_key: str
    calendar_id: Optional[str] = None
    drive_folder_id: Optional[str] = None

class MailchimpConfigRequest(BaseModel):
    api_key: str
    server_prefix: str  # e.g., "us1", "us2"
    default_list_id: Optional[str] = None

class ZapierConfigRequest(BaseModel):
    webhook_urls: List[Dict[str, str]]  # [{"event": "lead.created", "url": "..."}]