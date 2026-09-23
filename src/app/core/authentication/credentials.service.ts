import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { User, UserRole } from '@/app/models/user.model';

export interface Credentials {
  access_token: string;
  refresh_token: string;
  user: User;
}

const credentialsKey = 'credentials';

/**
 * Provides storage for authentication credentials.
 */
@Injectable({ providedIn: 'root' })
export class CredentialsService {
  private platformId = inject(PLATFORM_ID);
  private _credentials = signal<Credentials | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedCredentials = localStorage.getItem(credentialsKey);
      if (savedCredentials) {
        try {
          this._credentials.set(JSON.parse(savedCredentials));
        } catch {
          this._credentials.set(null);
        }
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.credentials;
  }

  get credentials(): Credentials | null {
    return this._credentials();
  }

  get user(): User | null {
    return this._credentials()?.user ?? null;
  }

  get role(): UserRole | null {
    return this.user?.role ?? null;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  hasModulo(modulo: string): boolean {
    const user = this.user;
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!user.modulos?.[modulo as keyof User['modulos']];
  }

  setCredentials(credentials?: Credentials) {
    this._credentials.set(credentials || null);

    if (isPlatformBrowser(this.platformId)) {
      if (credentials) {
        localStorage.setItem(credentialsKey, JSON.stringify(credentials));
      } else {
        localStorage.removeItem(credentialsKey);
      }
    }
  }
}
