import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, AdminUser, AppProvisioningCatalog, CatalogApplication } from '../../services/admin.service';

/** Etiquetas legibles para cada habilidad granular. */
const ABILITY_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  export: 'Exportar',
  manage: 'Administrar',
};

@Component({
  selector: 'app-permissions',
  imports: [FormsModule, Sidebar, TopNav],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss',
})
export class Permissions implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly users = signal<AdminUser[]>([]);
  readonly applications = signal<CatalogApplication[]>([]);
  readonly abilities = signal<string[]>([]);
  readonly selectedUser = signal<AdminUser | null>(null);

  // Acceso granular: appId -> set de habilidades otorgadas.
  readonly granted = signal<Map<number, Set<string>>>(new Map());
  // Rol por app externa: appId -> rol.
  readonly appRoles = signal<Map<number, string>>(new Map());
  // Módulos por app externa: appId -> set de claves de módulo.
  readonly appPerms = signal<Map<number, Set<string>>>(new Map());
  // Catálogo de roles/módulos por app externa (cargado bajo demanda).
  readonly catalogs = signal<Map<number, AppProvisioningCatalog>>(new Map());
  readonly loadingCatalog = signal<Set<number>>(new Set());
  private original = '';

  readonly searchQuery = signal('');
  readonly loadingUsers = signal(true);
  readonly loadingAccess = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly toastMessage = signal('');
  readonly toastVisible = signal(false);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      (u) => u.name.toLowerCase().includes(q) || u.cedula.toLowerCase().includes(q)
    );
  });

  readonly grantedCount = computed(() => this.granted().size);

  readonly hasChanges = computed(() => this.serialize(this.granted()) !== this.original);

  abilityLabel(ability: string): string {
    return ABILITY_LABELS[ability] ?? ability;
  }

  ngOnInit(): void {
    this.adminService.getPermissionCatalog().subscribe({
      next: (res) => {
        this.applications.set(res.applications);
        this.abilities.set(res.abilities);
      },
    });
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  selectUser(user: AdminUser): void {
    if (this.selectedUser()?.id === user.id) return;
    this.selectedUser.set(user);
    this.loadingAccess.set(true);
    this.granted.set(new Map());
    this.appRoles.set(new Map());
    this.appPerms.set(new Map());
    this.adminService.getUserApplications(user.id).subscribe({
      next: (res) => {
        const map = new Map<number, Set<string>>();
        const roles = new Map<number, string>();
        const perms = new Map<number, Set<string>>();
        const access = res.access ?? res.application_ids.map((id) => ({
          application_id: id,
          abilities: ['view'],
          role: null as string | null,
          permissions: [] as string[],
        }));
        for (const entry of access) {
          map.set(entry.application_id, new Set(entry.abilities.length ? entry.abilities : ['view']));
          if (entry.role) roles.set(entry.application_id, entry.role);
          if (entry.permissions?.length) perms.set(entry.application_id, new Set(entry.permissions));
        }
        this.granted.set(map);
        this.appRoles.set(roles);
        this.appPerms.set(perms);
        this.original = this.serialize(map);
        this.loadingAccess.set(false);
        // Precarga los catálogos de las apps aprovisionables ya otorgadas.
        for (const app of this.applications()) {
          if (map.has(app.id) && this.isProvisionable(app)) {
            this.loadCatalog(app.id);
          }
        }
      },
      error: () => this.loadingAccess.set(false),
    });
  }

  /** ¿La app admite rol/módulos por aplicación (SIGCOM/SIGCOMPRO)? */
  isProvisionable(app: CatalogApplication): boolean {
    return app.provisionable === true;
  }

  catalogFor(appId: number): AppProvisioningCatalog | undefined {
    return this.catalogs().get(appId);
  }

  isLoadingCatalog(appId: number): boolean {
    return this.loadingCatalog().has(appId);
  }

  private loadCatalog(appId: number): void {
    if (this.catalogs().has(appId) || this.loadingCatalog().has(appId)) return;
    const loading = new Set(this.loadingCatalog());
    loading.add(appId);
    this.loadingCatalog.set(loading);
    this.adminService.getAppCatalog(appId).subscribe({
      next: (cat) => {
        const next = new Map(this.catalogs());
        next.set(appId, cat);
        this.catalogs.set(next);
        const done = new Set(this.loadingCatalog());
        done.delete(appId);
        this.loadingCatalog.set(done);
      },
      error: () => {
        const done = new Set(this.loadingCatalog());
        done.delete(appId);
        this.loadingCatalog.set(done);
      },
    });
  }

  appRole(appId: number): string {
    return this.appRoles().get(appId) ?? '';
  }

  setAppRole(appId: number, role: string): void {
    const next = new Map(this.appRoles());
    if (role) {
      next.set(appId, role);
    } else {
      next.delete(appId);
    }
    this.appRoles.set(next);
  }

  appHasPerm(appId: number, key: string): boolean {
    return this.appPerms().get(appId)?.has(key) ?? false;
  }

  toggleAppPerm(appId: number, key: string): void {
    if (!this.isGranted(appId)) return;
    const next = new Map(this.appPerms());
    const set = new Set(next.get(appId) ?? []);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    if (set.size) {
      next.set(appId, set);
    } else {
      next.delete(appId);
    }
    this.appPerms.set(next);
  }

  isGranted(appId: number): boolean {
    return this.granted().has(appId);
  }

  hasAbility(appId: number, ability: string): boolean {
    return this.granted().get(appId)?.has(ability) ?? false;
  }

  toggleApp(appId: number): void {
    const next = new Map(this.granted());
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.set(appId, new Set(['view']));
      const app = this.applications().find((a) => a.id === appId);
      if (app && this.isProvisionable(app)) {
        this.loadCatalog(appId);
      }
    }
    this.granted.set(next);
  }

  toggleAbility(appId: number, ability: string): void {
    if (!this.isGranted(appId) || ability === 'view') return;
    const next = new Map(this.granted());
    const set = new Set(next.get(appId) ?? ['view']);
    if (set.has(ability)) {
      set.delete(ability);
    } else {
      set.add(ability);
    }
    next.set(appId, set);
    this.granted.set(next);
  }

  /** Importa a la suite los usuarios/roles/permisos de las apps externas. */
  importFromApps(): void {
    if (this.importing()) return;
    this.importing.set(true);
    this.adminService.importUsersFromApps().subscribe({
      next: (res) => {
        this.importing.set(false);
        const parts = Object.entries(res.summary).map(([slug, s]) =>
          s.error
            ? `${slug}: error`
            : `${slug}: +${s.created ?? 0} nuevos, ${s.linked ?? 0} vinculados`,
        );
        this.showToast(`Importado — ${parts.join(' · ')}`);
        this.adminService.getUsers().subscribe({ next: (users) => this.users.set(users) });
      },
      error: () => {
        this.importing.set(false);
        this.showToast('Error al importar desde las apps');
      },
    });
  }

  save(): void {
    const user = this.selectedUser();
    if (!user || this.saving()) return;
    this.saving.set(true);
    const access = Array.from(this.granted().entries()).map(([application_id, set]) => ({
      application_id,
      abilities: Array.from(set),
      role: this.appRoles().get(application_id) ?? null,
      permissions: Array.from(this.appPerms().get(application_id) ?? []),
    }));
    this.adminService.updateUserAccess(user.id, access).subscribe({
      next: () => {
        this.original = this.serialize(this.granted());
        this.saving.set(false);
        this.showToast('Permisos guardados y sincronizados');
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Error al guardar los permisos');
      },
    });
  }

  resetChanges(): void {
    const current = this.selectedUser();
    if (current) {
      this.selectedUser.set(null);
      this.selectUser(current);
    }
  }

  private serialize(map: Map<number, Set<string>>): string {
    const abilities = Array.from(map.entries())
      .map(([id, set]) => `${id}:${Array.from(set).sort().join(',')}`)
      .sort()
      .join('|');
    const roles = Array.from(this.appRoles().entries())
      .map(([id, role]) => `${id}=${role}`)
      .sort()
      .join('|');
    const perms = Array.from(this.appPerms().entries())
      .map(([id, set]) => `${id}#${Array.from(set).sort().join(',')}`)
      .sort()
      .join('|');
    return `${abilities}||${roles}||${perms}`;
  }

  userInitials(user: AdminUser): string {
    const parts = user.name.split(' ').filter((w) => w.length > 0);
    if (parts.length < 2) return parts.map((w) => w[0]).join('').substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 2500);
  }
}
