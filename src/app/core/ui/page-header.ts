import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Cabecera de página: breadcrumb "Inicio" + título grande + acciones a la
 * derecha (proyectadas). Replica el patrón del sistema anterior.
 */
@Component({
  selector: 'page-header',
  imports: [RouterLink],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <a
          routerLink="/admin/home"
          class="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Inicio
        </a>
        <h1 class="mt-0.5 text-3xl font-extrabold tracking-tight">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <div class="mt-0.5 text-neutral-500">{{ subtitle() }}</div>
        }
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeader {
  title = input.required<string>();
  subtitle = input<string>('');
}
