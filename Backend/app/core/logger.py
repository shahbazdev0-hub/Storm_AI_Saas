# app/core/logger.py
import logging
import logging.handlers
import sys
import json
import traceback
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from .config import settings

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": record.process,
            "thread_id": record.thread,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
        
        # Add user context if available
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        
        if hasattr(record, "company_id"):
            log_entry["company_id"] = record.company_id
        
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        
        return json.dumps(log_entry, default=str)

class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output"""
    
    # Color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """Format with colors"""
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset_color = self.COLORS['RESET']
        
        # Create colored level name
        colored_level = f"{log_color}{record.levelname}{reset_color}"
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # Format message
        message = record.getMessage()
        
        # Add exception info if present
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"
        
        return f"{timestamp} | {colored_level:20} | {record.name:15} | {message}"

class CRMLoggerAdapter(logging.LoggerAdapter):
    """Custom logger adapter with context"""
    
    def __init__(self, logger: logging.Logger, extra: Optional[Dict[str, Any]] = None):
        super().__init__(logger, extra or {})
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Process log message with extra context"""
        if "extra" not in kwargs:
            kwargs["extra"] = {}
        
        # Add context from adapter
        kwargs["extra"].update(self.extra)
        
        return msg, kwargs
    
    def with_context(self, **context) -> "CRMLoggerAdapter":
        """Create new adapter with additional context"""
        new_extra = self.extra.copy()
        new_extra.update(context)
        return CRMLoggerAdapter(self.logger, new_extra)

class LogManager:
    """Centralized logging management"""
    
    def __init__(self):
        self.loggers: Dict[str, logging.Logger] = {}
        self.configured = False
    
    def setup_logging(self) -> None:
        """Configure logging for the application"""
        if self.configured:
            return
        
        # Create logs directory
        log_dir = Path(settings.LOG_FILE).parent
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Get log level
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # Console handler with colors (for development)
        if settings.is_development():
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(log_level)
            console_formatter = ColoredFormatter()
            console_handler.setFormatter(console_formatter)
            root_logger.addHandler(console_handler)
        
        # File handler with JSON formatting (for production)
        if settings.is_production():
            file_handler = logging.handlers.TimedRotatingFileHandler(
                filename=settings.LOG_FILE,
                when=settings.LOG_ROTATION,
                interval=1,
                backupCount=settings.LOG_RETENTION,
                encoding='utf-8'
            )
            file_handler.setLevel(log_level)
            json_formatter = JSONFormatter()
            file_handler.setFormatter(json_formatter)
            root_logger.addHandler(file_handler)
        else:
            # Development file handler
            file_handler = logging.FileHandler(settings.LOG_FILE, encoding='utf-8')
            file_handler.setLevel(log_level)
            file_formatter = logging.Formatter(
                '%(asctime)s | %(levelname)-8s | %(name)-15s | %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            root_logger.addHandler(file_handler)
        
        # Error file handler (separate file for errors)
        error_file = Path(settings.LOG_FILE).parent / "error.log"
        error_handler = logging.FileHandler(error_file, encoding='utf-8')
        error_handler.setLevel(logging.ERROR)
        error_formatter = JSONFormatter() if settings.is_production() else logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)-15s | %(message)s'
        )
        error_handler.setFormatter(error_formatter)
        root_logger.addHandler(error_handler)
        
        # Configure specific loggers
        self._configure_third_party_loggers()
        
        # Set up application loggers
        self._setup_app_loggers()
        
        self.configured = True
        
        logger = self.get_logger("core.logger")
        logger.info(f"✅ Logging configured - Level: {settings.LOG_LEVEL}")
    
    def _configure_third_party_loggers(self) -> None:
        """Configure third-party library loggers"""
        # Reduce noise from third-party libraries
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("motor").setLevel(logging.WARNING)
        logging.getLogger("pymongo").setLevel(logging.WARNING)
        logging.getLogger("urllib3").setLevel(logging.WARNING)
        logging.getLogger("requests").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        
        # Set specific levels for production
        if settings.is_production():
            logging.getLogger("uvicorn").setLevel(logging.INFO)
            logging.getLogger("fastapi").setLevel(logging.INFO)
        else:
            logging.getLogger("uvicorn").setLevel(logging.INFO)
            logging.getLogger("fastapi").setLevel(logging.DEBUG)
    
    def _setup_app_loggers(self) -> None:
        """Set up application-specific loggers"""
        app_loggers = [
            "app.api",
            "app.core", 
            "app.services",
            "app.models",
            "app.utils",
            "app.middleware",
            "app.auth",
            "app.ai",
            "app.sms",
            "app.email",
            "app.integrations"
        ]
        
        for logger_name in app_loggers:
            logger = logging.getLogger(logger_name)
            logger.setLevel(logging.DEBUG if settings.is_development() else logging.INFO)
    
    def get_logger(self, name: str) -> CRMLoggerAdapter:
        """Get logger with CRM context"""
        if name not in self.loggers:
            self.loggers[name] = logging.getLogger(name)
        
        return CRMLoggerAdapter(self.loggers[name])
    
    def get_logger_with_context(self, name: str, **context) -> CRMLoggerAdapter:
        """Get logger with additional context"""
        logger = self.get_logger(name)
        return logger.with_context(**context)

# Global log manager instance
log_manager = LogManager()

# Convenience functions
def setup_logging() -> None:
    """Setup logging - convenience function"""
    log_manager.setup_logging()

def get_logger(name: str) -> CRMLoggerAdapter:
    """Get logger - convenience function"""
    return log_manager.get_logger(name)

def get_logger_with_context(name: str, **context) -> CRMLoggerAdapter:
    """Get logger with context - convenience function"""
    return log_manager.get_logger_with_context(name, **context)

# Audit logging helpers
class AuditLogger:
    """Specialized logger for audit events"""
    
    def __init__(self):
        self.logger = get_logger("audit")
    
    def log_user_action(
        self,
        user_id: str,
        company_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log user action for audit trail"""
        audit_data = {
            "audit_type": "user_action",
            "user_id": user_id,
            "company_id": company_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "details": details or {}
        }
        
        logger_with_context = self.logger.with_context(**audit_data)
        logger_with_context.info(f"User {user_id} performed {action} on {entity_type} {entity_id}")
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        description: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log security event"""
        security_data = {
            "audit_type": "security_event",
            "event_type": event_type,
            "severity": severity,
            "user_id": user_id,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        logger_with_context = self.logger.with_context(**security_data)
        
        if severity.lower() in ["high", "critical"]:
            logger_with_context.error(f"SECURITY: {event_type} - {description}")
        elif severity.lower() == "medium":
            logger_with_context.warning(f"SECURITY: {event_type} - {description}")
        else:
            logger_with_context.info(f"SECURITY: {event_type} - {description}")
    
    def log_data_access(
        self,
        user_id: str,
        company_id: str,
        resource: str,
        action: str,
        success: bool,
        ip_address: Optional[str] = None
    ) -> None:
        """Log data access for compliance"""
        access_data = {
            "audit_type": "data_access",
            "user_id": user_id,
            "company_id": company_id,
            "resource": resource,
            "action": action,
            "success": success,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": ip_address
        }
        
        logger_with_context = self.logger.with_context(**access_data)
        status = "SUCCESS" if success else "FAILED"
        logger_with_context.info(f"DATA ACCESS {status}: User {user_id} {action} {resource}")

# Global audit logger
audit_logger = AuditLogger()

# Export main components
__all__ = [
    "log_manager",
    "setup_logging",
    "get_logger",
    "get_logger_with_context",
    "audit_logger",
    "CRMLoggerAdapter",
    "LogManager",
    "AuditLogger",
    "JSONFormatter",
    "ColoredFormatter"
]