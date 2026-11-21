from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    course: str = Field(min_length=1, max_length=120)
    fees: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class StudentCreate(StudentFields):
    pass


class StudentUpdate(StudentFields):
    pass


class StudentRead(StudentFields):
    model_config = ConfigDict(from_attributes=True)

    id: int