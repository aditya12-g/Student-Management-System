from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.schemas import StudentCreate, StudentRead, StudentUpdate


app = FastAPI(title="Student Management API", version="1.0.0")
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/assets", StaticFiles(directory=STATIC_DIR), name="assets")


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/students", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(student_data: StudentCreate, db: Session = Depends(get_db)) -> Student:
    student = Student(**student_data.model_dump())
    db.add(student)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this email already exists",
        ) from error
    db.refresh(student)
    return student


@app.get("/students", response_model=list[StudentRead])
def list_students(
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[Student]:
    if offset < 0 or not 1 <= limit <= 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid pagination values")
    return list(db.scalars(select(Student).order_by(Student.id).offset(offset).limit(limit)))


@app.get("/students/{student_id}", response_model=StudentRead)
def get_student(student_id: int, db: Session = Depends(get_db)) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@app.put("/students/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    for field, value in student_data.model_dump().items():
        setattr(student, field, value)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this email already exists",
        ) from error
    db.refresh(student)
    return student


@app.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)) -> Response:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    db.delete(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)