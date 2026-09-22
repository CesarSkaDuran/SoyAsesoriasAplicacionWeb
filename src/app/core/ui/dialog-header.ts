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
  template: `
    <div
      class="flex min-h-16 shrink-0 items-center justify-between bg-gradient-to-r from-[#0b2b68] to-[#123f8c] px-6 py-4 text-white"
    >
      <div class="flex min-w-0 items-center gap-3">
        <span class="h-7 w-1 shrink-0 rounded-full bg-white/70"></span>
        <div class="truncate text-lg font-semibold tracking-tight">{{ title() }}</div>
      </div>
      <button
        type="button"
        class="ml-4 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
        mat-dialog-close
        aria-label="Cerrar"
      >
        <mat-icon svgIcon="x" />
      </button>
    </div>
  `,
})
export class DialogHeader {
  title = input.required<string>();
}
