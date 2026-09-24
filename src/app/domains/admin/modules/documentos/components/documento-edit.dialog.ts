import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Documento, DocumentoTipo } from '@/app/models/empleado.model';

@Component({
  selector: 'documento-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    DialogHeader,
  ],
  templateUrl: './documento-edit.dialog.html',
})
export class DocumentoEditDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<DocumentoEditDialog>);
  private doc = inject<Documento>(MAT_DIALOG_DATA);

  protected tipos = signal<DocumentoTipo[]>([]);
  protected saving = signal(false);
  protected isAdmin = () => this.creds.isAdmin();

  protected form = this.fb.group({
    tipo_id: [this.doc.tipo_id ?? null as number | null],
    nombre: [this.doc.nombre],
    version: [this.doc.version ?? ''],
    fecha_emision: [this.doc.fecha_emision ? new Date(`${this.doc.fecha_emision}T00:00:00`) : null as Date | null],
    descripcion: [this.doc.descripcion ?? ''],
    estatus: [this.doc.estatus ?? 'recibido'],
  });

  constructor() {
    this.api.documentoTipos().subscribe((res) => this.tipos.set(res.data));
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.api
      .updateDocumento(this.doc.id, {
        tipo_id: v.tipo_id,
        nombre: v.nombre ?? undefined,
        version: v.version || null,
        fecha_emision: v.fecha_emision ? this.fmtFecha(v.fecha_emision) : null,
        descripcion: v.descripcion || null,
        ...(this.isAdmin() ? { estatus: v.estatus as Documento['estatus'] } : {}),
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Documento actualizado', 'Cerrar', {
            duration: 2500,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(
            err?.error?.error ?? 'No se pudo actualizar',
            'Cerrar',
            { duration: 3000 }
          );
        },
      });
  }

  private fmtFecha(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
