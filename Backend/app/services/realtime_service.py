# backend/app/services/realtime_service.py
from typing import Dict, List, Any, Optional
import json
import asyncio
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class RealtimeConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.technician_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Dict[str, WebSocket] = {}
        self.company_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect_technician(self, websocket: WebSocket, technician_id: str, company_id: str):
        """Connect a technician to real-time updates"""
        await websocket.accept()
        self.technician_connections[technician_id] = websocket
        
        # Add to company connections
        if company_id not in self.company_connections:
            self.company_connections[company_id] = []
        self.company_connections[company_id].append(websocket)
        
        logger.info(f"Technician {technician_id} connected to real-time service")
    
    def disconnect_technician(self, technician_id: str, company_id: str):
        """Disconnect technician"""
        if technician_id in self.technician_connections:
            websocket = self.technician_connections[technician_id]
            del self.technician_connections[technician_id]
            
            # Remove from company connections
            if company_id in self.company_connections:
                try:
                    self.company_connections[company_id].remove(websocket)
                    if not self.company_connections[company_id]:
                        del self.company_connections[company_id]
                except ValueError:
                    pass
        
        logger.info(f"Technician {technician_id} disconnected from real-time service")
    
    async def send_to_technician(self, technician_id: str, message: Dict[str, Any]):
        """Send message to specific technician"""
        if technician_id in self.technician_connections:
            websocket = self.technician_connections[technician_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to technician {technician_id}: {e}")
                # Remove dead connection
                self.disconnect_technician(technician_id, "")
    
    async def send_to_company(self, company_id: str, message: Dict[str, Any]):
        """Send message to all connected users in a company"""
        if company_id in self.company_connections:
            dead_connections = []
            
            for websocket in self.company_connections[company_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(websocket)
            
            # Remove dead connections
            for dead_ws in dead_connections:
                try:
                    self.company_connections[company_id].remove(dead_ws)
                except ValueError:
                    pass
    
    async def broadcast_job_update(self, job_data: Dict[str, Any]):
        """Broadcast job status update to relevant parties"""
        message = {
            "type": "job_update",
            "data": job_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to assigned technician
        if "technician_id" in job_data and job_data["technician_id"]:
            await self.send_to_technician(job_data["technician_id"], message)
        
        # Send to company admins/managers
        if "company_id" in job_data:
            await self.send_to_company(job_data["company_id"], message)
    
    async def broadcast_location_update(self, technician_id: str, company_id: str, location_data: Dict[str, Any]):
        """Broadcast technician location update"""
        message = {
            "type": "location_update",
            "technician_id": technician_id,
            "data": location_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to company for tracking
        await self.send_to_company(company_id, message)

# Global connection manager
connection_manager = RealtimeConnectionManager()


# backend/app/services/photo_service.py
import os
import uuid
import base64
from typing import Optional, Tuple, Dict, Any
from PIL import Image, ExifTags
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

class PhotoService:
    """Handle photo upload, compression, and storage"""
    
    def __init__(self):
        self.max_size = (1920, 1080)
        self.thumbnail_size = (300, 200)
        self.quality = 85
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def validate_image(self, file_data: bytes, content_type: str) -> bool:
        """Validate image file"""
        if len(file_data) > self.max_file_size:
            return False
        
        if not content_type.startswith('image/'):
            return False
        
        try:
            Image.open(BytesIO(file_data))
            return True
        except Exception:
            return False
    
    def compress_image(self, file_data: bytes, target_quality: int = None) -> Tuple[bytes, Dict[str, Any]]:
        """Compress image and extract metadata"""
        quality = target_quality or self.quality
        
        try:
            # Open image
            image = Image.open(BytesIO(file_data))
            
            # Handle EXIF orientation
            try:
                for orientation in ExifTags.TAGS.keys():
                    if ExifTags.TAGS[orientation] == 'Orientation':
                        break
                
                exif = image._getexif()
                if exif is not None:
                    orientation_value = exif.get(orientation)
                    if orientation_value == 3:
                        image = image.rotate(180, expand=True)
                    elif orientation_value == 6:
                        image = image.rotate(270, expand=True)
                    elif orientation_value == 8:
                        image = image.rotate(90, expand=True)
            except (AttributeError, KeyError, TypeError):
                pass
            
            # Get original dimensions
            original_width, original_height = image.size
            
            # Resize if needed
            if original_width > self.max_size[0] or original_height > self.max_size[1]:
                image.thumbnail(self.max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            
            # Save compressed image
            output = BytesIO()
            image.save(output, format='JPEG', quality=quality, optimize=True)
            compressed_data = output.getvalue()
            
            # Create thumbnail
            thumbnail_image = image.copy()
            thumbnail_image.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS)
            thumbnail_output = BytesIO()
            thumbnail_image.save(thumbnail_output, format='JPEG', quality=70, optimize=True)
            thumbnail_data = thumbnail_output.getvalue()
            
            metadata = {
                "original_size": (original_width, original_height),
                "final_size": image.size,
                "original_file_size": len(file_data),
                "compressed_file_size": len(compressed_data),
                "thumbnail_size": len(thumbnail_data),
                "compression_ratio": round(len(compressed_data) / len(file_data), 2)
            }
            
            return compressed_data, thumbnail_data, metadata
            
        except Exception as e:
            logger.error(f"Error compressing image: {e}")
            raise
    
    def generate_filename(self, original_filename: str) -> str:
        """Generate unique filename"""
        extension = os.path.splitext(original_filename)[1].lower()
        if not extension:
            extension = '.jpg'
        return f"{uuid.uuid4()}{extension}"
    
    def encode_base64(self, image_data: bytes, mime_type: str = "image/jpeg") -> str:
        """Encode image as base64 data URL"""
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:{mime_type};base64,{base64_data}"


# backend/app/services/gps_service.py
import math
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)

class GPSService:
    """Handle GPS tracking and route optimization"""
    
    def __init__(self):
        self.earth_radius = 6371  # kilometers
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates using Haversine formula"""
        # Convert latitude and longitude to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return self.earth_radius * c
    
    def estimate_travel_time(self, distance_km: float, avg_speed_kmh: float = 50) -> int:
        """Estimate travel time in minutes"""
        if distance_km <= 0:
            return 0
        
        hours = distance_km / avg_speed_kmh
        return max(1, int(hours * 60))  # At least 1 minute
    
    def optimize_route(self, jobs: List[Dict[str, Any]], start_location: Optional[Tuple[float, float]] = None) -> List[Dict[str, Any]]:
        """Simple route optimization using nearest neighbor algorithm"""
        if not jobs:
            return []
        
        # Filter jobs with valid coordinates
        jobs_with_coords = []
        jobs_without_coords = []
        
        for job in jobs:
            location = job.get("location", {})
            lat = location.get("latitude")
            lon = location.get("longitude")
            
            if lat is not None and lon is not None:
                job["_temp_coords"] = (lat, lon)
                jobs_with_coords.append(job)
            else:
                jobs_without_coords.append(job)
        
        if not jobs_with_coords:
            # If no GPS coordinates, sort by scheduled time
            return sorted(jobs, key=lambda x: x.get("time_window", {}).get("scheduled_start", ""))
        
        # Use first job as starting point if no start location provided
        current_location = start_location or jobs_with_coords[0]["_temp_coords"]
        optimized_route = []
        remaining_jobs = jobs_with_coords.copy()
        
        # Nearest neighbor algorithm
        while remaining_jobs:
            nearest_job = None
            nearest_distance = float('inf')
            
            for job in remaining_jobs:
                job_coords = job["_temp_coords"]
                distance = self.calculate_distance(
                    current_location[0], current_location[1],
                    job_coords[0], job_coords[1]
                )
                
                if distance < nearest_distance:
                    nearest_distance = distance
                    nearest_job = job
            
            if nearest_job:
                # Add travel time and distance info
                nearest_job["route_info"] = {
                    "distance_km": round(nearest_distance, 2),
                    "estimated_travel_time": self.estimate_travel_time(nearest_distance),
                    "route_order": len(optimized_route) + 1
                }
                
                optimized_route.append(nearest_job)
                remaining_jobs.remove(nearest_job)
                current_location = nearest_job["_temp_coords"]
        
        # Clean up temp coordinates
        for job in optimized_route:
            if "_temp_coords" in job:
                del job["_temp_coords"]
        
        # Add jobs without coordinates at the end
        for i, job in enumerate(jobs_without_coords):
            job["route_info"] = {
                "distance_km": 0,
                "estimated_travel_time": 0,
                "route_order": len(optimized_route) + i + 1
            }
            optimized_route.append(job)
        
        return optimized_route
    
    async def track_technician_location(self, db, technician_id: str, company_id: str, 
                                      latitude: float, longitude: float, accuracy: float = None):
        """Track technician location and update database"""
        location_data = {
            "technician_id": ObjectId(technician_id),
            "company_id": ObjectId(company_id),
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        try:
            # Store location history
            await db.technician_locations.insert_one(location_data)
            
            # Update user's current location
            await db.users.update_one(
                {"_id": ObjectId(technician_id)},
                {
                    "$set": {
                        "current_location": {
                            "latitude": latitude,
                            "longitude": longitude,
                            "accuracy": accuracy,
                            "updated_at": datetime.utcnow()
                        }
                    }
                }
            )
            
            # Check if technician is near any job locations
            await self.check_proximity_alerts(db, technician_id, company_id, latitude, longitude)
            
        except Exception as e:
            logger.error(f"Error tracking technician location: {e}")
    
    async def check_proximity_alerts(self, db, technician_id: str, company_id: str, 
                                   latitude: float, longitude: float, threshold_km: float = 0.5):
        """Check if technician is near scheduled job locations"""
        try:
            # Get today's jobs for this technician
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = today + timedelta(days=1)
            
            jobs = await db.jobs.find({
                "company_id": ObjectId(company_id),
                "technician_id": ObjectId(technician_id),
                "status": {"$in": ["scheduled", "confirmed"]},
                "time_tracking.scheduled_start": {"$gte": today, "$lt": tomorrow}
            }).to_list(length=50)
            
            for job in jobs:
                address = job.get("address", {})
                if isinstance(address, dict):
                    job_lat = address.get("latitude")
                    job_lon = address.get("longitude")
                    
                    if job_lat is not None and job_lon is not None:
                        distance = self.calculate_distance(latitude, longitude, job_lat, job_lon)
                        
                        if distance <= threshold_km:
                            # Technician is near job location
                            notification = {
                                "type": "proximity_alert",
                                "message": f"You are near job location: {job.get('title', 'Service Call')}",
                                "job_id": str(job["_id"]),
                                "distance_km": round(distance, 2),
                                "timestamp": datetime.utcnow()
                            }
                            
                            # Send real-time notification
                            from .realtime_service import connection_manager
                            await connection_manager.send_to_technician(technician_id, notification)
            
        except Exception as e:
            logger.error(f"Error checking proximity alerts: {e}")


# Global service instances
photo_service = PhotoService()
gps_service = GPSService()