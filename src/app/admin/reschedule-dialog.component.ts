import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-reschedule-dialog',
  templateUrl: './reschedule-dialog.component.html',
  styleUrls: ['./reschedule-dialog.component.css']
})
export class RescheduleDialogComponent {
  rescheduleForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RescheduleDialogComponent>
  ) {
    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required]
    });
  }

  setInitialValues(date: string, startTime: string, endTime: string): void {
    this.rescheduleForm.patchValue({
      date: date,
      start_time: startTime,
      end_time: endTime
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onReschedule(): void {
    if (this.rescheduleForm.valid) {
      this.dialogRef.close(this.rescheduleForm.value);
    }
  }
}
