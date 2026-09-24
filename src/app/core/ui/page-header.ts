import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Cabecera de página: breadcrumb "Inicio" + título grande + acciones a la
 * derecha (proyectadas). Replica el patrón del sistema anterior.
 */
@Component({
  selector: 'page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
})
export class PageHeader {
  title = input.required<string>();
  subtitle = input<string>('');
}
