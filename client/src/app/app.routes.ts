import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { redirectIfAuthenticated } from './guards/redirectIfAuthenticated.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Landing',
    canActivate: [redirectIfAuthenticated],
    loadComponent: () =>
      import('./pages/landing/landing.container').then(
        (m) => m.LandingContainer
      ),
  },
  {
    path: 'connect',
    title: 'Connections',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/connect/connect.container').then(
        (m) => m.ConnectContainer
      ),
  },
  { path: '**', redirectTo: '' },
];
