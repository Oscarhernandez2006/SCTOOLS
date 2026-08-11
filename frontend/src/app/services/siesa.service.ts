import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SiesaStatus {
  has_credentials: boolean;
  domain: string;
  username: string | null;
}

export interface SiesaLaunchData {
  username: string;
  password: string;
  domain: string;
  server: string;
  port: string;
  lang: string;
  html5_url: string;
  return_url: string;
  login_url: string;
}

@Injectable({ providedIn: 'root' })
export class SiesaService {
  private http = inject(HttpClient);

  /** URL del portal de Siesa que se abre desde la suite. */
  readonly siesaUrl = 'https://carnesantacruzapp.siesacloud.com/';

  /** Estado de las credenciales Siesa del usuario (sin exponer la contraseña). */
  getStatus(): Observable<SiesaStatus> {
    return this.http.get<SiesaStatus>('/api/siesa/credentials');
  }

  /**
   * Datos para el auto-login sin extensión: piezas para armar el blob del
   * cliente HTML5 de Siesa. Responde 404 si el usuario no tiene credenciales.
   */
  getLaunchData(): Observable<SiesaLaunchData> {
    return this.http.get<SiesaLaunchData>('/api/siesa/launch');
  }

  /** Guarda/actualiza las credenciales Siesa (cifradas en el backend). */
  saveCredentials(username: string, password: string, domain?: string): Observable<SiesaStatus & { message: string }> {
    return this.http.post<SiesaStatus & { message: string }>('/api/siesa/credentials', {
      username,
      password,
      domain,
    });
  }

  /** Elimina las credenciales Siesa del usuario. */
  deleteCredentials(): Observable<{ message: string; has_credentials: boolean }> {
    return this.http.delete<{ message: string; has_credentials: boolean }>('/api/siesa/credentials');
  }
}
