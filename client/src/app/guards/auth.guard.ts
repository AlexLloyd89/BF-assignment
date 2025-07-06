import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authSvc = inject(AuthService);

  const user = authSvc.user$();

  return user ? true : router.parseUrl('/');
};
