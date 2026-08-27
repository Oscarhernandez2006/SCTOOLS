import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, PresenceReport } from '../services/admin.service';

@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [],
  templateUrl: './kiosk.html',
  styleUrl: './kiosk.scss',
})
export class KioskPage implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private interval: ReturnType<typeof setInterval> | null = null;

  readonly report = signal<PresenceReport | null>(null);
  readonly loading = signal(true);
  readonly now = signal(new Date());

  ngOnInit(): void {
    this.load();
    this.interval = setInterval(() => {
      this.now.set(new Date());
      this.load();
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  private load(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.adminService.getPresence(today, today).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  exit(): void { this.router.navigate(['/portal']); }

  fmtHours(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  statusClass(seconds: number): string {
    if (seconds >= 28800) return 'kiosk-row--full'; // >= 8h
    if (seconds >= 14400) return 'kiosk-row--mid';  // >= 4h
    return '';
  }

  isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000;
  }

  currentTime(): string {
    return this.now().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  currentDate(): string {
    return this.now().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
