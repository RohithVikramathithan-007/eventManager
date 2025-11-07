from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, time
from enum import Enum
import uuid

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
    booked_by: Optional[str] = None  # User ID

class TimeSlotCreate(BaseModel):
    category: EventCategory
    date: str
    start_time: str
    end_time: str

class TimeSlotBook(BaseModel):
    user_id: str

class UserPreferences(BaseModel):
    user_id: str
    categories: List[EventCategory]

# In-memory storage (in production, use a database)
timeslots: List[TimeSlot] = []
user_preferences: dict[str, List[EventCategory]] = {}

@app.get("/")
def read_root():
    return {"message": "Event Manager API"}

# User Preferences endpoints
@app.get("/api/users/{user_id}/preferences")
def get_user_preferences(user_id: str):
    """Get user preferences"""
    if user_id not in user_preferences:
        return {"user_id": user_id, "categories": []}
    return {"user_id": user_id, "categories": user_preferences[user_id]}

@app.put("/api/users/{user_id}/preferences")
def update_user_preferences(user_id: str, preferences: UserPreferences):
    """Update user preferences"""
    user_preferences[user_id] = preferences.categories
    return {"user_id": user_id, "categories": user_preferences[user_id]}

# Timeslot endpoints
@app.get("/api/timeslots")
def get_timeslots(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[EventCategory] = None,
    user_id: Optional[str] = None
):
    """Get timeslots with optional filters"""
    filtered = timeslots.copy()
    
    if start_date:
        filtered = [ts for ts in filtered if ts.date >= start_date]
    if end_date:
        filtered = [ts for ts in filtered if ts.date <= end_date]
    if category:
        filtered = [ts for ts in filtered if ts.category == category]
    
    # If user_id provided, only show timeslots for user's preferred categories
    if user_id and user_id in user_preferences:
        user_cats = user_preferences[user_id]
        filtered = [ts for ts in filtered if ts.category in user_cats]
    
    return filtered

@app.post("/api/timeslots")
def create_timeslot(timeslot: TimeSlotCreate):
    """Create a new timeslot (Admin only)"""
    new_timeslot = TimeSlot(
        id=str(uuid.uuid4()),
        category=timeslot.category,
        date=timeslot.date,
        start_time=timeslot.start_time,
        end_time=timeslot.end_time,
        booked_by=None
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
def book_timeslot(timeslot_id: str, booking: TimeSlotBook):
    """Book a timeslot"""
    for ts in timeslots:
        if ts.id == timeslot_id:
            if ts.booked_by is not None:
                raise HTTPException(status_code=400, detail="Timeslot already booked")
            ts.booked_by = booking.user_id
            return ts
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.delete("/api/timeslots/{timeslot_id}/book")
def unbook_timeslot(timeslot_id: str, user_id: str):
    """Unbook a timeslot"""
    for ts in timeslots:
        if ts.id == timeslot_id:
            if ts.booked_by != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to unbook this timeslot")
            ts.booked_by = None
            return {"message": "Timeslot unbooked successfully"}
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.get("/api/admin/timeslots")
def get_all_timeslots_admin():
    """Get all timeslots for admin view"""
    return timeslots

@app.delete("/api/timeslots/{timeslot_id}")
def delete_timeslot(timeslot_id: str):
    """Delete a timeslot (Admin only)"""
    global timeslots
    timeslots = [ts for ts in timeslots if ts.id != timeslot_id]
    return {"message": "Timeslot deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


