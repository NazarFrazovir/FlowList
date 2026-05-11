from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.sсhemas import SubTaskCreate, SubTaskResponse
from backend.routers.tasks import get_current_user
from typing import List

router = APIRouter(prefix="/tasks/{task_id}/subtasks", tags=["subtasks"])

@router.get("/", response_model=List[SubTaskResponse])
def get_subtasks(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner_id == current_user.id).first()
    if not task: raise HTTPException(404, "Задачу не знайдено")
    return task.subtasks

@router.post("/", response_model=SubTaskResponse)
def create_subtask(task_id: int, subtask: SubTaskCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner_id == current_user.id).first()
    if not task: raise HTTPException(404, "Задачу не знайдено")
    new = models.SubTask(title=subtask.title, task_id=task_id)
    db.add(new); db.commit(); db.refresh(new)
    return new

@router.put("/{sub_id}", response_model=SubTaskResponse)
def toggle_subtask(task_id: int, sub_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    sub = db.query(models.SubTask).filter(models.SubTask.id == sub_id, models.SubTask.task_id == task_id).first()
    if not sub: raise HTTPException(404, "Підзадачу не знайдено")
    sub.completed = not sub.completed
    db.commit(); db.refresh(sub)
    return sub

@router.delete("/{sub_id}")
def delete_subtask(task_id: int, sub_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    sub = db.query(models.SubTask).filter(models.SubTask.id == sub_id, models.SubTask.task_id == task_id).first()
    if not sub: raise HTTPException(404)
    db.delete(sub); db.commit()
    return {"ok": True}