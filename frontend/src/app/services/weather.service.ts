import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** Clima compartido para todo el suite. Se consulta una sola vez y se cachea. */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  readonly temp = signal<number | null>(null);
  readonly icon = signal('');
  readonly desc = signal('');
  readonly city = signal('');

  private loaded = false;

  /** Carga el clima una única vez por sesión; llamadas posteriores no repiten la petición. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;

    const load = (lat: number, lon: number, city = '') => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      this.http.get<any>(url).subscribe({
        next: (res) => {
          this.temp.set(Math.round(res.current.temperature_2m));
          const code = res.current.weather_code;
          this.icon.set(this.iconFor(code));
          this.desc.set(this.descFor(code));
          if (city) this.city.set(city);
        },
        error: () => { this.loaded = false; },
      });
    };

    if (!navigator.geolocation) {
      load(4.71, -74.07, 'Bogotá');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(4.71, -74.07, 'Bogotá'),
    );
  }

  private iconFor(code: number): string {
    if (code === 0) return 'wb_sunny';
    if (code <= 3) return 'partly_cloudy_day';
    if (code <= 48) return 'cloud';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'weather_snowy';
    if (code <= 82) return 'thunderstorm';
    return 'cloud';
  }

  private descFor(code: number): string {
    if (code === 0) return 'Despejado';
    if (code <= 3) return 'Parcialmente nublado';
    if (code <= 48) return 'Nublado';
    if (code <= 55) return 'Llovizna';
    if (code <= 67) return 'Lluvia';
    if (code <= 77) return 'Nieve';
    if (code <= 82) return 'Aguacero';
    if (code <= 99) return 'Tormenta';
    return 'Variable';
  }
}
