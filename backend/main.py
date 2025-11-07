from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, time
from enum import Enum
import uuid
from database import get_db_connection, verify_password, init_db
from auth import create_access_token, get_current_user, get_current_admin

# Ensure database is initialized (with error handling)
try:
    init_db()
    print("✓ Database initialized successfully")
except Exception as e:
    print(f"⚠ Warning: Database initialization error: {e}")
    print("  Please run 'python init_db.py' to initialize the database")

app = FastAPI(title="Event Manager API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class EventCategory(str, Enum):
    CAT1 = "Music Festivals"
    CAT2 = "Comedy Shows"
    CAT3 = "Movies"
    CAT4 = "Food Festivals"
    CAT5 = "Art Exhibitions"
    CAT6 = "Sports Events"
    CAT7 = "Tech Conferences"
    CAT8 = "Other"

# Models
class TimeSlot(BaseModel):
    id: str
    category: EventCategory
    date: str  # ISO format date string
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    booked_by: List[str] = []  # List of User IDs
    capacity: int = 1  # Maximum number of seats

class TimeSlotCreate(BaseModel):
    category: EventCategory
    date: str
    start_time: str
    end_time: str
    capacity: int = 1  # Maximum number of seats

class TimeSlotBook(BaseModel):
    user_id: str

class UserPreferences(BaseModel):
    user_id: str
    categories: List[EventCategory]

class LoginRequest(BaseModel):
    username: str
    password: str

# In-memory storage (in production, use a database)
timeslots: List[TimeSlot] = []
user_preferences: dict[str, List[EventCategory]] = {}

@app.get("/")
def read_root():
    return {"message": "Event Manager API"}

# Authentication endpoints
@app.post("/api/auth/login")
def login(login_data: LoginRequest):
    """Login endpoint for both users and admins"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get user from database
    cursor.execute("SELECT username, password_hash, is_admin FROM users WHERE username = ?", (login_data.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["username"], "is_admin": bool(user["is_admin"])}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "is_admin": bool(user["is_admin"])
    }

@app.get("/api/auth/me")
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "username": current_user["username"],
        "is_admin": current_user["is_admin"]
    }

# User Preferences endpoints
@app.get("/api/users/{user_id}/preferences")
def get_user_preferences(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user preferences"""
    # Users can only access their own preferences
    if current_user["username"] != user_id and not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's preferences")
    
    if user_id not in user_preferences:
        return {"user_id": user_id, "categories": []}
    return {"user_id": user_id, "categories": user_preferences[user_id]}

@app.put("/api/users/{user_id}/preferences")
def update_user_preferences(user_id: str, preferences: UserPreferences, current_user: dict = Depends(get_current_user)):
    """Update user preferences"""
    # Users can only update their own preferences
    if current_user["username"] != user_id and not current_user["is_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this user's preferences")
    
    user_preferences[user_id] = preferences.categories
    return {"user_id": user_id, "categories": user_preferences[user_id]}

# Timeslot endpoints
@app.get("/api/timeslots")
def get_timeslots(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[EventCategory] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get timeslots with optional filters"""
    user_id = current_user["username"]
    filtered = timeslots.copy()
    
    if start_date:
        filtered = [ts for ts in filtered if ts.date >= start_date]
    if end_date:
        filtered = [ts for ts in filtered if ts.date <= end_date]
    if category:
        filtered = [ts for ts in filtered if ts.category == category]
    
    # If user has preferences, only show timeslots for user's preferred categories
    if user_id in user_preferences:
        user_cats = user_preferences[user_id]
        filtered = [ts for ts in filtered if ts.category in user_cats]
    
    return filtered

@app.post("/api/timeslots")
def create_timeslot(timeslot: TimeSlotCreate, current_user: dict = Depends(get_current_admin)):
    """Create a new timeslot (Admin only)"""
    if timeslot.capacity < 1:
        raise HTTPException(status_code=400, detail="Capacity must be at least 1")
    
    new_timeslot = TimeSlot(
        id=str(uuid.uuid4()),
        category=timeslot.category,
        date=timeslot.date,
        start_time=timeslot.start_time,
        end_time=timeslot.end_time,
        booked_by=[],
        capacity=timeslot.capacity
    )
    timeslots.append(new_timeslot)
    return new_timeslot

@app.get("/api/timeslots/{timeslot_id}")
def get_timeslot(timeslot_id: str):
    """Get a specific timeslot"""
    for ts in timeslots:
        if ts.id == timeslot_id:
            return ts
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.post("/api/timeslots/{timeslot_id}/book")
def book_timeslot(timeslot_id: str, current_user: dict = Depends(get_current_user)):
    """Book a timeslot"""
    user_id = current_user["username"]
    for ts in timeslots:
        if ts.id == timeslot_id:
            # Check if event has ended
            try:
                event_datetime = datetime.strptime(f"{ts.date} {ts.end_time}", "%Y-%m-%d %H:%M")
                if event_datetime < datetime.now():
                    raise HTTPException(status_code=400, detail="Cannot book events that have already ended")
            except ValueError:
                # If date parsing fails, allow booking (shouldn't happen with valid data)
                pass
            
            # Check if user already booked
            if user_id in ts.booked_by:
                raise HTTPException(status_code=400, detail="You have already booked this timeslot")
            
            # Check if capacity is full
            if len(ts.booked_by) >= ts.capacity:
                raise HTTPException(status_code=400, detail="Timeslot is full")
            
            ts.booked_by.append(user_id)
            return ts
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.delete("/api/timeslots/{timeslot_id}/book")
def unbook_timeslot(timeslot_id: str, current_user: dict = Depends(get_current_user)):
    """Unbook a timeslot"""
    user_id = current_user["username"]
    for ts in timeslots:
        if ts.id == timeslot_id:
            if user_id not in ts.booked_by:
                raise HTTPException(status_code=403, detail="You have not booked this timeslot")
            ts.booked_by.remove(user_id)
            return {"message": "Timeslot unbooked successfully"}
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.get("/api/admin/timeslots")
def get_all_timeslots_admin(current_user: dict = Depends(get_current_admin)):
    """Get all timeslots for admin view"""
    return timeslots

@app.delete("/api/timeslots/{timeslot_id}")
def delete_timeslot(timeslot_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete a timeslot (Admin only)"""
    global timeslots
    timeslots = [ts for ts in timeslots if ts.id != timeslot_id]
    return {"message": "Timeslot deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


