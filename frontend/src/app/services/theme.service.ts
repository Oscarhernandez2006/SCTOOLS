import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'suite-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    // Solo se activa si el usuario lo guardó explícitamente — sin auto-detect por SO
    const saved = localStorage.getItem(THEME_KEY);
    this.apply(saved === 'dark');
  }

  toggle(): void { this.apply(!this.isDark()); }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }
}
