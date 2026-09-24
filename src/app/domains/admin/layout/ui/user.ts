import { Component, computed, inject } from '@angular/core';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AuthenticationService } from '@/app/core/authentication/authentication.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Scheme, Theming } from '@/app/core/theming';
import { userFullName } from '@/app/models/user.model';
import { ChangePasswordDialog } from './change-password.dialog';

@Component({
  selector: 'user',
  imports: [
    MatDivider,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatPseudoCheckbox,
    MatMenuTrigger,
  ],
  templateUrl: './user.html',
})
export class User {
  // Dependencies
  private theming = inject(Theming);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private authService = inject(AuthenticationService);
  private credentialsService = inject(CredentialsService);

  // State
  protected user = computed(() => this.credentialsService.user);
  protected fullName = computed(() => userFullName(this.user()));
  protected initials = computed(() => {
    const name = this.fullName() || this.user()?.email || '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  });
  protected subtitle = computed(() => {
    const user = this.user();
    if (user?.role === 'admin') return 'Administrador';
    return user?.empresa?.razon_social ?? user?.email ?? '';
  });
  protected scheme = computed(() => this.theming.scheme());
  protected schemes: { label: string; value: Scheme }[] = [
    { label: 'Claro', value: 'light' },
    { label: 'Oscuro', value: 'dark' },
    { label: 'Sistema', value: 'system' },
  ];

  updateScheme(scheme: Scheme) {
    this.theming.scheme.set(scheme);
  }

  openChangePassword() {
    this.dialog.open(ChangePasswordDialog, {
      width: '440px',
      maxWidth: '95vw',
    });
  }

  signOut() {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/sign-in');
    });
  }
}
