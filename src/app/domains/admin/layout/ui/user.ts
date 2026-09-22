import { Component, computed, inject } from '@angular/core';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AuthenticationService } from '@/app/core/authentication/authentication.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Scheme, Theming } from '@/app/core/theming';
import { userFullName } from '@/app/models/user.model';

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
  template: `
    <button
      class="flex w-full cursor-pointer items-center gap-x-3 rounded-xl p-2 text-left hover:bg-neutral-700/10 dark:hover:bg-neutral-300/10"
      [matMenuTriggerFor]="userMenu"
    >
      <div
        class="flex size-9 items-center justify-center rounded-lg bg-blue-600 font-semibold text-white"
      >
        {{ initials() }}
      </div>
      <div class="flex min-w-0 flex-auto flex-col select-none">
        <div class="truncate font-medium">{{ fullName() }}</div>
        <div class="text-on-surface-variant truncate text-sm">
          {{ subtitle() }}
        </div>
      </div>
      <mat-icon
        class="size-4"
        svgIcon="ellipsis-vertical"
      />
    </button>

    <mat-menu
      class="min-w-60"
      xPosition="before"
      yPosition="above"
      #userMenu="matMenu"
    >
      <button
        class="py-2 [&>span]:flex [&>span]:items-center"
        mat-menu-item
      >
        <div
          class="flex size-9 items-center justify-center rounded-lg bg-blue-600 font-semibold text-white"
        >
          {{ initials() }}
        </div>
        <div class="ml-3 flex min-w-0 flex-auto flex-col select-none">
          <div class="truncate font-medium">{{ fullName() }}</div>
          <div class="text-on-surface-variant truncate text-xs">
            {{ user()?.email }}
          </div>
        </div>
      </button>
      <mat-divider />
      <button
        mat-menu-item
        [matMenuTriggerFor]="appearanceMenu"
      >
        <mat-icon svgIcon="sun-moon" />
        Apariencia
      </button>
      <mat-divider />
      <button
        mat-menu-item
        (click)="signOut()"
      >
        <mat-icon svgIcon="log-out" />
        Cerrar sesión
      </button>
    </mat-menu>

    <mat-menu #appearanceMenu="matMenu">
      @for (item of schemes; track item.value) {
        <button
          mat-menu-item
          (click)="updateScheme(item.value)"
        >
          <mat-pseudo-checkbox
            appearance="minimal"
            class="mr-2"
            [state]="scheme() === item.value ? 'checked' : 'unchecked'"
          />
          <span>{{ item.label }}</span>
        </button>
      }
    </mat-menu>
  `,
})
export class User {
  // Dependencies
  private theming = inject(Theming);
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

  signOut() {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/sign-in');
    });
  }
}
