import { Component, OnInit, inject, signal } from '@angular/core';
import { SiesaService, SiesaLaunchData } from '../services/siesa.service';

/**
 * Auto-login puro de Siesa (sin extensión). Obtiene las credenciales del
 * usuario desde la Suite, arma el "blob" del cliente HTML5 de Siesa (Ericom
 * AccessNow) tal como lo hace la propia página de Siesa, lo coloca en
 * window.name (que persiste entre dominios) y redirige a html5.html, que abre
 * la sesión ya autenticada.
 */
@Component({
  selector: 'app-siesa-launch',
  imports: [],
  templateUrl: './siesa-launch.html',
  styleUrl: './siesa-launch.scss',
})
export class SiesaLaunch implements OnInit {
  private siesa = inject(SiesaService);

  status = signal<'loading' | 'error'>('loading');
  message = signal('Conectando con Siesa…');

  ngOnInit(): void {
    this.siesa.getLaunchData().subscribe({
      next: (data) => this.openSiesa(data),
      error: (err) => {
        if (err?.status === 404) {
          // Sin credenciales guardadas: enviar al login manual de Siesa.
          window.location.href = 'https://carnesantacruzapp.siesacloud.com/';
          return;
        }
        this.status.set('error');
        this.message.set('No se pudo iniciar la sesión de Siesa. Intenta de nuevo.');
      },
    });
  }

  private openSiesa(d: SiesaLaunchData): void {
    // Formato idéntico al de forHTML5() de Siesa.
    const rand = Math.floor(Math.random() * 1000);
    const s =
      'var randomnum = ' + rand + ';' +
      "window.cmdline='';" +
      "window.user='" + d.username + "';" +
      "window.pass='" + d.password + "';" +
      "window.code='';" +
      "window.server='" + d.server + "';" +
      "window.port='" + d.port + "';" +
      "window.webport='" + d.port + "';" +
      "window.lang='" + d.lang + "';" +
      "window.domain='" + d.domain + "';" +
      "applications_portal_return_url='" + d.return_url + "';";

    // Siesa codifica con jsencode64(escape(s)), cuyo resultado es base64 de la
    // cadena cruda (no percent-encoded). Lo replicamos byte a byte de forma
    // segura para UTF-8 con btoa(unescape(encodeURIComponent(...))).
    const blob = btoa(unescape(encodeURIComponent(s))).replace(/=/g, '_');
    // window.name persiste al navegar a otro dominio; el cliente de Siesa lo lee.
    window.name = ' ' + blob;
    window.location.href = d.html5_url;
  }
}
