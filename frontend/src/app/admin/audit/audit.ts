import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { FilterBar } from '../../shared/admin-ui/filter-bar/filter-bar';
import { DataSurface } from '../../shared/admin-ui/data-surface/data-surface';
import { AdminService, AuditEntry, Paginated } from '../../services/admin.service';

@Component({
  selector: 'app-audit',
  imports: [Sidebar, DatePipe, FormsModule, TopNav, FilterBar, DataSurface],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly page = signal<Paginated<AuditEntry> | null>(null);
  readonly actions = signal<string[]>([]);
  readonly loading = signal(true);

  readonly filterAction = signal('');
  readonly search = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly currentPage = signal(1);

  ngOnInit(): void {
    this.adminService.getAuditActions().subscribe({ next: (a) => this.actions.set(a) });
    this.load();
  }

  load(page = 1): void {
    this.loading.set(true);
    this.currentPage.set(page);
    const params: Record<string, string | number> = { page, per_page: 25 };
    if (this.filterAction()) params['action'] = this.filterAction();
    if (this.search()) params['q'] = this.search();
    if (this.from()) params['from'] = this.from();
    if (this.to()) params['to'] = this.to();
    this.adminService.getAudit(params).subscribe({
      next: (res) => {
        this.page.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.load(1);
  }

  clearFilters(): void {
    this.filterAction.set('');
    this.search.set('');
    this.from.set('');
    this.to.set('');
    this.load(1);
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      'user.created': 'Usuario creado',
      'user.updated': 'Usuario actualizado',
      'user.deleted': 'Usuario eliminado',
      'app.created': 'App creada',
      'app.updated': 'App actualizada',
      'app.deleted': 'App eliminada',
      'permissions.updated': 'Permisos actualizados',
      'role.created': 'Rol creado',
      'role.updated': 'Rol actualizado',
      'role.deleted': 'Rol eliminado',
      'session.revoked': 'Sesión revocada',
    };
    return map[action] ?? action;
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
