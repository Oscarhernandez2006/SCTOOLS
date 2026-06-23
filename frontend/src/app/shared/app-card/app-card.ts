import { Component, input, output } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

export interface AppCardData {
  name: string;
  description: string;
  icon: string;
  url: string;
  category: string;
  color: string;
  logo?: string;
  keywords?: string;
  slug?: string;
  ssoEnabled?: boolean;
}

@Component({
  selector: 'app-card',
  templateUrl: './app-card.html',
  styleUrl: './app-card.scss',
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class AppCard {
  data = input.required<AppCardData>();
  cardClick = output<AppCardData>();

  onClick(): void {
    this.cardClick.emit(this.data());
  }
}
