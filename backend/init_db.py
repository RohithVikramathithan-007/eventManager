#!/usr/bin/env python3
"""
Database initialization script.
Run this script to create the database with default users.
This can be committed to git so users can have a pre-populated database.
"""
import os
import sys
import sqlite3
from passlib.context import CryptContext
from datetime import datetime

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database file path
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "event_manager.db")

def init_database():
    """Initialize database with tables and default users"""
    print("Initializing database...")
    
    # Remove existing database if it exists (optional)
    if os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} already exists.")
        response = input("Do you want to recreate it? (y/n): ")
        if response.lower() != 'y':
            print("Keeping existing database.")
            return
        os.remove(DB_FILE)
        print("Removed existing database.")
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create users table
    print("Creating users table...")
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
    print("Creating timeslots table...")
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
    print("Creating bookings table...")
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
    print("Creating user_preferences table...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(username)
        )
    ''')
    
    conn.commit()
    
    # Create default users
    print("Creating default users...")
    
    # Create normal user: user1/password1
    user1_password_hash = pwd_context.hash("password1")
    cursor.execute('''
        INSERT INTO users (username, password_hash, is_admin, created_at)
        VALUES (?, ?, ?, ?)
    ''', ("user1", user1_password_hash, 0, datetime.now().isoformat()))
    print("  - Created user: user1 / password1")
    
    # Create admin user: admin1/adminpassword1
    admin1_password_hash = pwd_context.hash("adminpassword1")
    cursor.execute('''
        INSERT INTO users (username, password_hash, is_admin, created_at)
        VALUES (?, ?, ?, ?)
    ''', ("admin1", admin1_password_hash, 1, datetime.now().isoformat()))
    print("  - Created admin: admin1 / adminpassword1")
    
    conn.commit()
    conn.close()
    
    print(f"\nDatabase initialized successfully at: {DB_FILE}")
    print("\nDefault credentials:")
    print("  User:  user1 / password1")
    print("  Admin: admin1 / adminpassword1")

if __name__ == "__main__":
    try:
        init_database()
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)

