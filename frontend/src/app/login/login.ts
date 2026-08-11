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
      title: 'SIGCOM',
      subtitle: 'Gesti\u00f3n Comercial y Toma de Pedidos',
      logo: 'sigcom-app.png',
      features: [
        { name: 'Pedidos', icon: 'shopping_cart' },
        { name: 'Clientes', icon: 'groups' },
        { name: 'Precios y listas', icon: 'sell' },
        { name: 'Integraci\u00f3n Siesa', icon: 'sync_alt' },
      ],
    },
    {
      type: 'features' as const,
      title: 'SIGCOMPRO',
      subtitle: 'Operaciones, Despacho y Cuadre',
      logo: 'logocarnessantacruz.png',
      features: [
        { name: 'Pedidos', icon: 'receipt_long' },
        { name: 'Despacho', icon: 'local_shipping' },
        { name: 'Clientes', icon: 'groups' },
        { name: 'Cuadre de caja', icon: 'point_of_sale' },
      ],
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
