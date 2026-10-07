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

  // Solo el admin irrestricto salta todos los chequeos; el asesor
  // (staff limitado) sigue evaluado por user_modulos.
  if (credentials.isSuperAdmin()) {
    return true;
  }

  const adminOnly = route.data['adminOnly'] === true;
  const modulo = route.data['modulo'] as string | undefined;

  // Zonas adminOnly solo las abre un asesor si el item declara su modulo
  // y lo tiene habilitado (p. ej. { adminOnly: true, modulo: 'gastos' }).
  const asesorConModulo =
    credentials.role === 'asesor' && !!modulo && credentials.hasModulo(modulo);

  if ((adminOnly && !asesorConModulo) || (modulo && !credentials.hasModulo(modulo))) {
    router.navigate(['/admin/sin-acceso'], {
      queryParams: modulo ? { m: modulo } : {},
      replaceUrl: true,
    });
    return false;
  }

  return true;
};
