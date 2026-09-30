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
import { Documento } from '@/app/models/empleado.model';
import {
  CUENTA_STATUS,
  CUENTA_STATUS_COLOR,
  CuentaCobro,
  PAGO_STATUS,
  PAGO_STATUS_COLOR,
  Persona,
  SERVICIO_STATUS,
  SERVICIO_STATUS_COLOR,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { PersonaFormDialog } from '../components/persona-form.dialog';

@Component({
  selector: 'independiente-detail-page',
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
  templateUrl: './independiente-detail.page.html',
})
export default class IndependienteDetailPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  persona = signal<Persona | null>(null);
  documentos = signal<Documento[]>([]);
  servicios = signal<ServicioRegistro[]>([]);
  cuentas = signal<CuentaCobro[]>([]);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();
  personaId = '';

  // KPIs
  totalServicios = computed(() => this.servicios().length);
  totalPagos = computed(() => this.cuentas().length);
  totalFacturado = computed(() =>
    this.servicios().reduce((acc, s) => acc + (Number(s.valor) || 0), 0),
  );
  totalCobrado = computed(() =>
    this.cuentas().reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0),
  );

  private static readonly OK = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  private static readonly WARN = 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  private static readonly BAD = 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  private static readonly MUTED = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';

  protected estadoColor(status?: string): string {
    if (!status || status === 'activo') return IndependienteDetailPage.OK;
    if (status === 'prospecto') return IndependienteDetailPage.WARN;
    return IndependienteDetailPage.MUTED;
  }

  protected estados = [
    { value: 'activo', label: 'Activo' },
    { value: 'prospecto', label: 'Prospecto' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  protected estadoActual(p: Persona): string {
    return p.status || 'activo';
  }

  protected estadoLabel(p: Persona): string {
    return this.estados.find((s) => s.value === this.estadoActual(p))?.label ?? p.status ?? '';
  }

  protected setEstado(p: Persona, status: string) {
    if (this.estadoActual(p) === status) return;
    this.api.updatePersona(p.id, { status }).subscribe({
      next: () => {
        this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => this.snack.open('No se pudo actualizar el estado', 'OK', { duration: 3000 }),
    });
  }

  constructor() {
    this.personaId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.persona(this.personaId).subscribe({
      next: (r) => {
        this.persona.set(r.persona);
        this.documentos.set(r.documentos || []);
        this.servicios.set(r.servicios || []);
        this.cuentas.set(r.cuentas || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreCompleto(p: Persona) {
    return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  servicioLabel = (s: number) => SERVICIO_STATUS[s] || '—';
  servicioColor = (s: number) => SERVICIO_STATUS_COLOR[s] || 'bg-neutral-400 text-white';
  pagoLabel = (s: number) => PAGO_STATUS[s] || '—';
  pagoColor = (s: number) => PAGO_STATUS_COLOR[s] || 'bg-neutral-400 text-white';
  cuentaLabel = (s: number) => CUENTA_STATUS[s] || '—';
  cuentaColor = (s: number) => CUENTA_STATUS_COLOR[s] || 'bg-neutral-400';

  openEdit(p: Persona) {
    this.dialog
      .open(PersonaFormDialog, { width: '640px', data: { persona: p } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openUpload(p: Persona) {
    this.dialog
      .open(DocumentoUploadDialog, { width: '520px', data: { persona_id: p.id } })
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

  protected docEstados = [
    { value: 'recibido', label: 'Recibido' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'rechazado', label: 'Rechazado' },
  ];

  protected docEstadoActual(d: Documento): string {
    return d.estatus || 'recibido';
  }

  protected docEstadoLabel(d: Documento): string {
    return this.docEstados.find((s) => s.value === this.docEstadoActual(d))?.label ?? d.estatus ?? '';
  }

  protected docEstadoColor(d: Documento): string {
    const s = this.docEstadoActual(d);
    if (s === 'aprobado') return IndependienteDetailPage.OK;
    if (s === 'rechazado') return IndependienteDetailPage.BAD;
    if (s === 'en_revision') return IndependienteDetailPage.WARN;
    return IndependienteDetailPage.MUTED;
  }

  protected setDocEstado(d: Documento, estatus: string) {
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
