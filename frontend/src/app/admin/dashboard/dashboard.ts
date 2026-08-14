import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, SuiteStats } from '../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, DatePipe, TopNav],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly stats = signal<SuiteStats | null>(null);
  readonly loading = signal(true);
  readonly days = signal(7);
  readonly exporting = signal(false);

  readonly from = signal('');
  readonly to = signal('');

  readonly maxTrend = computed(() =>
    Math.max(1, ...(this.stats()?.logins_trend ?? []).map((d) => d.count))
  );

  readonly maxAccess = computed(() =>
    Math.max(1, ...(this.stats()?.access_per_app ?? []).map((a) => a.users_count))
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getStats(this.days()).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setDays(d: number): void {
    this.days.set(d);
    this.load();
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.adminService.exportStats(this.from() || undefined, this.to() || undefined).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `actividad-ingresos-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  trendHeight(count: number): number {
    return Math.round((count / this.maxTrend()) * 100);
  }

  accessWidth(count: number): number {
    return Math.round((count / this.maxAccess()) * 100);
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
