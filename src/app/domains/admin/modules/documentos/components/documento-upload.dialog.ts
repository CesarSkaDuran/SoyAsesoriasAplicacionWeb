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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';

export interface DocumentoUploadData {
  empresa_id?: number;
  empleado_id?: number;
  persona_id?: number;
}

@Component({
  selector: 'documento-upload-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    DialogHeader,
  ],
  template: `
    <dialog-header title="Subir documento" />
    <mat-dialog-content>
      <form
        [formGroup]="form"
        class="flex flex-col gap-y-4 pt-2"
      >
        <!-- File picker -->
        <button
          type="button"
          matButton="outlined"
          class="flex h-24 w-full flex-col items-center justify-center gap-y-1 rounded-xl border-2 border-dashed"
          (click)="fileInput.click()"
        >
          <mat-icon svgIcon="cloud-upload" />
          @if (file()) {
            <span class="font-medium">{{ file()!.name }}</span>
            <span class="text-xs text-neutral-500">
              {{ formatSize(file()!.size) }}
            </span>
          } @else {
            <span>Seleccionar archivo</span>
            <span class="text-xs text-neutral-500">
              PDF, imágenes, Excel — máx. 20 MB
            </span>
          }
        </button>
        <input
          #fileInput
          type="file"
          class="hidden"
          (change)="onFileSelected($event)"
        />

        <mat-form-field>
          <mat-label>Nombre del documento</mat-label>
          <input
            matInput
            formControlName="nombre"
          />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            rows="2"
            formControlName="descripcion"
          ></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button
        matButton
        mat-dialog-close
      >
        Cancelar
      </button>
      <button
        matButton="filled"
        [disabled]="!file() || uploading()"
        (click)="upload()"
      >
        {{ uploading() ? 'Subiendo…' : 'Subir' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class DocumentoUploadDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<DocumentoUploadDialog>);
  private data = inject<DocumentoUploadData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DocumentoUploadData;

  protected file = signal<File | null>(null);
  protected uploading = signal(false);

  protected form = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

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

    this.api
      .uploadDocumento(file, {
        nombre: this.form.value.nombre!,
        descripcion: this.form.value.descripcion || undefined,
        empresa_id: this.data.empresa_id,
        empleado_id: this.data.empleado_id,
        persona_id: this.data.persona_id,
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
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }
}
