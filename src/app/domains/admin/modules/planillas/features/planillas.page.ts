import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { PageHeader } from '@/app/core/ui/page-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import { Planilla } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { PlanillaDialog } from '../components/planilla.dialog';

const STATUS_LABEL: Record<string, string> = {
  generada: 'Generada',
  pagada: 'Pagada',
  verificada: 'Verificada',
};
const STATUS_COLOR: Record<string, string> = {
  generada: 'bg-blue-500',
  pagada: 'bg-green-500',
  verificada: 'bg-indigo-500',
};

@Component({
  selector: 'planillas-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Planillas"
        [subtitle]="total() + ' planillas'"
      >
        @if (isAdmin()) {
          <searchable-select
            class="w-64"
            label="Empresa"
            nullLabel="Todas"
            [items]="empresas()"
            displayKey="razon_social"
            [formControl]="empresaControl"
          />
        }
        <mat-form-field
          class="w-48"
          appearance="outline"
          subscriptSizing="dynamic"
        >
          <mat-label>Periodo</mat-label>
          <input
            matInput
            [formControl]="periodoControl"
            placeholder="ej. 2023-07"
          />
        </mat-form-field>
        @if (isAdmin()) {
          <button
            matButton="filled"
            (click)="openCreate()"
          >
            <mat-icon svgIcon="plus" />
            Nueva planilla
          </button>
        }
      </page-header>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <mat-spinner diameter="48" />
        </div>
      } @else {
        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
          <table
            mat-table
            [dataSource]="planillas()"
            class="w-full"
          >
            <ng-container matColumnDef="periodo">
              <th mat-header-cell *matHeaderCellDef>Periodo</th>
              <td mat-cell *matCellDef="let p">
                <div class="font-medium">
                  {{ p.nombre_periodo || p.periodo || '—' }}
                </div>
                <div class="text-xs text-neutral-500">
                  {{ p.empresa_nombre }} · Planilla {{ p.numero_planilla || '#' + p.id }}
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="empleados">
              <th mat-header-cell *matHeaderCellDef>N. empleados</th>
              <td mat-cell *matCellDef="let p">{{ p.num_empleados ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="salarios">
              <th mat-header-cell *matHeaderCellDef>Salarios</th>
              <td mat-cell *matCellDef="let p">
                {{ p.salario_dias | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="pago_ss">
              <th mat-header-cell *matHeaderCellDef>Total Planilla</th>
              <td mat-cell *matCellDef="let p" class="font-semibold">
                {{ p.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="otros">
              <th mat-header-cell *matHeaderCellDef>Otros Pagos</th>
              <td mat-cell *matCellDef="let p">
                {{ p.total_otros_pagos | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="fecha_pago">
              <th mat-header-cell *matHeaderCellDef>Fecha pago</th>
              <td mat-cell *matCellDef="let p">{{ p.fecha_pago | date: 'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                  [ngClass]="statusColor(p.status)"
                >
                  {{ statusLabel(p.status) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let p">
                @if (isAdmin()) {
                  <button
                    matIconButton
                    [matMenuTriggerFor]="menu"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" />
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="setStatus(p, 'pagada')">Marcar pagada</button>
                    <button mat-menu-item (click)="setStatus(p, 'verificada')">Verificada</button>
                    <button mat-menu-item (click)="openEdit(p)">Editar</button>
                  </mat-menu>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns()"
            ></tr>
          </table>
          </div>

          @if (!planillas().length) {
            <div class="py-16 text-center text-neutral-400">
              No hay planillas registradas
            </div>
          }

          <mat-paginator
            [length]="total()"
            [pageSize]="25"
            [pageIndex]="page() - 1"
            (page)="onPage($event)"
          />
        </div>
      }
    </div>
  `,
})
export default class PlanillasPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  planillas = signal<Planilla[]>([]);
  empresas = signal<Empresa[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();

  periodoControl = new FormControl('');
  empresaControl = new FormControl<number | null>(null);

  columns = signal<string[]>([]);

  constructor() {
    // Mismo orden que la tabla vieja de planillas
    this.columns.set(
      ['periodo', 'empleados', 'salarios', 'pago_ss', 'otros', 'fecha_pago', 'status', 'acciones']
    );

    if (this.isAdmin()) {
      this.api.empresas().subscribe((r) => this.empresas.set(r.data));
      this.empresaControl.valueChanges.subscribe(() => { this.page.set(1); this.load(); });
    }
    this.periodoControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.page.set(1); this.load(); });

    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .planillas({
        empresa_id: this.empresaControl.value ?? undefined,
        periodo: this.periodoControl.value || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.planillas.set(r.data);
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

  statusLabel = (s: string) => STATUS_LABEL[s] || s;
  statusColor = (s: string) => STATUS_COLOR[s] || 'bg-neutral-400';

  setStatus(p: Planilla, status: Planilla['status']) {
    this.api.updatePlanilla(p.id, { status }).subscribe(() => {
      this.snack.open('Estado actualizado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openCreate() {
    this.dialog
      .open(PlanillaDialog, { width: '520px', data: { empresas: this.empresas() } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(p: Planilla) {
    this.dialog
      .open(PlanillaDialog, {
        width: '520px',
        data: { planilla: p, empresas: this.empresas() },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }
}
