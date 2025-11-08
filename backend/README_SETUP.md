# Database Setup Instructions

## Quick Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize the database:**
   ```bash
   python init_db.py
   ```
   
   This will create `event_manager.db` with default users:
   - **User**: `user1` / `password1`
   - **Admin**: `admin1` / `adminpassword1`

3. **Start the server:**
   ```bash
   python main.py
   ```

## Alternative: Auto-initialization

The database will also be automatically initialized when you first run `main.py` if it doesn't exist. However, running `init_db.py` explicitly is recommended for a clean setup.

## Database File

The database file `event_manager.db` is ready to use in the `backend/` directory. 

## Troubleshooting

If you get a 404 error on login:
1. Make sure the database exists: `ls backend/event_manager.db`
2. If it doesn't exist, run: `python init_db.py`
3. Restart the server: `python main.py`

