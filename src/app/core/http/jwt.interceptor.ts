import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

import {
  AuthenticationService,
  SKIP_AUTH_RETRY,
} from '@/app/core/authentication/authentication.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Credentials } from '@/app/core/authentication/credentials.service';

// Refresh compartido: si varias peticiones reciben 401 a la vez,
// solo se hace una llamada a /auth/refresh.
let refreshing$: Observable<Credentials> | null = null;

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  const credentialsService = injector.get(CredentialsService);
  const credentials = credentialsService.credentials;

  if (credentials?.access_token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${credentials.access_token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((err) => {
      const isAuthCall =
        request.url.includes('/auth/login') ||
        request.url.includes('/auth/refresh');

      if (
        err.status !== 401 ||
        isAuthCall ||
        request.context.get(SKIP_AUTH_RETRY) ||
        !credentialsService.credentials?.refresh_token
      ) {
        return throwError(() => err);
      }

      refreshing$ ??= injector
        .get(AuthenticationService)
        .refresh()
        .pipe(
          shareReplay(1),
          tap({ finalize: () => (refreshing$ = null) })
        );

      return refreshing$.pipe(
        switchMap((creds) => {
          const retried = request.clone({
            setHeaders: {
              Authorization: `Bearer ${creds.access_token}`,
            },
          });
          return next(retried);
        }),
        catchError((refreshErr) => {
          credentialsService.setCredentials();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
