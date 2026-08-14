import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuiteStats {
  range_days: number;
  summary: {
    users_total: number;
    users_active: number;
    users_inactive: number;
    users_admins: number;
    apps_total: number;
    apps_active: number;
    access_grants: number;
    sso_last_7d: number;
    logins_last_7d: number;
    logins_ok_last_7d: number;
  };
  apps_by_category: { category: string; count: number }[];
  access_per_app: { id: number; name: string; slug: string; icon: string; color: string; is_active: boolean; users_count: number }[];
  sso_by_app: { application: string; count: number }[];
  recent_logins: { user: string; status: string; browser: string; os: string; device_type: string; ip_address: string; at: string }[];
  logins_trend: { day: string; count: number }[];
}

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
  access?: { application_id: number; abilities: string[] }[];
}

export interface AppAccess {
  application_id: number;
  abilities: string[];
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  is_admin: boolean;
  app_ids: number[];
  abilities: Record<string, string[]>;
  users_count: number;
}

export type RolePayload = {
  name: string;
  description: string | null;
  color: string | null;
  is_admin: boolean;
  app_ids: number[];
  abilities: Record<string, string[]>;
};

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  description: string | null;
  meta: Record<string, unknown> | null;
  ip_address: string | null;
  at: string | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface SessionEntry {
  id: number;
  user: string | null;
  user_id: number;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
  current?: boolean;
}

export interface ServiceHealth {
  id: number;
  name: string;
  slug: string;
  url: string;
  color: string | null;
  icon: string | null;
  logo: string | null;
  status: 'up' | 'down' | 'degraded';
  http_code: number | null;
  latency_ms: number;
}

export interface PresenceRow {
  id: number;
  user_id: number;
  user: string;
  cedula: string | null;
  date: string;
  present_seconds: number;
  absent_seconds: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface PresenceUserTotal {
  user_id: number;
  user: string;
  present_seconds: number;
  absent_seconds: number;
  days: number;
}

export interface PresenceReport {
  from: string;
  to: string;
  rows: PresenceRow[];
  by_user: PresenceUserTotal[];
}

export interface PresenceRankingRow {
  user_id: number;
  user: string;
  cedula: string | null;
  days: number;
  present_hours: number;
  target_hours: number;
  avg_daily_hours: number;
  compliance_pct: number;
  consistency_pct: number;
  score: number;
}

export interface PresenceMonthly {
  month: string;
  target_daily_hours: number;
  summary: {
    users: number;
    total_hours: number;
    total_days: number;
    avg_daily_hours: number;
    avg_compliance: number;
    avg_consistency: number;
    top_user: string | null;
    top_score: number | null;
  };
  ranking: PresenceRankingRow[];
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

export interface ManagedUser {
  id: number;
  name: string;
  cedula: string;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  role_id: number | null;
  role_name: string | null;
  has_siesa: boolean;
  application_ids: number[];
}

export interface UserPayload {
  name: string;
  cedula: string;
  email: string | null;
  password?: string;
  is_admin: boolean;
  is_active: boolean;
  role_id?: number | null;
  application_ids: number[];
  siesa_username?: string;
  siesa_password?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  getApplications(): Observable<CatalogApplication[]> {
    return this.http.get<CatalogApplication[]>('/api/admin/applications').pipe(
      map((res) => (Array.isArray(res) ? res : (res as { applications: CatalogApplication[] }).applications))
    );
  }

  /** Catálogo + lista de habilidades disponibles (para permisos granulares). */
  getPermissionCatalog(): Observable<{ applications: CatalogApplication[]; abilities: string[] }> {
    return this.http.get<{ applications: CatalogApplication[]; abilities: string[] }>('/api/admin/applications');
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

  /** Guarda el acceso granular (apps + habilidades) de un usuario. */
  updateUserAccess(userId: number, access: AppAccess[]): Observable<UserApplicationsResponse> {
    return this.http.put<UserApplicationsResponse>(
      `/api/admin/users/${userId}/applications`,
      { access }
    );
  }

  // ---- Roles / grupos ----
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>('/api/admin/roles');
  }

  createRole(payload: RolePayload): Observable<Role> {
    return this.http.post<Role>('/api/admin/roles', payload);
  }

  updateRole(id: number, payload: RolePayload): Observable<Role> {
    return this.http.put<Role>(`/api/admin/roles/${id}`, payload);
  }

  deleteRole(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/roles/${id}`);
  }

  // ---- Bitácora de auditoría ----
  getAudit(params: Record<string, string | number> = {}): Observable<Paginated<AuditEntry>> {
    return this.http.get<Paginated<AuditEntry>>('/api/admin/audit', { params: params as never });
  }

  getAuditActions(): Observable<string[]> {
    return this.http.get<string[]>('/api/admin/audit/actions');
  }

  // ---- Sesiones activas ----
  getSessions(): Observable<SessionEntry[]> {
    return this.http.get<SessionEntry[]>('/api/admin/sessions');
  }

  revokeSession(tokenId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/sessions/${tokenId}`);
  }

  // ---- Estado de servicios ----
  getServicesHealth(): Observable<{ checked_at: string; services: ServiceHealth[] }> {
    return this.http.get<{ checked_at: string; services: ServiceHealth[] }>('/api/admin/services/health');
  }

  // ---- Dashboard ----
  getStats(days = 7): Observable<SuiteStats> {
    return this.http.get<SuiteStats>('/api/admin/stats', { params: { days } as never });
  }

  exportStats(from?: string, to?: string): Observable<Blob> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get('/api/admin/stats/export', { params: params as never, responseType: 'blob' });
  }

  // ---- Presencia ----
  getPresence(from: string, to: string, userId?: number): Observable<PresenceReport> {
    const params: Record<string, string | number> = { from, to };
    if (userId) params['user_id'] = userId;
    return this.http.get<PresenceReport>('/api/admin/presence', { params: params as never });
  }

  exportPresence(from: string, to: string): Observable<Blob> {
    return this.http.get('/api/admin/presence/export', { params: { from, to } as never, responseType: 'blob' });
  }

  getPresenceMonthly(month: string): Observable<PresenceMonthly> {
    return this.http.get<PresenceMonthly>('/api/admin/presence/monthly', { params: { month } as never });
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

  // ---- Gestión de usuarios (CRUD) ----

  getManagedUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>('/api/admin/manage/users');
  }

  createUser(payload: UserPayload): Observable<ManagedUser> {
    return this.http.post<ManagedUser>('/api/admin/manage/users', payload);
  }

  updateUser(id: number, payload: UserPayload): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`/api/admin/manage/users/${id}`, payload);
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/manage/users/${id}`);
  }
}
