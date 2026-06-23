import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  cedula = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal('');
  loading = signal(false);
  shakeError = signal(false);

  activeSlide = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly slides = [
    {
      type: 'tagline' as const,
    },
    {
      type: 'features' as const,
      title: 'SIGCAN',
      subtitle: 'Sistema Integral de Gesti\u00f3n de Canastillas',
      icon: 'inventory_2',
      features: [
        { name: 'Alquileres', icon: 'handshake' },
        { name: 'Facturaci\u00f3n', icon: 'receipt_long' },
        { name: 'Inventario', icon: 'warehouse' },
        { name: 'Trazabilidad', icon: 'route' },
      ],
    },
    {
      type: 'info' as const,
      title: 'Pr\u00f3ximamente',
      subtitle: 'Software de Gesti\u00f3n Beneficio',
      description: 'Planta Bovino y Porcino. Un nuevo m\u00f3dulo en camino para gestionar todo el proceso de beneficio.',
      icon: 'precision_manufacturing',
    },
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.activeSlide.update((i) => (i + 1) % this.slides.length);
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  goToSlide(index: number): void {
    this.activeSlide.set(index);
  }

  onLogin(): void {
    if (!this.cedula || !this.password) {
      this.errorMessage.set('Ingresa tu c\u00e9dula y contrase\u00f1a');
      this.triggerShake();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.cedula, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/portal']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al iniciar sesi\u00f3n');
        this.triggerShake();
      },
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  private triggerShake(): void {
    this.shakeError.set(true);
    setTimeout(() => this.shakeError.set(false), 500);
  }

  onlyNumbers(event: KeyboardEvent): void {
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }
}
