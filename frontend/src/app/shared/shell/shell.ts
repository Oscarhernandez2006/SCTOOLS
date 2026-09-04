import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from '../top-nav/top-nav';
import { PresenceService } from '../../services/presence.service';

/** Layout persistente: el nav se monta una sola vez y no se recrea al navegar entre páginas. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TopNav],
  template: `
    <app-top-nav />
    <router-outlet />
  `,
})
export class Shell implements OnInit {
  private presence = inject(PresenceService);

  ngOnInit(): void {
    // Monitoreo global: arranca al entrar a cualquier página autenticada (no
    // solo el dashboard) y sobrevive a recargas/navegación. Idempotente.
    if (localStorage.getItem('sc_tools_token')) {
      this.presence.init();
    }
  }
}
