import { Component, OnInit } from '@angular/core';
import { DataServiceService, EventCategory, TimeSlot } from '../data-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';

interface CalendarDay {
  date: Date;
  dateStr: string;
  timeslots: TimeSlot[];
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  userId: string = '';
  currentWeekStart: Date = new Date();
  weekDays: CalendarDay[] = [];
  allTimeslots: TimeSlot[] = [];
  selectedCategory: EventCategory | null = null;
  categories: EventCategory[] = Object.values(EventCategory);
  userPreferences: EventCategory[] = [];

  constructor(
    public dataService: DataServiceService,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {
    this.initializeWeek();
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userId = user.username;
    } else {
      // If no user, verify token
      this.authService.verifyToken();
    }
    this.loadUserPreferences();
    this.loadTimeslots();
  }

  initializeWeek(): void {
    // Set to start of week (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    this.currentWeekStart = new Date(today.setDate(diff));
    this.currentWeekStart.setHours(0, 0, 0, 0);
    this.updateWeekDays();
  }

  updateWeekDays(): void {
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = this.formatDate(date);
      this.weekDays.push({
        date: date,
        dateStr: dateStr,
        timeslots: []
      });
    }
    this.assignTimeslotsToDays();
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatTime(timeStr: string): string {
    return timeStr;
  }

  loadUserPreferences(): void {
    this.dataService.getUserPreferences(this.userId).subscribe({
      next: (prefs) => {
        this.userPreferences = prefs.categories || [];
        this.loadTimeslots();
      },
      error: (err) => {
        console.error('Error loading preferences:', err);
      }
    });
  }

  loadTimeslots(): void {
    const startDate = this.formatDate(this.currentWeekStart);
    const endDate = new Date(this.currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = this.formatDate(endDate);

    this.dataService.getTimeslots(startDate, endDateStr, this.selectedCategory || undefined).subscribe({
      next: (timeslots) => {
        this.allTimeslots = timeslots;
        this.assignTimeslotsToDays();
      },
      error: (err) => {
        console.error('Error loading timeslots:', err);
        if (err.status === 401 || err.status === 403) {
          this.snackBar.open('Authentication required. Please login again.', 'Close', { duration: 3000 });
          // Redirect to login if not authenticated
          if (!this.authService.isAuthenticated()) {
            // This will be handled by the auth guard
          }
        } else {
          this.snackBar.open('Error loading timeslots', 'Close', { duration: 3000 });
        }
      }
    });
  }

  assignTimeslotsToDays(): void {
    this.weekDays.forEach(day => {
      day.timeslots = this.allTimeslots.filter(ts => ts.date === day.dateStr);
      // Sort by start time
      day.timeslots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.updateWeekDays();
    this.loadTimeslots();
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.updateWeekDays();
    this.loadTimeslots();
  }

  goToCurrentWeek(): void {
    this.initializeWeek();
    this.loadTimeslots();
  }

  getWeekRange(): string {
    const endDate = new Date(this.currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    return `${this.formatDisplayDate(this.currentWeekStart)} - ${this.formatDisplayDate(endDate)}`;
  }

  formatDisplayDate(date: Date | string): string {
    if (typeof date === 'string') {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onCategoryFilterChange(): void {
    this.loadTimeslots();
  }

  clearFilter(): void {
    this.selectedCategory = null;
    this.loadTimeslots();
  }

  canBook(timeslot: TimeSlot): boolean {
    // Check if event is cancelled
    if (this.isCancelled(timeslot)) {
      return false;
    }
    
    // Check if event has ended
    if (this.isEventEnded(timeslot)) {
      return false; // Event has ended
    }
    
    // Check if user already booked (only one signup per event per user)
    if (this.isBookedByUser(timeslot)) {
      return false;
    }
    
    // Check if there are available seats
    const availableSeats = timeslot.capacity - timeslot.booked_by.length;
    return availableSeats > 0;
  }

  isBookedByUser(timeslot: TimeSlot): boolean {
    return timeslot.booked_by.includes(this.userId);
  }

  getAvailableSeats(timeslot: TimeSlot): number {
    return timeslot.capacity - timeslot.booked_by.length;
  }

  isEventEnded(timeslot: TimeSlot): boolean {
    try {
      // Parse date components (format: YYYY-MM-DD)
      const dateParts = timeslot.date.split('-');
      if (dateParts.length !== 3) {
        console.warn('Invalid date format:', timeslot.date);
        return false; // Don't mark as ended if we can't parse
      }
      
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const day = parseInt(dateParts[2], 10);
      
      // Parse time components (format: HH:MM)
      const timeParts = timeslot.end_time.split(':');
      if (timeParts.length < 2) {
        console.warn('Invalid time format:', timeslot.end_time);
        return false; // Don't mark as ended if we can't parse
      }
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid date/time values:', { year, month, day, hours, minutes });
        return false;
      }
      
      // Create date object in local timezone
      const eventEndDate = new Date(year, month - 1, day, hours, minutes || 0, 0, 0);
      const now = new Date();
      
      // Debug logging - check browser console to see what's happening
      console.log('Event end check:', {
        date: timeslot.date,
        time: timeslot.end_time,
        eventEndDate: eventEndDate.toString(),
        eventEndDateISO: eventEndDate.toISOString(),
        now: now.toString(),
        nowISO: now.toISOString(),
        isEnded: eventEndDate < now
      });
      
      return eventEndDate < now;
    } catch (error) {
      console.error('Error checking if event ended:', error, timeslot);
      return false; // Don't mark as ended if there's an error
    }
  }

  isFull(timeslot: TimeSlot): boolean {
    return timeslot.booked_by.length >= timeslot.capacity;
  }

  isCancelled(timeslot: TimeSlot): boolean {
    return timeslot.status === 'cancelled' || timeslot.status === 'Cancelled';
  }

  isRescheduled(timeslot: TimeSlot): boolean {
    return timeslot.status === 'rescheduled' || timeslot.status === 'Rescheduled';
  }

  bookTimeslot(timeslot: TimeSlot): void {
    if (this.isCancelled(timeslot)) {
      this.snackBar.open('Cannot book cancelled events', 'Close', { duration: 3000 });
      return;
    }

    if (this.isEventEnded(timeslot)) {
      this.snackBar.open('Cannot book events that have already ended', 'Close', { duration: 3000 });
      return;
    }

    if (this.isBookedByUser(timeslot)) {
      this.snackBar.open('You have already booked this timeslot', 'Close', { duration: 3000 });
      return;
    }

    if (this.isFull(timeslot)) {
      this.snackBar.open('This timeslot is full', 'Close', { duration: 3000 });
      return;
    }

    this.dataService.bookTimeslot(timeslot.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully booked timeslot!', 'Close', { duration: 3000 });
        this.loadTimeslots();
        // Trigger notification refresh in parent component
        window.dispatchEvent(new Event('notifications-update'));
      },
      error: (err) => {
        console.error('Error booking timeslot:', err);
        const errorMsg = err.error?.detail || 'Error booking timeslot';
        this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
      }
    });
  }

  unbookTimeslot(timeslot: TimeSlot): void {
    if (!this.isBookedByUser(timeslot)) {
      this.snackBar.open('You cannot unbook this timeslot', 'Close', { duration: 3000 });
      return;
    }

    this.dataService.unbookTimeslot(timeslot.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully unbooked timeslot!', 'Close', { duration: 3000 });
        this.loadTimeslots();
        // Trigger notification refresh in parent component
        window.dispatchEvent(new Event('notifications-update'));
      },
      error: (err) => {
        console.error('Error unbooking timeslot:', err);
        this.snackBar.open('Error unbooking timeslot', 'Close', { duration: 3000 });
      }
    });
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
