import { HttpClient } from '@angular/common/http';
import { afterNextRender, Inject, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private jwtHelper = inject(JwtHelperService);
  private router = inject(Router);

  constructor(@Inject(PLATFORM_ID) private platformId: object) { }

  login(username: string, password: string): Observable<{ access_token: string, refresh_token: string }> {
    return this.http.post<{ access_token: string, refresh_token: string }>(`${environment.api_url}/auth/login`, { username, password }).pipe(
      tap(res => {
        if(isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.access_token);
          localStorage.setItem('refresh_token', res.refresh_token);
        }
      })
    );
  }

  refreshToken(): Observable<{ access_token: string, refresh_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<{ access_token: string, refresh_token: string }>(`${environment.api_url}/auth/refresh`, { refresh_token: refreshToken }).pipe(
      tap(res => {
        if(isPlatformBrowser(this.platformId)) {
          localStorage.setItem('access_token', res.access_token);
          localStorage.setItem('refresh_token', res.refresh_token);
        }
      })
    );
  }

  logout(): void {
    if(isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.router.navigate(['/login']);
    }
  }

  isLoggedIn(): boolean {
    if(isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token');
      return token !== null && token?.length > 0 && !this.jwtHelper.isTokenExpired(token);
    }
    return false;
  }

  getToken(): string | null {
    if(isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('access_token');
    }
    return null;
  }
}
