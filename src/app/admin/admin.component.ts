import { Component, OnInit } from '@angular/core';
import { DataServiceService, EventCategory, TimeSlot, TimeSlotCreate } from '../data-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RescheduleDialogComponent } from './reschedule-dialog.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  timeslots: TimeSlot[] = [];
  displayedColumns: string[] = ['category', 'date', 'start_time', 'end_time', 'capacity', 'booked', 'status', 'actions'];
  categories: EventCategory[] = Object.values(EventCategory);
  
  timeslotForm: FormGroup;
  showForm: boolean = false;

  constructor(
    private dataService: DataServiceService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.timeslotForm = this.fb.group({
      category: ['', Validators.required],
      date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      capacity: [1, [Validators.required, Validators.min(1)]]
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
      this.timeslotForm.patchValue({ capacity: 1 }); // Reset to default
    } else {
      // Ensure capacity is set to 1 when opening form
      this.timeslotForm.patchValue({ capacity: 1 });
    }
  }

  createTimeslot(): void {
    if (this.timeslotForm.valid) {
      const formValue = this.timeslotForm.value;
      const timeslot: TimeSlotCreate = {
        category: formValue.category,
        date: this.formatDate(formValue.date),
        start_time: formValue.start_time,
        end_time: formValue.end_time,
        capacity: 1  // Hard set to 1 seat
      };

      this.dataService.createTimeslot(timeslot).subscribe({
        next: () => {
          this.snackBar.open('Timeslot created successfully!', 'Close', { duration: 3000 });
          this.timeslotForm.reset();
          this.timeslotForm.patchValue({ capacity: 1 }); // Reset to default
          this.showForm = false;
          this.loadTimeslots();
        },
        error: (err) => {
          console.error('Error creating timeslot:', err);
          const errorMsg = err.error?.detail || 'Error creating timeslot';
          this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
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
      // Format date in local timezone to avoid UTC conversion issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
    const bookedCount = timeslot.booked_by.length;
    const available = timeslot.capacity - bookedCount;
    return `${bookedCount} / ${timeslot.capacity} booked (${available} available)`;
  }

  getBookedCount(timeslot: TimeSlot): number {
    return timeslot.booked_by.length;
  }

  isFull(timeslot: TimeSlot): boolean {
    return timeslot.booked_by.length >= timeslot.capacity;
  }

  cancelTimeslot(timeslot: TimeSlot): void {
    if (confirm('Are you sure you want to cancel this timeslot? All bookings will be notified.')) {
      this.dataService.cancelTimeslot(timeslot.id).subscribe({
        next: () => {
          this.snackBar.open('Timeslot cancelled successfully!', 'Close', { duration: 3000 });
          this.loadTimeslots();
          // Trigger notification refresh
          window.dispatchEvent(new Event('notifications-update'));
        },
        error: (err) => {
          console.error('Error cancelling timeslot:', err);
          const errorMsg = err.error?.detail || 'Error cancelling timeslot';
          this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
        }
      });
    }
  }

  rescheduleTimeslot(timeslot: TimeSlot): void {
    const dialogRef = this.dialog.open(RescheduleDialogComponent, {
      width: '500px'
    });

    // Set initial values in the dialog
    dialogRef.componentInstance.setInitialValues(
      timeslot.date,
      timeslot.start_time,
      timeslot.end_time
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const formattedDate = this.formatDate(result.date);
        this.dataService.rescheduleTimeslot(timeslot.id, formattedDate, result.start_time, result.end_time).subscribe({
          next: () => {
            this.snackBar.open('Timeslot rescheduled successfully!', 'Close', { duration: 3000 });
            this.loadTimeslots();
            // Trigger notification refresh
            window.dispatchEvent(new Event('notifications-update'));
          },
          error: (err) => {
            console.error('Error rescheduling timeslot:', err);
            const errorMsg = err.error?.detail || 'Error rescheduling timeslot';
            this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  isCancelled(timeslot: TimeSlot): boolean {
    return timeslot.status === 'cancelled' || timeslot.status === 'Cancelled';
  }

  isRescheduled(timeslot: TimeSlot): boolean {
    return timeslot.status === 'rescheduled' || timeslot.status === 'Rescheduled';
  }

  createSampleEvents(): void {
    if (confirm('This will create sample events for the next 2 weeks. Continue?')) {
      this.dataService.createSampleEvents().subscribe({
        next: (response) => {
          this.snackBar.open(response.message || 'Sample events created successfully!', 'Close', { duration: 3000 });
          this.loadTimeslots();
        },
        error: (err) => {
          console.error('Error creating sample events:', err);
          const errorMsg = err.error?.detail || 'Error creating sample events';
          this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
        }
      });
    }
  }
}
