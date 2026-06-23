import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminUser, CatalogApplication } from '../../services/admin.service';

@Component({
  selector: 'app-permissions',
  imports: [FormsModule],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss',
})
export class Permissions implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly users = signal<AdminUser[]>([]);
  readonly applications = signal<CatalogApplication[]>([]);
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly grantedIds = signal<Set<number>>(new Set());
  readonly originalIds = signal<Set<number>>(new Set());

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

  readonly hasChanges = computed(() => {
    const current = this.grantedIds();
    const original = this.originalIds();
    if (current.size !== original.size) return true;
    for (const id of current) {
      if (!original.has(id)) return true;
    }
    return false;
  });

  readonly grantedCount = computed(() => this.grantedIds().size);

  ngOnInit(): void {
    this.adminService.getApplications().subscribe({
      next: (apps) => this.applications.set(apps),
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
    this.grantedIds.set(new Set());
    this.adminService.getUserApplications(user.id).subscribe({
      next: (res) => {
        this.grantedIds.set(new Set(res.application_ids));
        this.originalIds.set(new Set(res.application_ids));
        this.loadingAccess.set(false);
      },
      error: () => this.loadingAccess.set(false),
    });
  }

  isGranted(appId: number): boolean {
    return this.grantedIds().has(appId);
  }

  toggleApp(appId: number): void {
    const next = new Set(this.grantedIds());
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.add(appId);
    }
    this.grantedIds.set(next);
  }

  save(): void {
    const user = this.selectedUser();
    if (!user || this.saving()) return;
    this.saving.set(true);
    const ids = Array.from(this.grantedIds());
    this.adminService.updateUserApplications(user.id, ids).subscribe({
      next: (res) => {
        this.originalIds.set(new Set(res.application_ids));
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
    this.grantedIds.set(new Set(this.originalIds()));
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
