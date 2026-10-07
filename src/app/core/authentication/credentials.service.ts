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
  readonly credentialsState = this._credentials.asReadonly();

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

  /**
   * Staff interno (admin o asesor): ve las acciones de módulo en la UI.
   * La diferencia real la impone el API: el asesor necesita el módulo
   * habilitado en user_modulos; el admin tiene acceso irrestricto.
   */
  isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'asesor';
  }

  /** Solo el administrador irrestricto (configuración, usuarios, auditoría). */
  isSuperAdmin(): boolean {
    return this.role === 'admin';
  }

  hasModulo(modulo: string): boolean {
    const user = this.user;
    if (!user) return false;
    if (user.role === 'admin') return true;
    const modulos = user.modulos as Record<string, unknown> | undefined;
    const configurado = !!modulos && Object.keys(modulos).length > 0;
    // Cliente sin checks configurados (dato viejo): conserva el acceso
    // base. Con checks definidos por el admin, el check manda.
    if ((user.role === 'empresa' || user.role === 'independiente') && !configurado) {
      return true;
    }
    return !!user.modulos?.[modulo as keyof User['modulos']];
  }

  /** Marca los terminos como aceptados en la sesion guardada */
  markTerminosAceptados() {
    const c = this._credentials();
    if (c?.user) {
      this.setCredentials({ ...c, user: { ...c.user, terminos_aceptados: true } });
    }
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
