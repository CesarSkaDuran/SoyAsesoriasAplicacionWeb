import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { User } from '@/app/models/user.model';

@Injectable({ providedIn: 'root' })
export class CoreService {
  private platformId = inject(PLATFORM_ID);
  currentUser: User | null = null;

  setUser(user: User) {
    this.currentUser = user;
    this.cacheValue('current_user', user);
  }

  get user(): User | null {
    return this.currentUser;
  }

  get userFromCache(): User | null {
    return this.getValueFromCache('current_user');
  }

  loadUserFromCache() {
    this.currentUser = this.userFromCache;
  }

  private cacheValue(index: string, value: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(index, JSON.stringify(value));
    }
  }

  private getValueFromCache(index: string) {
    if (isPlatformBrowser(this.platformId)) {
      const value = localStorage.getItem(index);
      return value ? JSON.parse(value) : null;
    }
    return null;
  }
}
