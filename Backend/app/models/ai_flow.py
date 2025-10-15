# =============================================================================
# app/models/ai_flow.py
# =============================================================================
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId
from enum import Enum

from .user import PyObjectId

class FlowTrigger(str, Enum):
    """AI flow trigger types"""
    NEW_LEAD = "new_lead"
    LEAD_STATUS_CHANGE = "lead_status_change"
    JOB_COMPLETED = "job_completed"
    PAYMENT_RECEIVED = "payment_received"
    INVOICE_OVERDUE = "invoice_overdue"
    CUSTOMER_INQUIRY = "customer_inquiry"
    SCHEDULE_REMINDER = "schedule_reminder"
    FOLLOW_UP_DUE = "follow_up_due"
    MANUAL = "manual"
    WEBHOOK = "webhook"
    TIME_BASED = "time_based"

class ActionType(str, Enum):
    """AI flow action types"""
    SEND_SMS = "send_sms"
    SEND_EMAIL = "send_email"
    CREATE_TASK = "create_task"
    UPDATE_LEAD_STATUS = "update_lead_status"
    ASSIGN_TO_USER = "assign_to_user"
    ADD_TAG = "add_tag"
    SCORE_LEAD = "score_lead"
    SCHEDULE_FOLLOW_UP = "schedule_follow_up"
    CREATE_ESTIMATE = "create_estimate"
    WAIT = "wait"
    CONDITIONAL = "conditional"
    API_CALL = "api_call"

class FlowCondition(BaseModel):
    """Flow condition for branching logic"""
    model_config = ConfigDict(extra="allow")
    
    field: str  # Field to check (e.g., "lead.source", "contact.type")
    operator: str  # equals, not_equals, contains, greater_than, etc.
    value: Union[str, int, float, bool, List[Any]]
    
    # Logical operators
    and_conditions: List['FlowCondition'] = Field(default_factory=list)
    or_conditions: List['FlowCondition'] = Field(default_factory=list)

class FlowAction(BaseModel):
    """AI flow action"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    action_type: ActionType
    name: str
    description: Optional[str] = None
    
    # Action configuration
    config: Dict[str, Any] = Field(default_factory=dict)
    
    # Conditional execution
    conditions: List[FlowCondition] = Field(default_factory=list)
    
    # Timing
    delay_minutes: int = Field(default=0, ge=0)
    
    # Error handling
    retry_attempts: int = Field(default=3, ge=0, le=10)
    continue_on_error: bool = Field(default=False)
    
    # Success/failure paths
    success_action_id: Optional[str] = None
    failure_action_id: Optional[str] = None
    
    # Tracking
    execution_count: int = Field(default=0)
    success_count: int = Field(default=0)
    failure_count: int = Field(default=0)
    last_executed: Optional[datetime] = None

class FlowExecution(BaseModel):
    """Flow execution record"""
    model_config = ConfigDict(extra="allow")
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    flow_id: PyObjectId
    entity_type: str  # lead, contact, job, etc.
    entity_id: PyObjectId
    
    # Execution status
    status: str = Field(default="running")  # running, completed, failed, cancelled
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Current state
    current_action_id: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    
    # Execution log
    execution_log: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Error information
    error_message: Optional[str] = None
    error_action_id: Optional[str] = None

class AIFlow(BaseModel):
    """AI Flow model for MongoDB with Pydantic v2"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
        extra="forbid"
    )
    
    # Primary fields
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    company_id: PyObjectId = Field(..., description="Company ID")
    
    # Flow identification
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    
    # Flow configuration
    trigger: FlowTrigger
    trigger_conditions: List[FlowCondition] = Field(default_factory=list)
    
    # Actions and workflow
    actions: List[FlowAction] = Field(default_factory=list)
    start_action_id: Optional[str] = None
    
    # Status and control
    is_active: bool = Field(default=True)
    is_template: bool = Field(default=False)
    version: int = Field(default=1)
    
    # AI settings
    ai_model: str = Field(default="gpt-3.5-turbo")
    ai_temperature: float = Field(default=0.7, ge=0, le=2)
    ai_max_tokens: int = Field(default=150, ge=10, le=1000)
    
    # Execution settings
    max_executions_per_day: int = Field(default=1000, ge=1)
    execution_window_start: Optional[str] = None  # HH:MM format
    execution_window_end: Optional[str] = None    # HH:MM format
    
    # Statistics
    total_executions: int = Field(default=0)
    successful_executions: int = Field(default=0)
    failed_executions: int = Field(default=0)
    last_executed: Optional[datetime] = None
    
    # Categorization
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: PyObjectId
    updated_by: Optional[PyObjectId] = None
    
    # Version control
    parent_flow_id: Optional[PyObjectId] = None  # For versioning
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(",") if tag.strip()]
        return v or []
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.total_executions == 0:
            return 0.0
        return (self.successful_executions / self.total_executions) * 100
    
    def add_action(self, action: FlowAction) -> None:
        """Add action to flow"""
        self.actions.append(action)
        
        # Set as start action if it's the first one
        if len(self.actions) == 1:
            self.start_action_id = action.id
        
        self.updated_at = datetime.utcnow()
    
    def get_action_by_id(self, action_id: str) -> Optional[FlowAction]:
        """Get action by ID"""
        for action in self.actions:
            if action.id == action_id:
                return action
        return None
