import { Component, input } from '@angular/core';

@Component({
  selector: 'sc-data-surface',
  standalone: true,
  templateUrl: './data-surface.html',
  styleUrl: './data-surface.scss',
})
export class DataSurface {
  readonly compact = input(false);
}
