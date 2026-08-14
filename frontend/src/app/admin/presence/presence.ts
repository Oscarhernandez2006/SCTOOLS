import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, PresenceMonthly, PresenceReport } from '../../services/admin.service';

@Component({
  selector: 'app-presence-admin',
  imports: [Sidebar, DatePipe, FormsModule, TopNav],
  templateUrl: './presence.html',
  styleUrl: './presence.scss',
})
export class PresenceAdmin implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly view = signal<'mensual' | 'diario'>('mensual');

  // Vista diaria
  readonly report = signal<PresenceReport | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly from = signal(this.isoDaysAgo(6));
  readonly to = signal(this.isoDaysAgo(0));

  // Vista mensual (ranking)
  readonly monthly = signal<PresenceMonthly | null>(null);
  readonly monthLoading = signal(false);
  readonly month = signal(new Date().toISOString().slice(0, 7));

  readonly podium = computed(() => (this.monthly()?.ranking ?? []).slice(0, 3));
  readonly rest = computed(() => (this.monthly()?.ranking ?? []).slice(3));

  // Podio en orden visual 2·1·3 (el ganador al centro y elevado).
  readonly podiumOrdered = computed(() => {
    const top = (this.monthly()?.ranking ?? []).slice(0, 3).map((row, i) => ({ row, place: i }));
    return top.length === 3 ? [top[1], top[0], top[2]] : top;
  });

  ngOnInit(): void {
    this.loadMonthly();
  }

  setView(v: 'mensual' | 'diario'): void {
    this.view.set(v);
    if (v === 'mensual' && !this.monthly()) this.loadMonthly();
    if (v === 'diario' && !this.report()) this.load();
  }

  // ---- Mensual ----
  loadMonthly(): void {
    this.monthLoading.set(true);
    this.adminService.getPresenceMonthly(this.month()).subscribe({
      next: (m) => {
        this.monthly.set(m);
        this.monthLoading.set(false);
      },
      error: () => this.monthLoading.set(false),
    });
  }

  monthLabel(): string {
    const [y, m] = this.month().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  medal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`;
  }

  complianceClass(pct: number): string {
    if (pct >= 90) return 'good';
    if (pct >= 70) return 'mid';
    return 'low';
  }

  initials(name: string): string {
    const parts = name.split(' ').filter((w) => w.length > 0);
    if (parts.length < 2) return parts.map((w) => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ---- Diaria ----
  load(): void {
    this.loading.set(true);
    this.adminService.getPresence(this.from(), this.to()).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.adminService.exportPresence(this.from(), this.to()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presencia-${this.from()}_a_${this.to()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  fmt(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  fmtHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  pct(present: number, absent: number): number {
    const total = present + absent;
    return total === 0 ? 0 : Math.round((present / total) * 100);
  }

  private isoDaysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
