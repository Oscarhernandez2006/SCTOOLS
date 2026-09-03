import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from '../top-nav/top-nav';

/** Layout persistente: el nav se monta una sola vez y no se recrea al navegar entre páginas. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TopNav],
  template: `
    <app-top-nav />
    <router-outlet />
  `,
})
export class Shell {}
