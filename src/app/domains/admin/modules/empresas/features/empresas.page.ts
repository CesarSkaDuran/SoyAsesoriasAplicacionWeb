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
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Empresa } from '@/app/models/user.model';
import { EmpresaFormDialog } from '../components/empresa-form.dialog';

@Component({
  selector: 'empresas-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIcon,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinner,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Empresas"
        [subtitle]="total() + ' empresas registradas'"
      >
        @if (isAdmin()) {
          <button
            matButton="filled"
            (click)="openCreate()"
          >
            <mat-icon svgIcon="plus" />
            Nueva empresa
          </button>
        }
      </page-header>

      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <mat-form-field
          class="w-72"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-icon matPrefix svgIcon="search" />
          <input
            matInput
            placeholder="Buscar por nombre o NIT"
            [formControl]="searchControl"
          />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option value="">Todos</mat-option>
            <mat-option value="activo">Activo</mat-option>
            <mat-option value="prospecto">Prospecto</mat-option>
            <mat-option value="inactivo">Inactivo</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Fecha inicial</mat-label>
          <input matInput [matDatepicker]="dpDesde" [formControl]="desdeControl" />
          <mat-datepicker-toggle matIconSuffix [for]="dpDesde" />
          <mat-datepicker #dpDesde />
        </mat-form-field>
        <mat-form-field
          class="w-44"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Fecha final</mat-label>
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
        <div class="overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900">
          <div class="overflow-x-auto">
            <table
              mat-table
              [dataSource]="empresas()"
              class="w-full"
            >
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let e">
                  <a
                    class="font-medium text-blue-600 hover:underline"
                    [routerLink]="['/admin/empresas', e.id]"
                  >
                    {{ e.razon_social }}
                  </a>
                </td>
              </ng-container>
              <ng-container matColumnDef="nit">
                <th mat-header-cell *matHeaderCellDef>Nit</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.num_documento }}{{ e.dv ? '-' + e.dv : '' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="contacto">
                <th mat-header-cell *matHeaderCellDef>Contacto</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.nombre_contacto || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="rep">
                <th mat-header-cell *matHeaderCellDef>Rep. Legal</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.representante_legal || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="tel">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.telefono_movil || e.telefono_fijo || '—' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="empleados">
                <th mat-header-cell *matHeaderCellDef>N° Empleados</th>
                <td mat-cell *matCellDef="let e">{{ e.num_empleados ?? 0 }}</td>
              </ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let e">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    [class.bg-green-500]="e.status === 'activo' || !e.status"
                    [class.bg-red-500]="e.status && e.status !== 'activo'"
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
                    title="Ver empresa"
                    [routerLink]="['/admin/empresas', e.id]"
                  >
                    <mat-icon svgIcon="eye" />
                  </button>
                  @if (isAdmin()) {
                    <button
                      matIconButton
                      title="Editar"
                      (click)="openEdit(e)"
                    >
                      <mat-icon svgIcon="pencil" />
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: columns"
              ></tr>
            </table>
          </div>
          @if (!empresas().length) {
            <div class="p-10 text-center text-neutral-500">
              No se encontraron empresas
            </div>
          }
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="20"
          (page)="onPage($event)"
        />
      }
    </div>
  `,
})
export default class EmpresasPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);

  protected columns = [
    'nombre',
    'nit',
    'contacto',
    'rep',
    'tel',
    'empleados',
    'estado',
    'acciones',
  ];
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(true);
  protected searchControl = new FormControl('');
  protected statusControl = new FormControl('');
  protected desdeControl = new FormControl<Date | null>(null);
  protected hastaControl = new FormControl<Date | null>(null);
  protected isAdmin = () => this.credentials.isAdmin();

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.load(1));
    this.statusControl.valueChanges.subscribe(() => this.load(1));
    this.desdeControl.valueChanges.subscribe(() => this.load(1));
    this.hastaControl.valueChanges.subscribe(() => this.load(1));

    this.load(1);
  }

  load(page: number) {
    this.loading.set(true);
    this.api
      .empresas(
        this.searchControl.value || undefined,
        page,
        20,
        this.statusControl.value || undefined,
        this.fmt(this.desdeControl.value),
        this.fmt(this.hastaControl.value)
      )
      .subscribe({
        next: (res) => {
          this.empresas.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    this.load(event.pageIndex + 1);
  }

  openCreate() {
    this.dialog
      .open(EmpresaFormDialog, { width: '900px', maxWidth: '95vw', data: {} })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  openEdit(empresa: Empresa) {
    this.dialog
      .open(EmpresaFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresa },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  private fmt(value: Date | null): string | undefined {
    return value ? value.toISOString().slice(0, 10) : undefined;
  }
}
