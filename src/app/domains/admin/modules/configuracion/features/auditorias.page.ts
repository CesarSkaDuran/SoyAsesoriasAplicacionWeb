import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { AuditEntry } from '@/app/core/api/api.service';

const ACTIONS: Record<string, string> = {
  crear: 'Creación',
  actualizar: 'Actualización',
  eliminar: 'Eliminación',
  cerrar_sesion: 'Cierre de sesión',
};

@Component({
  selector: 'auditorias-page',
  imports: [
    DatePipe,
    NgClass,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RouterLink,
    PageHeader,
  ],
  templateUrl: './auditorias.page.html',
})
export default class AuditoriasPage {
  private api = inject(ApiService);

  entries = signal<AuditEntry[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  pageSize = 25;
  columns = ['date', 'actor', 'action', 'resource', 'details', 'result', 'ip'];
  resources = [
    { value: 'empresas', label: 'Empresas' },
    { value: 'empleados', label: 'Empleados' },
    { value: 'personas', label: 'Independientes' },
    { value: 'solicitudes', label: 'Solicitudes' },
    { value: 'servicio-registros', label: 'Servicios' },
    { value: 'nominas', label: 'Nóminas' },
    { value: 'planillas', label: 'Planillas' },
    { value: 'usuarios', label: 'Usuarios' },
    { value: 'documentos', label: 'Documentos' },
    { value: 'pagos', label: 'Pagos' },
    { value: 'gastos', label: 'Gastos' },
    { value: 'soportes', label: 'Soporte' },
    { value: 'diagnosticos', label: 'Diagnósticos' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'maestros', label: 'Configuración' },
    { value: 'auditorias', label: 'Auditorías' },
  ];

  searchControl = new FormControl('');
  actionControl = new FormControl('');
  resourceControl = new FormControl('');
  fromControl = new FormControl<Date | null>(null);
  toControl = new FormControl<Date | null>(null);

  constructor() {
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.load(1));
    this.actionControl.valueChanges.subscribe(() => this.load(1));
    this.resourceControl.valueChanges.subscribe(() => this.load(1));
    this.fromControl.valueChanges.subscribe(() => this.load(1));
    this.toControl.valueChanges.subscribe(() => this.load(1));
    this.load();
  }

  load(page = this.page()) {
    this.loading.set(true);
    this.api.auditorias({
      search: this.searchControl.value || undefined,
      accion: this.actionControl.value || undefined,
      recurso: this.resourceControl.value || undefined,
      desde: this.formatDate(this.fromControl.value),
      hasta: this.formatDate(this.toControl.value),
      page,
      per_page: this.pageSize,
    }).subscribe({
      next: result => {
        this.entries.set(result.data);
        this.total.set(result.total);
        this.page.set(result.page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.load(event.pageIndex + 1);
  }

  actionLabel(action: string): string {
    return ACTIONS[action] || action;
  }

  actionColor(action: string): string {
    return action === 'eliminar'
      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
      : action === 'crear'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
  }

  responseColor(status: number): string {
    return status < 400
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  }

  resourceLabel(resource: string): string {
    return this.resources.find(item => item.value === resource)?.label || resource;
  }

  fieldsLabel(fields: string[] | null): string {
    return fields?.length ? fields.join(', ') : '—';
  }

  detailsLabel(entry: AuditEntry): string {
    if (!entry.detalle) return '';
    return Object.entries(entry.detalle)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(' · ');
  }

  private formatDate(date: Date | null): string | undefined {
    return date ? date.toISOString().slice(0, 10) : undefined;
  }
}
