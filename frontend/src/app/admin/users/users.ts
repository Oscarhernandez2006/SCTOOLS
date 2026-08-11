import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import {
  AdminService,
  CatalogApplication,
  ManagedUser,
  UserPayload,
} from '../../services/admin.service';

interface UserFormModel {
  id: number | null;
  name: string;
  cedula: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_active: boolean;
  application_ids: number[];
  siesa_username: string;
  siesa_password: string;
}

function emptyForm(): UserFormModel {
  return {
    id: null,
    name: '',
    cedula: '',
    email: '',
    password: '',
    is_admin: false,
    is_active: true,
    application_ids: [],
    siesa_username: '',
    siesa_password: '',
  };
}

@Component({
  selector: 'app-users-admin',
  imports: [FormsModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersAdmin implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly users = signal<ManagedUser[]>([]);
  readonly catalog = signal<CatalogApplication[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly modalOpen = signal(false);
  readonly editing = signal(false);
  readonly form = signal<UserFormModel>(emptyForm());
  readonly formError = signal('');
  readonly showPassword = signal(false);
  readonly showSiesaPassword = signal(false);

  readonly confirmDelete = signal<ManagedUser | null>(null);

  readonly toastMessage = signal('');
  readonly toastVisible = signal(false);

  readonly searchQuery = signal('');

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.cedula.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getManagedUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.adminService.getApplications().subscribe({
      next: (apps) => this.catalog.set(apps),
      error: () => this.catalog.set([]),
    });
  }

  openCreate(): void {
    this.form.set(emptyForm());
    this.editing.set(false);
    this.formError.set('');
    this.showPassword.set(false);
    this.showSiesaPassword.set(false);
    this.modalOpen.set(true);
  }

  openEdit(user: ManagedUser): void {
    this.form.set({
      id: user.id,
      name: user.name,
      cedula: user.cedula,
      email: user.email ?? '',
      password: '',
      is_admin: user.is_admin,
      is_active: user.is_active,
      application_ids: [...user.application_ids],
      siesa_username: '',
      siesa_password: '',
    });
    this.editing.set(true);
    this.formError.set('');
    this.showPassword.set(false);
    this.showSiesaPassword.set(false);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  updateField<K extends keyof UserFormModel>(key: K, value: UserFormModel[K]): void {
    this.form.set({ ...this.form(), [key]: value });
  }

  toggleApp(appId: number): void {
    const f = this.form();
    const ids = f.application_ids.includes(appId)
      ? f.application_ids.filter((id) => id !== appId)
      : [...f.application_ids, appId];
    this.form.set({ ...f, application_ids: ids });
  }

  hasApp(appId: number): boolean {
    return this.form().application_ids.includes(appId);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleSiesaPassword(): void {
    this.showSiesaPassword.update((v) => !v);
  }

  save(): void {
    if (this.saving()) return;
    const f = this.form();

    if (!f.name.trim() || !f.cedula.trim()) {
      this.formError.set('Nombre y cédula son obligatorios.');
      return;
    }
    if (!this.editing() && f.password.trim().length < 6) {
      this.formError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.editing() && f.password.trim() && f.password.trim().length < 6) {
      this.formError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const email = (f.email ?? '').trim();
    const payload: UserPayload = {
      name: f.name.trim(),
      cedula: f.cedula.trim(),
      email: email || null,
      is_admin: f.is_admin,
      is_active: f.is_active,
      application_ids: f.application_ids,
    };
    if (f.password.trim()) payload.password = f.password;
    if (f.siesa_username.trim()) payload.siesa_username = f.siesa_username.trim();
    if (f.siesa_password.trim()) payload.siesa_password = f.siesa_password;

    this.saving.set(true);
    this.formError.set('');

    const request$ =
      this.editing() && f.id
        ? this.adminService.updateUser(f.id, payload)
        : this.adminService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.showToast(this.editing() ? 'Usuario actualizado' : 'Usuario creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const errors = err?.error?.errors;
        const msg = errors
          ? Object.values(errors).flat().join(' ')
          : err?.error?.message || 'No se pudo guardar el usuario.';
        this.formError.set(msg);
      },
    });
  }

  askDelete(user: ManagedUser): void {
    this.confirmDelete.set(user);
  }

  cancelDelete(): void {
    this.confirmDelete.set(null);
  }

  doDelete(): void {
    const user = this.confirmDelete();
    if (!user) return;
    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.confirmDelete.set(null);
        this.showToast('Usuario eliminado');
        this.load();
      },
      error: (err) => {
        this.confirmDelete.set(null);
        this.showToast(err?.error?.message || 'No se pudo eliminar el usuario');
      },
    });
  }

  appName(appId: number): string {
    return this.catalog().find((a) => a.id === appId)?.name ?? '';
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
