import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
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

function endSession(injector: Injector, credentialsService: CredentialsService) {
  if (!credentialsService.credentials) return;
  const router = injector.get(Router);
  const redirect = router.url;
  credentialsService.setCredentials();
  void router.navigate(['/auth/sign-in'], {
    queryParams: { redirect },
    replaceUrl: true,
  });
}

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
        !credentialsService.credentials
      ) {
        return throwError(() => err);
      }

      if (!credentialsService.credentials.refresh_token) {
        endSession(injector, credentialsService);
        return throwError(() => err);
      }

      refreshing$ ??= injector
        .get(AuthenticationService)
        .refresh()
        .pipe(
          catchError((refreshErr) => {
            if (refreshErr.status === 401) {
              endSession(injector, credentialsService);
            }
            return throwError(() => refreshErr);
          }),
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
          if (refreshErr.status === 401) {
            endSession(injector, credentialsService);
          }
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
