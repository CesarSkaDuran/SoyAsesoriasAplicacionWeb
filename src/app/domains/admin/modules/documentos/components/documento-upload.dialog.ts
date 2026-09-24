import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { DocumentoTipo } from '@/app/models/empleado.model';

export interface DocumentoUploadData {
  empresa_id?: number;
  empleado_id?: number;
  persona_id?: number;
  tipo_id?: number;
}

@Component({
  selector: 'documento-upload-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIcon,
    DialogHeader,
  ],
  templateUrl: './documento-upload.dialog.html',
})
export class DocumentoUploadDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<DocumentoUploadDialog>);
  private data = inject<DocumentoUploadData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DocumentoUploadData;

  protected file = signal<File | null>(null);
  protected uploading = signal(false);
  protected tipos = signal<DocumentoTipo[]>([]);

  protected form = this.fb.group({
    tipo_id: [this.data.tipo_id ?? null as number | null, Validators.required],
    nombre: [''],
    version: [''],
    fecha_emision: [new Date() as Date | null],
    descripcion: [''],
  });

  constructor() {
    this.api.documentoTipos().subscribe((res) => this.tipos.set(res.data));
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.file.set(file);
    if (!this.form.value.nombre) {
      this.form.patchValue({ nombre: file.name });
    }
  }

  upload() {
    const file = this.file();
    if (!file || this.form.invalid) return;
    this.uploading.set(true);

    const fecha = this.form.value.fecha_emision;
    this.api
      .uploadDocumento(file, {
        nombre: this.form.value.nombre || undefined,
        descripcion: this.form.value.descripcion || undefined,
        empresa_id: this.data.empresa_id,
        empleado_id: this.data.empleado_id,
        persona_id: this.data.persona_id,
        tipo_id: this.form.value.tipo_id!,
        version: this.form.value.version || undefined,
        fecha_emision: fecha ? this.fmtFecha(fecha) : undefined,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Documento subido', 'Cerrar', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.uploading.set(false);
          this.snackBar.open(
            err?.error?.error ?? 'Error al subir el documento',
            'Cerrar',
            { duration: 3000 }
          );
        },
      });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private fmtFecha(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
