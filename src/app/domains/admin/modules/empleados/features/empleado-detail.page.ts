import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Documento, Empleado } from '@/app/models/empleado.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { BeneficiarioDialog } from '../components/beneficiario.dialog';
import { IncapacidadDialog } from '../components/incapacidad.dialog';
import { EmpleadoFormDialog } from '../components/empleado-form.dialog';

@Component({
  selector: 'empleado-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './empleado-detail.page.html',
})
export default class EmpleadoDetailPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  empleado = signal<Empleado | null>(null);
  beneficiarios = signal<any[]>([]);
  documentos = signal<Documento[]>([]);
  incapacidades = signal<any[]>([]);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();
  empleadoId = '';

  constructor() {
    this.empleadoId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.empleado(this.empleadoId).subscribe({
      next: (r) => {
        this.empleado.set(r.empleado);
        this.beneficiarios.set(r.beneficiarios || []);
        this.documentos.set(r.documentos || []);
        this.incapacidades.set(r.incapacidades || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreCompleto(e: Empleado) {
    return [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  openEdit(e: Empleado) {
    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId: e.empresa_id, empleado: e },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openBeneficiario(e: Empleado) {
    this.dialog
      .open(BeneficiarioDialog, { width: '520px', data: { empleado: e } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  removeBeneficiario(e: Empleado, b: any) {
    this.api.removeBeneficiario(e.id, b.id).subscribe(() => {
      this.snack.open('Beneficiario eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openIncapacidad(e: Empleado) {
    this.dialog
      .open(IncapacidadDialog, { width: '520px', data: { empleado: e } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  removeIncapacidad(e: Empleado, i: any) {
    this.api.removeIncapacidad(e.id, i.id).subscribe(() => {
      this.snack.open('Incapacidad eliminada', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openUpload(e: Empleado) {
    this.dialog
      .open(DocumentoUploadDialog, { width: '520px', data: { empleado_id: e.id } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  download(d: Documento) {
    this.api.downloadDocumento(d.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  removeDoc(d: Documento) {
    this.api.deleteDocumento(d.id).subscribe(() => {
      this.snack.open('Documento eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }
}
