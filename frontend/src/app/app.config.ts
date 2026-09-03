import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

/** Tras un despliegue nuevo, los chunks viejos dejan de existir (404). Recarga una vez para tomar el index.html fresco. */
function recoverFromStaleChunk(error: unknown): void {
  const message = String((error as { message?: string })?.message ?? error);
  const isChunkError = /dynamically imported module|ChunkLoadError|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(message);
  if (!isChunkError) return;
  const KEY = 'sc-chunk-reload-at';
  const last = Number(sessionStorage.getItem(KEY) ?? 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    location.reload();
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withNavigationErrorHandler(recoverFromStaleChunk)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
  ]
};
