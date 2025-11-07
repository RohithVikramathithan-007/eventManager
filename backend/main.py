from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, time, timedelta
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
    name: str  # Event name
    category: EventCategory
    date: str  # ISO format date string
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    booked_by: List[str] = []  # List of User IDs
    capacity: int = 1  # Maximum number of seats
    status: str = "active"  # "active", "cancelled", "rescheduled"
    original_date: Optional[str] = None  # Original date if rescheduled
    original_start_time: Optional[str] = None  # Original start time if rescheduled
    original_end_time: Optional[str] = None  # Original end time if rescheduled

class TimeSlotCreate(BaseModel):
    name: str  # Event name
    category: EventCategory
    date: str
    start_time: str
    end_time: str
    capacity: int = 1  # Maximum number of seats

class TimeSlotReschedule(BaseModel):
    date: str
    start_time: str
    end_time: str

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
    """Create a new timeslot (Admin only) - capacity is fixed to 1"""
    # Force capacity to 1
    capacity = 1
    
    new_timeslot = TimeSlot(
        id=str(uuid.uuid4()),
        name=timeslot.name,
        category=timeslot.category,
        date=timeslot.date,
        start_time=timeslot.start_time,
        end_time=timeslot.end_time,
        booked_by=[],
        capacity=capacity,  # Always 1
        status="active"
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
    """Book a timeslot - only one booking per user per event"""
    user_id = current_user["username"]
    for ts in timeslots:
        if ts.id == timeslot_id:
            # Check if event is cancelled
            if ts.status == "cancelled":
                raise HTTPException(status_code=400, detail="Cannot book cancelled events")
            
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

@app.post("/api/timeslots/{timeslot_id}/cancel")
def cancel_timeslot(timeslot_id: str, current_user: dict = Depends(get_current_admin)):
    """Cancel a timeslot (Admin only)"""
    for ts in timeslots:
        if ts.id == timeslot_id:
            ts.status = "cancelled"
            return {"message": "Timeslot cancelled successfully", "timeslot": ts}
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.post("/api/timeslots/{timeslot_id}/reschedule")
def reschedule_timeslot(timeslot_id: str, reschedule_data: TimeSlotReschedule, current_user: dict = Depends(get_current_admin)):
    """Reschedule a timeslot to a later date (Admin only)"""
    for ts in timeslots:
        if ts.id == timeslot_id:
            # Store original date/time if not already stored
            if not ts.original_date:
                ts.original_date = ts.date
                ts.original_start_time = ts.start_time
                ts.original_end_time = ts.end_time
            
            # Validate new date is in the future
            try:
                new_datetime = datetime.strptime(f"{reschedule_data.date} {reschedule_data.end_time}", "%Y-%m-%d %H:%M")
                if new_datetime < datetime.now():
                    raise HTTPException(status_code=400, detail="New date must be in the future")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date or time format")
            
            # Update to new date/time
            ts.date = reschedule_data.date
            ts.start_time = reschedule_data.start_time
            ts.end_time = reschedule_data.end_time
            ts.status = "rescheduled"
            
            return {"message": "Timeslot rescheduled successfully", "timeslot": ts}
    raise HTTPException(status_code=404, detail="Timeslot not found")

@app.post("/api/admin/create-sample-events")
def create_sample_events(current_user: dict = Depends(get_current_admin)):
    """Create sample events for the next 2 weeks (Admin only)"""
    import random
    
    today = datetime.now().date()
    categories = list(EventCategory)
    times_available = [
        ("09:00", "11:00"),
        ("10:00", "12:00"),
        ("14:00", "16:00"),
        ("15:00", "17:00"),
        ("18:00", "20:00"),
        ("19:00", "21:00")
    ]
    
    # Sample event names by category
    event_names = {
        EventCategory.CAT1: ["Summer Music Festival", "Jazz Night", "Rock Concert", "Classical Performance"],
        EventCategory.CAT2: ["Stand-up Comedy Show", "Improv Night", "Comedy Special", "Laugh Out Loud"],
        EventCategory.CAT3: ["Movie Premiere", "Film Screening", "Cinema Night", "Movie Marathon"],
        EventCategory.CAT4: ["Food & Wine Festival", "Taste of the City", "Culinary Experience", "Street Food Fair"],
        EventCategory.CAT5: ["Art Gallery Opening", "Modern Art Exhibition", "Photography Show", "Sculpture Display"],
        EventCategory.CAT6: ["Basketball Game", "Soccer Match", "Tennis Tournament", "Swimming Competition"],
        EventCategory.CAT7: ["Tech Conference", "AI Summit", "Developer Meetup", "Innovation Forum"],
        EventCategory.CAT8: ["Community Event", "Networking Mixer", "Workshop", "Special Event"]
    }
    
    created_count = 0
    for day_offset in range(14):  # Next 2 weeks
        event_date = today + timedelta(days=day_offset)
        date_str = event_date.strftime("%Y-%m-%d")
        
        # Create 2-4 events per day
        num_events = random.randint(2, 4)
        for _ in range(num_events):
            category = random.choice(categories)
            start_time, end_time = random.choice(times_available)
            capacity = 1  # Hard set to 1 seat per event
            # Get a random event name for this category
            name = random.choice(event_names.get(category, ["Event"]))
            
            new_timeslot = TimeSlot(
                id=str(uuid.uuid4()),
                name=name,
                category=category,
                date=date_str,
                start_time=start_time,
                end_time=end_time,
                booked_by=[],
                capacity=capacity,
                status="active"
            )
            timeslots.append(new_timeslot)
            created_count += 1
    
    return {"message": f"Created {created_count} sample events for the next 2 weeks", "count": created_count}

@app.get("/api/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get notifications for cancelled/rescheduled events that the user has booked"""
    user_id = current_user["username"]
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    
    # Get all timeslots where user has booked (including past events)
    # We check all events, not just future ones, in case past events were cancelled/rescheduled
    user_bookings = [ts for ts in timeslots if user_id in ts.booked_by]
    
    # Filter for events that are cancelled or rescheduled
    # Include both past and future events that were impacted
    # Check status case-insensitively
    cancelled_events = [ts for ts in user_bookings if ts.status and ts.status.lower() == "cancelled"]
    rescheduled_events = [ts for ts in user_bookings if ts.status and ts.status.lower() == "rescheduled"]
    
    # Debug logging
    print(f"DEBUG: User {user_id} has {len(user_bookings)} booked events")
    print(f"DEBUG: Found {len(cancelled_events)} cancelled events")
    print(f"DEBUG: Found {len(rescheduled_events)} rescheduled events")
    for ts in user_bookings:
        print(f"DEBUG: Event {ts.id} - Status: {ts.status}, Booked by: {ts.booked_by}")
    
    # For rescheduled events, show all rescheduled events (not just future ones)
    # Users should be notified if an event they booked was rescheduled, regardless of new date
    future_rescheduled = rescheduled_events
    
    cancelled_count = len(cancelled_events)
    rescheduled_count = len(future_rescheduled)
    
    notifications = []
    if cancelled_count > 0:
        # Show details of cancelled events
        cancelled_details = []
        for ts in cancelled_events[:3]:  # Show up to 3 cancelled events
            # Get category display name (enum value)
            category_name = ts.category.value if isinstance(ts.category, EventCategory) else str(ts.category)
            event_name = getattr(ts, 'name', 'Event')
            cancelled_details.append(f"'{event_name}' ({category_name}) on {ts.date}")
        detail_text = f": {', '.join(cancelled_details)}" if cancelled_details else ""
        if cancelled_count > 3:
            detail_text += f" and {cancelled_count - 3} more"
        
        notifications.append({
            "type": "cancelled",
            "count": cancelled_count,
            "message": f"You have {cancelled_count} cancelled event(s){detail_text}"
        })
    
    if rescheduled_count > 0:
        # Show details of rescheduled events
        rescheduled_details = []
        for ts in future_rescheduled[:3]:  # Show up to 3 rescheduled events
            # Get category display name (enum value)
            category_name = ts.category.value if isinstance(ts.category, EventCategory) else str(ts.category)
            event_name = getattr(ts, 'name', 'Event')
            original_info = ""
            if ts.original_date:
                original_info = f" (was {ts.original_date})"
            rescheduled_details.append(f"'{event_name}' ({category_name}) on {ts.date}{original_info}")
        detail_text = f": {', '.join(rescheduled_details)}" if rescheduled_details else ""
        if rescheduled_count > 3:
            detail_text += f" and {rescheduled_count - 3} more"
        
        notifications.append({
            "type": "rescheduled",
            "count": rescheduled_count,
            "message": f"You have {rescheduled_count} rescheduled event(s){detail_text}"
        })
    
    return {
        "notifications": notifications,
        "total": cancelled_count + rescheduled_count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


