# =============================================================================
# app/schemas/ai_flow.py
# =============================================================================
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.ai_flow import FlowTrigger, ActionType

# Flow condition schemas
class FlowConditionBase(BaseModel):
    """Base flow condition schema"""
    model_config = ConfigDict(extra="forbid")
    
    field: str = Field(..., description="Field to check")
    operator: str = Field(..., description="Comparison operator")
    value: Union[str, int, float, bool, List[Any]] = Field(..., description="Comparison value")

class FlowConditionCreate(FlowConditionBase):
    """Schema for creating flow condition"""
    pass

class FlowConditionResponse(FlowConditionBase):
    """Schema for flow condition response"""
    model_config = ConfigDict(from_attributes=True)

# Flow action schemas
class FlowActionBase(BaseModel):
    """Base flow action schema"""
    model_config = ConfigDict(extra="forbid")
    
    action_type: ActionType = Field(..., description="Action type")
    name: str = Field(..., min_length=1, max_length=100, description="Action name")
    description: Optional[str] = Field(None, max_length=500, description="Action description")
    config: Dict[str, Any] = Field(default_factory=dict, description="Action configuration")
    delay_minutes: Optional[int] = Field(default=0, ge=0, description="Delay in minutes")
    retry_attempts: Optional[int] = Field(default=3, ge=0, le=10, description="Retry attempts")
    continue_on_error: Optional[bool] = Field(default=False, description="Continue on error")

class FlowActionCreate(FlowActionBase):
    """Schema for creating flow action"""
    conditions: Optional[List[FlowConditionCreate]] = Field(default_factory=list, description="Conditions")

class FlowActionUpdate(FlowActionBase):
    """Schema for updating flow action"""
    action_type: Optional[ActionType] = Field(None, description="Action type")
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Action name")

class FlowActionResponse(FlowActionBase):
    """Schema for flow action response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Action ID")
    conditions: List[FlowConditionResponse] = Field(default_factory=list, description="Conditions")
    success_action_id: Optional[str] = Field(None, description="Success action ID")
    failure_action_id: Optional[str] = Field(None, description="Failure action ID")
    execution_count: int = Field(default=0, description="Execution count")
    success_count: int = Field(default=0, description="Success count")
    failure_count: int = Field(default=0, description="Failure count")
    last_executed: Optional[datetime] = Field(None, description="Last execution timestamp")

# Flow execution schemas
class FlowExecutionBase(BaseModel):
    """Base flow execution schema"""
    model_config = ConfigDict(extra="forbid")
    
    entity_type: str = Field(..., description="Entity type")
    entity_id: str = Field(..., description="Entity ID")
    variables: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Execution variables")

class FlowExecutionCreate(FlowExecutionBase):
    """Schema for creating flow execution"""
    pass

class FlowExecutionResponse(FlowExecutionBase):
    """Schema for flow execution response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Execution ID")
    flow_id: str = Field(..., description="Flow ID")
    status: str = Field(..., description="Execution status")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    current_action_id: Optional[str] = Field(None, description="Current action ID")
    execution_log: List[Dict[str, Any]] = Field(default_factory=list, description="Execution log")
    error_message: Optional[str] = Field(None, description="Error message")

# Base AI flow schemas
class AIFlowBase(BaseModel):
    """Base AI flow schema with common fields"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid"
    )
    
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Flow name")
    description: Optional[str] = Field(None, max_length=500, description="Flow description")
    trigger: Optional[FlowTrigger] = Field(None, description="Flow trigger")
    is_active: Optional[bool] = Field(None, description="Active status")
    is_template: Optional[bool] = Field(None, description="Template status")
    
    # AI settings
    ai_model: Optional[str] = Field(None, description="AI model")
    ai_temperature: Optional[float] = Field(None, ge=0, le=2, description="AI temperature")
    ai_max_tokens: Optional[int] = Field(None, ge=10, le=1000, description="AI max tokens")
    
    # Execution settings
    max_executions_per_day: Optional[int] = Field(None, ge=1, description="Max executions per day")
    execution_window_start: Optional[str] = Field(None, description="Execution window start (HH:MM)")
    execution_window_end: Optional[str] = Field(None, description="Execution window end (HH:MM)")
    
    # Categorization
    category: Optional[str] = Field(None, max_length=100, description="Flow category")
    tags: Optional[List[str]] = Field(default_factory=list, description="Flow tags")

# AI flow creation schema
class AIFlowCreate(AIFlowBase):
    """Schema for creating a new AI flow"""
    name: str = Field(..., min_length=1, max_length=100, description="Flow name")
    trigger: FlowTrigger = Field(..., description="Flow trigger")
    actions: List[FlowActionCreate] = Field(default_factory=list, description="Flow actions")
    trigger_conditions: Optional[List[FlowConditionCreate]] = Field(
        default_factory=list, description="Trigger conditions"
    )
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []

# AI flow update schema
class AIFlowUpdate(AIFlowBase):
    """Schema for updating AI flow information"""
    actions: Optional[List[FlowActionUpdate]] = Field(None, description="Flow actions")
    trigger_conditions: Optional[List[FlowConditionCreate]] = Field(None, description="Trigger conditions")
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        """Convert comma-separated strings to lists"""
        if v is None:
            return v
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v

# AI flow search schema
class AIFlowSearch(BaseModel):
    """Schema for AI flow search parameters"""
    model_config = ConfigDict(extra="forbid")
    
    q: Optional[str] = Field(None, description="Search query")
    trigger: Optional[FlowTrigger] = Field(None, description="Trigger filter")
    is_active: Optional[bool] = Field(None, description="Active status filter")
    is_template: Optional[bool] = Field(None, description="Template status filter")
    category: Optional[str] = Field(None, description="Category filter")
    tag: Optional[str] = Field(None, description="Tag filter")
    created_after: Optional[datetime] = Field(None, description="Created after")
    created_before: Optional[datetime] = Field(None, description="Created before")
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=25, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Response schemas
class AIFlowResponse(AIFlowBase):
    """Schema for AI flow response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Flow ID")
    company_id: str = Field(..., description="Company ID")
    name: str = Field(..., description="Flow name")
    trigger: FlowTrigger = Field(..., description="Flow trigger")
    is_active: bool = Field(..., description="Active status")
    version: int = Field(..., description="Flow version")
    
    # Actions and conditions
    actions: List[FlowActionResponse] = Field(default_factory=list, description="Flow actions")
    trigger_conditions: List[FlowConditionResponse] = Field(
        default_factory=list, description="Trigger conditions"
    )
    start_action_id: Optional[str] = Field(None, description="Start action ID")
    
    # Statistics
    total_executions: int = Field(default=0, description="Total executions")
    successful_executions: int = Field(default=0, description="Successful executions")
    failed_executions: int = Field(default=0, description="Failed executions")
    success_rate: float = Field(default=0.0, description="Success rate percentage")
    last_executed: Optional[datetime] = Field(None, description="Last execution timestamp")
    
    # System fields
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    created_by: str = Field(..., description="Created by user ID")

class AIFlowListResponse(BaseModel):
    """Schema for AI flow list response"""
    model_config = ConfigDict(from_attributes=True)
    
    flows: List[AIFlowResponse] = Field(..., description="List of AI flows")
    total: int = Field(..., description="Total number of flows")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

# Flow execution control schemas
class FlowExecuteManual(BaseModel):
    """Schema for manual flow execution"""
    model_config = ConfigDict(extra="forbid")
    
    entity_type: str = Field(..., description="Entity type")
    entity_id: str = Field(..., description="Entity ID")
    variables: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Execution variables")

class FlowTestRun(BaseModel):
    """Schema for flow test run"""
    model_config = ConfigDict(extra="forbid")
    
    test_data: Dict[str, Any] = Field(..., description="Test data")
    dry_run: bool = Field(default=True, description="Dry run flag")

# Success/Error response schemas
class AIFlowSuccessResponse(BaseModel):
    """Schema for AI flow success responses"""
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., description="Success message")
    flow_id: Optional[str] = Field(None, description="Flow ID")
    execution_id: Optional[str] = Field(None, description="Execution ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")

class AIFlowErrorResponse(BaseModel):
    """Schema for AI flow error responses"""
    model_config = ConfigDict(extra="forbid")
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
