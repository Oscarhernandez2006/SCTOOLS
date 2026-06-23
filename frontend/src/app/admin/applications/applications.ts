import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, ApplicationPayload, ManagedApplication } from '../../services/admin.service';

type FormModel = ApplicationPayload & { id: number | null };

/** Catálogo curado de íconos Material Symbols para el selector. */
const ICON_OPTIONS: string[] = [
  'apps', 'dashboard', 'grid_view', 'widgets', 'inventory_2', 'inventory', 'warehouse',
  'forklift', 'pallet', 'package_2', 'local_shipping', 'shopping_cart', 'store',
  'storefront', 'sell', 'local_offer', 'redeem', 'card_giftcard', 'receipt_long',
  'description', 'assignment', 'fact_check', 'task', 'checklist', 'event', 'calendar_month',
  'schedule', 'payments', 'account_balance', 'attach_money', 'paid', 'savings',
  'request_quote', 'badge', 'group', 'groups', 'person', 'manage_accounts',
  'support_agent', 'headset_mic', 'build', 'handyman', 'construction', 'engineering',
  'settings', 'tune', 'monitoring', 'analytics', 'bar_chart', 'pie_chart', 'trending_up',
  'insights', 'table_chart', 'folder', 'folder_open', 'cloud', 'cloud_upload', 'database',
  'dns', 'lan', 'hub', 'devices', 'computer', 'smartphone', 'qr_code', 'qr_code_scanner',
  'label', 'water_drop', 'recycling', 'eco', 'agriculture', 'factory', 'scale', 'balance',
  'gavel', 'verified', 'shield', 'lock', 'key', 'vpn_key', 'mail', 'chat', 'forum', 'call',
  'notifications', 'campaign', 'map', 'location_on', 'route', 'local_cafe', 'restaurant',
  'science', 'biotech', 'medical_services', 'health_and_safety', 'vaccines', 'school',
  'menu_book', 'work', 'business', 'corporate_fare', 'home', 'apartment',
];

/** Tamaño máximo del logo permitido (en bytes). */
const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

function emptyForm(): FormModel {
  return {
    id: null,
    slug: '',
    name: '',
    description: '',
    icon: 'apps',
    url: '',
    category: '',
    color: '#3D7A5F',
    logo: '',
    keywords: '',
    type: 'app',
    sso_enabled: false,
    is_active: true,
    sort_order: 0,
  };
}

@Component({
  selector: 'app-applications-admin',
  imports: [FormsModule],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
})
export class ApplicationsAdmin implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly apps = signal<ManagedApplication[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly modalOpen = signal(false);
  readonly editing = signal(false);
  readonly form = signal<FormModel>(emptyForm());
  readonly formError = signal('');

  readonly confirmDelete = signal<ManagedApplication | null>(null);

  readonly toastMessage = signal('');
  readonly toastVisible = signal(false);

  readonly searchQuery = signal('');

  // ---- Selector de íconos ----
  readonly iconPickerOpen = signal(false);
  readonly iconSearch = signal('');
  readonly filteredIcons = computed(() => {
    const q = this.iconSearch().trim().toLowerCase();
    const list = q ? ICON_OPTIONS.filter((i) => i.includes(q)) : ICON_OPTIONS;
    return list.slice(0, 60);
  });

  // ---- Logo ----
  readonly logoError = signal('');

  readonly filteredApps = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.apps();
    return this.apps().filter(
      (a) => a.name.toLowerCase().includes(q) || (a.category ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getManagedApplications().subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.set(emptyForm());
    this.editing.set(false);
    this.formError.set('');
    this.logoError.set('');
    this.iconPickerOpen.set(false);
    this.modalOpen.set(true);
  }

  openEdit(app: ManagedApplication): void {
    this.form.set({
      id: app.id,
      slug: app.slug,
      name: app.name,
      description: app.description ?? '',
      icon: app.icon ?? 'apps',
      url: app.url,
      category: app.category ?? '',
      color: app.color ?? '#3D7A5F',
      logo: app.logo ?? '',
      keywords: app.keywords ?? '',
      type: app.type,
      sso_enabled: app.sso_enabled,
      is_active: app.is_active,
      sort_order: app.sort_order,
    });
    this.editing.set(true);
    this.formError.set('');
    this.logoError.set('');
    this.iconPickerOpen.set(false);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  /** Auto-genera el slug a partir del nombre si el usuario no lo ha tocado manualmente. */
  onNameChange(value: string): void {
    const f = this.form();
    const autoSlug = this.slugify(f.name);
    const next = { ...f, name: value };
    if (!this.editing() && (f.slug === '' || f.slug === autoSlug)) {
      next.slug = this.slugify(value);
    }
    this.form.set(next);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  updateField<K extends keyof FormModel>(key: K, value: FormModel[K]): void {
    this.form.set({ ...this.form(), [key]: value });
  }

  // ---- Selector de íconos ----
  toggleIconPicker(): void {
    this.iconPickerOpen.set(!this.iconPickerOpen());
  }

  selectIcon(icon: string): void {
    this.updateField('icon', icon);
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
  }

  // ---- Subida de logo ----
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.logoError.set('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.logoError.set('El archivo debe ser una imagen.');
      input.value = '';
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.logoError.set('La imagen supera 1 MB. Usa una más liviana.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.updateField('logo', reader.result as string);
    };
    reader.onerror = () => this.logoError.set('No se pudo leer la imagen.');
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeLogo(): void {
    this.updateField('logo', '');
    this.logoError.set('');
  }

  save(): void {
    if (this.saving()) return;
    const f = this.form();

    if (!f.name.trim() || !f.slug.trim() || !f.url.trim()) {
      this.formError.set('Nombre, identificador y enlace son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload: ApplicationPayload = {
      slug: f.slug.trim(),
      name: f.name.trim(),
      description: f.description?.trim() || null,
      icon: f.icon?.trim() || null,
      url: f.url.trim(),
      category: f.category?.trim() || null,
      color: f.color || null,
      logo: f.logo?.trim() || null,
      keywords: f.keywords?.trim() || null,
      type: f.type,
      sso_enabled: f.sso_enabled,
      is_active: f.is_active,
      sort_order: Number(f.sort_order) || 0,
    };

    const request$ = this.editing() && f.id
      ? this.adminService.updateApplication(f.id, payload)
      : this.adminService.createApplication(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.showToast(this.editing() ? 'Aplicación actualizada' : 'Aplicación creada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message || err?.error?.errors
          ? Object.values(err.error.errors ?? {}).flat().join(' ') || err.error.message
          : 'No se pudo guardar la aplicación.';
        this.formError.set(msg);
      },
    });
  }

  askDelete(app: ManagedApplication): void {
    this.confirmDelete.set(app);
  }

  cancelDelete(): void {
    this.confirmDelete.set(null);
  }

  doDelete(): void {
    const app = this.confirmDelete();
    if (!app) return;
    this.adminService.deleteApplication(app.id).subscribe({
      next: () => {
        this.confirmDelete.set(null);
        this.showToast('Aplicación eliminada');
        this.load();
      },
      error: () => {
        this.confirmDelete.set(null);
        this.showToast('No se pudo eliminar la aplicación');
      },
    });
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
