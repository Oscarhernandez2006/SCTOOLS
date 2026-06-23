import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  name: string;
  cedula: string;
  email: string;
  is_admin?: boolean;
}

interface LoginRequest {
  cedula: string;
  password: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'sc_tools_token';
  private readonly USER_KEY = 'sc_tools_user';

  currentUser = signal<AuthUser | null>(this.getStoredUser());
  isAuthenticated = signal<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(cedula: string, password: string): Observable<LoginResponse> {
    return new Observable<LoginResponse>((observer) => {
      this.getGeolocation().then((coords) => {
        const body: LoginRequest = {
          cedula,
          password,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        };

        this.http.post<LoginResponse>('/api/auth/login', body).subscribe({
          next: (res) => {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this.currentUser.set(res.user);
            this.isAuthenticated.set(true);
            observer.next(res);
            observer.complete();
          },
          error: (err) => observer.error(err),
        });
      });
    });
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me');
  }

  /** Refresca los datos del usuario (incluido is_admin) desde el backend. */
  refreshUser(): void {
    this.getMe().subscribe({
      next: (user) => {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      },
      error: () => {},
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): AuthUser | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  private getGeolocation(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }
}
