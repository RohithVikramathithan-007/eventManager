import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isAdminLogin: boolean = false;
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // If already logged in, redirect
    if (this.authService.isAuthenticated()) {
      this.redirectAfterLogin();
    }
  }

  toggleLoginType(): void {
    this.isAdminLogin = !this.isAdminLogin;
    this.loginForm.reset();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Verify user type matches login type
          if (this.isAdminLogin && !response.is_admin) {
            this.snackBar.open('This account is not an admin account', 'Close', { duration: 3000 });
            this.authService.logout();
            return;
          }

          if (!this.isAdminLogin && response.is_admin) {
            this.snackBar.open('Please use Admin Login for admin accounts', 'Close', { duration: 3000 });
            this.authService.logout();
            return;
          }

          this.snackBar.open('Login successful!', 'Close', { duration: 2000 });
          this.redirectAfterLogin();
        },
        error: (err) => {
          this.isLoading = false;
          const errorMsg = err.error?.detail || 'Login failed. Please check your credentials.';
          this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
        }
      });
    } else {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 2000 });
    }
  }

  private redirectAfterLogin(): void {
    const user = this.authService.getCurrentUser();
    if (user?.is_admin) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/calendar']);
    }
  }
}
