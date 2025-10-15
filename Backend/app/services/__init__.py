# app/services/__init__.py
"""
Business logic services for AI-Enhanced SaaS CRM

This module contains all business logic services that handle the core
functionality of the CRM system. Services interact with the database,
external APIs, and provide the business logic layer between the API
endpoints and the data layer.
"""
from datetime import datetime, timedelta, date
from .auth_service import AuthService
from .crm_service import CRMService
from .scheduling_service import SchedulingService
from .estimate_service import EstimateService
# from .invoice_service import InvoiceService
from .ai_service import AIService
from .sms_service import SMSService
from .email_service import EmailService
from .analytics_service import AnalyticsService
from .integration_service import IntegrationService

# Version information
__version__ = "1.0.0"
__author__ = "CRM Development Team"

# Service registry for dependency injection
SERVICE_REGISTRY = {
    "auth": AuthService,
    "crm": CRMService,
    "scheduling": SchedulingService,
    "estimate": EstimateService,
    # "invoice": InvoiceService,
    "ai": AIService,
    "sms": SMSService,
    "email": EmailService,
    "analytics": AnalyticsService,
    "integration": IntegrationService
}

def get_service_class(service_name: str):
    """Get service class by name"""
    return SERVICE_REGISTRY.get(service_name.lower())

def list_services():
    """List all available services"""
    return list(SERVICE_REGISTRY.keys())

# Service manager for handling service lifecycles
class ServiceManager:
    """Manager for service instances and their lifecycles"""
    
    def __init__(self, database):
        self.database = database
        self._services = {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize all services"""
        if self._initialized:
            return
        
        # Initialize core services
        self._services["auth"] = AuthService(self.database)
        self._services["crm"] = CRMService(self.database)
        self._services["scheduling"] = SchedulingService(self.database)
        self._services["estimate"] = EstimateService(self.database)
        # self._services["invoice"] = InvoiceService(self.database)
        self._services["ai"] = AIService(self.database)
        self._services["sms"] = SMSService(self.database)
        self._services["email"] = EmailService(self.database)
        self._services["analytics"] = AnalyticsService(self.database)
        self._services["integration"] = IntegrationService(self.database)
        
        self._initialized = True
    
    def get_service(self, service_name: str):
        """Get service instance by name"""
        if not self._initialized:
            raise RuntimeError("Services not initialized. Call initialize() first.")
        
        service = self._services.get(service_name.lower())
        if not service:
            raise ValueError(f"Service '{service_name}' not found")
        
        return service
    
    async def cleanup(self):
        """Cleanup all services"""
        for service in self._services.values():
            if hasattr(service, 'cleanup'):
                try:
                    await service.cleanup()
                except Exception as e:
                    print(f"Error cleaning up service: {e}")
        
        self._services.clear()
        self._initialized = False

# Dependency injection helpers
class ServiceContainer:
    """Simple dependency injection container for services"""
    
    def __init__(self):
        self._services = {}
        self._factories = {}
    
    def register(self, name: str, factory_func, singleton: bool = True):
        """Register a service factory"""
        self._factories[name] = {
            "factory": factory_func,
            "singleton": singleton
        }
    
    def get(self, name: str):
        """Get service instance"""
        if name in self._services:
            return self._services[name]
        
        if name not in self._factories:
            raise ValueError(f"Service '{name}' not registered")
        
        factory_info = self._factories[name]
        instance = factory_info["factory"]()
        
        if factory_info["singleton"]:
            self._services[name] = instance
        
        return instance
    
    def clear(self):
        """Clear all services"""
        self._services.clear()

# Service decorators for common patterns
def service_method(retry_count: int = 3, timeout: int = 30):
    """Decorator for service methods with retry and timeout"""
    def decorator(func):
        import asyncio
        import functools
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(retry_count):
                try:
                    return await asyncio.wait_for(
                        func(*args, **kwargs), 
                        timeout=timeout
                    )
                except asyncio.TimeoutError:
                    if attempt == retry_count - 1:
                        raise
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                except Exception as e:
                    if attempt == retry_count - 1:
                        raise
                    await asyncio.sleep(1)
            
        return wrapper
    return decorator

def transaction_method(database_field: str = "db"):
    """Decorator for methods that need database transactions"""
    def decorator(func):
        import functools
        
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            db = getattr(self, database_field)
            
            async with await db.client.start_session() as session:
                async with session.start_transaction():
                    try:
                        result = await func(self, *args, **kwargs)
                        await session.commit_transaction()
                        return result
                    except Exception:
                        await session.abort_transaction()
                        raise
        
        return wrapper
    return decorator

def cache_result(ttl_seconds: int = 300):
    """Decorator for caching service method results"""
    def decorator(func):
        import functools
        import asyncio
        from datetime import datetime, timedelta
        
        cache = {}
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Check if cached result exists and is not expired
            if key in cache:
                cached_result, cached_time = cache[key]
                if datetime.utcnow() - cached_time < timedelta(seconds=ttl_seconds):
                    return cached_result
            
            # Call the function and cache the result
            result = await func(*args, **kwargs)
            cache[key] = (result, datetime.utcnow())
            
            return result
        
        return wrapper
    return decorator

# Service base class with common functionality
class BaseService:
    """Base service class with common functionality"""
    
    def __init__(self, database):
        self.db = database
        self._logger = None
    
    @property
    def logger(self):
        """Lazy-loaded logger"""
        if not self._logger:
            from app.core.logger import get_logger
            self._logger = get_logger(self.__class__.__name__)
        return self._logger
    
    async def _validate_company_access(self, company_id: str, user_company_id: str) -> bool:
        """Validate that user can access company data"""
        return str(company_id) == str(user_company_id)
    
    async def _log_activity(
        self, 
        user_id: str, 
        action: str, 
        entity_type: str, 
        entity_id: str,
        details: dict = None
    ):
        """Log user activity for audit trail"""
        try:
            from app.core.logger import audit_logger
            audit_logger.log_user_action(
                user_id=user_id,
                company_id=getattr(self, 'company_id', None),
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details or {}
            )
        except Exception as e:
            self.logger.error(f"Failed to log activity: {e}")
    
    async def _handle_error(self, error: Exception, context: str = None):
        """Handle and log service errors"""
        error_msg = f"Service error in {self.__class__.__name__}"
        if context:
            error_msg += f" ({context})"
        error_msg += f": {str(error)}"
        
        self.logger.error(error_msg, exc_info=True)
        
        # Could send to error tracking service here
        return None
    
    async def cleanup(self):
        """Cleanup service resources - override in subclasses"""
        pass

# Service health check utilities
class ServiceHealthChecker:
    """Health checker for services"""
    
    def __init__(self, service_manager: ServiceManager):
        self.service_manager = service_manager
    
    async def check_service_health(self, service_name: str) -> dict:
        """Check health of a specific service"""
        try:
            service = self.service_manager.get_service(service_name)
            
            # Check if service has health check method
            if hasattr(service, 'health_check'):
                return await service.health_check()
            
            # Default health check - just verify service exists
            return {
                "service": service_name,
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "service": service_name,
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def check_all_services(self) -> dict:
        """Check health of all services"""
        results = {}
        
        for service_name in SERVICE_REGISTRY.keys():
            results[service_name] = await self.check_service_health(service_name)
        
        # Overall health status
        unhealthy_services = [
            name for name, result in results.items() 
            if result.get("status") != "healthy"
        ]
        
        overall_status = "healthy" if not unhealthy_services else "degraded"
        
        return {
            "overall_status": overall_status,
            "services": results,
            "unhealthy_services": unhealthy_services,
            "timestamp": datetime.utcnow().isoformat()
        }

# Service factory functions
def create_service_manager(database):
    """Factory function to create service manager"""
    return ServiceManager(database)

def create_service_container():
    """Factory function to create service container"""
    return ServiceContainer()

# Export all services and utilities
__all__ = [
    # Service classes
    "AuthService",
    "CRMService", 
    "SchedulingService",
    "EstimateService",
    "InvoiceService",
    "AIService",
    "SMSService",
    "EmailService",
    "AnalyticsService",
    "IntegrationService",
    
    # Service management
    "ServiceManager",
    "ServiceContainer",
    "ServiceHealthChecker",
    "BaseService",
    
    # Decorators
    "service_method",
    "transaction_method", 
    "cache_result",
    
    # Utilities
    "get_service_class",
    "list_services",
    "create_service_manager",
    "create_service_container",
    
    # Registry
    "SERVICE_REGISTRY",
    
    # Version info
    "__version__",
    "__author__"
]

# Service initialization helper
async def initialize_services(database):
    """Helper function to initialize all services"""
    service_manager = create_service_manager(database)
    await service_manager.initialize()
    return service_manager