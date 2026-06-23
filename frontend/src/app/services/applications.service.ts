import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Application {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: string;
  color: string;
  logo?: string | null;
  keywords?: string | null;
  type: 'app' | 'form';
  sso_enabled: boolean;
}

export interface SsoTicketResponse {
  redirect_url: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  private http = inject(HttpClient);

  /** Lista las aplicaciones activas a las que el usuario autenticado tiene acceso. */
  getApplications(): Observable<Application[]> {
    return this.http.get<Application[]>('/api/applications');
  }

  /** Solicita un ticket SSO de un solo uso para abrir una aplicación con sesión iniciada. */
  requestSsoTicket(slug: string): Observable<SsoTicketResponse> {
    return this.http.post<SsoTicketResponse>('/api/sso/ticket', { slug });
  }
}
