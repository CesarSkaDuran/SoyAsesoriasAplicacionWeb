import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { NotificationsService } from '@/app/core/notifications/notifications.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import {
  PAGO_STATUS,
  PAGO_STATUS_COLOR,
  SERVICIO_STATUS,
  SERVICIO_STATUS_COLOR,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { ServicioRegistroDialog } from '../components/servicio-registro.dialog';

@Component({
  selector: 'servicios-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    NgClass,
    PageHeader,
    SearchableSelect,
  ],
  templateUrl: './servicios.page.html',
})
export default class ServiciosPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private notifications = inject(NotificationsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  registros = signal<ServicioRegistro[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  categoria = signal<string>('');
  titulo = signal<string>('Servicios');
  isAdmin = () => this.creds.isAdmin();

  searchControl = new FormControl('');
  statusControl = new FormControl<number | null>(null);
  statusPagoControl = new FormControl<number | null>(null);
  empresaControl = new FormControl<number | null>(null);
  desdeControl = new FormControl<Date | null>(null);
  hastaControl = new FormControl<Date | null>(null);

  // Mismo orden que la tabla vieja de servicios
  columns = [
    'id',
    'nombre',
    'nit',
    'tipo',
    'sucursal',
    'paquete',
    'fecha',
    'rep',
    'tel',
    'valor',
    'estado2',
    'estado',
    'acciones',
  ];

  constructor() {
    this.notifications.realtimeEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        if (['solicitud', 'servicio'].includes(notification.tipo)) this.load();
      });

    this.route.data.subscribe((d) => {
      this.categoria.set(d['categoria'] || '');
      this.titulo.set(d['titulo'] || 'Servicios');
      this.page.set(1);
      this.load();
    });

    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.statusControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.statusPagoControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });
    this.desdeControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    this.hastaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
  }

  load() {
    this.loading.set(true);
    this.api
      .servicioRegistros({
        nombre: this.categoria(),
        empresa_id: this.empresaControl.value ?? undefined,
        status: this.statusControl.value ?? undefined,
        status_pago: this.statusPagoControl.value ?? undefined,
        search: this.searchControl.value || undefined,
        desde: this.fmt(this.desdeControl.value),
        hasta: this.fmt(this.hastaControl.value),
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.registros.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(e: PageEvent) {
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  statusLabel = (s: number) => SERVICIO_STATUS[s] || '—';
  statusColor = (s: number) => SERVICIO_STATUS_COLOR[s] || 'bg-neutral-400';
  pagoLabel = (s: number) => PAGO_STATUS[s] || '—';
  pagoColor = (s: number) => PAGO_STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(r: ServicioRegistro, status: number) {
    this.api.updateServicioRegistro(r.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  setStatusPago(r: ServicioRegistro, status_pago: number) {
    this.api.updateServicioRegistro(r.id, { status_pago }).subscribe(() => {
      this.snack.open('Estado de pago actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(ServicioRegistroDialog, {
        width: '560px',
        data: { categoria: this.categoria(), empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(r: ServicioRegistro) {
    this.dialog
      .open(ServicioRegistroDialog, {
        width: '560px',
        data: { registro: r, categoria: this.categoria(), empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  private fmt(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
