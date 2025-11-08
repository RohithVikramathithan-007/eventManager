# Event Manager Application

A full-stack web application for booking events from pre-defined calendar slots. Built with Angular 15 and Angular Material for the frontend, and FastAPI for the backend.

## Features

### User Features
- **User Preferences**: Select event categories of interest
- **Calendar View**: 
  - Weekly calendar view with time slots
  - Navigate between weeks
  - Filter by event category
  - Sign up for available time slots
  - Unsubscribe from booked time slots
  - Visual indicators for booked/available slots

### Admin Features
- **Timeslot Management**: 
  - Create new time slots for event categories
  - View all time slots
  - See booking status for each time slot
  - Delete time slots


## Project Structure

```
eventManagerFrontend/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main application file
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── src/
│   ├── app/
│   │   ├── admin/          # Admin component
│   │   ├── calendar/       # Calendar component
│   │   ├── user-preferences/ # User preferences component
│   │   ├── data-service.service.ts # API service
│   │   └── app.module.ts   # Main module
│   └── styles.css          # Global styles
├── package.json            # Node dependencies
└── README.md              # This file
```

## Prerequisites

- **Node.js** (v16 or higher) and npm
- **Python** (v3.8 or higher) and pip
- **Angular CLI** (v15.2.8)

## Installation and Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```
3. Initialise DB:
```bash
   python init_db.py
   ```

4. Run the backend server:

Using uvicorn directly:
```bash
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

API documentation (Swagger UI) is available at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the project root directory:
```bash
cd eventManagerFrontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Angular Material (if not already installed):
```bash
ng add @angular/material
```

4. Start the development server:
```bash
ng serve
```

The frontend application will be available at `http://localhost:4200`

## Running the Application

1. **Start the Backend**:
   - Open a terminal
   - Navigate to the `backend` directory
   - Run `uvicorn main:app --reload`

2. **Start the Frontend**:
   - Open another terminal
   - Navigate to the project root directory
   - Run `ng serve`

3. **Access the Application**:
   - Open your browser and navigate to `http://localhost:4200`

## Usage Guide

### For Users

1. **Set Preferences**:
   - Navigate to "Preferences" from the top navigation
   - Select the event categories you're interested in
   - Click "Save Preferences"

2. **View Calendar**:
   - Navigate to "Calendar" from the top navigation
   - Use the arrow buttons to navigate between weeks
   - Use the category filter to show only specific categories
   - View available time slots for each day

3. **Book a Time Slot**:
   - Find an available time slot (shown in gray)
   - Click the "Book" button
   - The slot will be marked as booked (green if booked by you)

4. **Unbook a Time Slot**:
   - Find a time slot you've booked (shown in green)
   - Click the "Unbook" button
   - The slot will become available again

### For Admins

1. **Create Time Slots**:
   - Navigate to "Admin" from the top navigation
   - Click "Create New Timeslot"
   - Fill in the form:
     - Select event category
     - Choose date
     - Set start time (HH:MM format)
     - Set end time (HH:MM format)
   - Click "Create Timeslot"

2. **View All Time Slots**:
   - All time slots are displayed in a table
   - See booking status for each slot
   - Booked slots show the user ID who booked it

3. **Delete Time Slots**:
   - Click the delete icon next to any time slot
   - Confirm the deletion

## API Endpoints

### User Preferences
- `GET /api/users/{user_id}/preferences` - Get user preferences
- `PUT /api/users/{user_id}/preferences` - Update user preferences

### Time Slots
- `GET /api/timeslots` - Get time slots (with optional filters: start_date, end_date, category, user_id)
- `POST /api/timeslots` - Create a new time slot (Admin)
- `GET /api/timeslots/{timeslot_id}` - Get a specific time slot
- `POST /api/timeslots/{timeslot_id}/book` - Book a time slot
- `DELETE /api/timeslots/{timeslot_id}/book` - Unbook a time slot

### Admin
- `GET /api/admin/timeslots` - Get all time slots (Admin)
- `DELETE /api/timeslots/{timeslot_id}` - Delete a time slot (Admin)

## Troubleshooting

### Backend Issues

- **Port 8000 already in use**: Change the port in `main.py` or use `uvicorn main:app --port 8001`
- **CORS errors**: Ensure the frontend URL is in the `allow_origins` list in `main.py`

### Frontend Issues

- **Module not found errors**: Run `npm install` again
- **Angular Material not working**: Ensure you've run `ng add @angular/material`
- **API connection errors**: Ensure the backend is running on `http://localhost:8000`

## Support

For issues or questions, please refer to the API documentation at `http://localhost:8000/docs` when the backend is running.
