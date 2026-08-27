import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface NavLink {
  icon: string;
  label: string;
  route: string;
}

/** Barra lateral de navegación reutilizable (misma del dashboard) para las páginas internas. */
@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly links = computed<NavLink[]>(() => {
    const items: NavLink[] = [{ icon: 'home', label: 'Inicio', route: '/portal' }];
    if (this.auth.currentUser()?.is_admin) {
      items.push(
        { icon: 'group', label: 'Usuarios', route: '/admin/usuarios' },
        { icon: 'groups', label: 'Grupos', route: '/admin/roles' },
        { icon: 'admin_panel_settings', label: 'Permisos', route: '/admin/permisos' },
        { icon: 'history', label: 'Auditoría', route: '/admin/auditoria' },
        { icon: 'devices', label: 'Sesiones', route: '/admin/sesiones' },
        { icon: 'timer', label: 'Presencia', route: '/admin/presencia' },
      );
    }
    return items;
  });

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  go(route: string): void {
    this.router.navigate([route]);
  }
}
