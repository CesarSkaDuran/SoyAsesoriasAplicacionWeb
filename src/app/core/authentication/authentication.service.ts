import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { User } from '@/app/models/user.model';
import { Credentials, CredentialsService } from './credentials.service';

const routes = {
  login: () => `/auth/login`,
  refresh: () => `/auth/refresh`,
  logout: () => `/auth/logout`,
  changePassword: () => `/auth/change-password`,
  me: () => `/auth/me`,
};

// Marca para que el jwtInterceptor no intente refrescar sobre la propia
// llamada de refresh (evita bucle infinito).
export const SKIP_AUTH_RETRY = new HttpContextToken<boolean>(() => false);

export interface LoginContext {
  email: string;
  password: string;
  remember?: boolean;
}

interface LoginResponse {
  token: string;
  refresh_token: string;
  user: User;
}

/**
 * Provides a base for authentication workflow.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private httpClient = inject(HttpClient);
  private credentialsService = inject(CredentialsService);

  /**
   * Authenticates the user.
   */
  login(context: LoginContext): Observable<Credentials> {
    return this.httpClient.post<LoginResponse>(routes.login(), context).pipe(
      map((response) => ({
        access_token: response.token,
        refresh_token: response.refresh_token,
        user: response.user,
      })),
      tap((credentials) => this.credentialsService.setCredentials(credentials))
    );
  }

  /**
   * Renueva el par access+refresh. El backend rota el refresh token:
   * el viejo queda revocado en cada uso.
   */
  refresh(): Observable<Credentials> {
    const refreshToken = this.credentialsService.credentials?.refresh_token;
    return this.httpClient
      .post<LoginResponse>(
        routes.refresh(),
        { refresh_token: refreshToken },
        { context: new HttpContext().set(SKIP_AUTH_RETRY, true) }
      )
      .pipe(
        map((response) => ({
          access_token: response.token,
          refresh_token: response.refresh_token,
          user: response.user,
        })),
        tap((credentials) => this.credentialsService.setCredentials(credentials))
      );
  }

  changePassword(context: {
    current_password: string;
    new_password: string;
  }): Observable<Credentials> {
    return this.httpClient.put<LoginResponse>(routes.changePassword(), context).pipe(
      map((response) => ({
        access_token: response.token,
        refresh_token: response.refresh_token,
        user: response.user,
      })),
      tap((credentials) => this.credentialsService.setCredentials(credentials))
    );
  }

  /**
   * Logs out the user and clears credentials.
   */
  logout(): Observable<boolean> {
    const refreshToken = this.credentialsService.credentials?.refresh_token;
    this.credentialsService.setCredentials();
    if (refreshToken) {
      this.httpClient
        .post(routes.logout(), { refresh_token: refreshToken })
        .subscribe({ error: () => {} });
    }
    return of(true);
  }

  /**
   * Refreshes the current user data from the server.
   */
  checkUser(): Observable<User> {
    return this.httpClient.get<{ user: User }>(routes.me()).pipe(
      map((response) => response.user),
      switchMap((user) => {
        const credentials = this.credentialsService.credentials;
        if (credentials) {
          this.credentialsService.setCredentials({ ...credentials, user });
        }
        return of(user);
      })
    );
  }
}
