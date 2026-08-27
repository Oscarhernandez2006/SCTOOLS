import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopNav } from '../shared/top-nav/top-nav';
import { Sidebar } from '../shared/sidebar/sidebar';
import { AuthService, LoginHistoryEntry } from '../services/auth.service';

@Component({
  selector: 'app-activity-page',
  standalone: true,
  imports: [TopNav, Sidebar, DatePipe, FormsModule],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class ActivityPage implements OnInit {
  private authService = inject(AuthService);

  readonly logins = signal<LoginHistoryEntry[]>([]);
  readonly loading = signal(true);
  readonly filterStatus = signal('all');

  readonly filtered = computed(() => {
    const f = this.filterStatus();
    return f === 'all' ? this.logins() : this.logins().filter((l) => l.status === f);
  });

  ngOnInit(): void {
    this.authService.getMyLogins(100).subscribe({
      next: (data) => { this.logins.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string): string { return s === 'success' ? 'Exitoso' : 'Fallido'; }
  statusColor(s: string): string { return s === 'success' ? 'var(--color-accent)' : '#c0392b'; }
  statusIcon(s: string): string { return s === 'success' ? 'check_circle' : 'cancel'; }
  deviceIcon(d: string | null): string {
    if (d === 'Mobile') return 'smartphone';
    if (d === 'Tablet') return 'tablet';
    return 'computer';
  }
}
