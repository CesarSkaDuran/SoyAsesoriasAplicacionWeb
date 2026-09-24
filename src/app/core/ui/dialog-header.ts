import { Component, input } from '@angular/core';
import { MatDialogClose } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';

/**
 * Barra de título azul marino con botón de cierre — replica el patrón de
 * modales del sistema anterior (header navy + X a la derecha).
 */
@Component({
  selector: 'dialog-header',
  imports: [MatIcon, MatDialogClose],
  templateUrl: './dialog-header.html',
})
export class DialogHeader {
  title = input.required<string>();
}
