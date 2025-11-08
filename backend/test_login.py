#!/usr/bin/env python3
"""
Quick test script to verify login endpoint and database setup
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(username, password):
    """Test login endpoint"""
    url = f"{BASE_URL}/api/auth/login"
    data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"\nTesting login for: {username}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Login successful!")
            print(f"Username: {result.get('username')}")
            print(f"Is Admin: {result.get('is_admin')}")
            print(f"Token: {result.get('access_token')[:50]}...")
            return True
        else:
            print(f"Login failed: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"Cannot connect to {BASE_URL}")
        print("Make sure the server is running: python main.py")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Login Endpoints")
    
    # Test user login
    test_login("user1", "password1")
    
    # Test admin login
    test_login("admin1", "adminpassword1")
    
    # Test invalid credentials
    print("Testing invalid credentials...")
    test_login("user1", "wrongpassword")
    
    print("Test completed!")

