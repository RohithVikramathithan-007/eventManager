# Event Manager Backend

FastAPI backend for the Event Manager application with SQLite database and JWT authentication.

## Setup

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Initialize the database:**
```bash
python init_db.py
```

   This creates `event_manager.db` with default users:
   - **User**: `user1` / `password1`
   - **Admin**: `admin1` / `adminpassword1`

   **Note:** The database will also auto-initialize when you first run `main.py`, but running `init_db.py` explicitly is recommended.

## Running

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation is available at `http://localhost:8000/docs`

## Authentication

All API endpoints (except `/api/auth/login`) require authentication via JWT Bearer token.

### Login Endpoint
- **POST** `/api/auth/login`
- Body: `{ "username": "user1", "password": "password1" }`
- Returns: JWT access token

### Get Current User
- **GET** `/api/auth/me`
- Requires: Bearer token in Authorization header
- Returns: Current user information

## Database

The application uses SQLite database with the following tables:
- `users` - User accounts with hashed passwords
- `timeslots` - Event timeslots
- `bookings` - User bookings (for future use)
- `user_preferences` - User category preferences (for future use)

Passwords are hashed using bcrypt for security.


