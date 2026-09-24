import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { CdkMonitorFocus } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import {
  isActive,
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, take } from 'rxjs';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import {
  NAVIGATION,
  NavigationItem,
} from '@/app/domains/admin/layout/data/navigation';

@Component({
  selector: 'navigation',
  imports: [
    MatIcon,
    NgTemplateOutlet,
    RouterLinkActive,
    Tree,
    TreeItem,
    TreeItemGroup,
    RouterLink,
    CdkMonitorFocus,
  ],
  templateUrl: './navigation.html',
})
export class Navigation {
  // Dependencies
  private router = inject(Router);
  private credentialsService = inject(CredentialsService);

  // State
  protected navigation = signal<NavigationItem[]>(this.filterByRole(NAVIGATION));
  protected navigationEnd = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      take(1)
    )
  );

  constructor() {
    // Expand active route on initial load
    effect(() => {
      const navigationEnd = this.navigationEnd();
      if (!navigationEnd) {
        return;
      }

      this.navigation.set(this.expandActiveRoute(this.navigation()));
    });
  }

  /**
   * Filter navigation by role and user_modulos permissions.
   * Admin sees everything; empresa/independiente see their allowed modules.
   */
  filterByRole(items: NavigationItem[]): NavigationItem[] {
    return items
      .map((section) => ({
        ...section,
        children: (section.children ?? []).filter((item) => {
          if (item.adminOnly) return this.credentialsService.isAdmin();
          if (item.empresaOnly) {
            return !!this.credentialsService.user?.empresa?.id;
          }
          if (item.modulo) return this.credentialsService.hasModulo(item.modulo);
          return true;
        }),
      }))
      .filter((section) => !section.children || section.children.length > 0);
  }

  /**
   * Expand all parent routes of the active route.
   * @param items
   */
  expandActiveRoute(items: NavigationItem[]): NavigationItem[] {
    for (const item of items) {
      if (item.children?.length) {
        item.children = this.expandActiveRoute(item.children);

        if (item.children.some((child) => child.expanded)) {
          item.expanded = true;
        }
      }

      if (
        item.route &&
        isActive(
          item.route,
          this.router,
          this.isActiveOption(item.activeOptions ?? { exact: true })
        )()
      ) {
        item.expanded = true;
      }
    }
    return items;
  }

  /**
   * Convert simple exact option to full IsActiveMatchOptions.
   * @param options
   */
  isActiveOption(
    options: { exact: boolean } | IsActiveMatchOptions
  ): IsActiveMatchOptions {
    if ('exact' in options) {
      return options.exact
        ? {
            paths: 'exact',
            queryParams: 'exact',
            fragment: 'ignored',
            matrixParams: 'ignored',
          }
        : {
            paths: 'subset',
            queryParams: 'subset',
            fragment: 'ignored',
            matrixParams: 'ignored',
          };
    }

    return options;
  }
}
