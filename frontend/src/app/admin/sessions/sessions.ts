import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { FilterBar } from '../../shared/admin-ui/filter-bar/filter-bar';
import { AdminService, PresenceReport, SessionEntry } from '../../services/admin.service';

@Component({
  selector: 'app-sessions',
  imports: [Sidebar, DatePipe, FormsModule, FilterBar],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class Sessions implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly sessions = signal<SessionEntry[]>([]);
  readonly presence = signal<PresenceReport | null>(null);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly revoking = signal<number | null>(null);

  // Última marca de presencia por usuario (para saber si está frente a la cámara).
  private readonly lastSeenByUser = computed(() => {
    const map = new Map<number, number>();
    for (const row of this.presence()?.rows ?? []) {
      if (!row.last_seen_at) continue;
      const t = new Date(row.last_seen_at).getTime();
      if (t > (map.get(row.user_id) ?? 0)) map.set(row.user_id, t);
    }
    return map;
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.sessions();
    return this.sessions().filter((s) => (s.user ?? '').toLowerCase().includes(q));
  });

  readonly onCameraCount = computed(() => this.filtered().filter((s) => this.onCamera(s.user_id)).length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const today = new Date().toISOString().slice(0, 10);
    this.adminService.getSessions().subscribe({
      next: (s) => {
        this.sessions.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.adminService.getPresence(today, today).subscribe({
      next: (r) => this.presence.set(r),
      error: () => {},
    });
  }

  /** En cámara = presencia registrada en los últimos 5 minutos (persona en su PC). */
  onCamera(userId: number): boolean {
    const last = this.lastSeenByUser().get(userId);
    return !!last && Date.now() - last < 5 * 60 * 1000;
  }

  initials(name: string | null): string {
    const parts = (name ?? '').split(' ').filter((w) => w.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length < 3) return parts.map((w) => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[2][0]).toUpperCase();
  }

  revoke(session: SessionEntry): void {
    if (this.revoking()) return;
    if (!confirm(`¿Revocar la sesión de ${session.user}? El usuario deberá iniciar sesión de nuevo.`)) return;
    this.revoking.set(session.id);
    this.adminService.revokeSession(session.id).subscribe({
      next: () => {
        this.sessions.set(this.sessions().filter((s) => s.id !== session.id));
        this.revoking.set(null);
      },
      error: () => this.revoking.set(null),
    });
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
