import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartValueFormat, categoricalColor } from './chart-theme';
import { formatValueFull } from './chart-format';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}

/**
 * Barras horizontales — ideales para rankings y comparaciones entre categorías.
 * Texto nítido (HTML), ancho relativo al máximo, orden preservado del origen.
 */
@Component({
  selector: 'sc-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bc" role="list">
      @for (row of rows(); track row.label; let i = $index) {
        <div class="bc__row" role="listitem" [attr.aria-label]="row.label + ': ' + fullValue(row.value)">
          <span class="bc__label" [title]="row.label">
            @if (row.icon) {
              <span class="material-symbols-outlined bc__icon" [style.color]="row.color">{{ row.icon }}</span>
            }
            {{ row.label }}
          </span>
          <div class="bc__track">
            <div
              class="bc__fill"
              [style.width.%]="row.pct"
              [style.background]="row.color"
              [title]="row.label + ' — ' + fullValue(row.value)"
            ></div>
          </div>
          <span class="bc__value">{{ fullValue(row.value) }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .bc {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        width: 100%;
      }
      .bc__row {
        display: grid;
        grid-template-columns: minmax(90px, 168px) 1fr auto;
        align-items: center;
        gap: 0.75rem;
      }
      .bc__label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.82rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bc__icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      .bc__track {
        height: 10px;
        background: #eef2f0;
        border-radius: 999px;
        overflow: hidden;
      }
      .bc__fill {
        height: 100%;
        min-width: 3px;
        border-radius: 999px;
        transition: width var(--transition-slow);
      }
      .bc__value {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--color-text-primary);
        text-align: right;
        min-width: 2.5ch;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 520px) {
        .bc__row {
          grid-template-columns: minmax(72px, 110px) 1fr auto;
          gap: 0.5rem;
        }
        .bc__label {
          font-size: 0.76rem;
        }
      }
    `,
  ],
})
export class BarChart {
  readonly data = input<BarDatum[]>([]);
  readonly valueFormat = input<ChartValueFormat>('number');
  readonly maxItems = input<number>(0);

  readonly rows = computed(() => {
    const items = this.data();
    const limited = this.maxItems() > 0 ? items.slice(0, this.maxItems()) : items;
    const max = Math.max(1, ...limited.map((d) => d.value));
    return limited.map((d, i) => ({
      ...d,
      color: d.color || categoricalColor(i),
      pct: Math.max(2, Math.round((d.value / max) * 100)),
    }));
  });

  fullValue(v: number): string {
    return formatValueFull(v, this.valueFormat());
  }
}
