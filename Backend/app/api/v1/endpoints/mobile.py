# backend/app/api/v1/endpoints/mobile.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId

# use YOUR existing functions
from app.dependencies.auth import get_current_user   # <-- was require_user (doesn't exist)
from app.core.database import get_database           # returns AsyncIOMotorDatabase

router = APIRouter(tags=["mobile"])

class ScanRequest(BaseModel):
    code: str  # today: Mongo _id string; later you can support signed tokens

def _serialize_job(doc: dict) -> dict:
    """Minimal serialization: _id -> id and common ObjectIds to str."""
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for k in ["company_id", "customer_id", "technician_id", "estimate_id", "created_by", "updated_by"]:
        if k in out and isinstance(out[k], ObjectId):
            out[k] = str(out[k])
    if "technician_ids" in out and isinstance(out["technician_ids"], list):
        out["technician_ids"] = [str(t) if isinstance(t, ObjectId) else t for t in out["technician_ids"]]
    return out

@router.post("/jobs/scan")
async def scan_job(
    req: ScanRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _user: dict = Depends(get_current_user),  # enforce auth with your dependency
):
    code = req.code.strip()
    try:
        oid = ObjectId(code)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job code")

    doc = await db.jobs.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return {"job": _serialize_job(doc)}













# from fastapi import APIRouter, Depends, HTTPException, status
# from pydantic import BaseModel
# from motor.motor_asyncio import AsyncIOMotorDatabase
# from bson import ObjectId
# from bson.errors import InvalidId

# from app.dependencies.auth import require_user
# from app.core.database import get_db  # must return AsyncIOMotorDatabase
# from app.utils.mongo import serialize_job

# router = APIRouter(prefix="/mobile", tags=["mobile"], dependencies=[Depends(require_user)])

# class ScanRequest(BaseModel):
#     code: str  # today this is the Mongo _id string; later can be a signed token

# @router.post("/jobs/scan")
# async def scan_job(req: ScanRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
#     code = req.code.strip()
#     try:
#         oid = ObjectId(code)
#     except (InvalidId, TypeError):
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job code")

#     doc = await db.jobs.find_one({"_id": oid})
#     if not doc:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

#     job = serialize_job(doc)
#     return {"job": job}
