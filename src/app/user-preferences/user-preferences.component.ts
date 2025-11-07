import { Component, OnInit } from '@angular/core';
import { DataServiceService, EventCategory } from '../data-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-user-preferences',
  templateUrl: './user-preferences.component.html',
  styleUrls: ['./user-preferences.component.css']
})
export class UserPreferencesComponent implements OnInit {
  userId: string = '';
  categories: EventCategory[] = Object.values(EventCategory);
  selectedCategories: EventCategory[] = [];

  constructor(
    private dataService: DataServiceService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userId = user.username;
    }
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.dataService.getUserPreferences(this.userId).subscribe({
      next: (prefs) => {
        this.selectedCategories = prefs.categories || [];
      },
      error: (err) => {
        console.error('Error loading preferences:', err);
        this.selectedCategories = [];
      }
    });
  }

  toggleCategory(category: EventCategory): void {
    const index = this.selectedCategories.indexOf(category);
    if (index >= 0) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(category);
    }
  }

  isSelected(category: EventCategory): boolean {
    return this.selectedCategories.includes(category);
  }

  savePreferences(): void {
    this.dataService.updateUserPreferences(this.userId, this.selectedCategories).subscribe({
      next: () => {
        this.snackBar.open('Preferences saved successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Error saving preferences:', err);
        this.snackBar.open('Error saving preferences', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
