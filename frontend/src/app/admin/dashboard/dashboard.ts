import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, SuiteStats } from '../../services/admin.service';
import {
  BarChart,
  BarDatum,
  ChartCard,
  ChartCardState,
  DonutChart,
  DonutDatum,
  LineChart,
  LinePoint,
  CHART_SEMANTIC,
} from '../../shared/charts';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, DatePipe, TopNav, ChartCard, LineChart, BarChart, DonutChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly stats = signal<SuiteStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly days = signal(7);
  readonly exporting = signal(false);

  readonly from = signal('');
  readonly to = signal('');

  readonly accentColor = CHART_SEMANTIC.primary;

  /** Tendencia de ingresos como serie temporal para la gráfica de líneas. */
  readonly trendPoints = computed<LinePoint[]>(() =>
    (this.stats()?.logins_trend ?? []).map((d) => ({ x: d.day, y: d.count }))
  );

  /** Accesos por aplicación como barras horizontales (conserva color/icono). */
  readonly accessBars = computed<BarDatum[]>(() =>
    (this.stats()?.access_per_app ?? []).map((a) => ({
      label: a.name,
      value: a.users_count,
      color: a.color || CHART_SEMANTIC.primary,
      icon: a.icon,
    }))
  );

  /** Distribución de apps por categoría como proporciones (dona). */
  readonly categoryDonut = computed<DonutDatum[]>(() =>
    (this.stats()?.apps_by_category ?? []).map((c) => ({ label: c.category, value: c.count }))
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.getStats(this.days()).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Estado a mostrar en cada tarjeta de gráfica. */
  cardState(hasData: boolean): ChartCardState {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';
    return hasData ? 'ready' : 'empty';
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

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
