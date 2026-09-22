import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Documento } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { DocumentoUploadDialog } from '../components/documento-upload.dialog';

@Component({
  selector: 'documentos-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIcon,
    MatProgressSpinner,
    MatSnackBarModule,
    DatePipe,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Documentos"
        subtitle="Archivos compartidos"
      >
        @if (isAdmin()) {
          <mat-form-field
            class="w-64"
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Empresa</mat-label>
            <mat-select [formControl]="empresaControl">
              @for (e of empresas(); track e.id) {
                <mat-option [value]="e.id">{{ e.razon_social }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <button
          matButton="filled"
          (click)="openUpload()"
          [disabled]="!empresaId()"
        >
          <mat-icon svgIcon="upload" />
          Subir documento
        </button>
      </page-header>

      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else {
        <div
          class="overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900"
        >
          @for (d of documentos(); track d.id) {
            <div
              class="flex items-center justify-between border-b px-5 py-4 last:border-0"
            >
              <div class="flex items-center gap-x-3">
                <div
                  class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950"
                >
                  <mat-icon svgIcon="file-text" />
                </div>
                <div>
                  <div class="font-medium">{{ d.nombre }}</div>
                  <div class="text-sm text-neutral-500">
                    {{ d.created_at | date: 'medium' }}
                    @if (d.size) {
                      · {{ formatSize(d.size) }}
                    }
                    @if (d.descripcion) {
                      · {{ d.descripcion }}
                    }
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-x-2">
                <button
                  matIconButton
                  title="Descargar"
                  (click)="download(d)"
                >
                  <mat-icon svgIcon="download" />
                </button>
                <button
                  matIconButton
                  title="Eliminar"
                  (click)="remove(d)"
                >
                  <mat-icon svgIcon="trash" />
                </button>
              </div>
            </div>
          }
          @if (!documentos().length) {
            <div class="p-10 text-center text-neutral-500">
              No hay documentos para esta empresa
            </div>
          }
        </div>
      }
    </div>
  `,
})
export default class DocumentosPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  protected documentos = signal<Documento[]>([]);
  protected empresas = signal<Empresa[]>([]);
  protected loading = signal(false);
  protected empresaControl = new FormControl<number | null>(null);
  protected empresaId = signal<number | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();

  constructor() {
    const user = this.credentials.user;

    if (this.isAdmin()) {
      this.api.empresas().subscribe((res) => {
        this.empresas.set(res.data);
        if (res.data.length) this.empresaControl.setValue(res.data[0].id);
      });
      this.empresaControl.valueChanges.subscribe((id) => {
        this.empresaId.set(id);
        if (id) this.load(id);
      });
    } else if (user?.empresa?.id) {
      this.empresaId.set(user.empresa.id);
      this.load(user.empresa.id);
    }
  }

  load(empresaId: number) {
    this.loading.set(true);
    this.api.documentos({ empresa_id: empresaId }).subscribe({
      next: (res) => {
        this.documentos.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openUpload() {
    const empresaId = this.empresaId();
    if (!empresaId) return;

    this.dialog
      .open(DocumentoUploadDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa_id: empresaId },
      })
      .afterClosed()
      .subscribe((uploaded) => {
        if (uploaded) this.load(empresaId);
      });
  }

  download(doc: Documento) {
    this.api.downloadDocumento(doc.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  remove(doc: Documento) {
    this.api.deleteDocumento(doc.id).subscribe({
      next: () => {
        this.snackBar.open('Documento eliminado', 'Cerrar', { duration: 2500 });
        const id = this.empresaId();
        if (id) this.load(id);
      },
      error: () =>
        this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  formatSize(bytes: number): string {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }
}
