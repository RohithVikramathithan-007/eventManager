import { Component, OnInit } from '@angular/core';
import { DataServiceService, EventCategory, TimeSlot, TimeSlotCreate } from '../data-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  timeslots: TimeSlot[] = [];
  displayedColumns: string[] = ['category', 'date', 'start_time', 'end_time', 'booked_by', 'actions'];
  categories: EventCategory[] = Object.values(EventCategory);
  
  timeslotForm: FormGroup;
  showForm: boolean = false;

  constructor(
    private dataService: DataServiceService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.timeslotForm = this.fb.group({
      category: ['', Validators.required],
      date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTimeslots();
  }

  loadTimeslots(): void {
    this.dataService.getAllTimeslots().subscribe({
      next: (timeslots) => {
        // Sort by date and time
        this.timeslots = timeslots.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.start_time.localeCompare(b.start_time);
        });
      },
      error: (err) => {
        console.error('Error loading timeslots:', err);
        this.snackBar.open('Error loading timeslots', 'Close', { duration: 3000 });
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.timeslotForm.reset();
    }
  }

  createTimeslot(): void {
    if (this.timeslotForm.valid) {
      const formValue = this.timeslotForm.value;
      const timeslot: TimeSlotCreate = {
        category: formValue.category,
        date: this.formatDate(formValue.date),
        start_time: formValue.start_time,
        end_time: formValue.end_time
      };

      this.dataService.createTimeslot(timeslot).subscribe({
        next: () => {
          this.snackBar.open('Timeslot created successfully!', 'Close', { duration: 3000 });
          this.timeslotForm.reset();
          this.showForm = false;
          this.loadTimeslots();
        },
        error: (err) => {
          console.error('Error creating timeslot:', err);
          this.snackBar.open('Error creating timeslot', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
    }
  }

  deleteTimeslot(timeslotId: string): void {
    if (confirm('Are you sure you want to delete this timeslot?')) {
      this.dataService.deleteTimeslot(timeslotId).subscribe({
        next: () => {
          this.snackBar.open('Timeslot deleted successfully!', 'Close', { duration: 3000 });
          this.loadTimeslots();
        },
        error: (err) => {
          console.error('Error deleting timeslot:', err);
          this.snackBar.open('Error deleting timeslot', 'Close', { duration: 3000 });
        }
      });
    }
  }

  formatDate(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }

  formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getBookedStatus(timeslot: TimeSlot): string {
    return timeslot.booked_by ? `Booked by: ${timeslot.booked_by}` : 'Available';
  }

  isBooked(timeslot: TimeSlot): boolean {
    return timeslot.booked_by !== null;
  }
}
