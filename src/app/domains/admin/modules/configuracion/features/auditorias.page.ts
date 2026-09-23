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
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header title="Auditorías" subtitle="Historial de movimientos realizados en el sistema">
        <a matButton="outlined" routerLink="/admin/configuracion">
          <mat-icon svgIcon="arrow-left" />
          Configuración
        </a>
      </page-header>

      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field class="w-full sm:w-72" appearance="outline" subscriptSizing="dynamic">
          <mat-icon svgIcon="search" matIconPrefix />
          <mat-label>Buscar movimiento</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Usuario, módulo o registro" />
        </mat-form-field>
        <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Acción</mat-label>
          <mat-select [formControl]="actionControl">
            <mat-option value="">Todas</mat-option>
            <mat-option value="crear">Creación</mat-option>
            <mat-option value="actualizar">Actualización</mat-option>
            <mat-option value="eliminar">Eliminación</mat-option>
            <mat-option value="cerrar_sesion">Cierre de sesión</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field class="w-48" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Módulo</mat-label>
          <mat-select [formControl]="resourceControl">
            <mat-option value="">Todos</mat-option>
            @for (resource of resources; track resource.value) {
              <mat-option [value]="resource.value">{{ resource.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Desde</mat-label>
          <input matInput [matDatepicker]="fromPicker" [formControl]="fromControl" />
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
          <mat-datepicker #fromPicker />
        </mat-form-field>
        <mat-form-field class="w-44" appearance="outline" subscriptSizing="dynamic">
          <mat-label>Hasta</mat-label>
          <input matInput [matDatepicker]="toPicker" [formControl]="toControl" />
          <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
          <mat-datepicker #toPicker />
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="flex min-h-64 items-center justify-center">
          <mat-spinner diameter="42" />
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          @if (entries().length) {
            <div class="overflow-x-auto">
              <table mat-table [dataSource]="entries()" class="w-full min-w-[950px]">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Fecha y hora</th>
                  <td mat-cell *matCellDef="let entry" class="whitespace-nowrap text-sm text-neutral-600">
                    {{ entry.created_at | date: 'dd/MM/yyyy HH:mm:ss' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="actor">
                  <th mat-header-cell *matHeaderCellDef>Usuario</th>
                  <td mat-cell *matCellDef="let entry">
                    <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ entry.actor_email || 'Usuario eliminado' }}</div>
                    <div class="text-xs text-neutral-500">{{ entry.actor_role || '—' }}</div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Acción</th>
                  <td mat-cell *matCellDef="let entry">
                    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="actionColor(entry.accion)">
                      {{ actionLabel(entry.accion) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="resource">
                  <th mat-header-cell *matHeaderCellDef>Módulo / registro</th>
                  <td mat-cell *matCellDef="let entry">
                    <div class="font-medium text-neutral-800 dark:text-neutral-100">{{ resourceLabel(entry.recurso) }}</div>
                    <div class="text-xs text-neutral-500">{{ entry.recurso_id ? '#' + entry.recurso_id : entry.ruta }}</div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="details">
                  <th mat-header-cell *matHeaderCellDef>Cambios</th>
                  <td mat-cell *matCellDef="let entry" class="max-w-80">
                    <div class="truncate text-sm text-neutral-700 dark:text-neutral-300">{{ fieldsLabel(entry.campos) }}</div>
                    @if (detailsLabel(entry)) {
                      <div class="truncate text-xs text-neutral-500">{{ detailsLabel(entry) }}</div>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="result">
                  <th mat-header-cell *matHeaderCellDef>Resultado</th>
                  <td mat-cell *matCellDef="let entry">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold" [ngClass]="responseColor(entry.codigo_respuesta)">
                      {{ entry.codigo_respuesta }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="ip">
                  <th mat-header-cell *matHeaderCellDef>IP</th>
                  <td mat-cell *matCellDef="let entry" class="font-mono text-xs text-neutral-500">{{ entry.ip || '—' }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns" class="!bg-neutral-50 dark:!bg-neutral-800"></tr>
                <tr mat-row *matRowDef="let row; columns: columns" class="transition-colors hover:!bg-neutral-50 dark:hover:!bg-neutral-800/60"></tr>
              </table>
            </div>
            <div class="border-t border-neutral-100 px-2 dark:border-neutral-700">
              <mat-paginator
                [length]="total()"
                [pageSize]="pageSize"
                [pageIndex]="page() - 1"
                [pageSizeOptions]="[10, 25, 50, 100]"
                (page)="onPage($event)"
                showFirstLastButtons
              />
            </div>
          } @else {
            <div class="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <span class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <mat-icon svgIcon="shield-check" />
              </span>
              <h2 class="font-semibold text-neutral-800 dark:text-neutral-100">No hay movimientos para mostrar</h2>
              <p class="mt-1 text-sm text-neutral-500">Prueba otros filtros o vuelve más tarde.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
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
