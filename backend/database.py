import sqlite3
import os
from passlib.context import CryptContext
from datetime import datetime

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database file path - store in backend directory
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "event_manager.db")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Create timeslots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timeslots (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Create bookings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timeslot_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            booked_at TEXT NOT NULL,
            FOREIGN KEY (timeslot_id) REFERENCES timeslots(id),
            FOREIGN KEY (user_id) REFERENCES users(username)
        )
    ''')
    
    # Create user_preferences table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(username)
        )
    ''')
    
    conn.commit()
    
    # Create default users if they don't exist
    create_default_users(cursor, conn)
    
    conn.close()

def create_default_users(cursor, conn):
    """Create default users with hashed passwords"""
    # Check if users already exist
    cursor.execute("SELECT COUNT(*) FROM users WHERE username IN ('user1', 'admin1')")
    count = cursor.fetchone()[0]
    
    if count == 0:
        # Create normal user: user1/password1
        user1_password_hash = pwd_context.hash("password1")
        cursor.execute('''
            INSERT INTO users (username, password_hash, is_admin, created_at)
            VALUES (?, ?, ?, ?)
        ''', ("user1", user1_password_hash, 0, datetime.now().isoformat()))
        
        # Create admin user: admin1/adminpassword1
        admin1_password_hash = pwd_context.hash("adminpassword1")
        cursor.execute('''
            INSERT INTO users (username, password_hash, is_admin, created_at)
            VALUES (?, ?, ?, ?)
        ''', ("admin1", admin1_password_hash, 1, datetime.now().isoformat()))
        
        conn.commit()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

# Initialize database on import (with error handling)
try:
    init_db()
except Exception as e:
    print(f"Warning: Database initialization failed: {e}")
    print("You may need to run 'python init_db.py' manually")

