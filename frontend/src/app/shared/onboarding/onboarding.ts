import { Component, EventEmitter, Output, signal } from '@angular/core';

interface Step {
  icon: string;
  title: string;
  text: string;
  highlight?: string;
}

const STEPS: Step[] = [
  {
    icon: 'waving_hand',
    title: '¡Bienvenido/a a SantaCruz Suite!',
    text: 'Este portal centraliza todas las herramientas del grupo. En unos pasos te mostramos cómo sacarle el máximo partido.',
  },
  {
    icon: 'grid_view',
    title: 'Tus aplicaciones',
    text: 'En "Aplicaciones" verás todas las herramientas a las que tienes acceso. Haz clic en una card para abrirla con inicio de sesión automático.',
  },
  {
    icon: 'search',
    title: 'Búsqueda rápida (Ctrl+K)',
    text: 'Pulsa Ctrl+K en cualquier momento para buscar apps y secciones sin mover el mouse.',
  },
  {
    icon: 'person',
    title: 'Tu perfil',
    text: 'En el menú de usuario (arriba a la derecha) accede a tu perfil, cambia tu contraseña y revisa tu historial de accesos.',
  },
];

@Component({
  selector: 'sc-onboarding',
  standalone: true,
  imports: [],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingTour {
  @Output() done = new EventEmitter<void>();

  readonly step = signal(0);

  readonly steps = STEPS;

  get current(): Step { return STEPS[this.step()]; }
  get total(): number { return STEPS.length; }
  get isLast(): boolean { return this.step() === STEPS.length - 1; }

  next(): void {
    if (this.isLast) { this.finish(); return; }
    this.step.update((i) => i + 1);
  }

  skip(): void { this.finish(); }

  private finish(): void {
    localStorage.setItem('suite-onboarding-done', '1');
    this.done.emit();
  }
}
