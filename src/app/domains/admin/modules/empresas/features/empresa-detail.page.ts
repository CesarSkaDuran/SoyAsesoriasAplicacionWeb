import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Empresa } from '@/app/models/user.model';
import { Documento, Empleado, Nomina } from '@/app/models/empleado.model';
import { EmpresaServicio } from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { EmpleadoFormDialog } from '../../empleados/components/empleado-form.dialog';
import { RetirarLoteDialog } from '../../empleados/components/retirar-lote.dialog';
import { RecontratarDialog } from '../../empleados/components/recontratar.dialog';
import { EmpresaFormDialog } from '../components/empresa-form.dialog';
import { EmpresaServicioDialog } from '../components/empresa-servicio.dialog';
import { EmpresaUsuarioDialog } from '../components/empresa-usuario.dialog';

@Component({
  selector: 'empresa-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatMenuModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empresa-detail.page.html',
})
export default class EmpresaDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private credentials = inject(CredentialsService);
  private snack = inject(MatSnackBar);

  protected isAdmin = () => this.credentials.isAdmin();

  protected empresa = signal<Empresa | null>(null);
  protected empleados = signal<Empleado[]>([]);
  protected empleadosTotal = signal(0);
  protected empleadosEstado = signal('activo');
  protected empleadosLoading = signal(false);
  protected nominas = signal<Nomina[]>([]);
  protected documentos = signal<Documento[]>([]);
  protected servicios = signal<EmpresaServicio[]>([]);
  protected loading = signal(true);
  protected serviciosActivos = computed(
    () => this.servicios().filter((s) => s.status === 'activo').length,
  );

  protected empresaId = '';

  // Badges de estado (patrón auditorías: bg-*-50 text-*-700 + dark)
  private static readonly OK = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  private static readonly WARN = 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  private static readonly INFO = 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
  private static readonly BAD = 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  private static readonly MUTED = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';

  protected empleadoColor(status?: string): string {
    if (status === 'retirado') return EmpresaDetailPage.BAD;
    if (status === 'suspendido') return EmpresaDetailPage.WARN;
    return EmpresaDetailPage.OK;
  }

  protected nominaColor(status?: string): string {
    if (status === 'pagada') return EmpresaDetailPage.OK;
    if (status === 'liquidada') return EmpresaDetailPage.INFO;
    return EmpresaDetailPage.WARN;
  }

  protected servicioColor(status?: string): string {
    return status === 'activo' ? EmpresaDetailPage.OK : EmpresaDetailPage.MUTED;
  }

  protected documentoColor(estatus?: string): string {
    if (estatus === 'rechazado') return EmpresaDetailPage.BAD;
    if (estatus === 'en_revision') return EmpresaDetailPage.WARN;
    if (estatus === 'aprobado') return EmpresaDetailPage.OK;
    return EmpresaDetailPage.MUTED;
  }

  protected docEstados = [
    { value: 'recibido', label: 'Recibido' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
  ];

  protected docEstadoActual(d: Documento): string {
    return d.estatus || 'recibido';
  }

  protected documentoLabel(estatus?: string): string {
    return this.docEstados.find((s) => s.value === (estatus ?? 'recibido'))?.label ?? estatus ?? '';
  }

  protected setDocEstado(d: Documento, estatus: string) {
    if (this.docEstadoActual(d) === estatus) return;
    this.api.updateDocumento(d.id, { estatus: estatus as Documento['estatus'] }).subscribe({
      next: () => {
        this.snack.open('Estado del documento actualizado', 'OK', { duration: 2500 });
        this.reload();
      },
      error: () => this.snack.open('No se pudo actualizar el estado', 'OK', { duration: 3000 }),
    });
  }

  protected estados = [
    { value: 'activo', label: 'Activo' },
    { value: 'prospecto', label: 'Prospecto' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  protected empresaEstadoActual(e: Empresa): string {
    return e.status || 'activo';
  }

  protected empresaEstadoLabel(e: Empresa): string {
    return this.estados.find((s) => s.value === this.empresaEstadoActual(e))?.label ?? e.status ?? '';
  }

  protected empresaEstadoColor(e: Empresa): string {
    const s = this.empresaEstadoActual(e);
    if (s === 'activo') return EmpresaDetailPage.OK;
    if (s === 'prospecto') return EmpresaDetailPage.WARN;
    return EmpresaDetailPage.MUTED;
  }

  protected setEstado(e: Empresa, status: string) {
    if (this.empresaEstadoActual(e) === status) return;
    this.api.updateEmpresa(e.id, { status }).subscribe({
      next: () => {
        this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
        this.reload();
      },
      error: () => this.snack.open('No se pudo actualizar el estado', 'OK', { duration: 3000 }),
    });
  }

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
    this.loadEmpleados();
    this.api.nominas(id).subscribe((res) => this.nominas.set(res.data));
    this.api
      .documentos({ empresa_id: id })
      .subscribe((res) => this.documentos.set(res.data));
  }

  protected setEmpleadoFiltro(estado: string) {
    this.empleadosEstado.set(estado);
    this.loadEmpleados();
  }

  private loadEmpleados() {
    const estado = this.empleadosEstado();
    this.empleadosLoading.set(true);
    this.api.empleados(this.empresaId, undefined, 1, estado).subscribe({
      next: (res) => {
        if (estado !== this.empleadosEstado()) return;
        this.empleados.set(res.data);
        this.empleadosTotal.set(res.total);
        this.empleadosLoading.set(false);
      },
      error: () => {
        if (estado !== this.empleadosEstado()) return;
        this.empleadosLoading.set(false);
        this.snack.open('No se pudieron cargar los empleados', 'Cerrar', { duration: 3000 });
      },
    });
  }

  protected recontratarEmpleado(empleado: Empleado) {
    if (!this.isAdmin() || empleado.status !== 'retirado') return;
    this.dialog.open(RecontratarDialog, {
      width: '640px', maxWidth: '95vw', data: { empleado },
    }).afterClosed().subscribe(ok => {
      if (ok) this.loadEmpleados();
    });
  }

  protected retirarEmpleado(empleado: Empleado) {
    if (!this.isAdmin() || empleado.status === 'retirado') return;
    const nombre = [empleado.primer_nombre, empleado.segundo_nombre, empleado.primer_apellido, empleado.segundo_apellido]
      .filter(Boolean).join(' ').trim();
    this.dialog.open(RetirarLoteDialog, {
      width: '520px',
      maxWidth: '95vw',
      data: { empleados: [{ id: empleado.id, nombre }] },
    }).afterClosed().subscribe((retirado) => {
      if (retirado) this.loadEmpleados();
    });
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
