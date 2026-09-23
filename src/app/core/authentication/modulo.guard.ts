import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

import { CredentialsService } from './credentials.service';

/**
 * Restringe el acceso por URL directa según user_modulos / rol.
 * Uso: `canActivate: [ModuloGuard], data: { modulo: 'empleados' }`
 *      `canActivate: [ModuloGuard], data: { adminOnly: true }`
 *
 * El menú ya oculta los módulos sin permiso; este guard evita que el
 * usuario llegue escribiendo la URL. La API sigue siendo la que impone
 * la autorización real de los datos.
 */
export const ModuloGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const credentials = inject(CredentialsService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // En SSR no hay credenciales en localStorage: dejar pasar y que el cliente decida
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (credentials.isAdmin()) {
    return true;
  }

  const adminOnly = route.data['adminOnly'] === true;
  const modulo = route.data['modulo'] as string | undefined;

  if (adminOnly || (modulo && !credentials.hasModulo(modulo))) {
    router.navigate(['/admin/home'], { replaceUrl: true });
    return false;
  }

  return true;
};
