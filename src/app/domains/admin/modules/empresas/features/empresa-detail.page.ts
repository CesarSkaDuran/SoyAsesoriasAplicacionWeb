import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Empresa } from '@/app/models/user.model';
import { Documento, Empleado, Nomina } from '@/app/models/empleado.model';
import { EmpresaServicio } from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { EmpleadoFormDialog } from '../../empleados/components/empleado-form.dialog';
import { EmpresaFormDialog } from '../components/empresa-form.dialog';
import { EmpresaServicioDialog } from '../components/empresa-servicio.dialog';
import { EmpresaUsuarioDialog } from '../components/empresa-usuario.dialog';

@Component({
  selector: 'empresa-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './empresa-detail.page.html',
})
export default class EmpresaDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private credentials = inject(CredentialsService);

  protected isAdmin = () => this.credentials.isAdmin();

  protected empresa = signal<Empresa | null>(null);
  protected empleados = signal<Empleado[]>([]);
  protected empleadosTotal = signal(0);
  protected nominas = signal<Nomina[]>([]);
  protected documentos = signal<Documento[]>([]);
  protected servicios = signal<EmpresaServicio[]>([]);
  protected loading = signal(true);

  protected empresaId = '';

  constructor() {
    this.empresaId = this.route.snapshot.paramMap.get('id')!;
    this.reload();
  }

  reload() {
    const id = this.empresaId;
    this.api.empresa(id).subscribe({
      next: (res: any) => {
        this.empresa.set(res.empresa ?? res);
        this.servicios.set(res.servicios ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.empleados(id).subscribe((res) => {
      this.empleados.set(res.data);
      this.empleadosTotal.set(res.total);
    });
    this.api.nominas(id).subscribe((res) => this.nominas.set(res.data));
    this.api
      .documentos({ empresa_id: id })
      .subscribe((res) => this.documentos.set(res.data));
  }

  openEdit() {
    this.dialog
      .open(EmpresaFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  openUsuario() {
    this.dialog
      .open(EmpresaUsuarioDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.reload();
      });
  }

  openServicio() {
    this.dialog
      .open(EmpresaServicioDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  removeServicio(s: EmpresaServicio) {
    this.api
      .removeEmpresaServicio(this.empresaId, s.servicio_id)
      .subscribe((res) => this.servicios.set(res.servicios));
  }

  openEmpleado() {
    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId: Number(this.empresaId) },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  openUpload() {
    this.dialog
      .open(DocumentoUploadDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa_id: Number(this.empresaId) },
      })
      .afterClosed()
      .subscribe((uploaded) => {
        if (uploaded) this.reload();
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
}
