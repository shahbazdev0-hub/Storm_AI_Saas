# backend/app/api/v1/endpoints/integrations.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.dependencies.auth import get_current_user, require_role
from app.services.integration_service import IntegrationService
from app.schemas.integration import (
    IntegrationProviderResponse, IntegrationResponse, IntegrationConfigRequest,
    WebhookCreateRequest, WebhookResponse, ApiKeyCreateRequest, ApiKeyResponse,
    TestResultResponse, SyncResultResponse, IntegrationLogResponse
)
from app.models.user import UserRole

router = APIRouter()

async def get_integration_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> IntegrationService:
    """Dependency to get integration service"""
    return IntegrationService(db)

# Provider endpoints
@router.get("/providers", response_model=List[IntegrationProviderResponse])
async def get_available_providers(
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all available integration providers"""
    try:
        providers = await integration_service.get_providers()
        return [IntegrationProviderResponse(**provider.dict()) for provider in providers]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get providers: {str(e)}"
        )

@router.get("/providers/{provider_id}", response_model=IntegrationProviderResponse)
async def get_provider(
    provider_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get specific integration provider"""
    try:
        provider = await integration_service.get_provider(provider_id)
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        return IntegrationProviderResponse(**provider.dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider: {str(e)}"
        )

# Integration management endpoints
@router.get("", response_model=List[IntegrationResponse])
async def get_integrations(
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all integrations for the company"""
    try:
        integrations = await integration_service.get_integrations(current_user["company_id"])
        return [IntegrationResponse(**integration.dict()) for integration in integrations]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integrations: {str(e)}"
        )

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get specific integration"""
    try:
        integration = await integration_service.get_integration(integration_id, current_user["company_id"])
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        return IntegrationResponse(**integration.dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integration: {str(e)}"
        )

@router.post("/{provider_id}/configure", response_model=IntegrationResponse)
async def configure_integration(
    provider_id: str,
    config: IntegrationConfigRequest,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Configure new integration or update existing one"""
    try:
        # Check if integration already exists for this provider
        existing_integrations = await integration_service.get_integrations(current_user["company_id"])
        existing_integration = next(
            (i for i in existing_integrations if i.provider_id == provider_id), 
            None
        )
        
        if existing_integration:
            # Update existing integration
            integration = await integration_service.update_integration_config(
                existing_integration.id, 
                current_user["company_id"], 
                config
            )
        else:
            # Create new integration
            integration = await integration_service.create_integration(
                current_user["company_id"],
                provider_id,
                config,
                current_user["id"]
            )
        
        return IntegrationResponse(**integration.dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure integration: {str(e)}"
        )

@router.put("/{integration_id}/config", response_model=IntegrationResponse)
async def update_integration_config(
    integration_id: str,
    config: IntegrationConfigRequest,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Update integration configuration"""
    try:
        integration = await integration_service.update_integration_config(
            integration_id, 
            current_user["company_id"], 
            config
        )
        return IntegrationResponse(**integration.dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update integration config: {str(e)}"
        )

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Delete integration"""
    try:
        success = await integration_service.delete_integration(integration_id, current_user["company_id"])
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        return {"message": "Integration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete integration: {str(e)}"
        )

@router.post("/{integration_id}/test", response_model=TestResultResponse)
async def test_integration(
    integration_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Test integration connection"""
    try:
        result = await integration_service.test_integration(integration_id, current_user["company_id"])
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test integration: {str(e)}"
        )

@router.post("/{integration_id}/sync", response_model=SyncResultResponse)
async def sync_integration(
    integration_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Sync integration data"""
    try:
        result = await integration_service.sync_integration(integration_id, current_user["company_id"])
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync integration: {str(e)}"
        )

@router.get("/{integration_id}/logs", response_model=List[IntegrationLogResponse])
async def get_integration_logs(
    integration_id: str,
    limit: int = Query(50, le=100),
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get integration logs"""
    try:
        logs = await integration_service.get_integration_logs(integration_id, current_user["company_id"], limit)
        return [IntegrationLogResponse(**log.dict()) for log in logs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integration logs: {str(e)}"
        )

# Webhook endpoints
@router.get("/webhooks", response_model=List[WebhookResponse])
async def get_webhooks(
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(get_current_user)
):
    """Get all webhooks for the company"""
    try:
        webhooks = await integration_service.get_webhooks(current_user["company_id"])
        return [WebhookResponse(**webhook.dict()) for webhook in webhooks]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get webhooks: {str(e)}"
        )

@router.post("/webhooks", response_model=WebhookResponse)
async def create_webhook(
    webhook_data: WebhookCreateRequest,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Create new webhook"""
    try:
        webhook = await integration_service.create_webhook(
            current_user["company_id"], 
            webhook_data
        )
        return WebhookResponse(**webhook.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create webhook: {str(e)}"
        )

@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Delete webhook"""
    try:
        success = await integration_service.delete_webhook(webhook_id, current_user["company_id"])
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook not found"
            )
        return {"message": "Webhook deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete webhook: {str(e)}"
        )

# API Key endpoints
@router.get("/api-keys", response_model=List[ApiKeyResponse])
async def get_api_keys(
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Get all API keys for the company"""
    try:
        api_keys = await integration_service.get_api_keys(current_user["company_id"], mask_keys=True)
        return [ApiKeyResponse(**api_key.dict()) for api_key in api_keys]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get API keys: {str(e)}"
        )

@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    api_key_data: ApiKeyCreateRequest,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Create new API key"""
    try:
        api_key = await integration_service.create_api_key(
            current_user["company_id"],
            api_key_data,
            current_user["id"]
        )
        # Return the full key only once upon creation
        return ApiKeyResponse(**api_key.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )

@router.delete("/api-keys/{api_key_id}")
async def delete_api_key(
    api_key_id: str,
    integration_service: IntegrationService = Depends(get_integration_service),
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Delete API key"""
    try:
        success = await integration_service.delete_api_key(api_key_id, current_user["company_id"])
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        return {"message": "API key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )