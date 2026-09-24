import { SelectionModel } from '@angular/cdk/collections';
import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { NotificationsService } from '@/app/core/notifications/notifications.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Solicitud } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { SolicitudDialog } from '../components/solicitud.dialog';
import { SolicitudDetalleDialog } from '../components/solicitud-detalle.dialog';
import { SolicitudEntregaDialog } from '../components/solicitud-entrega.dialog';

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  aprobada: 'bg-indigo-50 text-indigo-700',
  en_proceso: 'bg-blue-50 text-blue-700',
  completada: 'bg-green-50 text-green-700',
  rechazada: 'bg-red-50 text-red-700',
  cancelada: 'bg-neutral-100 text-neutral-500',
};
const STATUS_DOT: Record<string, string> = {
  pendiente: 'bg-amber-500',
  aprobada: 'bg-indigo-500',
  en_proceso: 'bg-blue-500',
  completada: 'bg-green-500',
  rechazada: 'bg-red-500',
  cancelada: 'bg-neutral-400',
};

@Component({
  selector: 'solicitudes-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    MatTooltipModule,
    DatePipe,
    NgClass,
    PageHeader,
    SearchableSelect,
  ],
  templateUrl: './solicitudes.page.html',
})
export default class SolicitudesPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private notifications = inject(NotificationsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  solicitudes = signal<Solicitud[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  // Seleccion multiple de tickets (columna de checkboxes)
  selection = new SelectionModel<Solicitud>(true, []);
  respuestaTarget: Solicitud | null = null;
  uploadingRespuesta = signal<number | null>(null);

  searchControl = new FormControl('');
  statusControl = new FormControl<string | null>(null);
  empresaControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo formato del modelo: Solicitud | Estatus | Fechas | Respuesta | Obs | Acciones
  // El admin además ve el teléfono del cliente
  get columns(): string[] {
    const cols = ['select', 'solicitud', 'status', 'date', 'entrega'];
    if (this.isAdmin()) cols.push('telefono');
    cols.push('respuesta', 'obs', 'options');
    return cols;
  }

  constructor() {
    this.notifications.realtimeEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        if (['solicitud', 'servicio'].includes(notification.tipo)) this.load();
      });

    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });

    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .solicitudes({
        empresa_id: this.empresaControl.value ?? undefined,
        status: this.statusControl.value || undefined,
        search: this.searchControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.solicitudes.set(r.data);
          this.total.set(r.total);
          this.selection.clear();
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  statusLabel = (s: string) => STATUS_LABEL[s] || s;
  statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-100 text-neutral-500';
  statusDot = (s: string) => STATUS_DOT[s] || 'bg-neutral-400';

  // Semáforo de entrega: rojo si ya pasó, amarillo si faltan 3 días o menos
  entregaClass(s: Solicitud): string {
    if (['completada', 'cancelada', 'rechazada'].includes(s.status)) {
      return 'bg-neutral-100 text-neutral-500';
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const f = new Date(`${String(s.fecha_entrega).slice(0, 10)}T00:00:00`);
    const diff = Math.round((f.getTime() - hoy.getTime()) / 86400000);
    if (diff < 0) return 'bg-red-100 text-red-700';
    if (diff <= 3) return 'bg-amber-100 text-amber-800';
    return 'bg-neutral-100 text-neutral-600';
  }

  fmtEntrega(fecha: string): string {
    const [y, m, d] = String(fecha).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  openDetalle(s: Solicitud) {
    this.dialog.open(SolicitudDetalleDialog, {
      width: '520px',
      maxWidth: '95vw',
      data: s,
    });
  }

  openEntrega(s: Solicitud) {
    this.dialog
      .open(SolicitudEntregaDialog, { width: '480px', maxWidth: '95vw', data: s })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  setStatus(s: Solicitud, status: Solicitud['status']) {
    this.api.updateSolicitud(s.id, { status }).subscribe({
      next: () => {
        this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => this.snack.open(err?.error?.error || 'No se pudo cambiar el estado', 'Cerrar', { duration: 3500 }),
    });
  }

  isAllSelected(): boolean {
    const rows = this.solicitudes();
    return rows.length > 0 && rows.every((r) => this.selection.isSelected(r));
  }

  toggleAll() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.solicitudes().forEach((r) => this.selection.select(r));
    }
  }

  // Respuesta/documento: el admin adjunta el archivo; el cliente lo descarga
  pickRespuesta(s: Solicitud, input: HTMLInputElement) {
    this.respuestaTarget = s;
    input.value = '';
    input.click();
  }

  onRespuestaFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const s = this.respuestaTarget;
    if (!file || !s) return;
    this.uploadingRespuesta.set(s.id);
    this.api.uploadRespuestaSolicitud(s.id, file).subscribe({
      next: () => {
        this.uploadingRespuesta.set(null);
        this.snack.open('Respuesta cargada', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => {
        this.uploadingRespuesta.set(null);
        this.snack.open(
          err?.error?.error || 'No se pudo cargar la respuesta',
          'Cerrar',
          { duration: 3500 }
        );
      },
    });
  }

  downloadRespuesta(s: Solicitud) {
    this.api.downloadRespuestaSolicitud(s.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = s.respuesta_nombre || `respuesta-${s.id}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  removeRespuesta(s: Solicitud) {
    if (!confirm(`¿Eliminar la respuesta "${s.respuesta_nombre}"?`)) return;
    this.api.deleteRespuestaSolicitud(s.id).subscribe({
      next: () => {
        this.snack.open('Respuesta eliminada', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) =>
        this.snack.open(
          err?.error?.error || 'No se pudo eliminar',
          'Cerrar',
          { duration: 3500 }
        ),
    });
  }

  openCreate() {
    this.dialog
      .open(SolicitudDialog, { width: '520px', data: { empresas: this.empresas() } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
