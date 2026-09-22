import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { User } from '@/app/models/user.model';
import { Credentials, CredentialsService } from './credentials.service';

const routes = {
  login: () => `/auth/login`,
  logout: () => `/auth/logout`,
  me: () => `/auth/me`,
};

export interface LoginContext {
  email: string;
  password: string;
  remember?: boolean;
}

interface LoginResponse {
  token: string;
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
        user: response.user,
      })),
      tap((credentials) => this.credentialsService.setCredentials(credentials))
    );
  }

  /**
   * Logs out the user and clears credentials.
   */
  logout(): Observable<boolean> {
    this.credentialsService.setCredentials();
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
