import { HttpInterceptorFn } from '@angular/common/http';

import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { inject } from '@angular/core';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const credentialsService = inject(CredentialsService);
  const credentials = credentialsService.credentials;

  if (credentials?.access_token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${credentials.access_token}`,
      },
    });
  }

  return next(request);
};
