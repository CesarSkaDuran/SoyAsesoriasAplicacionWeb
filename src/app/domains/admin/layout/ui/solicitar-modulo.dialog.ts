import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';

/**
 * El cliente (empresa/independiente) toca un módulo bloqueado del menú y
 * puede enviar una solicitud para que SoyAsesorías lo habilite. Genera un
 * registro en /solicitudes (status pendiente) que el staff gestiona.
 */
@Component({
  selector: 'solicitar-modulo-dialog',
  imports: [MatDialogModule, MatButtonModule, DialogHeader],
  template: `
    <dialog-header title="Solicitar módulo" />
    <mat-dialog-content class="mat-typography">
      <p class="text-sm text-neutral-500">
        Tu plan actual no cubre el módulo <strong>{{ data.label }}</strong>.
        ¿Deseas enviar una solicitud a SoyAsesorías para habilitarlo?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="text" mat-dialog-close>Cancelar</button>
      <button matButton="filled" [disabled]="saving" (click)="enviar()">
        Enviar solicitud
      </button>
    </mat-dialog-actions>
  `,
})
export class SolicitarModuloDialog {
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<SolicitarModuloDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ label: string }>(MAT_DIALOG_DATA);
  saving = false;

  enviar() {
    if (this.saving) return;
    this.saving = true;
    this.api
      .createSolicitud({
        descripcion: `Solicitud de acceso al módulo: ${this.data.label}`,
      })
      .subscribe({
        next: () => {
          this.snack.open(
            'Solicitud enviada. SoyAsesorías la revisará.',
            'OK',
            { duration: 3000 }
          );
          this.ref.close(true);
        },
        error: (e) => {
          this.saving = false;
          this.snack.open(
            e?.error?.error || 'No se pudo enviar la solicitud',
            'Cerrar'
          );
        },
      });
  }
}
