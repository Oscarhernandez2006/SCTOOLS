import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, SessionEntry } from '../../services/admin.service';

@Component({
  selector: 'app-sessions',
  imports: [Sidebar, DatePipe, FormsModule, TopNav],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class Sessions implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly sessions = signal<SessionEntry[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly revoking = signal<number | null>(null);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.sessions();
    return this.sessions().filter((s) => (s.user ?? '').toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getSessions().subscribe({
      next: (s) => {
        this.sessions.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
