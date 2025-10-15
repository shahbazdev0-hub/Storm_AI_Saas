# =============================================================================
# MIDDLEWARE
# =============================================================================
# app/middleware/auth_middleware.py
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Skip auth for public endpoints
        public_paths = ["/", "/health", "/docs", "/openapi.json", "/api/v1/auth/login", "/api/v1/auth/register"]
        
        if request.url.path in public_paths:
            response = await call_next(request)
            return response
        
        # Process request
        response = await call_next(request)
        
        # Log request
        process_time = time.time() - start_time
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}s")
        
        return response
