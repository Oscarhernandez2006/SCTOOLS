import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AppCard, AppCardData } from '../shared/app-card/app-card';
import { AuthService } from '../services/auth.service';
import { Application, ApplicationsService } from '../services/applications.service';

@Component({
  selector: 'app-portal',
  imports: [FormsModule, DatePipe, AppCard],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
})
export class Portal implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private applicationsService = inject(ApplicationsService);
  private http = inject(HttpClient);
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    this.fetchWeather();
    this.loadApplications();
    this.authService.refreshUser();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topbar__user')) {
      this.userMenuOpen.set(false);
    }
    if (!target.closest('.topbar__calendar-wrapper')) {
      this.calendarOpen.set(false);
    }
    if (!target.closest('.profile-modal') && !target.closest('.topbar__dropdown-item')) {
      this.profileOpen.set(false);
    }
  }

  sidebarCollapsed = signal(false);
  searchQuery = signal('');
  toastMessage = signal('');
  toastVisible = signal(false);
  userMenuOpen = signal(false);
  profileOpen = signal(false);
  calendarOpen = signal(false);

  // Vista activa del portal (controlada por el sidebar)
  activeView = signal<'inicio' | 'aplicaciones'>('inicio');

  // Reloj en tiempo real
  currentTime = signal(new Date());

  // Clima
  weatherTemp = signal<number | null>(null);
  weatherDesc = signal('');
  weatherIcon = signal('');
  weatherCity = signal('');

  // Calendario
  calendarDate = signal(new Date());
  selectedDay = signal<number | null>(null);

  readonly user = this.authService.currentUser;

  get isAdmin(): boolean {
    return !!this.user()?.is_admin;
  }

  goToPermissions(): void {
    this.userMenuOpen.set(false);
    this.router.navigate(['/admin/permisos']);
  }

  get currentUserName(): string {
    return this.user()?.name ?? 'Usuario';
  }

  get currentUserFirstName(): string {
    return (this.user()?.name ?? 'Usuario').split(' ')[0];
  }

  get currentUserInitials(): string {
    const parts = (this.user()?.name ?? '').split(' ').filter(w => w.length > 0);
    if (parts.length < 3) return parts.map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[2][0]).toUpperCase();
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get greetingIcon(): string {
    const h = new Date().getHours();
    if (h < 12) return 'wb_sunny';
    if (h < 18) return 'wb_twilight';
    return 'dark_mode';
  }

  readonly currentDate = new Date();

  // Calendario helpers
  get calendarMonth(): string {
    return this.calendarDate().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): (number | null)[] {
    const d = this.calendarDate();
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks: (number | null)[] = Array(firstDay).fill(null);
    const days: (number | null)[] = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
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
    const key = `${d.getFullYear()}-${d.getMonth()}-${day}`;
    return this.companyEvents.has(key);
  }

  getEventsForDay(day: number): string[] {
    const d = this.calendarDate();
    const key = `${d.getFullYear()}-${d.getMonth()}-${day}`;
    return this.companyEvents.get(key) ?? [];
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

  // Eventos de ejemplo de la empresa
  readonly companyEvents = new Map<string, string[]>([
    [`2026-3-1`, ['Día del Trabajo']],
    [`2026-3-15`, ['Pago de nómina quincenal']],
    [`2026-3-30`, ['Pago de nómina fin de mes']],
    [`2026-4-1`, ['Reunión de resultados mensual']],
    [`2026-4-15`, ['Pago de nómina quincenal']],
    [`2026-4-18`, ['Corpus Christi - Festivo']],
  ]);

  // Clima
  private fetchWeather(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
        this.http.get<any>(url).subscribe({
          next: (res) => {
            this.weatherTemp.set(Math.round(res.current.temperature_2m));
            const code = res.current.weather_code;
            this.weatherIcon.set(this.getWeatherIcon(code));
            this.weatherDesc.set(this.getWeatherDesc(code));
          },
        });
      },
      () => {
        // Si no da permisos, usar coordenadas de Bogotá
        const url = `https://api.open-meteo.com/v1/forecast?latitude=4.71&longitude=-74.07&current=temperature_2m,weather_code&timezone=auto`;
        this.http.get<any>(url).subscribe({
          next: (res) => {
            this.weatherTemp.set(Math.round(res.current.temperature_2m));
            const code = res.current.weather_code;
            this.weatherIcon.set(this.getWeatherIcon(code));
            this.weatherDesc.set(this.getWeatherDesc(code));
            this.weatherCity.set('Bogotá');
          },
        });
      }
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

  private getWeatherDesc(code: number): string {
    if (code === 0) return 'Despejado';
    if (code <= 3) return 'Parcialmente nublado';
    if (code <= 48) return 'Nublado';
    if (code <= 55) return 'Llovizna';
    if (code <= 67) return 'Lluvia';
    if (code <= 77) return 'Nieve';
    if (code <= 82) return 'Aguacero';
    if (code <= 99) return 'Tormenta';
    return 'Variable';
  }

  // Perfil
  openProfile(): void {
    this.userMenuOpen.set(false);
    this.profileOpen.set(true);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  readonly sidebarLinks = computed(() => {
    const links: { icon: string; label: string; view: 'inicio' | 'aplicaciones'; route?: string; adminOnly?: boolean }[] = [
      { icon: 'home', label: 'Inicio', view: 'inicio' },
      { icon: 'grid_view', label: 'Aplicaciones', view: 'aplicaciones' },
    ];
    if (this.isAdmin) {
      links.push({ icon: 'tune', label: 'Gestionar apps', view: 'inicio', route: '/admin/aplicaciones', adminOnly: true });
      links.push({ icon: 'admin_panel_settings', label: 'Permisos', view: 'inicio', route: '/admin/permisos', adminOnly: true });
    }
    return links;
  });

  selectSidebar(item: { view: 'inicio' | 'aplicaciones'; route?: string }): void {
    if (item.route) {
      this.router.navigate([item.route]);
      return;
    }
    this.activeView.set(item.view);
  }

  readonly apps = signal<AppCardData[]>([]);

  readonly forms = signal<AppCardData[]>([]);

  readonly appsLoading = signal<boolean>(true);

  readonly recentApps = computed(() => this.apps().slice(0, 4).map((a) => a.name));

  private mapApplication(app: Application): AppCardData {
    return {
      name: app.name,
      description: app.description,
      icon: app.icon,
      url: app.url,
      category: app.category,
      color: app.color,
      logo: app.logo ?? undefined,
      keywords: app.keywords ?? undefined,
      slug: app.slug,
      ssoEnabled: app.sso_enabled,
    };
  }

  private loadApplications(): void {
    this.appsLoading.set(true);
    this.applicationsService.getApplications().subscribe({
      next: (applications) => {
        const mapped = applications.map((a) => this.mapApplication(a));
        this.apps.set(mapped.filter((_, i) => applications[i].type === 'app'));
        this.forms.set(mapped.filter((_, i) => applications[i].type === 'form'));
        this.appsLoading.set(false);
      },
      error: () => {
        this.apps.set([]);
        this.forms.set([]);
        this.appsLoading.set(false);
      },
    });
  }

  private matchesSearch(item: AppCardData, query: string): boolean {
    const keywords = query.toLowerCase().trim().split(/\s+/);
    const text = `${item.name} ${item.category} ${item.description} ${item.keywords ?? ''}`.toLowerCase();
    return keywords.every((kw) => text.includes(kw));
  }

  filteredApps = computed(() => {
    const q = this.searchQuery().trim();
    if (!q) return this.apps();
    return this.apps().filter((a) => this.matchesSearch(a, q));
  });

  filteredForms = computed(() => {
    const q = this.searchQuery().trim();
    if (!q) return this.forms();
    return this.forms().filter((f) => this.matchesSearch(f, q));
  });

  activeModules = computed(() => this.apps().length);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  onAppClick(app: AppCardData): void {
    // Apps con SSO: pedimos un ticket de un solo uso y abrimos ya logueado.
    if (app.ssoEnabled && app.slug) {
      this.toastMessage.set(`Iniciando sesión en ${app.name}...`);
      this.toastVisible.set(true);
      this.applicationsService.requestSsoTicket(app.slug).subscribe({
        next: (res) => {
          this.toastVisible.set(false);
          window.open(res.redirect_url, '_blank');
        },
        error: () => {
          // Si falla el SSO, abrimos la app normalmente como respaldo.
          this.toastMessage.set(`No se pudo iniciar sesión automáticamente. Abriendo ${app.name}...`);
          setTimeout(() => {
            this.toastVisible.set(false);
            window.open(app.url, '_blank');
          }, 1200);
        },
      });
      return;
    }

    this.toastMessage.set(`Redirigiendo a ${app.name}...`);
    this.toastVisible.set(true);
    setTimeout(() => {
      this.toastVisible.set(false);
      window.open(app.url, '_blank');
    }, 1000);
  }

  logout(): void {
    this.authService.logout();
  }
}
