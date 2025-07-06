import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const redirectIfAuthenticated: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return auth.user$() ? router.parseUrl('/connect') : true;
};
