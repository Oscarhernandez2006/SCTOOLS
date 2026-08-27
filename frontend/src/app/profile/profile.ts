import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopNav } from '../shared/top-nav/top-nav';
import { Sidebar } from '../shared/sidebar/sidebar';
import { AuthService, LoginHistoryEntry } from '../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [TopNav, Sidebar, DatePipe, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly logins = signal<LoginHistoryEntry[]>([]);
  readonly loadingLogins = signal(true);

  readonly pwdOpen = signal(false);
  readonly pwdSaving = signal(false);
  readonly pwdError = signal('');
  readonly pwdSuccess = signal('');
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  pwdCurrent = '';
  pwdNew = '';
  pwdConfirm = '';

  get initials(): string {
    const parts = (this.user()?.name ?? '').split(' ').filter((w) => w.length > 0);
    if (parts.length < 2) return parts.map((w) => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  ngOnInit(): void {
    this.authService.getMyLogins(30).subscribe({
      next: (data) => { this.logins.set(data); this.loadingLogins.set(false); },
      error: () => this.loadingLogins.set(false),
    });
  }

  togglePwd(): void {
    this.pwdOpen.update((v) => !v);
    this.pwdError.set('');
    this.pwdSuccess.set('');
  }

  changePassword(): void {
    if (!this.pwdCurrent) { this.pwdError.set('Ingresa tu contraseña actual.'); return; }
    if (this.pwdNew.length < 6) { this.pwdError.set('Mínimo 6 caracteres.'); return; }
    if (this.pwdNew !== this.pwdConfirm) { this.pwdError.set('Las contraseñas no coinciden.'); return; }
    this.pwdSaving.set(true);
    this.pwdError.set('');
    this.authService.changePassword(this.pwdCurrent, this.pwdNew).subscribe({
      next: () => {
        this.pwdSaving.set(false);
        this.pwdSuccess.set('Contraseña actualizada');
        this.pwdCurrent = ''; this.pwdNew = ''; this.pwdConfirm = '';
      },
      error: (err) => { this.pwdSaving.set(false); this.pwdError.set(err?.error?.message || 'Error al cambiar la contraseña'); },
    });
  }

  statusIcon(status: string): string {
    return status === 'success' ? 'check_circle' : 'cancel';
  }

  statusColor(status: string): string {
    return status === 'success' ? 'var(--color-accent)' : '#c0392b';
  }
}
