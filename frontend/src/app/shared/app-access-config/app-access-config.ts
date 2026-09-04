import { Component, computed, input, model } from '@angular/core';
import { AppProvisioningCatalog, CatalogApplication } from '../../services/admin.service';

/** Selección de rol + módulos granulares para una app aprovisionable. */
export interface AppAccessSelection {
  role: string;
  permissions: string[];
}

/**
 * Editor reutilizable de rol y permisos granulares por aplicación.
 * Presentacional: recibe el catálogo de la app y un modelo `selection`
 * (two-way). Se usa tanto en el alta de usuarios como en la pantalla de
 * Permisos, para que la experiencia sea idéntica en ambos lugares.
 */
@Component({
  selector: 'sc-app-access-config',
  templateUrl: './app-access-config.html',
  styleUrl: './app-access-config.scss',
})
export class AppAccessConfig {
  readonly app = input.required<CatalogApplication>();
  readonly catalog = input<AppProvisioningCatalog | null>(null);
  readonly loading = input(false);
  readonly selection = model.required<AppAccessSelection>();

  readonly roles = computed(() => this.catalog()?.roles ?? []);
  readonly groups = computed(() => this.catalog()?.groups ?? []);

  setRole(role: string): void {
    this.selection.update((s) => ({ ...s, role }));
  }

  hasPerm(key: string): boolean {
    return this.selection().permissions.includes(key);
  }

  togglePerm(key: string): void {
    this.selection.update((s) => {
      const set = new Set(s.permissions);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...s, permissions: [...set] };
    });
  }
}
