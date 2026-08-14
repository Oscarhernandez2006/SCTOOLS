import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, AdminUser, CatalogApplication } from '../../services/admin.service';

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
  private original = '';

  readonly searchQuery = signal('');
  readonly loadingUsers = signal(true);
  readonly loadingAccess = signal(false);
  readonly saving = signal(false);
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
    this.adminService.getUserApplications(user.id).subscribe({
      next: (res) => {
        const map = new Map<number, Set<string>>();
        const access = res.access ?? res.application_ids.map((id) => ({ application_id: id, abilities: ['view'] }));
        for (const entry of access) {
          map.set(entry.application_id, new Set(entry.abilities.length ? entry.abilities : ['view']));
        }
        this.granted.set(map);
        this.original = this.serialize(map);
        this.loadingAccess.set(false);
      },
      error: () => this.loadingAccess.set(false),
    });
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

  save(): void {
    const user = this.selectedUser();
    if (!user || this.saving()) return;
    this.saving.set(true);
    const access = Array.from(this.granted().entries()).map(([application_id, set]) => ({
      application_id,
      abilities: Array.from(set),
    }));
    this.adminService.updateUserAccess(user.id, access).subscribe({
      next: () => {
        this.original = this.serialize(this.granted());
        this.saving.set(false);
        this.showToast('Permisos guardados correctamente');
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
    return Array.from(map.entries())
      .map(([id, set]) => `${id}:${Array.from(set).sort().join(',')}`)
      .sort()
      .join('|');
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
