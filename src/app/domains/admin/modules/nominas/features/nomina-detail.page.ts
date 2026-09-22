import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Nomina, NominaDetalle } from '@/app/models/empleado.model';

@Component({
  selector: 'nomina-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTableModule,
    MatProgressSpinner,
    CurrencyPipe,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else if (nomina(); as n) {
        <div>
          <a
            routerLink="/admin/nominas"
            class="mb-2 inline-flex items-center gap-x-1 text-sm text-neutral-500 hover:text-blue-600"
          >
            <mat-icon
              svgIcon="arrow-left"
              class="size-4"
            />
            Volver a nóminas
          </a>
          <div class="text-2xl font-bold">
            Nómina #{{ n.id }}
            @if (n.nombre_periodo) {
              — {{ n.nombre_periodo }}
            }
          </div>
          <div class="flex items-center justify-between">
            <div class="text-neutral-500">
              {{ n.num_empleados }} empleados · {{ n.status }}
            </div>
            @if (isAdmin()) {
              <div class="flex gap-2">
                @if (n.status === 'liquidada') {
                  <button
                    matButton="outlined"
                    [disabled]="generando()"
                    (click)="generarPlanilla()"
                  >
                    <mat-icon svgIcon="file-check" />
                    Generar planilla PILA
                  </button>
                }
                <a
                  [routerLink]="['/admin/nominas', n.id, 'liquidar']"
                  matButton="filled"
                >
                  <mat-icon svgIcon="calculator" />
                  {{ detalles().length ? 'Reliquidar' : 'Liquidar nómina' }}
                </a>
              </div>
            }
          </div>
        </div>

        <!-- Totals -->
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Total nómina</div>
            <div class="mt-1 text-xl font-bold">
              {{ n.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Seguridad social</div>
            <div class="mt-1 text-xl font-bold">
              {{
                n.total_seguridad_social
                  | currency: 'COP' : 'symbol-narrow' : '1.0-0'
              }}
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Horas extras</div>
            <div class="mt-1 text-xl font-bold">
              {{
                n.total_horas_extras
                  | currency: 'COP' : 'symbol-narrow' : '1.0-0'
              }}
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Deducciones</div>
            <div class="mt-1 text-xl font-bold">
              {{
                n.total_deducciones
                  | currency: 'COP' : 'symbol-narrow' : '1.0-0'
              }}
            </div>
          </div>
        </div>

        <!-- Detail per employee -->
        <div
          class="overflow-auto rounded-2xl border bg-white dark:bg-neutral-900"
        >
          <table
            mat-table
            [dataSource]="detalles()"
            class="w-full"
          >
            <ng-container matColumnDef="empleado">
              <th mat-header-cell *matHeaderCellDef>Empleado</th>
              <td mat-cell *matCellDef="let d">
                <div class="font-medium">
                  {{ d.primer_nombre }} {{ d.primer_apellido }}
                </div>
                <div class="text-xs text-neutral-500">
                  {{ d.numero_documento }}
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="dias">
              <th mat-header-cell *matHeaderCellDef>Días</th>
              <td mat-cell *matCellDef="let d">{{ d.dias_laborados }}</td>
            </ng-container>
            <ng-container matColumnDef="salario">
              <th mat-header-cell *matHeaderCellDef>Salario</th>
              <td mat-cell *matCellDef="let d">
                {{
                  d.salario_base | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                }}
              </td>
            </ng-container>
            <ng-container matColumnDef="extras">
              <th mat-header-cell *matHeaderCellDef>H. extras</th>
              <td mat-cell *matCellDef="let d">
                {{
                  d.horas_extras | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                }}
              </td>
            </ng-container>
            <ng-container matColumnDef="deducciones">
              <th mat-header-cell *matHeaderCellDef>Deducciones</th>
              <td mat-cell *matCellDef="let d">
                {{
                  d.deducciones | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                }}
              </td>
            </ng-container>
            <ng-container matColumnDef="neto">
              <th mat-header-cell *matHeaderCellDef>Neto</th>
              <td
                mat-cell
                *matCellDef="let d"
                class="font-semibold"
              >
                {{ d.neto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
            ></tr>
          </table>
          @if (!detalles().length) {
            <div class="p-10 text-center text-neutral-500">
              Esta nómina no tiene detalle por empleado
            </div>
          }
        </div>

        <!-- Planilla PILA (aportes seguridad social por empleado) -->
        @if (detalles().length) {
          <div>
            <div class="mb-3 flex items-center justify-between">
              <div class="text-lg font-bold">Planilla PILA — Aportes</div>
              <button
                matButton="outlined"
                (click)="exportarCsv()"
              >
                <mat-icon svgIcon="download" />
                Exportar CSV
              </button>
            </div>
            <div
              class="overflow-auto rounded-2xl border bg-white dark:bg-neutral-900"
            >
              <table
                mat-table
                [dataSource]="detalles()"
                class="w-full"
              >
                <ng-container matColumnDef="p_empleado">
                  <th mat-header-cell *matHeaderCellDef>Empleado</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.primer_nombre }} {{ d.primer_apellido }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_ibc">
                  <th mat-header-cell *matHeaderCellDef>IBC</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.ibc | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_salud">
                  <th mat-header-cell *matHeaderCellDef>Salud</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.salud | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_pension">
                  <th mat-header-cell *matHeaderCellDef>Pensión</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.pension | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_arl">
                  <th mat-header-cell *matHeaderCellDef>ARL</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.arl | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_ccf">
                  <th mat-header-cell *matHeaderCellDef>CCF</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.ccf | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_sena">
                  <th mat-header-cell *matHeaderCellDef>SENA</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.sena | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_icbf">
                  <th mat-header-cell *matHeaderCellDef>ICBF</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.icbf | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="p_total">
                  <th mat-header-cell *matHeaderCellDef>Total planilla</th>
                  <td
                    mat-cell
                    *matCellDef="let d"
                    class="font-semibold"
                  >
                    {{
                      d.total_planilla
                        | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                    }}
                  </td>
                </ng-container>
                <tr
                  mat-header-row
                  *matHeaderRowDef="columnsPlanilla"
                ></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: columnsPlanilla"
                ></tr>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export default class NominaDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  protected creds = inject(CredentialsService);

  protected nomina = signal<Nomina | null>(null);
  protected detalles = signal<NominaDetalle[]>([]);
  protected loading = signal(true);
  protected generando = signal(false);
  protected columns = [
    'empleado',
    'dias',
    'salario',
    'extras',
    'deducciones',
    'neto',
  ];
  protected columnsPlanilla = [
    'p_empleado',
    'p_ibc',
    'p_salud',
    'p_pension',
    'p_arl',
    'p_ccf',
    'p_sena',
    'p_icbf',
    'p_total',
  ];

  isAdmin = () => this.creds.isAdmin();

  generarPlanilla() {
    const n = this.nomina();
    if (!n) return;
    this.generando.set(true);
    this.api.generarPlanilla(n.id).subscribe({
      next: (res) => {
        this.generando.set(false);
        this.snack.open(
          res.existente
            ? 'Ya existe una planilla para esta nómina'
            : `Planilla #${res.planilla.id} generada`,
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/admin/planillas']);
      },
      error: () => {
        this.generando.set(false);
        this.snack.open('No se pudo generar la planilla', 'Cerrar');
      },
    });
  }

  exportarCsv() {
    const n = this.nomina();
    if (!n) return;
    const header = [
      'Empleado',
      'Documento',
      'Dias',
      'IBC',
      'Salud',
      'Pension',
      'ARL',
      'CCF',
      'SENA',
      'ICBF',
      'Total planilla',
    ];
    const filas = this.detalles().map((d) => [
      `"${d.primer_nombre ?? ''} ${d.primer_apellido ?? ''}"`,
      d.numero_documento ?? '',
      d.dias_laborados ?? 0,
      d.ibc ?? 0,
      d.salud ?? 0,
      d.pension ?? 0,
      d.arl ?? 0,
      d.ccf ?? 0,
      d.sena ?? 0,
      d.icbf ?? 0,
      d.total_planilla ?? 0,
    ]);
    const csv = [header.join(';'), ...filas.map((f) => f.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla-nomina-${n.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.nomina(id).subscribe({
      next: (res) => {
        this.nomina.set(res.nomina);
        this.detalles.set(res.detalles);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
