import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Nomina } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';
import { NominaFormDialog } from '../components/nomina-form.dialog';

@Component({
  selector: 'nominas-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
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
        title="Nóminas"
        [subtitle]="total() + ' nóminas generadas'"
      >
        <button
          matButton="filled"
          (click)="openForm()"
        >
          <mat-icon svgIcon="plus" />
          Nueva nómina
        </button>
      </page-header>

      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        @if (isAdmin()) {
          <mat-form-field
            class="w-64"
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Empresa</mat-label>
            <mat-select [formControl]="empresaControl">
              <mat-option [value]="0">Todas las empresas</mat-option>
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
            <mat-option value="">Todos</mat-option>
            <mat-option value="borrador">Borrador</mat-option>
            <mat-option value="liquidada">Liquidada</mat-option>
            <mat-option value="pagada">Pagada</mat-option>
          </mat-select>
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
              [dataSource]="nominas()"
              class="w-full"
            >
              <ng-container matColumnDef="periodo">
                <th mat-header-cell *matHeaderCellDef>Periodo</th>
                <td mat-cell *matCellDef="let n">
                  <a
                    [routerLink]="['/admin/nominas', n.id]"
                    class="font-medium text-blue-700 hover:underline"
                  >
                    {{ n.nombre_periodo || 'Nómina #' + n.id }}
                  </a>
                  <div class="text-xs text-neutral-500">
                    {{ n.empresa_nombre }}
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="empleados">
                <th mat-header-cell *matHeaderCellDef>N. empleados</th>
                <td mat-cell *matCellDef="let n">{{ n.num_empleados ?? 0 }}</td>
              </ng-container>
              <ng-container matColumnDef="salarios">
                <th mat-header-cell *matHeaderCellDef>Salarios</th>
                <td mat-cell *matCellDef="let n">
                  {{ n.salario_dias | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="o_ingreso">
                <th mat-header-cell *matHeaderCellDef>Horas Extras</th>
                <td mat-cell *matCellDef="let n">
                  {{ n.total_horas_extras | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="pago_ss">
                <th mat-header-cell *matHeaderCellDef>Seguridad Social</th>
                <td mat-cell *matCellDef="let n">
                  {{ n.total_seguridad_social | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="otros">
                <th mat-header-cell *matHeaderCellDef>Otros Pagos</th>
                <td mat-cell *matCellDef="let n">
                  {{ n.total_otros_pagos | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="deducciones">
                <th mat-header-cell *matHeaderCellDef>Deducciones</th>
                <td mat-cell *matCellDef="let n">
                  {{ n.total_deducciones | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="total_pagar">
                <th mat-header-cell *matHeaderCellDef>Total a pagar</th>
                <td mat-cell *matCellDef="let n" class="font-semibold">
                  {{ n.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let n">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    [class.bg-amber-500]="n.status === 'borrador'"
                    [class.bg-blue-500]="n.status === 'liquidada'"
                    [class.bg-green-500]="n.status === 'pagada'"
                  >
                    {{ n.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let n">
                  <button
                    matIconButton
                    title="Ver detalle"
                    [routerLink]="['/admin/nominas', n.id]"
                  >
                    <mat-icon svgIcon="eye" />
                  </button>
                  <button
                    matIconButton
                    title="Liquidar"
                    [routerLink]="['/admin/nominas', n.id, 'liquidar']"
                  >
                    <mat-icon svgIcon="calculator" />
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
          @if (!nominas().length) {
            <div class="p-10 text-center text-neutral-500">
              No hay nóminas para esta empresa
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
export default class NominasPage {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private dialog = inject(MatDialog);

  // Mismo orden de columnas de la tabla vieja
  protected columns = [
    'periodo',
    'empleados',
    'salarios',
    'o_ingreso',
    'pago_ss',
    'otros',
    'deducciones',
    'total_pagar',
    'status',
    'acciones',
  ];
  protected nominas = signal<Nomina[]>([]);
  protected empresas = signal<Empresa[]>([]);
  protected total = signal(0);
  protected loading = signal(false);
  protected empresaControl = new FormControl<number | null>(null);
  protected statusControl = new FormControl('');
  protected isAdmin = () => this.credentials.isAdmin();

  constructor() {
    const user = this.credentials.user;

    if (this.isAdmin()) {
      this.api.empresas('', 1, 1000).subscribe((res) => {
        this.empresas.set(res.data);
      });
      this.empresaControl.valueChanges.subscribe(() => this.load(undefined, 1));
      this.load(undefined, 1);
    } else if (user?.empresa?.id) {
      this.load(user.empresa.id, 1);
    }
    this.statusControl.valueChanges.subscribe(() => this.load(undefined, 1));
  }

  openForm() {
    this.dialog
      .open(NominaFormDialog, { width: '480px' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.load(undefined, 1);
      });
  }

  load(empresaId: number | undefined, page: number) {
    this.loading.set(true);
    const id = empresaId ?? this.empresaControl.value ?? undefined;
    this.api
      .nominas(id || undefined, page, this.statusControl.value || undefined)
      .subscribe({
        next: (res) => {
          this.nominas.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(event: PageEvent) {
    const id = this.isAdmin()
      ? (this.empresaControl.value || undefined)
      : this.credentials.user?.empresa?.id;
    this.load(id ?? undefined, event.pageIndex + 1);
  }
}
