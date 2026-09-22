import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Empleado } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { EmpleadoFormDialog } from '../components/empleado-form.dialog';

const TIPOS_CONTRATO: Record<string, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término fijo',
  obra_labor: 'Obra o labor',
  aprendizaje: 'Aprendizaje',
  prestacion_servicios: 'Prestación de servicios',
};

@Component({
  selector: 'empleados-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    CurrencyPipe,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Empleados"
        [subtitle]="total() + ' empleados'"
      >
        <button
          matButton="filled"
          (click)="openForm()"
        >
          <mat-icon svgIcon="plus" />
          Nuevo empleado
        </button>
      </page-header>

      <!-- Filtros como la app vieja: buscar + rango de fechas + empresa/estado -->
      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field
          class="w-72"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-icon matPrefix svgIcon="search" />
          <input
            matInput
            placeholder="Nombre o documento"
            [formControl]="searchControl"
          />
        </mat-form-field>
        @if (isAdmin()) {
          <mat-form-field
            class="w-64"
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Empresa</mat-label>
            <mat-select [formControl]="empresaControl">
              <mat-option [value]="null">Todas</mat-option>
              @for (e of empresas(); track e.id) {
                <mat-option [value]="e.id">{{ e.razon_social }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option value="todos">Todos</mat-option>
            <mat-option value="activo">Activo</mat-option>
            <mat-option value="retirado">Retirado</mat-option>
            <mat-option value="suspendido">Suspendido</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Desde</mat-label>
          <input matInput [matDatepicker]="dpDesde" [formControl]="desdeControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpDesde" />
          <mat-datepicker #dpDesde />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Hasta</mat-label>
          <input matInput [matDatepicker]="dpHasta" [formControl]="hastaControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpHasta" />
          <mat-datepicker #dpHasta />
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else {
        <div
          class="overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900"
        >
          <div class="overflow-x-auto">
            <table
              mat-table
              [dataSource]="empleados()"
              class="w-full"
            >
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let e">
                  <a
                    [routerLink]="['/admin/empleados', e.id]"
                    class="font-medium text-blue-700 hover:underline"
                  >
                    {{ e.primer_nombre }} {{ e.segundo_nombre }}
                    {{ e.primer_apellido }} {{ e.segundo_apellido }}
                  </a>
                </td>
              </ng-container>
              <ng-container matColumnDef="empresa">
                <th mat-header-cell *matHeaderCellDef>Empresa</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.empresa_nombre || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="n_doc">
                <th mat-header-cell *matHeaderCellDef>Documento</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.tipo_documento }} {{ e.numero_documento }}
                </td>
              </ng-container>
              <ng-container matColumnDef="tel">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let e">{{ e.movil || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="cargo">
                <th mat-header-cell *matHeaderCellDef>Cargo</th>
                <td mat-cell *matCellDef="let e">{{ e.cargo_nombre || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="contrato">
                <th mat-header-cell *matHeaderCellDef>Tipo de contrato</th>
                <td mat-cell *matCellDef="let e">
                  {{ tipoContrato(e.tipo_contrato) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="salario">
                <th mat-header-cell *matHeaderCellDef>Salario</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.salario_base | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let e">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    [class.bg-green-500]="e.status === 'activo' || !e.status"
                    [class.bg-red-500]="e.status === 'retirado'"
                    [class.bg-amber-500]="e.status === 'suspendido'"
                  >
                    {{ e.status || 'activo' }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let e">
                  <button
                    matIconButton
                    title="Ver detalle"
                    [routerLink]="['/admin/empleados', e.id]"
                  >
                    <mat-icon svgIcon="eye" />
                  </button>
                  <button
                    matIconButton
                    title="Editar"
                    (click)="openForm(e)"
                  >
                    <mat-icon svgIcon="pencil" />
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
              ></tr>
            </table>
          </div>
          @if (!empleados().length) {
            <div class="p-10 text-center text-neutral-500">
              No se encontraron empleados
            </div>
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="25"
          (page)="onPage($event)"
        />
      }
    </div>
  `,
})
export default class EmpleadosPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  // Mismas columnas de la tabla vieja
  protected columns = [
    'nombre',
    'empresa',
    'n_doc',
    'tel',
    'cargo',
    'contrato',
    'salario',
    'estado',
    'acciones',
  ];
  protected empleados = signal<Empleado[]>([]);
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(true);
  protected searchControl = new FormControl('');
  protected empresaControl = new FormControl<number | null>(null);
  protected statusControl = new FormControl('todos');
  protected desdeControl = new FormControl<Date | null>(null);
  protected hastaControl = new FormControl<Date | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();

  protected currentEmpresaId(): number | null {
    return (
      this.empresaControl.value ?? this.credentials.user?.empresa?.id ?? null
    );
  }

  protected tipoContrato(t?: string): string {
    return t ? TIPOS_CONTRATO[t] ?? t : '—';
  }

  constructor() {
    if (this.isAdmin()) {
      this.api.empresas(undefined, 1, 500).subscribe((res) => {
        this.empresas.set(res.data);
      });
      this.empresaControl.valueChanges.subscribe(() => this.load(1));
    }
    this.load(1);

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.load(1));
    this.statusControl.valueChanges.subscribe(() => this.load(1));
    this.desdeControl.valueChanges.subscribe(() => this.load(1));
    this.hastaControl.valueChanges.subscribe(() => this.load(1));
  }

  load(page: number) {
    this.loading.set(true);
    this.api
      .empleados(
        this.empresaControl.value || undefined,
        this.searchControl.value || undefined,
        page,
        this.statusControl.value || 'todos',
        this.fmtDate(this.desdeControl.value),
        this.fmtDate(this.hastaControl.value)
      )
      .subscribe({
        next: (res) => {
          this.empleados.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    this.load(event.pageIndex + 1);
  }

  openForm(empleado?: Empleado) {
    const empresaId = this.currentEmpresaId() ?? empleado?.empresa_id;
    if (!empresaId) {
      this.snack.open(
        'Selecciona una empresa en el filtro para crear el empleado',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId, empleado },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  private fmtDate(d: Date | null): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }
}
