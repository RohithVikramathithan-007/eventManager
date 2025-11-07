import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DataServiceService } from './data-service.service';
import { interval, Subscription } from 'rxjs';

interface Notification {
  type: string;
  count: number;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'eventManagerFrontend';
  notifications: Notification[] = [];
  notificationCount: number = 0;
  showNotificationDropdown: boolean = false;
  private notificationSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dataService: DataServiceService
  ) {}

  ngOnInit(): void {
    // Verify token on app initialization
    if (this.authService.isAuthenticated()) {
      this.authService.verifyToken();
      this.loadNotifications();
      // Refresh notifications every 30 seconds
      this.notificationSubscription = interval(30000).subscribe(() => {
        if (this.authService.isAuthenticated()) {
          this.loadNotifications();
        }
      });
    }

    // Listen for notification update events
    window.addEventListener('notifications-update', () => {
      console.log('Notification update event received'); // Debug log
      if (this.authService.isAuthenticated()) {
        // Small delay to ensure backend has processed the change
        setTimeout(() => {
          this.loadNotifications();
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, skipping notifications');
      return;
    }

    console.log('Loading notifications...');
    this.dataService.getNotifications().subscribe({
      next: (response) => {
        console.log('Notifications API response:', response);
        this.notifications = response.notifications || [];
        this.notificationCount = response.total || 0;
        console.log('Notification count:', this.notificationCount);
        console.log('Notifications array:', this.notifications);
        if (this.notificationCount > 0) {
          console.log('Notifications found!', this.notifications);
        }
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        console.error('Error details:', err.error);
      }
    });
  }

  toggleNotifications(): void {
    if (this.hasNotifications()) {
      this.showNotificationDropdown = !this.showNotificationDropdown;
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getUsername(): string {
    const user = this.authService.getCurrentUser();
    return user?.username || '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasNotifications(): boolean {
    return this.notificationCount > 0;
  }

  getNotificationTooltip(): string {
    if (this.notificationCount === 0) {
      return 'No notifications';
    }
    return this.notifications.map(n => n.message).join(', ');
  }
}
