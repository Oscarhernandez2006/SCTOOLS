import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PresenceService } from '../../services/presence.service';

/** Barra superior compartida por todo el suite (marca, reloj, clima, calendario, usuario). */
@Component({
  selector: 'app-top-nav',
  imports: [DatePipe],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.scss',
})
export class TopNav implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly presence = inject(PresenceService);

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  readonly currentTime = signal(new Date());
  readonly userMenuOpen = signal(false);
  readonly calendarOpen = signal(false);

  readonly weatherTemp = signal<number | null>(null);
  readonly weatherIcon = signal('');

  readonly calendarDate = signal(new Date());
  readonly selectedDay = signal<number | null>(null);

  readonly user = this.authService.currentUser;

  ngOnInit(): void {
    this.clockInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
    this.fetchWeather();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (!t.closest('.tn__user')) this.userMenuOpen.set(false);
    if (!t.closest('.tn__calendar-wrapper')) this.calendarOpen.set(false);
  }

  get isAdmin(): boolean {
    return !!this.user()?.is_admin;
  }

  get currentUserName(): string {
    return this.user()?.name ?? 'Usuario';
  }

  get currentUserInitials(): string {
    const parts = (this.user()?.name ?? '').split(' ').filter((w) => w.length > 0);
    if (parts.length < 3) return parts.map((w) => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[2][0]).toUpperCase();
  }

  goHome(): void {
    this.router.navigate(['/portal']);
  }

  goToPermissions(): void {
    this.userMenuOpen.set(false);
    this.router.navigate(['/admin/permisos']);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }

  // ---- Calendario ----
  get calendarMonth(): string {
    return this.calendarDate().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): (number | null)[] {
    const d = this.calendarDate();
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const now = new Date();
    const d = this.calendarDate();
    return day === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  hasEvent(day: number | null): boolean {
    if (!day) return false;
    const d = this.calendarDate();
    return this.companyEvents.has(`${d.getFullYear()}-${d.getMonth()}-${day}`);
  }

  getEventsForDay(day: number): string[] {
    const d = this.calendarDate();
    return this.companyEvents.get(`${d.getFullYear()}-${d.getMonth()}-${day}`) ?? [];
  }

  changeMonth(offset: number): void {
    const d = new Date(this.calendarDate());
    d.setMonth(d.getMonth() + offset);
    this.calendarDate.set(d);
    this.selectedDay.set(null);
  }

  selectDay(day: number | null): void {
    if (day) this.selectedDay.set(this.selectedDay() === day ? null : day);
  }

  readonly companyEvents = new Map<string, string[]>([
    ['2026-3-1', ['Día del Trabajo']],
    ['2026-3-15', ['Pago de nómina quincenal']],
    ['2026-3-30', ['Pago de nómina fin de mes']],
    ['2026-4-1', ['Reunión de resultados mensual']],
    ['2026-4-15', ['Pago de nómina quincenal']],
    ['2026-4-18', ['Corpus Christi - Festivo']],
  ]);

  // ---- Clima ----
  private fetchWeather(): void {
    const load = (lat: number, lon: number) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      this.http.get<any>(url).subscribe({
        next: (res) => {
          this.weatherTemp.set(Math.round(res.current.temperature_2m));
          this.weatherIcon.set(this.getWeatherIcon(res.current.weather_code));
        },
      });
    };
    if (!navigator.geolocation) {
      load(4.71, -74.07);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(4.71, -74.07)
    );
  }

  private getWeatherIcon(code: number): string {
    if (code === 0) return 'wb_sunny';
    if (code <= 3) return 'partly_cloudy_day';
    if (code <= 48) return 'cloud';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'weather_snowy';
    if (code <= 82) return 'thunderstorm';
    return 'cloud';
  }
}
