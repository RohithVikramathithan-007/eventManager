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
      if (this.authService.isAuthenticated()) {
        this.loadNotifications();
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
      return;
    }

    this.dataService.getNotifications().subscribe({
      next: (response) => {
        this.notifications = response.notifications || [];
        this.notificationCount = response.total || 0;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        // Don't show error for notifications, just silently fail
      }
    });
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
