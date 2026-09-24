import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { Media } from '@/app/core/media';
import { LanguageSwitcher } from '@/app/domains/admin/layout/ui/language-switcher';
import { Notifications } from '@/app/domains/admin/layout/ui/notifications';
import { SchemeSwitcher } from '@/app/domains/admin/layout/ui/scheme-switcher';
import { Shortcuts } from '@/app/domains/admin/layout/ui/shortcuts';
import { AdminSidebar } from '@/app/domains/admin/layout/ui/sidebar';

@Component({
  selector: 'admin-layout',
  imports: [
    MatIconModule,
    MatButtonModule,
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    AdminSidebar,
    SchemeSwitcher,
    Notifications,
    LanguageSwitcher,
    Shortcuts,
  ],
  templateUrl: './layout.view.html',
})
export class AdminLayout {
  // Dependencies
  private media = inject(Media);

  // State
  protected isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );
}
