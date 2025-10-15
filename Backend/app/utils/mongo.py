from bson import ObjectId
from typing import Any, Dict, List

def oid_str(value: Any):
    return str(value) if isinstance(value, ObjectId) else value

def serialize_job(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a job doc: _id->id and ObjectIds to str for top-level fields you use in UI."""
    out = dict(doc)
    out["id"] = str(out.pop("_id"))

    # common ObjectId fields you already convert elsewhere
    for k in ["company_id", "customer_id", "technician_id", "estimate_id", "created_by", "updated_by"]:
        if k in out and isinstance(out[k], ObjectId):
            out[k] = str(out[k])

    if "technician_ids" in out and isinstance(out["technician_ids"], list):
        out["technician_ids"] = [str(t) if isinstance(t, ObjectId) else t for t in out["technician_ids"]]

    # keep other nested structures as-is (FastAPI handles datetimes)
    return out
