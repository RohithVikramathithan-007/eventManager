import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export enum EventCategory {
  CAT1 = 'Music Festivals',
  CAT2 = 'Comedy Shows',
  CAT3 = 'Movies',
  CAT4 = 'Food Festivals',
  CAT5 = 'Art Exhibitions',
  CAT6 = 'Sports Events',
  CAT7 = 'Tech Conferences',
  CAT8 = 'Other'
}

export interface TimeSlot {
  id: string;
  category: EventCategory;
  date: string;
  start_time: string;
  end_time: string;
  booked_by: string[];  // List of User IDs
  capacity: number;  // Maximum number of seats
}

export interface TimeSlotCreate {
  category: EventCategory;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;  // Maximum number of seats
}

export interface UserPreferences {
  user_id: string;
  categories: EventCategory[];
}

@Injectable({
  providedIn: 'root'
})
export class DataServiceService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // User Preferences
  getUserPreferences(userId: string): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiUrl}/users/${userId}/preferences`, {
      headers: this.getHeaders()
    });
  }

  updateUserPreferences(userId: string, categories: EventCategory[]): Observable<UserPreferences> {
    return this.http.put<UserPreferences>(`${this.apiUrl}/users/${userId}/preferences`, {
      user_id: userId,
      categories
    }, {
      headers: this.getHeaders()
    });
  }

  // Timeslots
  getTimeslots(startDate?: string, endDate?: string, category?: EventCategory): Observable<TimeSlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (category) params = params.set('category', category);

    return this.http.get<TimeSlot[]>(`${this.apiUrl}/timeslots`, { 
      params,
      headers: this.getHeaders()
    });
  }

  createTimeslot(timeslot: TimeSlotCreate): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.apiUrl}/timeslots`, timeslot, {
      headers: this.getHeaders()
    });
  }

  getTimeslot(timeslotId: string): Observable<TimeSlot> {
    return this.http.get<TimeSlot>(`${this.apiUrl}/timeslots/${timeslotId}`, {
      headers: this.getHeaders()
    });
  }

  bookTimeslot(timeslotId: string): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.apiUrl}/timeslots/${timeslotId}/book`, {}, {
      headers: this.getHeaders()
    });
  }

  unbookTimeslot(timeslotId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/timeslots/${timeslotId}/book`, {
      headers: this.getHeaders()
    });
  }

  // Admin
  getAllTimeslots(): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.apiUrl}/admin/timeslots`, {
      headers: this.getHeaders()
    });
  }

  deleteTimeslot(timeslotId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/timeslots/${timeslotId}`, {
      headers: this.getHeaders()
    });
  }
}
