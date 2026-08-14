import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TopNav } from '../../shared/top-nav/top-nav';
import { AdminService, CatalogApplication, Role, RolePayload } from '../../services/admin.service';

const ABILITY_LABELS: Record<string, string> = {
  view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar', export: 'Exportar', manage: 'Administrar',
};

@Component({
  selector: 'app-roles',
  imports: [Sidebar, FormsModule, TopNav],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly roles = signal<Role[]>([]);
  readonly applications = signal<CatalogApplication[]>([]);
  readonly abilities = signal<string[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly modalOpen = signal(false);
  readonly editing = signal<Role | null>(null);

  // Form
  readonly fName = signal('');
  readonly fDescription = signal('');
  readonly fColor = signal('#57AD31');
  readonly fIsAdmin = signal(false);
  readonly fApps = signal<Map<number, Set<string>>>(new Map());

  readonly modalTitle = computed(() => (this.editing() ? 'Editar rol' : 'Nuevo rol'));

  abilityLabel(a: string): string {
    return ABILITY_LABELS[a] ?? a;
  }

  ngOnInit(): void {
    this.adminService.getPermissionCatalog().subscribe({
      next: (res) => {
        this.applications.set(res.applications);
        this.abilities.set(res.abilities);
      },
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getRoles().subscribe({
      next: (r) => {
        this.roles.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  appName(id: number): string {
    return this.applications().find((a) => a.id === id)?.name ?? `#${id}`;
  }

  openCreate(): void {
    this.editing.set(null);
    this.fName.set('');
    this.fDescription.set('');
    this.fColor.set('#57AD31');
    this.fIsAdmin.set(false);
    this.fApps.set(new Map());
    this.modalOpen.set(true);
  }

  openEdit(role: Role): void {
    this.editing.set(role);
    this.fName.set(role.name);
    this.fDescription.set(role.description ?? '');
    this.fColor.set(role.color ?? '#57AD31');
    this.fIsAdmin.set(role.is_admin);
    const map = new Map<number, Set<string>>();
    for (const id of role.app_ids) {
      map.set(id, new Set(role.abilities?.[String(id)] ?? role.abilities?.[id as unknown as string] ?? ['view']));
    }
    this.fApps.set(map);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  isAppOn(id: number): boolean {
    return this.fApps().has(id);
  }

  toggleApp(id: number): void {
    const next = new Map(this.fApps());
    if (next.has(id)) next.delete(id);
    else next.set(id, new Set(['view']));
    this.fApps.set(next);
  }

  hasAbility(id: number, a: string): boolean {
    return this.fApps().get(id)?.has(a) ?? false;
  }

  toggleAbility(id: number, a: string): void {
    if (!this.isAppOn(id) || a === 'view') return;
    const next = new Map(this.fApps());
    const set = new Set(next.get(id) ?? ['view']);
    if (set.has(a)) set.delete(a);
    else set.add(a);
    next.set(id, set);
    this.fApps.set(next);
  }

  save(): void {
    if (!this.fName().trim() || this.saving()) return;
    this.saving.set(true);
    const abilities: Record<string, string[]> = {};
    const appIds: number[] = [];
    for (const [id, set] of this.fApps().entries()) {
      appIds.push(id);
      abilities[id] = Array.from(set);
    }
    const payload: RolePayload = {
      name: this.fName().trim(),
      description: this.fDescription().trim() || null,
      color: this.fColor(),
      is_admin: this.fIsAdmin(),
      app_ids: appIds,
      abilities,
    };
    const editing = this.editing();
    const req = editing
      ? this.adminService.updateRole(editing.id, payload)
      : this.adminService.createRole(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(role: Role): void {
    if (!confirm(`¿Eliminar el rol "${role.name}"? Los usuarios con este rol quedarán sin rol.`)) return;
    this.adminService.deleteRole(role.id).subscribe({ next: () => this.load() });
  }

  goBack(): void {
    this.router.navigate(['/portal']);
  }
}
