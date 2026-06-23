import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  name: string;
  cedula: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface CatalogApplication {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  type: 'app' | 'form';
  is_active: boolean;
}

interface UserApplicationsResponse {
  user_id: number;
  application_ids: number[];
}

export interface ManagedApplication {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string;
  category: string | null;
  color: string | null;
  logo: string | null;
  keywords: string | null;
  type: 'app' | 'form';
  sso_enabled: boolean;
  is_active: boolean;
  sort_order: number;
}

export type ApplicationPayload = Omit<ManagedApplication, 'id'>;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  getApplications(): Observable<CatalogApplication[]> {
    return this.http.get<CatalogApplication[]>('/api/admin/applications');
  }

  getUserApplications(userId: number): Observable<UserApplicationsResponse> {
    return this.http.get<UserApplicationsResponse>(`/api/admin/users/${userId}/applications`);
  }

  updateUserApplications(userId: number, applicationIds: number[]): Observable<UserApplicationsResponse> {
    return this.http.put<UserApplicationsResponse>(
      `/api/admin/users/${userId}/applications`,
      { application_ids: applicationIds }
    );
  }

  // ---- Gestión del catálogo de aplicaciones (CRUD) ----

  getManagedApplications(): Observable<ManagedApplication[]> {
    return this.http.get<ManagedApplication[]>('/api/admin/manage/applications');
  }

  createApplication(payload: ApplicationPayload): Observable<ManagedApplication> {
    return this.http.post<ManagedApplication>('/api/admin/manage/applications', payload);
  }

  updateApplication(id: number, payload: ApplicationPayload): Observable<ManagedApplication> {
    return this.http.put<ManagedApplication>(`/api/admin/manage/applications/${id}`, payload);
  }

  deleteApplication(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/manage/applications/${id}`);
  }
}
