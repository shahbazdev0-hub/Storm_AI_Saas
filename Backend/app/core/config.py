# app/core/config.py
from typing import List, Union, Optional, Any
from pydantic_settings import BaseSettings
from pydantic import field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings as PydanticBaseSettings
import secrets
import os
from pathlib import Path

class Settings(PydanticBaseSettings):
    """Application settings with Pydantic v2"""
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str
    EMAIL_PASSWORD: str
    # Basic Application Settings
    PROJECT_NAME: str = "AI-Enhanced SaaS CRM"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Security Settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    ALGORITHM: str = "HS256"
    
    # CORS Settings - Use Union type to handle both string and list
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    ALLOWED_HOSTS: Union[str, List[str]] = "localhost,127.0.0.1,*"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            # Handle empty string or whitespace
            if not v or not v.strip():
                return [
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:5173"
                ]
            # Handle comma-separated string
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        else:
            # Return default if unexpected type
            return [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
            ]
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v or not v.strip():
                return ["localhost", "127.0.0.1", "*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        else:
            return ["localhost", "127.0.0.1", "*"]
    
    # Database Settings
    MONGODB_URL: str = "mongodb+srv://hamza:hamza@cluster0.n44j3.mongodb.net/crm_platform"
    DATABASE_NAME: str = "crm_platform"
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_POOL_SIZE: int = 100
    MONGODB_MAX_IDLE_TIME_MS: int = 30000
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DB: int = 0
    REDIS_MAX_CONNECTIONS: int = 20
    
    # Email Settings
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # SendGrid (Alternative to SMTP)
    SENDGRID_API_KEY: Optional[str] = None
    
    # SMS Settings - Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # AI Service Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_MAX_TOKENS: int = 150
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # File Storage Settings (Enhanced for Document Management)
    UPLOAD_PATH: str = "uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB (increased from 10MB for documents)
    ALLOWED_FILE_TYPES: Union[str, List[str]] = "pdf,jpg,jpeg,png,doc,docx,txt,rtf,bmp,webp,gif,mp4,avi,mov,wmv,flv,zip,rar,7z,xlsx,xls,csv,ppt,pptx"
    
    # ✅ NEW - Document Management Settings
    UPLOAD_DIR: str = "uploads"  # Base upload directory
    DOCUMENTS_DIR: str = "uploads/documents"  # Document-specific directory
    TEMP_DIR: str = "uploads/temp"  # Temporary files directory
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB limit for documents
    DOCUMENT_RETENTION_DAYS: int = 365  # How long to keep documents
    DOCUMENT_BACKUP_ENABLED: bool = True  # Enable document backups
    DOCUMENT_ENCRYPTION_ENABLED: bool = False  # Enable file encryption (set to True in production)
    
    # Document file type restrictions
    ALLOWED_DOCUMENT_EXTENSIONS: Union[str, List[str]] = ".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp4,.avi,.mov,.wmv,.flv,.zip,.rar,.7z,.xlsx,.xls,.csv,.ppt,.pptx"
    RESTRICTED_FILE_TYPES: Union[str, List[str]] = ".exe,.bat,.cmd,.sh,.scr,.com,.pif,.vbs,.js"  # Blocked for security
    
    # Document versioning settings
    DOCUMENT_VERSIONING_ENABLED: bool = True
    MAX_DOCUMENT_VERSIONS: int = 10  # Maximum versions to keep per document
    
    # Document processing settings
    DOCUMENT_PREVIEW_ENABLED: bool = True
    DOCUMENT_THUMBNAIL_SIZE: int = 200  # Thumbnail size in pixels
    DOCUMENT_OCR_ENABLED: bool = False  # Enable OCR for text extraction (requires additional setup)
    

    # Add this to your Settings class, around line 95-100 after the Google Services section:

    # Google Services
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = "http://localhost:5173"

    
    @field_validator("ALLOWED_DOCUMENT_EXTENSIONS", mode="before")
    @classmethod
    def assemble_document_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v or not v.strip():
                return [".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png"]
            return [ext.strip() for ext in v.split(",") if ext.strip()]
        elif isinstance(v, list):
            return v
        else:
            return [".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png"]
    
    @field_validator("RESTRICTED_FILE_TYPES", mode="before")
    @classmethod
    def assemble_restricted_types(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v or not v.strip():
                return [".exe", ".bat", ".cmd", ".sh", ".scr"]
            return [ext.strip() for ext in v.split(",") if ext.strip()]
        elif isinstance(v, list):
            return v
        else:
            return [".exe", ".bat", ".cmd", ".sh", ".scr"]
    
    @field_validator("ALLOWED_FILE_TYPES", mode="before")
    @classmethod
    def assemble_file_types(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v or not v.strip():
                return ["pdf", "jpg", "jpeg", "png", "doc", "docx", "txt"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        else:
            return ["pdf", "jpg", "jpeg", "png", "doc", "docx", "txt"]
    
    # External API Settings
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    
    # Payment Settings - Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_API_VERSION: str = "2023-10-16"
    
    # QuickBooks Integration
    QUICKBOOKS_CLIENT_ID: Optional[str] = None
    QUICKBOOKS_CLIENT_SECRET: Optional[str] = None
    QUICKBOOKS_SANDBOX: bool = True
    QUICKBOOKS_REDIRECT_URI: Optional[str] = None
    
    # Google Services
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    RATE_LIMIT_ENABLED: bool = True
    
    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    LOG_ROTATION: str = "midnight"
    LOG_RETENTION: int = 30  # days
    
    # Background Tasks - Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_ACCEPT_CONTENT: Union[str, List[str]] = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_TIMEZONE: str = "UTC"
    
    @field_validator("CELERY_ACCEPT_CONTENT", mode="before")
    @classmethod
    def assemble_celery_content(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v or not v.strip():
                return ["json"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        else:
            return ["json"]
    
    # API Settings
    API_TITLE: str = "CRM API"
    API_DESCRIPTION: str = "AI-Enhanced SaaS CRM for Service Companies"
    API_VERSION: str = "1.0.0"
    OPENAPI_URL: Optional[str] = "/openapi.json"
    DOCS_URL: Optional[str] = "/docs"
    REDOC_URL: Optional[str] = "/redoc"
    
    # Security Headers
    SECURITY_HEADERS_ENABLED: bool = True
    HSTS_MAX_AGE: int = 31536000  # 1 year
    CONTENT_TYPE_OPTIONS: bool = True
    FRAME_OPTIONS: str = "DENY"
    XSS_PROTECTION: bool = True
    
    # Session Settings
    SESSION_COOKIE_NAME: str = "crm_session"
    SESSION_COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    
    # Feature Flags
    ENABLE_AI_FEATURES: bool = True
    ENABLE_SMS_AUTOMATION: bool = True
    ENABLE_EMAIL_AUTOMATION: bool = True
    ENABLE_INTEGRATIONS: bool = True
    ENABLE_ANALYTICS: bool = True
    ENABLE_FILE_UPLOADS: bool = True
    ENABLE_DOCUMENT_MANAGEMENT: bool = True  # ✅ NEW - Enable document management features
    ENABLE_DOCUMENT_SIGNING: bool = True  # ✅ NEW - Enable document signing
    ENABLE_DOCUMENT_APPROVAL: bool = True  # ✅ NEW - Enable document approval workflow
    
    # Business Settings
    DEFAULT_TIMEZONE: str = "UTC"
    DEFAULT_CURRENCY: str = "USD"
    DEFAULT_DATE_FORMAT: str = "%Y-%m-%d"
    DEFAULT_DATETIME_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    
    # Monitoring & Health Check
    HEALTH_CHECK_ENABLED: bool = True
    METRICS_ENABLED: bool = True
    SENTRY_DSN: Optional[str] = None
    
    # Performance Settings
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    REQUEST_TIMEOUT: int = 30  # seconds
    
    @field_validator("UPLOAD_PATH", mode="before")
    @classmethod
    def create_upload_directory(cls, v: str) -> str:
        """Create upload directory if it doesn't exist"""
        try:
            Path(v).mkdir(parents=True, exist_ok=True)
        except Exception:
            # If we can't create directory, use a safe default
            v = "uploads"
            Path(v).mkdir(parents=True, exist_ok=True)
        return v
    
    @field_validator("DOCUMENTS_DIR", mode="before")
    @classmethod
    def create_documents_directory(cls, v: str) -> str:
        """Create documents directory if it doesn't exist"""
        try:
            Path(v).mkdir(parents=True, exist_ok=True)
        except Exception:
            # If we can't create directory, use a safe default
            v = "uploads/documents"
            Path(v).mkdir(parents=True, exist_ok=True)
        return v
    
    @field_validator("TEMP_DIR", mode="before")
    @classmethod
    def create_temp_directory(cls, v: str) -> str:
        """Create temp directory if it doesn't exist"""
        try:
            Path(v).mkdir(parents=True, exist_ok=True)
        except Exception:
            # If we can't create directory, use a safe default
            v = "uploads/temp"
            Path(v).mkdir(parents=True, exist_ok=True)
        return v
    
    @field_validator("LOG_FILE", mode="before")
    @classmethod
    def create_log_directory(cls, v: str) -> str:
        """Create log directory if it doesn't exist"""
        try:
            log_dir = Path(v).parent
            log_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            # If we can't create directory, use a safe default
            v = "logs/app.log"
            log_dir = Path(v).parent
            log_dir.mkdir(parents=True, exist_ok=True)
        return v
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT.lower() == "development"
    
    def is_testing(self) -> bool:
        """Check if running in testing environment"""
        return self.ENVIRONMENT.lower() == "testing"
    
    def get_database_url(self) -> str:
        """Get formatted database URL"""
        return f"{self.MONGODB_URL}/{self.DATABASE_NAME}"
    
    def get_redis_url(self) -> str:
        """Get formatted Redis URL"""
        return f"{self.REDIS_URL}/{self.REDIS_DB}"
    
    # ✅ NEW - Document management helper methods
    def get_documents_path(self) -> Path:
        """Get documents directory path"""
        return Path(self.DOCUMENTS_DIR)
    
    def get_temp_path(self) -> Path:
        """Get temporary directory path"""
        return Path(self.TEMP_DIR)
    
    def is_allowed_file_extension(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        file_ext = Path(filename).suffix.lower()
        return file_ext in self.ALLOWED_DOCUMENT_EXTENSIONS
    
    def is_restricted_file_type(self, filename: str) -> bool:
        """Check if file type is restricted"""
        file_ext = Path(filename).suffix.lower()
        return file_ext in self.RESTRICTED_FILE_TYPES
    
    def get_max_file_size_mb(self) -> float:
        """Get maximum file size in MB"""
        return self.MAX_UPLOAD_SIZE / (1024 * 1024)
    
    def get_company_documents_path(self, company_id: str) -> Path:
        """Get company-specific documents path"""
        company_path = self.get_documents_path() / company_id
        company_path.mkdir(parents=True, exist_ok=True)
        return company_path
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables

# Create global settings instance
settings = Settings()

# Export settings for easy import
__all__ = ["settings", "Settings"]