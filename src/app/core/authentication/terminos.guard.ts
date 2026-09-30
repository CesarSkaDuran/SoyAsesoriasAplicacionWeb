import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CredentialsService } from './credentials.service';

/**
 * Gate de términos y condiciones: cualquier usuario autenticado que no
 * haya aceptado la versión vigente es redirigido a /terminos antes de
 * usar la plataforma. Sin aceptación no hay notificaciones externas.
 */
export const TerminosGuard: CanActivateFn = () => {
  const credentialsService = inject(CredentialsService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = credentialsService.user;

  // Solo los usuarios cliente (empresa/independiente) deben aceptar los
  // terminos: son quienes reciben notificaciones por canales externos.
  // El staff interno (admin) no pasa por el gate.
  const esCliente = user?.role === 'empresa' || user?.role === 'independiente';
  if (esCliente && user.terminos_aceptados !== true) {
    return router.parseUrl('/terminos');
  }

  return true;
};
