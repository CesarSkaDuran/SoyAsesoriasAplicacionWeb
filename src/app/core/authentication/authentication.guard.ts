import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { CredentialsService } from './credentials.service';

export const AuthenticationGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const credentialsService = inject(CredentialsService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // En SSR no hay localStorage: dejar pasar y que el cliente decida
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (credentialsService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/sign-in'], {
    queryParams: { redirect: state.url },
    replaceUrl: true,
  });
  return false;
};
