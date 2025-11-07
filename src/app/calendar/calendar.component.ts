import { Component, OnInit } from '@angular/core';
import { DataServiceService, EventCategory, TimeSlot } from '../data-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  userId: string = 'user1'; // In a real app, this would come from auth service
  currentWeekStart: Date = new Date();
  weekDays: CalendarDay[] = [];
  allTimeslots: TimeSlot[] = [];
  selectedCategory: EventCategory | null = null;
  categories: EventCategory[] = Object.values(EventCategory);
  userPreferences: EventCategory[] = [];

  constructor(
    private dataService: DataServiceService,
    private snackBar: MatSnackBar
  ) {
    this.initializeWeek();
  }

  ngOnInit(): void {
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

    this.dataService.getTimeslots(startDate, endDateStr, this.selectedCategory || undefined, this.userId).subscribe({
      next: (timeslots) => {
        this.allTimeslots = timeslots;
        this.assignTimeslotsToDays();
      },
      error: (err) => {
        console.error('Error loading timeslots:', err);
        this.snackBar.open('Error loading timeslots', 'Close', { duration: 3000 });
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

  formatDisplayDate(date: Date): string {
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
    return timeslot.booked_by === null;
  }

  isBookedByUser(timeslot: TimeSlot): boolean {
    return timeslot.booked_by === this.userId;
  }

  bookTimeslot(timeslot: TimeSlot): void {
    if (!this.canBook(timeslot)) {
      this.snackBar.open('This timeslot is already booked', 'Close', { duration: 3000 });
      return;
    }

    this.dataService.bookTimeslot(timeslot.id, this.userId).subscribe({
      next: () => {
        this.snackBar.open('Successfully booked timeslot!', 'Close', { duration: 3000 });
        this.loadTimeslots();
      },
      error: (err) => {
        console.error('Error booking timeslot:', err);
        this.snackBar.open('Error booking timeslot', 'Close', { duration: 3000 });
      }
    });
  }

  unbookTimeslot(timeslot: TimeSlot): void {
    if (!this.isBookedByUser(timeslot)) {
      this.snackBar.open('You cannot unbook this timeslot', 'Close', { duration: 3000 });
      return;
    }

    this.dataService.unbookTimeslot(timeslot.id, this.userId).subscribe({
      next: () => {
        this.snackBar.open('Successfully unbooked timeslot!', 'Close', { duration: 3000 });
        this.loadTimeslots();
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
