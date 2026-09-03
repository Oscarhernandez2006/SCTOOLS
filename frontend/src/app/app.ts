import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor() {
    // El modo oscuro fue retirado: limpiar cualquier resto persistido de sesiones previas.
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('suite-theme');
  }
}
