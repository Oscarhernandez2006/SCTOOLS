import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./login/login').then(m => m.Login), canActivate: [guestGuard] },
  { path: 'portal', loadComponent: () => import('./portal/portal').then(m => m.Portal), canActivate: [authGuard] },
  { path: 'admin/permisos', loadComponent: () => import('./admin/permissions/permissions').then(m => m.Permissions), canActivate: [adminGuard] },
  { path: 'admin/aplicaciones', loadComponent: () => import('./admin/applications/applications').then(m => m.ApplicationsAdmin), canActivate: [adminGuard] },
  { path: '**', redirectTo: 'login' },
];
