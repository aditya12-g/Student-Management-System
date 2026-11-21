from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def student_payload(email: str = "sam@example.com") -> dict[str, object]:
    return {"name": "Sam Student", "email": email, "course": "Computer Science", "fees": "1250.00"}


def test_frontend_and_assets_are_served(client: TestClient) -> None:
    page = client.get("/")
    assert page.status_code == 200
    assert "Student directory" in page.text
    assert client.get("/assets/styles.css").status_code == 200
    assert client.get("/assets/app.js").status_code == 200


def test_student_crud(client: TestClient) -> None:
    created = client.post("/students", json=student_payload())
    assert created.status_code == 201
    student = created.json()
    assert student["email"] == "sam@example.com"
    assert student["fees"] == "1250.00"

    student_id = student["id"]
    assert client.get(f"/students/{student_id}").status_code == 200
    assert len(client.get("/students").json()) == 1

    updated_payload = student_payload("sam.updated@example.com")
    updated_payload["course"] = "Data Science"
    updated = client.put(f"/students/{student_id}", json=updated_payload)
    assert updated.status_code == 200
    assert updated.json()["course"] == "Data Science"

    assert client.delete(f"/students/{student_id}").status_code == 204
    assert client.get(f"/students/{student_id}").status_code == 404


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    assert client.post("/students", json=student_payload()).status_code == 201
    duplicate = client.post("/students", json=student_payload())
    assert duplicate.status_code == 409


def test_invalid_email_and_negative_fees_are_rejected(client: TestClient) -> None:
    invalid_email = student_payload("not-an-email")
    negative_fees = {**student_payload("fees@example.com"), "fees": "-1.00"}
    assert client.post("/students", json=invalid_email).status_code == 422
    assert client.post("/students", json=negative_fees).status_code == 422