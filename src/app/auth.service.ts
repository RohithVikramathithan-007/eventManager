import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  is_admin: boolean;
}

export interface UserInfo {
  username: string;
  is_admin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if token is still valid on service initialization
    const token = this.getToken();
    if (token) {
      this.verifyToken();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        this.setToken(response.access_token);
        this.setUser({ username: response.username, is_admin: response.is_admin });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private setUser(user: UserInfo): void {
    localStorage.setItem('user_info', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): UserInfo | null {
    const userStr = localStorage.getItem('user_info');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.is_admin || false;
  }

  verifyToken(): void {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return;
    }

    this.http.get<UserInfo>(`${this.apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (user) => {
        this.setUser(user);
      },
      error: () => {
        this.logout();
      }
    });
  }
}

