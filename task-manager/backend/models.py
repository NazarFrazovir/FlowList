from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base  # ← змінили
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    tasks = relationship("Task", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    priority = Column(String, default="medium")  # ← новe
    deadline = Column(DateTime, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="tasks")
    order = Column(Integer, default=0)
    subtasks = relationship("SubTask", back_populates="task", cascade="all, delete")

class SubTask(Base):
    __tablename__ = "subtasks"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String)
    completed  = Column(Boolean, default=False)
    task_id    = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"))
    task       = relationship("Task", back_populates="subtasks")
