import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { Empleado, Nomina, NominaDetalle } from '@/app/models/empleado.model';
import { EmpleadoLiquidarDialog } from '../components/empleado-liquidar.dialog';

interface LiquidacionInput {
  dias_laborados?: number;
  horas_extras?: number;
  otros_ingresos?: number;
  ingreso_noc?: number;
  deducciones?: number;
  indemnizacion?: number;
}

@Component({
  selector: 'nomina-liquidar-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTableModule,
    MatProgressSpinner,
    CurrencyPipe,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else {
        <page-header
          [title]="'Liquidar nómina — ' + (nomina()?.nombre_periodo || 'Periodo')"
          [subtitle]="nomina()?.empresa_nombre || ''"
        >
          <a
            [routerLink]="['/admin/nominas', nominaId]"
            matButton="outlined"
          >
            <mat-icon svgIcon="arrow-left" />
            Volver
          </a>
          <button
            matButton="filled"
            [disabled]="!empleados().length || saving()"
            (click)="liquidar()"
          >
            <mat-icon svgIcon="check" />
            Liquidar nómina
          </button>
        </page-header>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="rounded-xl border border-neutral-200 bg-white p-4">
            <div class="text-xs font-semibold text-neutral-500">Empleados</div>
            <div class="text-xl font-bold">{{ empleados().length }}</div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-4">
            <div class="text-xs font-semibold text-neutral-500">Total estimado</div>
            <div class="text-xl font-bold">
              {{ totalEstimado() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-4">
            <div class="text-xs font-semibold text-neutral-500">Horas extras</div>
            <div class="text-xl font-bold">
              {{ totalHoras() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-4">
            <div class="text-xs font-semibold text-neutral-500">Deducciones</div>
            <div class="text-xl font-bold">
              {{ totalDed() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table
            mat-table
            [dataSource]="empleados()"
            class="w-full"
          >
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let e">
                <div class="font-medium">
                  {{ e.primer_nombre }} {{ e.primer_apellido }}
                </div>
                <div class="text-xs text-neutral-400">{{ e.numero_documento }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="salario">
              <th mat-header-cell *matHeaderCellDef>Salario</th>
              <td mat-cell *matCellDef="let e">
                {{ e.salario_base | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="dias">
              <th mat-header-cell *matHeaderCellDef>Días</th>
              <td mat-cell *matCellDef="let e">
                {{ inputs()[e.id]?.dias_laborados ?? 30 }}
              </td>
            </ng-container>
            <ng-container matColumnDef="horas">
              <th mat-header-cell *matHeaderCellDef>H. Extras</th>
              <td mat-cell *matCellDef="let e">
                {{ (inputs()[e.id]?.horas_extras ?? 0) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="otros">
              <th mat-header-cell *matHeaderCellDef>Otros</th>
              <td mat-cell *matCellDef="let e">
                {{ (inputs()[e.id]?.otros_ingresos ?? 0) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="deducciones">
              <th mat-header-cell *matHeaderCellDef>Deducciones</th>
              <td mat-cell *matCellDef="let e">
                {{ (inputs()[e.id]?.deducciones ?? 0) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="neto">
              <th mat-header-cell *matHeaderCellDef>Neto estimado</th>
              <td mat-cell *matCellDef="let e">
                {{ neto(e) | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let e">
                <button
                  matButton="outlined"
                  (click)="openEmpleado(e)"
                >
                  <mat-icon svgIcon="calculator" />
                  Liquidar
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
            ></tr>
          </table>

          @if (!empleados().length) {
            <div class="py-16 text-center text-neutral-400">
              La empresa no tiene empleados activos
            </div>
          }
        </div>
      }
    </div>
  `,
})
export default class NominaLiquidarPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  nomina = signal<Nomina | null>(null);
  empleados = signal<Empleado[]>([]);
  inputs = signal<Record<number, LiquidacionInput>>({});
  loading = signal(true);
  saving = signal(false);
  nominaId = '';

  columns = ['nombre', 'salario', 'dias', 'horas', 'otros', 'deducciones', 'neto', 'acciones'];

  constructor() {
    this.nominaId = this.route.snapshot.paramMap.get('id')!;
    this.api.nomina(this.nominaId).subscribe({
      next: (r) => {
        this.nomina.set(r.nomina);
        // Pre-cargar inputs desde el detalle ya liquidado (reliquidacion)
        const map: Record<number, LiquidacionInput> = {};
        for (const d of r.detalles || []) {
          map[d.empleado_id] = {
            dias_laborados: Number(d.dias_laborados) || 30,
            horas_extras: Number(d.horas_extras) || 0,
            otros_ingresos: Number(d.otros_ingresos) || 0,
            ingreso_noc: Number(d.ingreso_noc) || 0,
            deducciones: Number(d.deducciones) || 0,
            indemnizacion: Number(d.indemnizacion) || 0,
          };
        }
        this.inputs.set(map);
        this.loadEmpleados(r.nomina.empresa_id);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadEmpleados(empresaId: number) {
    this.api.empleados(empresaId, undefined, 1, 'activo').subscribe({
      next: (r) => {
        this.empleados.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  neto(e: Empleado): number {
    const i = this.inputs()[e.id] || {};
    const dias = i.dias_laborados ?? 30;
    const salario = (Number(e.salario_base) / 30) * dias;
    const aux = e.subsidio_transporte ? (200000 / 30) * dias : 0;
    return (
      salario + aux +
      (i.horas_extras ?? 0) +
      (i.otros_ingresos ?? 0) +
      (i.ingreso_noc ?? 0) -
      (i.deducciones ?? 0)
    );
  }

  totalEstimado() {
    return this.empleados().reduce((a, e) => a + this.neto(e), 0);
  }
  totalHoras() {
    return Object.values(this.inputs()).reduce((a, i) => a + (i.horas_extras ?? 0), 0);
  }
  totalDed() {
    return Object.values(this.inputs()).reduce((a, i) => a + (i.deducciones ?? 0), 0);
  }

  openEmpleado(e: Empleado) {
    this.dialog
      .open(EmpleadoLiquidarDialog, {
        width: '560px',
        data: { empleado: e, input: this.inputs()[e.id] },
      })
      .afterClosed()
      .subscribe((input: LiquidacionInput | undefined) => {
        if (!input) return;
        this.inputs.update((m) => ({ ...m, [e.id]: input }));
      });
  }

  liquidar() {
    this.saving.set(true);
    const items = this.empleados().map((e) => ({
      empleado_id: e.id,
      ...this.inputs()[e.id],
    }));
    this.api.liquidarNomina(this.nominaId, { empleados: items }).subscribe({
      next: () => {
        this.snack.open('Nómina liquidada', 'OK', { duration: 3000 });
        this.router.navigate(['/admin/nominas', this.nominaId]);
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('No se pudo liquidar', 'Cerrar');
      },
    });
  }
}
