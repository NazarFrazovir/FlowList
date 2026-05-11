from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.sсhemas import TaskCreate, TaskUpdate, TaskResponse
from backend.auth import decode_token
from fastapi.security import OAuth2PasswordBearer
from typing import List
import jwt
from pydantic import BaseModel
from typing import List as PyList

router = APIRouter(prefix="/tasks", tags=["tasks"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Отримати поточного користувача з токена
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Невалідний токен")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Токен прострочений")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Невалідний токен")

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return user

# Отримати всі задачі поточного користувача
@router.get("/", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(models.Task).filter(models.Task.owner_id == current_user.id).all()

# Створити задачу
@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    new_task = models.Task(**task.dict(), owner_id=current_user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

# Оновити задачу
@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == current_user.id
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")

    for key, value in task.dict(exclude_unset=True).items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)
    return db_task

# Видалити задачу
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == current_user.id
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")

    db.delete(db_task)
    db.commit()
    return {"message": "Задачу видалено"}


class OrderUpdate(BaseModel):
    ids: PyList[int]


@router.put("/reorder")
def reorder_tasks(data: OrderUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    for i, task_id in enumerate(data.ids):
        db_task = db.query(models.Task).filter(
            models.Task.id == task_id,
            models.Task.owner_id == current_user.id
        ).first()
        if db_task:
            db_task.order = i
    db.commit()
    return {"ok": True}