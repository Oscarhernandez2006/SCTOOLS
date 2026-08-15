import { DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * Base para gráficas SVG responsive: expone el ancho real del host mediante
 * un `ResizeObserver`, de modo que el SVG se dibuja con dimensiones en píxeles
 * (texto nítido, sin distorsión) y se adapta a desktop, tablet y móvil.
 */
export abstract class ResponsiveChart {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: ResizeObserver;

  /** Ancho disponible del contenedor, en píxeles. */
  protected readonly width = signal(0);

  constructor() {
    afterNextRender(() => {
      this.observer = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0) this.width.set(Math.round(w));
      });
      this.observer.observe(this.hostEl.nativeElement);
      this.width.set(Math.round(this.hostEl.nativeElement.clientWidth));
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  /** True cuando el viewport es estrecho (ajustes específicos para móvil). */
  protected readonly isCompact = () => this.width() > 0 && this.width() < 420;
}
