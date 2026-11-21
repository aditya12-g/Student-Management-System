# Student Management API

A REST API for managing students and their course fees, built with FastAPI, SQLAlchemy, and MySQL.

## Requirements

- Python 3.10 or newer
- MySQL 8 or compatible server

## Set up

From the project directory, create and activate a virtual environment in PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create the database in MySQL:

```sql
CREATE DATABASE student_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Set the connection string in the current PowerShell session, replacing the username and password with your MySQL credentials:

```powershell
$env:DATABASE_URL = "mysql+pymysql://root:your_password@localhost:3306/student_management"
```

Initialize the table and start the API:

```powershell
python -m app.init_db
uvicorn app.main:app --reload
```

The student management frontend runs at `http://127.0.0.1:8000`. Interactive API documentation is available at `/docs`; the health check is at `/health`.

For convenience, copy `.env.example` to `.env` and set your MySQL credentials there. The app loads this file automatically; environment variables already set in the shell take precedence.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/students` | Add a student |
| `GET` | `/students?offset=0&limit=100` | List students |
| `GET` | `/students/{student_id}` | Get one student |
| `PUT` | `/students/{student_id}` | Replace a student's details |
| `DELETE` | `/students/{student_id}` | Delete a student |

Create and update requests use this JSON shape:

```json
{
  "name": "Sam Student",
  "email": "sam@example.com",
  "course": "Computer Science",
  "fees": "1250.00"
}
```

Email addresses must be valid and unique. Fees must be nonnegative and have at most two decimal places. A duplicate email returns `409 Conflict`; invalid input returns `422 Unprocessable Entity`.

## Tests

Run the test suite with:

```powershell
python -m pytest
```

The tests use an in-memory SQLite database, so MySQL does not need to be running to test the API endpoints.