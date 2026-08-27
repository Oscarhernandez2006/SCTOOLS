import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'suite-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem(THEME_KEY);
    const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches);
    this.apply(dark);
  }

  toggle(): void { this.apply(!this.isDark()); }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }
}
