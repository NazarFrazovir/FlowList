from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- User ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    class Config:
        from_attributes = True

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Task ---
class TaskCreate(BaseModel):
    title:       str
    description: Optional[str] = None
    priority:    Optional[str] = "medium"
    deadline:    Optional[datetime] = None
    order: Optional[int] = None

class TaskUpdate(BaseModel):
    title:       Optional[str] = None
    description: Optional[str] = None
    completed:   Optional[bool] = None
    priority:    Optional[str] = None
    deadline:    Optional[datetime] = None
    order: Optional[int] = None

class SubTaskCreate(BaseModel):
    title: str

class SubTaskResponse(BaseModel):
    id:        int
    title:     str
    completed: bool
    task_id:   int
    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id:          int
    title:       str
    description: Optional[str]
    completed:   bool
    created_at:  datetime
    priority:    str
    deadline:    Optional[datetime]
    owner_id:    int
    order: Optional[int]
    subtasks: List[SubTaskResponse] = []

    class Config:
        from_attributes = True




