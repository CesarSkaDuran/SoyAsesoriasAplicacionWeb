import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { CdkMonitorFocus } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
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
import { SolicitarModuloDialog } from '@/app/domains/admin/layout/ui/solicitar-modulo.dialog';

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
  private dialog = inject(MatDialog);

  // State
  protected navigation = signal<NavigationItem[]>(this.filterByRole(NAVIGATION));

  // Tooltip del candado: al asesor le falta permiso (lo otorga el admin);
  // al cliente le falta cobertura del plan (lo vende SoyAsesorías).
  protected readonly lockedMessage =
    this.credentialsService.role === 'asesor'
      ? 'No tienes permisos para ingresar a este módulo'
      : 'Tu plan no cubre este módulo. Toca para solicitarlo a SoyAsesorías';

  // Solo el cliente puede solicitar el módulo bloqueado desde el menú;
  // el asesor depende del admin y solo ve el tooltip.
  protected readonly lockedClickable =
    this.credentialsService.role === 'empresa' ||
    this.credentialsService.role === 'independiente';

  /** Candado: cliente → diálogo de solicitud; asesor → sin acción. */
  protected onLockedClick(node: NavigationItem, event: Event) {
    event.preventDefault();
    if (this.lockedClickable) {
      this.dialog.open(SolicitarModuloDialog, {
        data: { label: node.label },
      });
    }
  }
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
   * Construye la navegación por rol. El admin ve todo habilitado; clientes
   * y asesores ven los módulos sin permiso deshabilitados con candado en
   * vez de ocultos. Las opciones puramente administrativas no aplican a
   * clientes y sí se ocultan.
   */
  filterByRole(items: NavigationItem[]): NavigationItem[] {
    return items
      .map((section) => ({
        ...section,
        children: (section.children ?? [])
          .map((item) => this.applyAccess(item))
          .filter((item): item is NavigationItem => !!item),
      }))
      .filter((section) => !section.children || section.children.length > 0);
  }

  /**
   * Devuelve el item habilitado o bloqueado (`disabled`), o null cuando la
   * opción no aplica al rol y debe ocultarse (adminOnly para clientes,
   * empresaOnly sin empresa).
   */
  private applyAccess(item: NavigationItem): NavigationItem | null {
    const children = item.children
      ?.map((child) => this.applyAccess(child))
      .filter((child): child is NavigationItem => !!child);

    // Grupo que quedó sin opciones visibles: se oculta completo
    if (item.children && children?.length === 0) return null;

    const node: NavigationItem = children ? { ...item, children } : item;

    // Ligado a tener empresa propia: solo aplica a usuarios empresa,
    // incluso el admin no tiene empresa asociada.
    if (node.empresaOnly) {
      return this.credentialsService.user?.empresa?.id ? node : null;
    }

    // No aplica al cliente independiente (p. ej. Empleados): se oculta.
    if (
      node.empresaClienteOnly &&
      this.credentialsService.role === 'independiente'
    ) {
      return null;
    }

    if (this.credentialsService.isSuperAdmin()) return node;

    if (node.adminOnly) {
      // Opciones administrativas no aplican a clientes: se ocultan.
      // Asesor: habilitado solo si declara módulo y lo tiene en user_modulos.
      if (this.credentialsService.role !== 'asesor') return null;
      const enabled = !!node.modulo && this.credentialsService.hasModulo(node.modulo);
      return enabled ? node : { ...node, disabled: true };
    }

    if (node.modulo) {
      return this.credentialsService.hasModulo(node.modulo)
        ? node
        : { ...node, disabled: true };
    }

    return node;
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
