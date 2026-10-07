import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DialogHeader } from '@/app/core/ui/dialog-header';

/**
 * Pide el motivo cuando el staff marca un estado que exige explicación
 * (rechazado, solicitar renovación o estados personalizados).
 * Devuelve el comentario (string) o null si se cancela.
 */
@Component({
  selector: 'rechazo-comentario-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DialogHeader,
  ],
  template: `
    <dialog-header [title]="data.accion" />
    <mat-dialog-content>
      <p class="mb-3 text-sm text-neutral-500">
        El cliente verá este motivo junto al documento
        <strong>{{ data.titulo }}</strong>.
      </p>
      <mat-form-field class="w-full" appearance="outline">
        <mat-label>Explicación para el cliente</mat-label>
        <textarea
          matInput
          rows="4"
          [formControl]="comentario"
          placeholder="Ej: el documento está vencido, ilegible o no corresponde al solicitado"
        ></textarea>
        @if (comentario.touched && comentario.invalid) {
          <mat-error>El motivo es obligatorio</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="text" (click)="ref.close(null)">Cancelar</button>
      <button matButton="filled" [disabled]="comentario.invalid" (click)="ref.close(comentario.value)">
        {{ data.accion }}
      </button>
    </mat-dialog-actions>
  `,
})
export class RechazoComentarioDialog {
  ref = inject(MatDialogRef<RechazoComentarioDialog, string | null>);
  data = inject<{ titulo: string; accion: string }>(MAT_DIALOG_DATA, { optional: true }) ?? { titulo: '', accion: 'Confirmar' };
  comentario = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });
}
