import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface StatsSummary {
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
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface AccessPerApp {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
  users_count: number;
}

export interface SsoByApp {
  application: string;
  count: number;
}

export interface RecentLogin {
  user: string;
  status: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  ip_address: string | null;
  at: string | null;
}

export interface TrendPoint {
  day: string;
  count: number;
}

export interface DashboardStats {
  summary: StatsSummary;
  apps_by_category: CategoryStat[];
  access_per_app: AccessPerApp[];
  sso_by_app: SsoByApp[];
  recent_logins: RecentLogin[];
  logins_trend: TrendPoint[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);

  /** Estadísticas del dashboard de la suite (solo administradores). */
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/admin/stats');
  }
}
