import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Simple login component - in a real app, this would handle authentication
  // For now, users can directly access the app without login
  
  constructor(private router: Router) { }

  skipLogin(): void {
    // Navigate to calendar - in production, this would verify credentials
    this.router.navigate(['/calendar']);
  }
}
