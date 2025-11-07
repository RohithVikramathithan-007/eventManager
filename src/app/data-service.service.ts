import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  constructor(private http: HttpClient) { }

  // User Preferences
  getUserPreferences(userId: string): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiUrl}/users/${userId}/preferences`);
  }

  updateUserPreferences(userId: string, categories: EventCategory[]): Observable<UserPreferences> {
    return this.http.put<UserPreferences>(`${this.apiUrl}/users/${userId}/preferences`, {
      user_id: userId,
      categories
    });
  }

  // Timeslots
  getTimeslots(startDate?: string, endDate?: string, category?: EventCategory, userId?: string): Observable<TimeSlot[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (category) params = params.set('category', category);
    if (userId) params = params.set('user_id', userId);

    return this.http.get<TimeSlot[]>(`${this.apiUrl}/timeslots`, { params });
  }

  createTimeslot(timeslot: TimeSlotCreate): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.apiUrl}/timeslots`, timeslot);
  }

  getTimeslot(timeslotId: string): Observable<TimeSlot> {
    return this.http.get<TimeSlot>(`${this.apiUrl}/timeslots/${timeslotId}`);
  }

  bookTimeslot(timeslotId: string, userId: string): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.apiUrl}/timeslots/${timeslotId}/book`, {
      user_id: userId
    });
  }

  unbookTimeslot(timeslotId: string, userId: string): Observable<any> {
    const params = new HttpParams().set('user_id', userId);
    return this.http.delete(`${this.apiUrl}/timeslots/${timeslotId}/book`, { params });
  }

  // Admin
  getAllTimeslots(): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.apiUrl}/admin/timeslots`);
  }

  deleteTimeslot(timeslotId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/timeslots/${timeslotId}`);
  }
}
