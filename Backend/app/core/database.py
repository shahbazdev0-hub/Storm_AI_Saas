# app/core/database.py
import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT
import logging
from typing import Optional
import asyncio
from fastapi import HTTPException
from .config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection and management"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.connected = False
    
    async def connect(self) -> None:
        """Create database connection"""
        logger.info("Connecting to MongoDB...")
        
        try:
            # Create MongoDB client with connection options
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,  # 5 second timeout
                connectTimeoutMS=10000,  # 10 second timeout
                maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
                maxIdleTimeMS=settings.MONGODB_MAX_IDLE_TIME_MS,
                retryWrites=True,
                retryReads=True
            )
            
            # Get database instance
            self.database = self.client[settings.DATABASE_NAME]
            
            # Test the connection
            await self.client.admin.command('ping')
            
            logger.info(f"✅ Successfully connected to MongoDB: {settings.DATABASE_NAME}")
            self.connected = True
            
            # Create indexes for better performance
            await self.create_indexes()
            
        except ConnectionFailure as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
        except ServerSelectionTimeoutError as e:
            logger.error(f"❌ MongoDB server selection timeout: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error connecting to MongoDB: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Close database connection"""
        logger.info("Closing MongoDB connection...")
        
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("✅ MongoDB connection closed")
    
    async def ping(self) -> bool:
        """Test database connection"""
        try:
            if self.client:
                await self.client.admin.command('ping')
                return True
        except Exception as e:
            logger.error(f"Database ping failed: {e}")
        return False
    
    async def create_indexes(self) -> None:
        """Create database indexes for optimal performance"""
        logger.info("Creating database indexes...")
        
        try:
            db = self.database
            
            # Users collection indexes
            await db.users.create_indexes([
                IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("role", ASCENDING)], name="company_role_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
                IndexModel([("last_login", DESCENDING)], name="last_login_desc")
            ])
            
            # Companies collection indexes
            await db.companies.create_indexes([
                IndexModel([("name", ASCENDING)], name="name_idx"),
                IndexModel([("status", ASCENDING)], name="status_idx"),
                IndexModel([("subscription_plan", ASCENDING)], name="subscription_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Contacts collection indexes
            await db.contacts.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("email", ASCENDING)], name="company_email_idx"),
                IndexModel([("company_id", ASCENDING), ("phone", ASCENDING)], name="company_phone_idx"),
                IndexModel([("company_id", ASCENDING), ("type", ASCENDING)], name="company_type_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("company_id", ASCENDING), ("assigned_to", ASCENDING)], name="company_assigned_idx"),
                IndexModel([("first_name", TEXT), ("last_name", TEXT), ("email", TEXT), ("company", TEXT)], name="text_search"),
                IndexModel([("tags", ASCENDING)], name="tags_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
                IndexModel([("updated_at", DESCENDING)], name="updated_at_desc")
            ])
            
            # Leads collection indexes
            await db.leads.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("company_id", ASCENDING), ("source", ASCENDING)], name="company_source_idx"),
                IndexModel([("company_id", ASCENDING), ("assigned_to", ASCENDING)], name="company_assigned_idx"),
                IndexModel([("company_id", ASCENDING), ("ai_score", DESCENDING)], name="company_ai_score_idx"),
                IndexModel([("company_id", ASCENDING), ("priority", ASCENDING)], name="company_priority_idx"),
                IndexModel([("contact_id", ASCENDING)], name="contact_id_idx"),
                IndexModel([("expected_close_date", ASCENDING)], name="close_date_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Jobs collection indexes
            await db.jobs.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("company_id", ASCENDING), ("scheduled_date", ASCENDING)], name="company_scheduled_idx"),
                IndexModel([("company_id", ASCENDING), ("technician_id", ASCENDING)], name="company_technician_idx"),
                IndexModel([("company_id", ASCENDING), ("customer_id", ASCENDING)], name="company_customer_idx"),
                IndexModel([("company_id", ASCENDING), ("priority", ASCENDING)], name="company_priority_idx"),
                IndexModel([("scheduled_date", ASCENDING), ("status", ASCENDING)], name="scheduled_status_idx"),
                IndexModel([("technician_id", ASCENDING), ("scheduled_date", ASCENDING)], name="tech_scheduled_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Estimates collection indexes
            await db.estimates.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("company_id", ASCENDING), ("customer_id", ASCENDING)], name="company_customer_idx"),
                IndexModel([("estimate_number", ASCENDING)], unique=True, name="estimate_number_unique"),
                IndexModel([("valid_until", ASCENDING)], name="valid_until_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Invoices collection indexes
            await db.invoices.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("status", ASCENDING)], name="company_status_idx"),
                IndexModel([("company_id", ASCENDING), ("customer_id", ASCENDING)], name="company_customer_idx"),
                IndexModel([("invoice_number", ASCENDING)], unique=True, name="invoice_number_unique"),
                IndexModel([("due_date", ASCENDING)], name="due_date_idx"),
                IndexModel([("company_id", ASCENDING), ("due_date", ASCENDING), ("status", ASCENDING)], name="overdue_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # SMS Messages collection indexes
            await db.sms_messages.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("phone_number", ASCENDING)], name="company_phone_idx"),
                IndexModel([("company_id", ASCENDING), ("direction", ASCENDING)], name="company_direction_idx"),
                IndexModel([("phone_number", ASCENDING), ("created_at", DESCENDING)], name="phone_created_idx"),
                IndexModel([("lead_id", ASCENDING)], name="lead_id_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # AI Flows collection indexes
            await db.ai_flows.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("is_active", ASCENDING)], name="company_active_idx"),
                IndexModel([("company_id", ASCENDING), ("name", ASCENDING)], name="company_name_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Integrations collection indexes
            await db.integrations.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("type", ASCENDING)], name="company_type_idx"),
                IndexModel([("company_id", ASCENDING), ("is_active", ASCENDING)], name="company_active_idx"),
                IndexModel([("name", ASCENDING)], name="name_idx")
            ])
            
            # Analytics/Metrics collection indexes
            await db.analytics.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("metric_type", ASCENDING)], name="company_metric_idx"),
                IndexModel([("company_id", ASCENDING), ("date", DESCENDING)], name="company_date_idx"),
                IndexModel([("date", DESCENDING)], name="date_desc")
            ])
            
            # Reviews/Feedback collection indexes
            await db.reviews.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("company_id", ASCENDING), ("rating", ASCENDING)], name="company_rating_idx"),
                IndexModel([("customer_id", ASCENDING)], name="customer_id_idx"),
                IndexModel([("job_id", ASCENDING)], name="job_id_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # File Uploads collection indexes
            await db.file_uploads.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("uploaded_by", ASCENDING)], name="uploaded_by_idx"),
                IndexModel([("entity_type", ASCENDING), ("entity_id", ASCENDING)], name="entity_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            # Audit Logs collection indexes
            await db.audit_logs.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("user_id", ASCENDING)], name="user_id_idx"),
                IndexModel([("action", ASCENDING)], name="action_idx"),
                IndexModel([("entity_type", ASCENDING), ("entity_id", ASCENDING)], name="entity_idx"),
                IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
                IndexModel([("company_id", ASCENDING), ("timestamp", DESCENDING)], name="company_timestamp_idx")
            ])
            
            # Payments collection indexes
            await db.payments.create_indexes([
                IndexModel([("company_id", ASCENDING)], name="company_id_idx"),
                IndexModel([("invoice_id", ASCENDING)], name="invoice_id_idx"),
                IndexModel([("customer_id", ASCENDING)], name="customer_id_idx"),
                IndexModel([("payment_method", ASCENDING)], name="payment_method_idx"),
                IndexModel([("status", ASCENDING)], name="status_idx"),
                IndexModel([("created_at", DESCENDING)], name="created_at_desc")
            ])
            
            logger.info("✅ Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating database indexes: {e}")
            # Don't raise here as the app can still function without indexes
    
    async def drop_indexes(self, collection_name: str) -> bool:
        """Drop all indexes for a collection (except _id)"""
        try:
            collection = self.database[collection_name]
            await collection.drop_indexes()
            logger.info(f"✅ Dropped indexes for collection: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"❌ Error dropping indexes for {collection_name}: {e}")
            return False
    
    async def get_collection_stats(self, collection_name: str) -> dict:
        """Get statistics for a collection"""
        try:
            result = await self.database.command("collStats", collection_name)
            return {
                "count": result.get("count", 0),
                "size": result.get("size", 0),
                "avgObjSize": result.get("avgObjSize", 0),
                "storageSize": result.get("storageSize", 0),
                "indexes": result.get("nindexes", 0),
                "totalIndexSize": result.get("totalIndexSize", 0)
            }
        except Exception as e:
            logger.error(f"❌ Error getting stats for {collection_name}: {e}")
            return {}
    
    async def get_database_stats(self) -> dict:
        """Get database statistics"""
        try:
            result = await self.database.command("dbStats")
            return {
                "collections": result.get("collections", 0),
                "views": result.get("views", 0),
                "objects": result.get("objects", 0),
                "avgObjSize": result.get("avgObjSize", 0),
                "dataSize": result.get("dataSize", 0),
                "storageSize": result.get("storageSize", 0),
                "indexes": result.get("indexes", 0),
                "indexSize": result.get("indexSize", 0)
            }
        except Exception as e:
            logger.error(f"❌ Error getting database stats: {e}")
            return {}
    
    async def health_check(self) -> dict:
        """Perform database health check"""
        health_status = {
            "status": "unhealthy",
            "connected": False,
            "ping_success": False,
            "response_time_ms": None
        }
        
        try:
            import time
            start_time = time.time()
            
            # Test connection
            if self.connected and await self.ping():
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                health_status.update({
                    "status": "healthy",
                    "connected": True,
                    "ping_success": True,
                    "response_time_ms": round(response_time, 2)
                })
            
        except Exception as e:
            logger.error(f"❌ Database health check failed: {e}")
            health_status["error"] = str(e)
        
        return health_status
    
    def get_collection(self, name: str):
        """Get a collection by name"""
        if not self.database:
            raise RuntimeError("Database not connected")
        return self.database[name]

# backend/app/core/database.py - Add integration collections setup

# Add these collection creation methods to your existing database.py file

async def create_integration_collections(db):
    """Create integration-related collections with proper indexes"""
    
    # Integrations collection
    if "integrations" not in await db.list_collection_names():
        await db.create_collection("integrations")
        
        # Create indexes for integrations
        await db.integrations.create_index([("company_id", 1)])
        await db.integrations.create_index([("provider_id", 1)])
        await db.integrations.create_index([("company_id", 1), ("provider_id", 1)], unique=True)
        await db.integrations.create_index([("status", 1)])
        await db.integrations.create_index([("created_at", -1)])
    
    # Webhooks collection
    if "webhooks" not in await db.list_collection_names():
        await db.create_collection("webhooks")
        
        # Create indexes for webhooks
        await db.webhooks.create_index([("company_id", 1)])
        await db.webhooks.create_index([("integration_id", 1)])
        await db.webhooks.create_index([("is_active", 1)])
        await db.webhooks.create_index([("events", 1)])
        await db.webhooks.create_index([("created_at", -1)])
    
    # Integration logs collection
    if "integration_logs" not in await db.list_collection_names():
        await db.create_collection("integration_logs")
        
        # Create indexes for logs
        await db.integration_logs.create_index([("integration_id", 1)])
        await db.integration_logs.create_index([("company_id", 1)])
        await db.integration_logs.create_index([("created_at", -1)])
        await db.integration_logs.create_index([("status", 1)])
        await db.integration_logs.create_index([("action", 1)])
        
        # TTL index to automatically delete old logs (30 days)
        await db.integration_logs.create_index(
            [("created_at", 1)], 
            expireAfterSeconds=30 * 24 * 60 * 60  # 30 days
        )
    
    # API keys collection
    if "api_keys" not in await db.list_collection_names():
        await db.create_collection("api_keys")
        
        # Create indexes for API keys
        await db.api_keys.create_index([("company_id", 1)])
        await db.api_keys.create_index([("key_hash", 1)], unique=True)
        await db.api_keys.create_index([("is_active", 1)])
        await db.api_keys.create_index([("expires_at", 1)])
        await db.api_keys.create_index([("created_at", -1)])
        
        # TTL index for expired keys
        await db.api_keys.create_index([("expires_at", 1)], expireAfterSeconds=0)

# Add this to your existing database initialization
async def initialize_integration_database():
    """Initialize integration-specific database setup"""
    try:
        database = await get_database()
        await create_integration_collections(database)
        logger.info("✅ Integration database collections initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize integration database: {e}")
        raise

async def get_database():
    """Get database instance"""
    if database_manager.database is None:  # Fix: Compare with None instead of using bool()
        raise HTTPException(status_code=503, detail="Database not connected")
    return database_manager.database
# Create global database manager instance
database_manager = DatabaseManager()

# Convenience functions for easier access
async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    if database_manager.database is None:
        raise RuntimeError("Database not connected. Call connect_to_mongo() first.")
    return database_manager.database

async def connect_to_mongo() -> None:
    """Connect to MongoDB"""
    await database_manager.connect()

async def close_mongo_connection() -> None:
    """Close MongoDB connection"""
    await database_manager.disconnect()

async def ping_database() -> bool:
    """Ping database"""
    return await database_manager.ping()

async def get_collection_stats(collection_name: str) -> dict:
    """Get collection statistics"""
    return await database_manager.get_collection_stats(collection_name)

async def get_database_stats() -> dict:
    """Get database statistics"""
    return await database_manager.get_database_stats()

async def database_health_check() -> dict:
    """Database health check"""
    return await database_manager.health_check()

# Database transaction helper
class DatabaseTransaction:
    """Context manager for database transactions"""
    
    def __init__(self, session=None):
        self.session = session
        self.client = database_manager.client
    
    async def __aenter__(self):
        if not self.client:
            raise RuntimeError("Database not connected")
        
        self.session = await self.client.start_session()
        self.session.start_transaction()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            if exc_type:
                await self.session.abort_transaction()
            else:
                await self.session.commit_transaction()
            await self.session.end_session()

# Export main components
__all__ = [
    "database_manager",
    "get_database",
    "connect_to_mongo",
    "close_mongo_connection",
    "ping_database",
    "get_collection_stats", 
    "get_database_stats",
    "database_health_check",
    "DatabaseManager",
    "DatabaseTransaction"
]