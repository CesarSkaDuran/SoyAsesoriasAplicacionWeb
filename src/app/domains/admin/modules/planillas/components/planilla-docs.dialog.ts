import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { DocumentoUploadDialog } from '@/app/domains/admin/modules/documentos/components/documento-upload.dialog';
import { Documento } from '@/app/models/empleado.model';
import { Planilla } from '@/app/models/negocio.model';

@Component({
  selector: 'planilla-docs-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinner,
    DatePipe,
    DialogHeader,
  ],
  templateUrl: './planilla-docs.dialog.html',
})
export class PlanillaDocsDialog {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  ref = inject(MatDialogRef<PlanillaDocsDialog>);
  data = inject<{ planilla: Planilla }>(MAT_DIALOG_DATA);

  documentos = signal<Documento[]>([]);
  loading = signal(true);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.planilla(this.data.planilla.id).subscribe({
      next: (r) => {
        this.documentos.set(r.documentos ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  upload() {
    this.dialog
      .open(DocumentoUploadDialog, {
        width: '520px',
        data: {
          planilla_id: this.data.planilla.id,
          empresa_id: this.data.planilla.empresa_id,
        },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  ver(d: Documento) {
    this.api.downloadDocumento(d.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  eliminar(d: Documento) {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    this.api.deleteDocumento(d.id).subscribe(() => {
      this.snack.open('Documento eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }
}
