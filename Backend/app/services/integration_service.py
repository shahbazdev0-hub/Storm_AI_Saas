# backend/app/services/integration_service.py
import secrets
import hashlib
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from cryptography.fernet import Fernet
import httpx
import json

from app.core.config import settings
from app.core.logger import get_logger
from app.models.integration import (
    Integration, IntegrationProvider, Webhook, IntegrationLog, 
    ApiKey, SyncResult, IntegrationStatus, IntegrationType, AuthType
)
from app.schemas.integration import (
    IntegrationConfigRequest, WebhookCreateRequest, ApiKeyCreateRequest,
    TestResultResponse, SyncResultResponse, BatchResponse
)

logger = get_logger(__name__)

class IntegrationService:
    """Service for managing third-party integrations"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode()) if hasattr(settings, 'ENCRYPTION_KEY') else None
        self._load_providers()
    
    def _load_providers(self):
        """Load available integration providers"""
        self.providers = {
            "stripe": IntegrationProvider(
                id="stripe",
                name="Stripe",
                type=IntegrationType.PAYMENT,
                description="Accept online payments and manage subscriptions",
                logo_url="/logos/stripe.png",
                auth_type=AuthType.API_KEY,
                required_fields=[
                    {"key": "publishable_key", "label": "Publishable Key", "type": "text", "required": True},
                    {"key": "secret_key", "label": "Secret Key", "type": "password", "required": True},
                    {"key": "webhook_secret", "label": "Webhook Secret", "type": "password", "required": False}
                ],
                documentation_url="https://docs.stripe.com",
                features=["Online payments", "Recurring billing", "Payment processing", "Fraud protection"]
            ),
            "twilio": IntegrationProvider(
                id="twilio",
                name="Twilio",
                type=IntegrationType.COMMUNICATION,
                description="Send SMS notifications and automate conversations",
                logo_url="/logos/twilio.png",
                auth_type=AuthType.API_KEY,
                required_fields=[
                    {"key": "account_sid", "label": "Account SID", "type": "text", "required": True},
                    {"key": "auth_token", "label": "Auth Token", "type": "password", "required": True},
                    {"key": "phone_number", "label": "Phone Number", "type": "text", "required": True}
                ],
                documentation_url="https://docs.twilio.com",
                features=["SMS messaging", "Voice calls", "Conversation AI", "Phone verification"]
            ),
            "quickbooks": IntegrationProvider(
                id="quickbooks",
                name="QuickBooks Online",
                type=IntegrationType.ACCOUNTING,
                description="Sync invoices, payments, and financial data with QuickBooks",
                logo_url="/logos/quickbooks.png",
                auth_type=AuthType.OAUTH2,
                required_fields=[
                    {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
                    {"key": "client_secret", "label": "Client Secret", "type": "password", "required": True},
                    {"key": "sandbox", "label": "Sandbox Mode", "type": "checkbox", "required": False}
                ],
                setup_url="https://developer.intuit.com/app/developer/qbo/docs/get-started",
                documentation_url="https://developer.intuit.com/app/developer/qbo/docs/api/accounting",
                features=["Invoice sync", "Payment tracking", "Customer sync", "Financial reporting"]
            ),
            "google_calendar": IntegrationProvider(
                id="google_calendar",
                name="Google Calendar",
                type=IntegrationType.PRODUCTIVITY,
                description="Sync appointments and schedules with Google Calendar",
                logo_url="/logos/google-calendar.png",
                auth_type=AuthType.OAUTH2,
                required_fields=[
                    {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
                    {"key": "client_secret", "label": "Client Secret", "type": "password", "required": True},
                    {"key": "api_key", "label": "API Key", "type": "password", "required": True}
                ],
                setup_url="https://console.cloud.google.com/apis/credentials",
                documentation_url="https://developers.google.com/calendar",
                features=["Calendar sync", "Appointment scheduling", "Reminder notifications"]
            ),
            "mailchimp": IntegrationProvider(
                id="mailchimp",
                name="Mailchimp",
                type=IntegrationType.MARKETING,
                description="Sync customer data and automate email marketing",
                logo_url="/logos/mailchimp.png",
                auth_type=AuthType.API_KEY,
                required_fields=[
                    {"key": "api_key", "label": "API Key", "type": "password", "required": True},
                    {"key": "server_prefix", "label": "Server Prefix", "type": "text", "required": True, "description": "e.g., us1, us2"}
                ],
                documentation_url="https://mailchimp.com/developer/",
                features=["Email campaigns", "Customer segmentation", "Automation workflows"]
            ),
            "zapier": IntegrationProvider(
                id="zapier",
                name="Zapier",
                type=IntegrationType.AUTOMATION,
                description="Connect with 5000+ apps through automated workflows",
                logo_url="/logos/zapier.png",
                auth_type=AuthType.WEBHOOK,
                required_fields=[
                    {"key": "webhook_urls", "label": "Webhook URLs", "type": "textarea", "required": True, "description": "JSON array of webhook configurations"}
                ],
                documentation_url="https://zapier.com/developer",
                features=["Workflow automation", "App connections", "Data sync", "Trigger actions"]
            ),
            "google_maps": IntegrationProvider(
                id="google_maps",
                name="Google Maps",
                type=IntegrationType.MAPPING,
                description="Route optimization and location services",
                logo_url="/logos/google-maps.png",
                auth_type=AuthType.API_KEY,
                required_fields=[
                    {"key": "api_key", "label": "API Key", "type": "password", "required": True}
                ],
                setup_url="https://console.cloud.google.com/apis/credentials",
                documentation_url="https://developers.google.com/maps",
                features=["Route optimization", "Geocoding", "Distance calculation", "Map display"]
            )
        }
    
    # Provider Management
    async def get_providers(self) -> List[IntegrationProvider]:
        """Get all available integration providers"""
        return list(self.providers.values())
    
    async def get_provider(self, provider_id: str) -> Optional[IntegrationProvider]:
        """Get specific provider by ID"""
        return self.providers.get(provider_id)
    
    # Integration Management
    async def get_integrations(self, company_id: str) -> List[Integration]:
        """Get all integrations for a company"""
        try:
            collection = self.db.integrations
            cursor = collection.find({"company_id": company_id})
            integrations = []
            
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                # Don't return encrypted config
                if "encrypted_config" in doc:
                    del doc["encrypted_config"]
                integrations.append(Integration(**doc))
            
            return integrations
        except Exception as e:
            logger.error(f"Error getting integrations: {e}")
            return []
    
    async def get_integration(self, integration_id: str, company_id: str) -> Optional[Integration]:
        """Get specific integration"""
        try:
            collection = self.db.integrations
            doc = await collection.find_one({
                "_id": ObjectId(integration_id),
                "company_id": company_id
            })
            
            if doc:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                # Don't return encrypted config
                if "encrypted_config" in doc:
                    del doc["encrypted_config"]
                return Integration(**doc)
            return None
        except Exception as e:
            logger.error(f"Error getting integration: {e}")
            return None
    
    async def create_integration(
        self, 
        company_id: str, 
        provider_id: str, 
        config: IntegrationConfigRequest,
        user_id: str
    ) -> Integration:
        """Create new integration"""
        try:
            provider = await self.get_provider(provider_id)
            if not provider:
                raise ValueError(f"Provider {provider_id} not found")
            
            # Encrypt sensitive config
            encrypted_config = {}
            safe_config = {}
            
            config_dict = config.dict()
            for key, value in config_dict.items():
                if value is None:
                    continue
                    
                # Encrypt sensitive fields
                if any(field["key"] == key and field["type"] == "password" 
                       for field in provider.required_fields):
                    if self.cipher_suite:
                        encrypted_config[key] = self.cipher_suite.encrypt(str(value).encode()).decode()
                    else:
                        encrypted_config[key] = value  # Fallback if no encryption
                else:
                    safe_config[key] = value
            
            integration = Integration(
                company_id=company_id,
                provider_id=provider_id,
                name=provider.name,
                type=provider.type,
                status=IntegrationStatus.PENDING,
                config=safe_config,
                encrypted_config=encrypted_config,
                created_by=user_id,
                webhook_url=config.webhook_url
            )
            
            collection = self.db.integrations
            result = await collection.insert_one(integration.dict(by_alias=True, exclude={"id"}))
            integration.id = str(result.inserted_id)
            
            # Test the integration
            test_result = await self.test_integration(integration.id, company_id)
            if test_result.success:
                await self.update_integration_status(integration.id, IntegrationStatus.CONNECTED)
                integration.status = IntegrationStatus.CONNECTED
            else:
                await self.update_integration_status(integration.id, IntegrationStatus.ERROR, test_result.message)
                integration.status = IntegrationStatus.ERROR
                integration.last_error = test_result.message
            
            await self.log_integration_action(
                integration.id, 
                company_id, 
                "integration_created",
                "success" if test_result.success else "error",
                f"Integration created and {'connected' if test_result.success else 'failed to connect'}"
            )
            
            return integration
            
        except Exception as e:
            logger.error(f"Error creating integration: {e}")
            raise
    
    async def update_integration_config(
        self, 
        integration_id: str, 
        company_id: str, 
        config: IntegrationConfigRequest
    ) -> Integration:
        """Update integration configuration"""
        try:
            integration = await self.get_integration(integration_id, company_id)
            if not integration:
                raise ValueError("Integration not found")
            
            provider = await self.get_provider(integration.provider_id)
            if not provider:
                raise ValueError("Provider not found")
            
            # Encrypt sensitive config
            encrypted_config = {}
            safe_config = {}
            
            config_dict = config.dict()
            for key, value in config_dict.items():
                if value is None:
                    continue
                    
                if any(field["key"] == key and field["type"] == "password" 
                       for field in provider.required_fields):
                    if self.cipher_suite:
                        encrypted_config[key] = self.cipher_suite.encrypt(str(value).encode()).decode()
                    else:
                        encrypted_config[key] = value
                else:
                    safe_config[key] = value
            
            # Update integration
            update_data = {
                "config": safe_config,
                "encrypted_config": encrypted_config,
                "updated_at": datetime.utcnow(),
                "webhook_url": config.webhook_url
            }
            
            collection = self.db.integrations
            await collection.update_one(
                {"_id": ObjectId(integration_id), "company_id": company_id},
                {"$set": update_data}
            )
            
            # Test updated configuration
            test_result = await self.test_integration(integration_id, company_id)
            if test_result.success:
                await self.update_integration_status(integration_id, IntegrationStatus.CONNECTED)
            else:
                await self.update_integration_status(integration_id, IntegrationStatus.ERROR, test_result.message)
            
            await self.log_integration_action(
                integration_id, 
                company_id, 
                "config_updated",
                "success" if test_result.success else "error",
                f"Configuration updated and {'connected' if test_result.success else 'failed to connect'}"
            )
            
            return await self.get_integration(integration_id, company_id)
            
        except Exception as e:
            logger.error(f"Error updating integration config: {e}")
            raise
    
    async def delete_integration(self, integration_id: str, company_id: str) -> bool:
        """Delete integration"""
        try:
            collection = self.db.integrations
            result = await collection.delete_one({
                "_id": ObjectId(integration_id),
                "company_id": company_id
            })
            
            if result.deleted_count > 0:
                await self.log_integration_action(
                    integration_id, 
                    company_id, 
                    "integration_deleted",
                    "success",
                    "Integration deleted"
                )
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting integration: {e}")
            return False
    
    async def update_integration_status(
        self, 
        integration_id: str, 
        status: IntegrationStatus, 
        error_message: Optional[str] = None
    ):
        """Update integration status"""
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            
            if status == IntegrationStatus.CONNECTED:
                update_data["last_sync"] = datetime.utcnow()
                update_data["last_error"] = None
            elif status == IntegrationStatus.ERROR and error_message:
                update_data["last_error"] = error_message
            
            collection = self.db.integrations
            await collection.update_one(
                {"_id": ObjectId(integration_id)},
                {"$set": update_data}
            )
            
        except Exception as e:
            logger.error(f"Error updating integration status: {e}")
    
    async def test_integration(self, integration_id: str, company_id: str) -> TestResultResponse:
        """Test integration connection"""
        start_time = time.time()
        
        try:
            integration = await self.get_integration(integration_id, company_id)
            if not integration:
                return TestResultResponse(success=False, message="Integration not found")
            
            # Get decrypted config
            full_config = await self._get_decrypted_config(integration_id, company_id)
            if not full_config:
                return TestResultResponse(success=False, message="Failed to decrypt configuration")
            
            # Test based on provider
            if integration.provider_id == "stripe":
                return await self._test_stripe(full_config)
            elif integration.provider_id == "twilio":
                return await self._test_twilio(full_config)
            elif integration.provider_id == "quickbooks":
                return await self._test_quickbooks(full_config)
            elif integration.provider_id == "google_calendar":
                return await self._test_google_calendar(full_config)
            elif integration.provider_id == "mailchimp":
                return await self._test_mailchimp(full_config)
            elif integration.provider_id == "google_maps":
                return await self._test_google_maps(full_config)
            else:
                return TestResultResponse(success=False, message=f"Testing not implemented for {integration.provider_id}")
            
        except Exception as e:
            logger.error(f"Error testing integration: {e}")
            return TestResultResponse(
                success=False, 
                message=f"Test failed: {str(e)}",
                response_time_ms=int((time.time() - start_time) * 1000)
            )
    
    async def sync_integration(self, integration_id: str, company_id: str) -> SyncResultResponse:
        """Sync integration data"""
        start_time = time.time()
        
        try:
            integration = await self.get_integration(integration_id, company_id)
            if not integration:
                raise ValueError("Integration not found")
            
            if integration.status != IntegrationStatus.CONNECTED:
                raise ValueError("Integration not connected")
            
            # Perform sync based on provider
            records_synced = 0
            errors = []
            
            if integration.provider_id == "stripe":
                records_synced, errors = await self._sync_stripe(integration_id, company_id)
            elif integration.provider_id == "quickbooks":
                records_synced, errors = await self._sync_quickbooks(integration_id, company_id)
            # Add other provider sync methods as needed
            
            duration_ms = int((time.time() - start_time) * 1000)
            status = "success" if not errors else ("partial" if records_synced > 0 else "error")
            
            # Update last sync time
            await self.update_integration_status(integration_id, IntegrationStatus.CONNECTED)
            
            await self.log_integration_action(
                integration_id,
                company_id,
                "sync_completed",
                status,
                f"Synced {records_synced} records",
                {"records_synced": records_synced, "errors": errors, "duration_ms": duration_ms}
            )
            
            return SyncResultResponse(
                integration_id=integration_id,
                status=status,
                records_synced=records_synced,
                errors=errors,
                duration_ms=duration_ms,
                last_sync=datetime.utcnow(),
                metadata={"provider": integration.provider_id}
            )
            
        except Exception as e:
            logger.error(f"Error syncing integration: {e}")
            duration_ms = int((time.time() - start_time) * 1000)
            
            await self.log_integration_action(
                integration_id,
                company_id,
                "sync_failed",
                "error",
                f"Sync failed: {str(e)}",
                {"duration_ms": duration_ms}
            )
            
            return SyncResultResponse(
                integration_id=integration_id,
                status="error",
                records_synced=0,
                errors=[str(e)],
                duration_ms=duration_ms,
                last_sync=datetime.utcnow(),
                metadata={"provider": integration.provider_id if integration else "unknown"}
            )
    
    # Helper methods for testing integrations
    async def _test_stripe(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test Stripe connection"""
        try:
            import stripe
            stripe.api_key = config.get("secret_key")
            
            # Simple test: retrieve account
            account = stripe.Account.retrieve()
            
            return TestResultResponse(
                success=True,
                message=f"Connected to Stripe account: {account.get('display_name', account.get('id'))}",
                details={"account_id": account.get("id"), "country": account.get("country")}
            )
        except Exception as e:
            return TestResultResponse(success=False, message=f"Stripe test failed: {str(e)}")
    
    async def _test_twilio(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test Twilio connection"""
        try:
            from twilio.rest import Client
            
            client = Client(config.get("account_sid"), config.get("auth_token"))
            account = client.api.accounts(config.get("account_sid")).fetch()
            
            return TestResultResponse(
                success=True,
                message=f"Connected to Twilio account: {account.friendly_name}",
                details={"account_sid": account.sid, "status": account.status}
            )
        except Exception as e:
            return TestResultResponse(success=False, message=f"Twilio test failed: {str(e)}")
    
    async def _test_quickbooks(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test QuickBooks connection"""
        try:
            # This would require QuickBooks SDK implementation
            # For now, just validate the config fields
            if not all(key in config for key in ["client_id", "client_secret"]):
                return TestResultResponse(success=False, message="Missing required QuickBooks credentials")
            
            return TestResultResponse(
                success=True,
                message="QuickBooks configuration validated (OAuth flow required for full connection)",
                details={"requires_oauth": True}
            )
        except Exception as e:
            return TestResultResponse(success=False, message=f"QuickBooks test failed: {str(e)}")
    
    async def _test_google_calendar(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test Google Calendar connection"""
        try:
            if not all(key in config for key in ["client_id", "client_secret", "api_key"]):
                return TestResultResponse(success=False, message="Missing required Google credentials")
            
            # Test API key validity with a simple request
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://www.googleapis.com/calendar/v3/users/me/calendarList",
                    headers={"Authorization": f"Bearer {config.get('api_key')}"}
                )
                
                if response.status_code == 200:
                    return TestResultResponse(
                        success=True,
                        message="Google Calendar API key validated",
                        details={"oauth_required": True}
                    )
                else:
                    return TestResultResponse(
                        success=False,
                        message="Google Calendar API key validation failed"
                    )
        except Exception as e:
            return TestResultResponse(success=False, message=f"Google Calendar test failed: {str(e)}")
    
    async def _test_mailchimp(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test Mailchimp connection"""
        try:
            api_key = config.get("api_key")
            server_prefix = config.get("server_prefix")
            
            if not api_key or not server_prefix:
                return TestResultResponse(success=False, message="Missing Mailchimp API key or server prefix")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://{server_prefix}.api.mailchimp.com/3.0/",
                    auth=("anystring", api_key)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return TestResultResponse(
                        success=True,
                        message=f"Connected to Mailchimp account: {data.get('account_name', 'Unknown')}",
                        details={"account_id": data.get("account_id"), "email": data.get("email")}
                    )
                else:
                    return TestResultResponse(success=False, message="Mailchimp API authentication failed")
                    
        except Exception as e:
            return TestResultResponse(success=False, message=f"Mailchimp test failed: {str(e)}")
    
    async def _test_google_maps(self, config: Dict[str, Any]) -> TestResultResponse:
        """Test Google Maps connection"""
        try:
            api_key = config.get("api_key")
            if not api_key:
                return TestResultResponse(success=False, message="Missing Google Maps API key")
            
            # Test with a simple geocoding request
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://maps.googleapis.com/maps/api/geocode/json",
                    params={"address": "1600 Amphitheatre Parkway, Mountain View, CA", "key": api_key}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK":
                        return TestResultResponse(
                            success=True,
                            message="Google Maps API key validated successfully"
                        )
                    else:
                        return TestResultResponse(
                            success=False,
                            message=f"Google Maps API error: {data.get('error_message', 'Unknown error')}"
                        )
                else:
                    return TestResultResponse(success=False, message="Google Maps API request failed")
                    
        except Exception as e:
            return TestResultResponse(success=False, message=f"Google Maps test failed: {str(e)}")
    
    # Sync methods (simplified implementations)
    async def _sync_stripe(self, integration_id: str, company_id: str) -> tuple[int, List[str]]:
        """Sync Stripe data"""
        try:
            # This would implement actual Stripe data sync
            # For now, return mock data
            return 10, []
        except Exception as e:
            return 0, [str(e)]
    
    async def _sync_quickbooks(self, integration_id: str, company_id: str) -> tuple[int, List[str]]:
        """Sync QuickBooks data"""
        try:
            # This would implement actual QuickBooks data sync
            return 15, []
        except Exception as e:
            return 0, [str(e)]
    
    # Utility methods
    async def _get_decrypted_config(self, integration_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        """Get decrypted configuration for an integration"""
        try:
            collection = self.db.integrations
            doc = await collection.find_one({
                "_id": ObjectId(integration_id),
                "company_id": company_id
            })
            
            if not doc:
                return None
            
            # Combine safe and encrypted config
            full_config = doc.get("config", {}).copy()
            encrypted_config = doc.get("encrypted_config", {})
            
            # Decrypt sensitive fields
            if self.cipher_suite:
                for key, encrypted_value in encrypted_config.items():
                    try:
                        decrypted_value = self.cipher_suite.decrypt(encrypted_value.encode()).decode()
                        full_config[key] = decrypted_value
                    except Exception as e:
                        logger.error(f"Failed to decrypt config key {key}: {e}")
            else:
                full_config.update(encrypted_config)
            
            return full_config
            
        except Exception as e:
            logger.error(f"Error getting decrypted config: {e}")
            return None
    
    # Webhook Management
    async def create_webhook(
        self, 
        company_id: str, 
        webhook_data: WebhookCreateRequest,
        integration_id: Optional[str] = None
    ) -> Webhook:
        """Create new webhook"""
        try:
            webhook = Webhook(
                company_id=company_id,
                integration_id=integration_id,
                name=webhook_data.name,
                url=webhook_data.url,
                events=webhook_data.events,
                is_active=webhook_data.is_active,
                secret=secrets.token_urlsafe(32)  # Generate webhook secret
            )
            
            collection = self.db.webhooks
            result = await collection.insert_one(webhook.dict(by_alias=True, exclude={"id"}))
            webhook.id = str(result.inserted_id)
            
            return webhook
            
        except Exception as e:
            logger.error(f"Error creating webhook: {e}")
            raise
    
    async def get_webhooks(self, company_id: str) -> List[Webhook]:
        """Get all webhooks for a company"""
        try:
            collection = self.db.webhooks
            cursor = collection.find({"company_id": company_id})
            webhooks = []
            
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                webhooks.append(Webhook(**doc))
            
            return webhooks
        except Exception as e:
            logger.error(f"Error getting webhooks: {e}")
            return []
    
    async def delete_webhook(self, webhook_id: str, company_id: str) -> bool:
        """Delete webhook"""
        try:
            collection = self.db.webhooks
            result = await collection.delete_one({
                "_id": ObjectId(webhook_id),
                "company_id": company_id
            })
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting webhook: {e}")
            return False
    
    # API Key Management
    async def create_api_key(
        self, 
        company_id: str, 
        api_key_data: ApiKeyCreateRequest,
        user_id: str
    ) -> ApiKey:
        """Create new API key"""
        try:
            # Generate API key
            key = f"sk_{'test' if settings.ENVIRONMENT != 'production' else 'live'}_{secrets.token_urlsafe(32)}"
            key_hash = hashlib.sha256(key.encode()).hexdigest()
            
            # Set expiration if specified
            expires_at = None
            if api_key_data.expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=api_key_data.expires_in_days)
            
            api_key = ApiKey(
                company_id=company_id,
                name=api_key_data.name,
                key=key,
                key_hash=key_hash,
                permissions=api_key_data.permissions,
                rate_limit=api_key_data.rate_limit,
                expires_at=expires_at,
                created_by=user_id
            )
            
            collection = self.db.api_keys
            result = await collection.insert_one(api_key.dict(by_alias=True, exclude={"id"}))
            api_key.id = str(result.inserted_id)
            
            return api_key
            
        except Exception as e:
            logger.error(f"Error creating API key: {e}")
            raise
    
    async def get_api_keys(self, company_id: str, mask_keys: bool = True) -> List[ApiKey]:
        """Get all API keys for a company"""
        try:
            collection = self.db.api_keys
            cursor = collection.find({"company_id": company_id})
            api_keys = []
            
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                
                api_key = ApiKey(**doc)
                
                # Mask the key for security
                if mask_keys:
                    api_key.key = api_key.key[:8] + "..." + api_key.key[-4:]
                
                api_keys.append(api_key)
            
            return api_keys
        except Exception as e:
            logger.error(f"Error getting API keys: {e}")
            return []
    
    async def delete_api_key(self, api_key_id: str, company_id: str) -> bool:
        """Delete API key"""
        try:
            collection = self.db.api_keys
            result = await collection.delete_one({
                "_id": ObjectId(api_key_id),
                "company_id": company_id
            })
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting API key: {e}")
            return False
    
    # Logging
    async def log_integration_action(
        self,
        integration_id: str,
        company_id: str,
        action: str,
        status: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log integration action"""
        try:
            log_entry = IntegrationLog(
                integration_id=integration_id,
                company_id=company_id,
                action=action,
                status=status,
                message=message,
                metadata=metadata or {}
            )
            
            collection = self.db.integration_logs
            await collection.insert_one(log_entry.dict(by_alias=True, exclude={"id"}))
            
        except Exception as e:
            logger.error(f"Error logging integration action: {e}")
    
    async def get_integration_logs(
        self, 
        integration_id: str, 
        company_id: str, 
        limit: int = 50
    ) -> List[IntegrationLog]:
        """Get logs for an integration"""
        try:
            collection = self.db.integration_logs
            cursor = collection.find({
                "integration_id": integration_id,
                "company_id": company_id
            }).sort("created_at", -1).limit(limit)
            
            logs = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                logs.append(IntegrationLog(**doc))
            
            return logs
        except Exception as e:
            logger.error(f"Error getting integration logs: {e}")
            return []