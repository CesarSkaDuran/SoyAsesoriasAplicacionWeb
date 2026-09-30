import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
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
    MatMenuModule,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  smmlv = signal(0);
  isAdmin = () => this.creds.isAdmin();
  empleadoId = '';

  diasIncapacidad = computed(() =>
    this.incapacidades().reduce((acc, i) => acc + (Number(i.dias) || 0), 0),
  );

  private static readonly OK = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  private static readonly WARN = 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  private static readonly BAD = 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  private static readonly MUTED = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';

  constructor() {
    this.empleadoId = this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.api.nominaParametros(new Date().getFullYear()).subscribe({
      next: ({ parametros }) => this.smmlv.set(Number(parametros.salario_minimo) || 0),
      error: () => {},
    });
  }

  bajoMinimo(e: Empleado): boolean {
    return this.smmlv() > 0 && Number(e.salario_base) < this.smmlv();
  }

  antiguedad(e: Empleado): string {
    if (!e.fecha_ingreso) return '—';
    const desde = new Date(e.fecha_ingreso);
    const hasta = e.fecha_retiro ? new Date(e.fecha_retiro) : new Date();
    let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + hasta.getMonth() - desde.getMonth();
    if (hasta.getDate() < desde.getDate()) meses--;
    if (meses < 0) return '—';
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    if (anios && resto) return `${anios} a ${resto} m`;
    if (anios) return `${anios} ${anios === 1 ? 'año' : 'años'}`;
    return `${resto} ${resto === 1 ? 'mes' : 'meses'}`;
  }

  tipoContrato(t?: string): string {
    const map: Record<string, string> = {
      indefinido: 'Indefinido',
      fijo: 'Término fijo',
      obra_labor: 'Obra o labor',
      aprendizaje: 'Aprendizaje',
      prestacion_servicios: 'Prestación de servicios',
    };
    return t ? map[t] ?? t : '—';
  }

  estadoColor(status?: string): string {
    if (status === 'retirado') return EmpleadoDetailPage.BAD;
    if (status === 'suspendido') return EmpleadoDetailPage.WARN;
    return EmpleadoDetailPage.OK;
  }

  estados = [
    { value: 'activo', label: 'Activo' },
    { value: 'suspendido', label: 'Suspendido' },
    { value: 'retirado', label: 'Retirado' },
  ];

  estadoActual(e: Empleado): string {
    return e.status || 'activo';
  }

  estadoLabel(e: Empleado): string {
    return this.estados.find((s) => s.value === this.estadoActual(e))?.label ?? e.status ?? '';
  }

  setEstado(e: Empleado, status: string) {
    if (this.estadoActual(e) === status) return;
    const data: Partial<Empleado> = { status };
    if (status === 'retirado' && !e.fecha_retiro) {
      data.fecha_retiro = new Date().toISOString().slice(0, 10);
    }
    if (status === 'activo' && e.fecha_retiro) {
      data.fecha_retiro = null;
    }
    this.api.updateEmpleado(e.id, data).subscribe({
      next: () => {
        this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => this.snack.open('No se pudo actualizar el estado', 'OK', { duration: 3000 }),
    });
  }

  incapacidadColor(status?: string): string {
    const s = String(status || '').toLowerCase();
    if (['pagada', 'aprobada', 'cerrada'].includes(s)) return EmpleadoDetailPage.OK;
    if (['rechazada', 'anulada'].includes(s)) return EmpleadoDetailPage.BAD;
    if (['pendiente', 'en_revision', 'radicada'].includes(s)) return EmpleadoDetailPage.WARN;
    return EmpleadoDetailPage.MUTED;
  }

  diasAcumulados(i: Record<string, any>): number {
    return Number(i['dias_acumulado'] || 0) + Number(i['dias'] || 0);
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
      .open(IncapacidadDialog, { width: '640px', maxWidth: '95vw', data: { empleado: e, incapacidades: this.incapacidades() } })
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

  docEstados = [
    { value: 'recibido', label: 'Recibido' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
  ];

  docEstadoActual(d: Documento): string {
    return d.estatus || 'recibido';
  }

  docEstadoLabel(d: Documento): string {
    return this.docEstados.find((s) => s.value === this.docEstadoActual(d))?.label ?? d.estatus ?? '';
  }

  docEstadoColor(d: Documento): string {
    const s = this.docEstadoActual(d);
    if (s === 'aprobado') return EmpleadoDetailPage.OK;
    if (s === 'rechazado') return EmpleadoDetailPage.BAD;
    if (s === 'en_revision') return EmpleadoDetailPage.WARN;
    return EmpleadoDetailPage.MUTED;
  }

  setDocEstado(d: Documento, estatus: string) {
    if (this.docEstadoActual(d) === estatus) return;
    this.api.updateDocumento(d.id, { estatus: estatus as Documento['estatus'] }).subscribe({
      next: () => {
        this.snack.open('Estado del documento actualizado', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => this.snack.open('No se pudo actualizar el estado', 'OK', { duration: 3000 }),
    });
  }
}
