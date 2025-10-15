# app/core/__init__.py
"""
Core module for AI-Enhanced SaaS CRM

This module provides core functionality including:
- Configuration management with environment variables
- Database connection and management with MongoDB
- Security features including JWT tokens and password hashing
- Structured logging with audit capabilities
"""

from .config import settings, Settings
from .database import (
    database_manager,
    get_database,
    connect_to_mongo,
    close_mongo_connection,
    ping_database,
    database_health_check,
    DatabaseManager,
    DatabaseTransaction
)
from .security import (
    security_manager,
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    decode_token,
    generate_api_key,
    generate_reset_token,
    verify_reset_token,
    SecurityManager
)
from .logger import (
    log_manager,
    setup_logging,
    get_logger,
    get_logger_with_context,
    audit_logger,
    LogManager,
    AuditLogger
)

# Version information
__version__ = "1.0.0"
__author__ = "CRM Development Team"
__description__ = "AI-Enhanced SaaS CRM Core Module"

# Core module initialization
def initialize_core():
    """Initialize core module components"""
    # Setup logging first
    setup_logging()
    
    # Get logger for core module
    logger = get_logger("core.init")
    logger.info(f"🚀 Initializing CRM Core Module v{__version__}")
    
    # Log configuration summary
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🗄️ Database: {settings.DATABASE_NAME}")
    logger.info(f"🔐 Debug Mode: {settings.DEBUG}")
    
    if settings.is_production():
        logger.info("🏭 Running in PRODUCTION mode")
    elif settings.is_development():
        logger.info("🔧 Running in DEVELOPMENT mode")
    elif settings.is_testing():
        logger.info("🧪 Running in TESTING mode")
    
    # Validate critical settings
    _validate_configuration()
    
    logger.info("✅ Core module initialized successfully")

def _validate_configuration():
    """Validate critical configuration settings"""
    logger = get_logger("core.validation")
    
    # Check database configuration
    if not settings.MONGODB_URL:
        logger.error("❌ MONGODB_URL not configured")
        raise ValueError("MONGODB_URL is required")
    
    if not settings.DATABASE_NAME:
        logger.error("❌ DATABASE_NAME not configured")
        raise ValueError("DATABASE_NAME is required")
    
    # Check security configuration
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        logger.warning("⚠️ SECRET_KEY is too short or not set")
    
    # Check Redis configuration for background tasks
    if not settings.REDIS_URL:
        logger.warning("⚠️ REDIS_URL not configured - background tasks disabled")
    
    # Check AI configuration
    if settings.ENABLE_AI_FEATURES:
        if not settings.OPENAI_API_KEY and not settings.ANTHROPIC_API_KEY:
            logger.warning("⚠️ No AI API keys configured - AI features will be limited")
    
    # Check SMS configuration
    if settings.ENABLE_SMS_AUTOMATION:
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
            logger.warning("⚠️ Twilio not fully configured - SMS features disabled")
    
    # Check email configuration
    if settings.ENABLE_EMAIL_AUTOMATION:
        smtp_configured = all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD])
        sendgrid_configured = bool(settings.SENDGRID_API_KEY)
        
        if not smtp_configured and not sendgrid_configured:
            logger.warning("⚠️ No email service configured - email features disabled")
    
    # Check payment configuration
    if settings.STRIPE_SECRET_KEY and not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("⚠️ Stripe webhook secret not configured - webhook verification disabled")
    
    logger.info("✅ Configuration validation completed")

# Health check function
async def health_check():
    """Perform comprehensive health check"""
    logger = get_logger("core.health")
    
    health_status = {
        "status": "healthy",
        "timestamp": settings.DEFAULT_DATETIME_FORMAT,
        "version": __version__,
        "environment": settings.ENVIRONMENT,
        "components": {}
    }
    
    try:
        # Database health check
        db_health = await database_health_check()
        health_status["components"]["database"] = db_health
        
        if db_health["status"] != "healthy":
            health_status["status"] = "degraded"
        
        # Add more component checks here
        health_status["components"]["logging"] = {
            "status": "healthy" if log_manager.configured else "unhealthy"
        }
        
        health_status["components"]["security"] = {
            "status": "healthy" if security_manager else "unhealthy"
        }
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)
    
    return health_status

# Graceful shutdown function
async def shutdown_core():
    """Gracefully shutdown core components"""
    logger = get_logger("core.shutdown")
    logger.info("🔄 Shutting down core components...")
    
    try:
        # Close database connections
        await close_mongo_connection()
        logger.info("✅ Database connections closed")
        
        # Add other cleanup tasks here
        
        logger.info("✅ Core shutdown completed")
        
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")
        raise

# Export all main components for easy import
__all__ = [
    # Configuration
    "settings",
    "Settings",
    
    # Database
    "database_manager",
    "get_database",
    "connect_to_mongo",
    "close_mongo_connection",
    "ping_database",
    "database_health_check",
    "DatabaseManager",
    "DatabaseTransaction",
    
    # Security
    "security_manager",
    "create_access_token",
    "create_refresh_token",
    "verify_password",
    "get_password_hash",
    "decode_token",
    "generate_api_key",
    "generate_reset_token",
    "verify_reset_token",
    "SecurityManager",
    
    # Logging
    "log_manager",
    "setup_logging",
    "get_logger",
    "get_logger_with_context",
    "audit_logger",
    "LogManager",
    "AuditLogger",
    
    # Core functions
    "initialize_core",
    "health_check",
    "shutdown_core",
    
    # Version info
    "__version__",
    "__author__",
    "__description__"
]

# Auto-initialize if imported
if not getattr(initialize_core, '_initialized', False):
    initialize_core()
    initialize_core._initialized = True