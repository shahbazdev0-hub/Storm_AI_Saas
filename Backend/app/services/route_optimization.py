# app/services/route_optimization.py
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, date
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging
import math
import asyncio
import httpx
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class Location:
    """Represents a location with coordinates"""
    address: str
    latitude: float
    longitude: float
    job_id: Optional[str] = None
    estimated_duration: int = 60  # minutes
    priority: int = 1  # 1-5, higher is more priority
    time_window_start: Optional[datetime] = None
    time_window_end: Optional[datetime] = None

@dataclass
class RouteStop:
    """Represents a stop in an optimized route"""
    location: Location
    arrival_time: datetime
    departure_time: datetime
    travel_time_from_previous: int = 0  # minutes
    sequence_number: int = 0

@dataclass
class OptimizedRoute:
    """Represents an optimized route for a technician"""
    technician_id: str
    technician_name: str
    route_date: date
    stops: List[RouteStop]
    total_distance_miles: float = 0.0
    total_travel_time_minutes: int = 0
    total_work_time_minutes: int = 0
    estimated_completion_time: Optional[datetime] = None
    efficiency_score: float = 0.0

class RouteOptimizationService:
    """Service for route optimization and GPS tracking"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.jobs_collection = database.jobs
        self.users_collection = database.users
        self.companies_collection = database.companies
        self.google_maps_api_key = settings.GOOGLE_MAPS_API_KEY
    
    async def optimize_routes(
        self,
        company_id: str,
        route_date: date,
        technician_ids: Optional[List[str]] = None,
        max_hours_per_route: int = 8,
        include_travel_time: bool = True
    ) -> List[OptimizedRoute]:
        """Optimize routes for technicians on given date"""
        try:
            # Get jobs for the date
            start_datetime = datetime.combine(route_date, datetime.min.time())
            end_datetime = datetime.combine(route_date, datetime.max.time())
            
            jobs_query = {
                "company_id": ObjectId(company_id),
                "time_tracking.scheduled_start": {
                    "$gte": start_datetime,
                    "$lte": end_datetime
                },
                "status": {"$in": ["scheduled", "confirmed", "in_progress"]}
            }
            
            if technician_ids:
                jobs_query["$or"] = [
                    {"technician_id": {"$in": [ObjectId(tid) for tid in technician_ids]}},
                    {"technician_ids": {"$in": [ObjectId(tid) for tid in technician_ids]}}
                ]
            
            jobs = await self.jobs_collection.find(jobs_query).to_list(length=None)
            
            if not jobs:
                return []
            
            # Get technicians
            if technician_ids:
                technicians = await self.users_collection.find({
                    "_id": {"$in": [ObjectId(tid) for tid in technician_ids]},
                    "company_id": ObjectId(company_id)
                }).to_list(length=None)
            else:
                # Get all active technicians
                technicians = await self.users_collection.find({
                    "company_id": ObjectId(company_id),
                    "role": {"$in": ["technician", "manager"]},
                    "status": "active"
                }).to_list(length=None)
            
            # Create locations from jobs
            locations = []
            for job in jobs:
                address = job["address"]
                address_str = f"{address['street']}, {address['city']}, {address['state']} {address['postal_code']}"
                
                # Get coordinates
                lat, lng = await self._get_coordinates(address_str)
                if lat and lng:
                    location = Location(
                        address=address_str,
                        latitude=lat,
                        longitude=lng,
                        job_id=str(job["_id"]),
                        estimated_duration=job["time_tracking"].get("scheduled_duration", 60),
                        priority=self._get_job_priority_score(job),
                        time_window_start=job["time_tracking"].get("scheduled_start"),
                        time_window_end=job["time_tracking"].get("scheduled_end")
                    )
                    locations.append(location)
            
            # Optimize routes for each technician
            optimized_routes = []
            
            for technician in technicians:
                tech_id = str(technician["_id"])
                tech_name = f"{technician['first_name']} {technician['last_name']}"
                
                # Get technician's assigned jobs
                tech_locations = []
                for location in locations:
                    job = next((j for j in jobs if str(j["_id"]) == location.job_id), None)
                    if job and (
                        job.get("technician_id") == technician["_id"] or
                        technician["_id"] in job.get("technician_ids", [])
                    ):
                        tech_locations.append(location)
                
                if tech_locations:
                    # Optimize route for this technician
                    # Optimize route for this technician
                    route = await self._optimize_single_route(
                        technician_id=tech_id,
                        technician_name=tech_name,
                        locations=tech_locations,
                        route_date=route_date,
                        max_hours=max_hours_per_route,
                        include_travel_time=include_travel_time
                    )
                    optimized_routes.append(route)
            
            return optimized_routes
            
        except Exception as e:
            logger.error(f"Error optimizing routes: {e}")
            raise
    
    async def _optimize_single_route(
        self,
        technician_id: str,
        technician_name: str,
        locations: List[Location],
        route_date: date,
        max_hours: int = 8,
        include_travel_time: bool = True
    ) -> OptimizedRoute:
        """Optimize route for a single technician"""
        try:
            if not locations:
                return OptimizedRoute(
                    technician_id=technician_id,
                    technician_name=technician_name,
                    route_date=route_date,
                    stops=[]
                )
            
            # Sort locations by priority and time windows
            sorted_locations = self._sort_locations_by_constraints(locations)
            
            # Apply nearest neighbor algorithm with improvements
            optimized_order = await self._nearest_neighbor_with_constraints(sorted_locations)
            
            # Create route stops with timing
            stops = await self._create_route_stops(optimized_order, route_date, include_travel_time)
            
            # Calculate route metrics
            total_distance, total_travel_time = await self._calculate_route_metrics(stops)
            total_work_time = sum(stop.location.estimated_duration for stop in stops)
            
            # Calculate efficiency score
            efficiency_score = self._calculate_efficiency_score(
                len(stops), total_distance, total_travel_time, total_work_time
            )
            
            return OptimizedRoute(
                technician_id=technician_id,
                technician_name=technician_name,
                route_date=route_date,
                stops=stops,
                total_distance_miles=total_distance,
                total_travel_time_minutes=total_travel_time,
                total_work_time_minutes=total_work_time,
                estimated_completion_time=stops[-1].departure_time if stops else None,
                efficiency_score=efficiency_score
            )
            
        except Exception as e:
            logger.error(f"Error optimizing single route: {e}")
            raise
    
    async def _nearest_neighbor_with_constraints(
        self, 
        locations: List[Location]
    ) -> List[Location]:
        """Nearest neighbor algorithm with time window constraints"""
        if not locations:
            return []
        
        if len(locations) == 1:
            return locations
        
        # Start with highest priority location or earliest time window
        unvisited = locations.copy()
        route = []
        
        # Choose starting location
        start_location = min(unvisited, key=lambda x: (
            x.time_window_start or datetime.now(),
            -x.priority
        ))
        route.append(start_location)
        unvisited.remove(start_location)
        
        current_location = start_location
        
        while unvisited:
            # Find nearest feasible location considering time windows
            best_location = None
            best_score = float('inf')
            
            for location in unvisited:
                distance = self._calculate_distance(current_location, location)
                
                # Consider time window constraints
                time_penalty = 0
                if location.time_window_start:
                    # Estimate arrival time
                    travel_time = distance * 2  # Rough estimate: 2 minutes per mile
                    current_time = current_location.time_window_start or datetime.now()
                    arrival_time = current_time + timedelta(minutes=travel_time)
                    
                    if arrival_time > location.time_window_end:
                        time_penalty = 1000  # Heavy penalty for missing time window
                    elif arrival_time < location.time_window_start:
                        wait_time = (location.time_window_start - arrival_time).seconds / 60
                        time_penalty = wait_time * 0.5  # Light penalty for waiting
                
                # Priority bonus
                priority_bonus = (5 - location.priority) * 2
                
                score = distance + time_penalty + priority_bonus
                
                if score < best_score:
                    best_score = score
                    best_location = location
            
            if best_location:
                route.append(best_location)
                unvisited.remove(best_location)
                current_location = best_location
            else:
                # Fallback: add remaining locations by distance
                route.extend(unvisited)
                break
        
        return route
    
    async def _create_route_stops(
        self,
        locations: List[Location],
        route_date: date,
        include_travel_time: bool = True
    ) -> List[RouteStop]:
        """Create route stops with proper timing"""
        if not locations:
            return []
        
        stops = []
        current_time = datetime.combine(route_date, datetime.min.time().replace(hour=8))  # Start at 8 AM
        
        for i, location in enumerate(locations):
            travel_time = 0
            
            if i > 0 and include_travel_time:
                # Calculate travel time from previous location
                distance = self._calculate_distance(locations[i-1], location)
                travel_time = await self._get_travel_time(locations[i-1], location)
                current_time += timedelta(minutes=travel_time)
            
            # Respect time windows
            if location.time_window_start and current_time < location.time_window_start:
                current_time = location.time_window_start
            
            arrival_time = current_time
            departure_time = arrival_time + timedelta(minutes=location.estimated_duration)
            
            stop = RouteStop(
                location=location,
                arrival_time=arrival_time,
                departure_time=departure_time,
                travel_time_from_previous=travel_time,
                sequence_number=i + 1
            )
            
            stops.append(stop)
            current_time = departure_time
        
        return stops
    
    async def _get_coordinates(self, address: str) -> Tuple[Optional[float], Optional[float]]:
        """Get latitude and longitude for an address using Google Maps API"""
        if not self.google_maps_api_key:
            # Return default coordinates or use a geocoding service
            return None, None
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    'address': address,
                    'key': self.google_maps_api_key
                }
                
                response = await client.get(
                    'https://maps.googleapis.com/maps/api/geocode/json',
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data['status'] == 'OK' and data['results']:
                        location = data['results'][0]['geometry']['location']
                        return location['lat'], location['lng']
                
                return None, None
                
        except Exception as e:
            logger.error(f"Error geocoding address {address}: {e}")
            return None, None
    
    async def _get_travel_time(self, from_location: Location, to_location: Location) -> int:
        """Get travel time between two locations using Google Maps API"""
        if not self.google_maps_api_key:
            # Fallback to distance-based estimation
            distance = self._calculate_distance(from_location, to_location)
            return max(int(distance * 2), 5)  # 2 minutes per mile, minimum 5 minutes
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    'origins': f"{from_location.latitude},{from_location.longitude}",
                    'destinations': f"{to_location.latitude},{to_location.longitude}",
                    'mode': 'driving',
                    'units': 'imperial',
                    'key': self.google_maps_api_key
                }
                
                response = await client.get(
                    'https://maps.googleapis.com/maps/api/distancematrix/json',
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if (data['status'] == 'OK' and 
                        data['rows'] and 
                        data['rows'][0]['elements'] and
                        data['rows'][0]['elements'][0]['status'] == 'OK'):
                        
                        duration = data['rows'][0]['elements'][0]['duration']['value']
                        return int(duration / 60)  # Convert seconds to minutes
                
                # Fallback to distance estimation
                distance = self._calculate_distance(from_location, to_location)
                return max(int(distance * 2), 5)
                
        except Exception as e:
            logger.error(f"Error getting travel time: {e}")
            distance = self._calculate_distance(from_location, to_location)
            return max(int(distance * 2), 5)
    
    def _calculate_distance(self, loc1: Location, loc2: Location) -> float:
        """Calculate distance between two locations using Haversine formula"""
        if not all([loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude]):
            return 10.0  # Default distance
        
        # Haversine formula
        R = 3959  # Earth's radius in miles
        
        lat1_rad = math.radians(loc1.latitude)
        lat2_rad = math.radians(loc2.latitude)
        delta_lat = math.radians(loc2.latitude - loc1.latitude)
        delta_lon = math.radians(loc2.longitude - loc1.longitude)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def _sort_locations_by_constraints(self, locations: List[Location]) -> List[Location]:
        """Sort locations by time windows and priority"""
        return sorted(locations, key=lambda x: (
            x.time_window_start or datetime.max,
            -x.priority,
            x.address
        ))
    
    def _get_job_priority_score(self, job: Dict[str, Any]) -> int:
        """Convert job priority to numeric score"""
        priority_map = {
            "emergency": 5,
            "urgent": 4,
            "high": 3,
            "normal": 2,
            "low": 1
        }
        return priority_map.get(job.get("priority", "normal"), 2)
    
    async def _calculate_route_metrics(self, stops: List[RouteStop]) -> Tuple[float, int]:
        """Calculate total distance and travel time for route"""
        total_distance = 0.0
        total_travel_time = 0
        
        for i in range(1, len(stops)):
            distance = self._calculate_distance(
                stops[i-1].location, 
                stops[i].location
            )
            travel_time = stops[i].travel_time_from_previous
            
            total_distance += distance
            total_travel_time += travel_time
        
        return total_distance, total_travel_time
    
    def _calculate_efficiency_score(
        self,
        num_stops: int,
        total_distance: float,
        total_travel_time: int,
        total_work_time: int
    ) -> float:
        """Calculate route efficiency score (0-100)"""
        if num_stops == 0:
            return 0.0
        
        # Base score factors
        distance_efficiency = max(0, 100 - (total_distance / num_stops * 5))  # Penalty for long distances
        time_efficiency = (total_work_time / (total_work_time + total_travel_time)) * 100 if total_travel_time > 0 else 100
        stop_density = min(100, num_stops * 10)  # Bonus for more stops
        
        # Weighted average
        efficiency_score = (
            distance_efficiency * 0.3 +
            time_efficiency * 0.5 +
            stop_density * 0.2
        )
        
        return round(efficiency_score, 2)
    
    async def save_optimized_routes(
        self,
        routes: List[OptimizedRoute],
        company_id: str,
        created_by: str
    ) -> List[str]:
        """Save optimized routes and update job schedules"""
        try:
            saved_route_ids = []
            
            for route in routes:
                # Save route document
                route_doc = {
                    "company_id": ObjectId(company_id),
                    "technician_id": ObjectId(route.technician_id),
                    "technician_name": route.technician_name,
                    "route_date": route.route_date,
                    "stops": [
                        {
                            "job_id": ObjectId(stop.location.job_id) if stop.location.job_id else None,
                            "address": stop.location.address,
                            "latitude": stop.location.latitude,
                            "longitude": stop.location.longitude,
                            "arrival_time": stop.arrival_time,
                            "departure_time": stop.departure_time,
                            "estimated_duration": stop.location.estimated_duration,
                            "travel_time_from_previous": stop.travel_time_from_previous,
                            "sequence_number": stop.sequence_number
                        }
                        for stop in route.stops
                    ],
                    "total_distance_miles": route.total_distance_miles,
                    "total_travel_time_minutes": route.total_travel_time_minutes,
                    "total_work_time_minutes": route.total_work_time_minutes,
                    "estimated_completion_time": route.estimated_completion_time,
                    "efficiency_score": route.efficiency_score,
                    "created_at": datetime.utcnow(),
                    "created_by": ObjectId(created_by)
                }
                
                result = await self.db.optimized_routes.insert_one(route_doc)
                saved_route_ids.append(str(result.inserted_id))
                
                # Update job schedules based on optimized route
                for stop in route.stops:
                    if stop.location.job_id:
                        await self.jobs_collection.update_one(
                            {"_id": ObjectId(stop.location.job_id)},
                            {
                                "$set": {
                                    "time_tracking.scheduled_start": stop.arrival_time,
                                    "time_tracking.scheduled_end": stop.departure_time,
                                    "route_sequence": stop.sequence_number,
                                    "estimated_travel_time": stop.travel_time_from_previous,
                                    "updated_at": datetime.utcnow()
                                }
                            }
                        )
            
            logger.info(f"Saved {len(routes)} optimized routes for company {company_id}")
            return saved_route_ids
            
        except Exception as e:
            logger.error(f"Error saving optimized routes: {e}")
            raise
    
    async def get_route_analytics(
        self,
        company_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get route optimization analytics"""
        try:
            # Get optimized routes in date range
            routes = await self.db.optimized_routes.find({
                "company_id": ObjectId(company_id),
                "route_date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }).to_list(length=None)
            
            if not routes:
                return {
                    "total_routes": 0,
                    "average_efficiency": 0,
                    "total_distance": 0,
                    "total_travel_time": 0,
                    "average_stops_per_route": 0
                }
            
            # Calculate analytics
            total_routes = len(routes)
            total_distance = sum(route["total_distance_miles"] for route in routes)
            total_travel_time = sum(route["total_travel_time_minutes"] for route in routes)
            total_stops = sum(len(route["stops"]) for route in routes)
            average_efficiency = sum(route["efficiency_score"] for route in routes) / total_routes
            
            # Efficiency by technician
            technician_efficiency = {}
            for route in routes:
                tech_id = str(route["technician_id"])
                if tech_id not in technician_efficiency:
                    technician_efficiency[tech_id] = {
                        "technician_name": route["technician_name"],
                        "route_count": 0,
                        "total_efficiency": 0,
                        "total_distance": 0,
                        "total_stops": 0
                    }
                
                technician_efficiency[tech_id]["route_count"] += 1
                technician_efficiency[tech_id]["total_efficiency"] += route["efficiency_score"]
                technician_efficiency[tech_id]["total_distance"] += route["total_distance_miles"]
                technician_efficiency[tech_id]["total_stops"] += len(route["stops"])
            
            # Calculate averages
            for tech_data in technician_efficiency.values():
                tech_data["average_efficiency"] = tech_data["total_efficiency"] / tech_data["route_count"]
                tech_data["average_distance"] = tech_data["total_distance"] / tech_data["route_count"]
                tech_data["average_stops"] = tech_data["total_stops"] / tech_data["route_count"]
            
            return {
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "total_routes": total_routes,
                "average_efficiency": round(average_efficiency, 2),
                "total_distance_miles": round(total_distance, 2),
                "total_travel_time_minutes": total_travel_time,
                "average_stops_per_route": round(total_stops / total_routes, 2),
                "technician_performance": list(technician_efficiency.values())
            }
            
        except Exception as e:
            logger.error(f"Error getting route analytics: {e}")
            raise
    
    async def track_gps_location(
        self,
        technician_id: str,
        latitude: float,
        longitude: float,
        company_id: str,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Track technician GPS location"""
        try:
            if not timestamp:
                timestamp = datetime.utcnow()
            
            # Save GPS tracking record
            tracking_doc = {
                "company_id": ObjectId(company_id),
                "technician_id": ObjectId(technician_id),
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": timestamp,
                "accuracy": None,  # Could be provided by mobile app
                "speed": None,     # Could be calculated from previous locations
                "heading": None    # Direction of travel
            }
            
            await self.db.gps_tracking.insert_one(tracking_doc)
            
            # Update technician's current location
            await self.users_collection.update_one(
                {"_id": ObjectId(technician_id)},
                {
                    "$set": {
                        "current_location": {
                            "latitude": latitude,
                            "longitude": longitude,
                            "last_updated": timestamp
                        }
                    }
                }
            )
            
            return {
                "message": "Location updated successfully",
                "timestamp": timestamp
            }
            
        except Exception as e:
            logger.error(f"Error tracking GPS location: {e}")
            raise
    
    async def get_technician_location(
        self,
        technician_id: str,
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get current technician location"""
        try:
            technician = await self.users_collection.find_one({
                "_id": ObjectId(technician_id),
                "company_id": ObjectId(company_id)
            })
            
            if technician and technician.get("current_location"):
                return technician["current_location"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting technician location: {e}")
            return None