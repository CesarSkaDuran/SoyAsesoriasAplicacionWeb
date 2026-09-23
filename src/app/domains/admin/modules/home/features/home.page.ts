import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApiService, ClienteDashboard } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { userFullName } from '@/app/models/user.model';

interface Resumen {
  empresas: number;
  empleados: number;
  cartera_pendiente: number;
  servicios_pendientes: number;
  tickets_abiertos: number;
}

interface DashboardData {
  servicios_por_estado: { estado: string; total: number }[];
  ingresos_mensuales: { mes: string; total: number }[];
  servicios_por_tipo: { nombre: string; total: number }[];
  solicitudes_recientes: any[];
  empresas_recientes: any[];
  independientes: number;
}

@Component({
  selector: 'home-page',
  imports: [
    RouterLink,
    MatIcon,
    MatButtonModule,
    MatMenuModule,
    MatTabsModule,
    MatTableModule,
    DatePipe,
    NgApexchartsModule,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-4 sm:gap-y-7 sm:p-8">
      <!-- Welcome Banner -->
      <div class="flex flex-col items-start justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50/80 p-5 shadow-sm sm:flex-row sm:items-center sm:p-7 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-900 dark:to-blue-950/30">
        <div class="flex items-center gap-4">
          <div class="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xl font-bold text-white">
            {{ initials() }}
          </div>
          <div>
            <h1 class="text-2xl font-bold">Bienvenido de nuevo, {{ firstName() }}!</h1>
            <p class="mt-1 text-sm text-neutral-500">
              @if (user()?.role === 'admin') {
                Panel de administración — Soy Asesorías
              } @else {
                {{ user()?.empresa?.razon_social || user()?.persona?.primer_nombre || 'Portal de empresa' }}
              }
            </p>
            @if (!isAdmin()) {
              <span class="mt-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/70 dark:text-blue-300">
                {{ user()?.role === 'empresa' ? 'Portal empresarial' : 'Portal independiente' }}
              </span>
            }
          </div>
        </div>
        @if (isAdmin()) {
          <div class="flex flex-wrap gap-2">
            <a href="https://www.sispro.gov.co/central-prestadores-de-servicios/Pages/RUAF-Registro-Unico-de-Afiliados.aspx"
               target="_blank"
               class="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <mat-icon svgIcon="external-link" class="icon-sm" /> Ruaf
            </a>
            <a href="https://www.enlace-apb.com/interssi/.plus"
               target="_blank"
               class="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <mat-icon svgIcon="external-link" class="icon-sm" /> Asopagos
            </a>
            <button [matMenuTriggerFor]="preMenu"
                    class="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              <mat-icon svgIcon="file-plus" class="icon-sm" /> Pre-Afiliaciones
            </button>
            <mat-menu #preMenu="matMenu">
              <button mat-menu-item routerLink="/admin/empleados">
                <mat-icon svgIcon="user" /> Empleado
              </button>
              <button mat-menu-item (click)="goToNewEmpresa()">
                <mat-icon svgIcon="building" /> Empresa
              </button>
              <button mat-menu-item (click)="goToNewIndependiente()">
                <mat-icon svgIcon="user-plus" /> Independiente
              </button>
            </mat-menu>
          </div>
        }
      </div>

      <!-- KPI Cards -->
      @if (resumen(); as r) {
        <div class="grid grid-cols-2 gap-4 xl:grid-cols-5">
          @for (kpi of kpis(r); track kpi.label) {
            <a [routerLink]="kpi.route"
               class="group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-neutral-900"
               [class]="kpi.borderClass">
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl" [class]="kpi.iconBg">
                  <mat-icon [svgIcon]="kpi.icon" class="icon-sm" [class]="kpi.iconColor" />
                </div>
                <span class="text-sm font-medium text-neutral-500">{{ kpi.label }}</span>
              </div>
              <div class="mt-3 text-2xl font-bold" [class]="kpi.valueColor">
                {{ kpi.value }}
              </div>
              <div class="mt-1 text-xs text-neutral-400">{{ kpi.sub }}</div>
            </a>
          }
        </div>
      }

      <!-- Charts Row -->
      @if (dashData(); as d) {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Monthly Income Chart -->
          <div class="rounded-2xl border bg-white p-6 shadow-sm dark:bg-neutral-900">
            <h3 class="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Ingresos mensuales</h3>
            @if (d.ingresos_mensuales.length) {
              <apx-chart
                [series]="[{ name: 'Ingresos', data: d.ingresos_mensuales.map(m => m.total) }]"
                [chart]="{ type: 'area', height: 260, toolbar: { show: false }, fontFamily: 'inherit' }"
                [xaxis]="{ categories: d.ingresos_mensuales.map(m => formatMonth(m.mes)) }"
                [stroke]="{ curve: 'smooth', width: 2 }"
                [fill]="{ type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } }"
                [dataLabels]="{ enabled: false }"
                [colors]="['#0154f9']"
                [yaxis]="{ labels: { formatter: copShort } }"
                [tooltip]="{ y: { formatter: copFull } }"
                [grid]="{ borderColor: '#e5e6e9', strokeDashArray: 4 }"
              />
            } @else {
              <p class="py-6 text-center text-neutral-400">Sin datos de ingresos recientes</p>
            }
          </div>

          <!-- Services by Type - Donut -->
          <div class="rounded-2xl border bg-white p-6 shadow-sm dark:bg-neutral-900">
            <h3 class="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Servicios por tipo</h3>
            @if (d.servicios_por_tipo.length) {
              <apx-chart
                [series]="d.servicios_por_tipo.map(s => s.total)"
                [labels]="d.servicios_por_tipo.map(s => s.nombre)"
                [chart]="{ type: 'donut', height: 240, fontFamily: 'inherit' }"
                [colors]="chartColors"
                [legend]="{ position: 'bottom', fontSize: '12px' }"
                [dataLabels]="{ enabled: false }"
                [stroke]="{ width: 2 }"
                [plotOptions]="{ pie: { donut: { size: '68%' } } }"
              />
            } @else {
              <p class="py-6 text-center text-neutral-400">Sin datos de servicios</p>
            }

            <!-- Services by Status below -->
            <h3 class="mb-3 mt-6 border-t pt-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Estado de servicios</h3>
            <div class="flex flex-wrap gap-3">
              @for (e of d.servicios_por_estado; track e.estado) {
                <div class="flex flex-col items-center rounded-xl px-4 py-3"
                     [class]="statusBg(e.estado)">
                  <span class="text-xl font-bold">{{ e.total }}</span>
                  <span class="text-xs font-medium">{{ e.estado }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Dashboard cliente (empresa / independiente) -->
      @if (!isAdmin() && clienteData(); as cd) {
        <!-- KPIs del cliente -->
        <section class="space-y-4" aria-labelledby="client-summary-title">
          <div>
            <h2 id="client-summary-title" class="text-lg font-bold text-neutral-800 dark:text-neutral-100">Resumen de tu cuenta</h2>
            <p class="mt-1 text-sm text-neutral-500">Consulta el estado de tus servicios, pagos y documentos.</p>
          </div>
          <div [class]="clienteKpiGridClass()">
            @for (kpi of clienteKpis(cd); track kpi.label) {
              <a [routerLink]="kpi.route"
               class="group flex min-h-36 flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-800"
               [class]="kpi.borderClass">
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl" [class]="kpi.iconBg">
                  <mat-icon [svgIcon]="kpi.icon" class="icon-sm" [class]="kpi.iconColor" />
                </div>
                <span class="text-sm font-medium text-neutral-500">{{ kpi.label }}</span>
              </div>
              <div class="mt-3 text-2xl font-bold" [class]="kpi.valueColor">
                {{ kpi.value }}
              </div>
              <div class="mt-1 text-xs text-neutral-400">{{ kpi.sub }}</div>
              </a>
            }
          </div>
        </section>

        <!-- Gráficas del cliente -->
        <section class="space-y-4" aria-labelledby="client-activity-title">
          <div>
            <h2 id="client-activity-title" class="text-lg font-bold text-neutral-800 dark:text-neutral-100">Actividad de tu cuenta</h2>
            <p class="mt-1 text-sm text-neutral-500">Un vistazo a tus pagos y servicios recientes.</p>
          </div>
          <div class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
          <!-- Pagos mensuales -->
          <div class="flex min-h-80 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-neutral-800 dark:text-neutral-100">Mis pagos</h3>
                <p class="mt-1 text-sm text-neutral-500">Resumen de los últimos seis meses</p>
              </div>
              <span class="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <mat-icon svgIcon="dollar-sign" class="icon-sm" />
              </span>
            </div>
            @if (cd.pagos_mensuales.length) {
              <apx-chart
                [series]="[
                  { name: 'Pagado', data: cd.pagos_mensuales.map(m => m.pagado) },
                  { name: 'Facturado', data: cd.pagos_mensuales.map(m => m.total) }
                ]"
                [chart]="{ type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'inherit' }"
                [xaxis]="{ categories: cd.pagos_mensuales.map(m => formatMonth(m.mes)) }"
                [plotOptions]="{ bar: { borderRadius: 5, columnWidth: '55%' } }"
                [dataLabels]="{ enabled: false }"
                [colors]="['#10b981', '#f59e0b']"
                [legend]="{ position: 'top', fontSize: '12px' }"
                [yaxis]="{ labels: { formatter: copShort } }"
                [tooltip]="{ y: { formatter: copFull } }"
                [grid]="{ borderColor: '#e5e6e9', strokeDashArray: 4 }"
              />
            } @else {
              <div class="flex min-h-40 flex-1 flex-col items-center justify-center rounded-xl bg-neutral-50 px-5 py-6 text-center dark:bg-neutral-800/50">
                <span class="mb-3 flex size-11 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm dark:bg-neutral-800">
                  <mat-icon svgIcon="chart-column" class="icon-sm" />
                </span>
                <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Aún no hay pagos recientes</p>
                <p class="mt-1 text-xs text-neutral-500">Cuando se registren pagos, verás aquí su evolución.</p>
              </div>
            }

            <!-- Cuentas por estado -->
            @if (cd.cuentas_por_estado.length) {
              <h3 class="mb-3 mt-6 border-t pt-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Cuentas de cobro</h3>
              <div class="flex flex-wrap gap-3">
                @for (e of cd.cuentas_por_estado; track e.estado) {
                  <div class="flex flex-col items-center rounded-xl px-4 py-3" [class]="estadoCuentaBg(e.estado)">
                    <span class="text-xl font-bold">{{ e.total }}</span>
                    <span class="text-xs font-medium">{{ e.estado }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Servicios -->
          <div class="flex min-h-80 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-neutral-800 dark:text-neutral-100">Mis servicios</h3>
                <p class="mt-1 text-sm text-neutral-500">Distribución y estado de tus solicitudes</p>
              </div>
              <span class="rounded-xl bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                <mat-icon svgIcon="handshake" class="icon-sm" />
              </span>
            </div>
            @if (cd.servicios_por_tipo.length) {
              <apx-chart
                [series]="cd.servicios_por_tipo.map(s => s.total)"
                [labels]="cd.servicios_por_tipo.map(s => s.nombre)"
                [chart]="{ type: 'donut', height: 240, fontFamily: 'inherit' }"
                [colors]="chartColors"
                [legend]="{ position: 'bottom', fontSize: '12px' }"
                [dataLabels]="{ enabled: false }"
                [stroke]="{ width: 2 }"
                [plotOptions]="{ pie: { donut: { size: '68%' } } }"
              />
            } @else {
              <div class="flex min-h-40 flex-1 flex-col items-center justify-center rounded-xl bg-neutral-50 px-5 py-6 text-center dark:bg-neutral-800/50">
                <span class="mb-3 flex size-11 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm dark:bg-neutral-800">
                  <mat-icon svgIcon="handshake" class="icon-sm" />
                </span>
                <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Aún no hay servicios registrados</p>
                <p class="mt-1 text-xs text-neutral-500">Aquí aparecerá la actividad de tus servicios.</p>
              </div>
            }

            @if (cd.servicios_por_estado.length) {
              <h3 class="mb-3 mt-6 border-t pt-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Estado de servicios</h3>
              <div class="flex flex-wrap gap-3">
                @for (e of cd.servicios_por_estado; track e.estado) {
                  <div class="flex flex-col items-center rounded-xl px-4 py-3" [class]="statusBg(e.estado)">
                    <span class="text-xl font-bold">{{ e.total }}</span>
                    <span class="text-xs font-medium">{{ e.estado }}</span>
                  </div>
                }
              </div>
            }
          </div>
          </div>
        </section>

        <!-- Seguimiento: solicitudes, diagnósticos y soporte -->
        @if (cd.solicitudes_por_estado.length || cd.diagnosticos_por_estado.length || cd.soportes_por_estado.length || cd.solicitudes_recientes.length) {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Estados de gestión -->
            <div class="rounded-2xl border bg-white p-6 shadow-sm dark:bg-neutral-900">
              <h3 class="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">Mis trámites</h3>
              @if (cd.solicitudes_por_estado.length) {
                <div class="mb-4">
                  <div class="mb-2 text-sm font-semibold text-neutral-500">Solicitudes</div>
                  <div class="flex flex-wrap gap-3">
                    @for (e of cd.solicitudes_por_estado; track e.estado) {
                      <div class="flex flex-col items-center rounded-xl px-4 py-3" [class]="statusSolicitudBg(e.estado)">
                        <span class="text-xl font-bold">{{ e.total }}</span>
                        <span class="text-xs font-medium">{{ e.estado }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (cd.diagnosticos_por_estado.length) {
                <div class="mb-4">
                  <div class="mb-2 text-sm font-semibold text-neutral-500">Diagnósticos</div>
                  <div class="flex flex-wrap gap-3">
                    @for (e of cd.diagnosticos_por_estado; track e.estado) {
                      <div class="flex flex-col items-center rounded-xl px-4 py-3" [class]="statusDiagnosticoBg(e.estado)">
                        <span class="text-xl font-bold">{{ e.total }}</span>
                        <span class="text-xs font-medium">{{ e.estado }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (cd.soportes_por_estado.length) {
                <div>
                  <div class="mb-2 text-sm font-semibold text-neutral-500">Tickets de soporte</div>
                  <div class="flex flex-wrap gap-3">
                    @for (e of cd.soportes_por_estado; track e.estado) {
                      <div class="flex flex-col items-center rounded-xl px-4 py-3" [class]="statusSoporteBg(e.estado)">
                        <span class="text-xl font-bold">{{ e.total }}</span>
                        <span class="text-xs font-medium">{{ e.estado }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Solicitudes recientes -->
            <div class="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-neutral-900">
              <div class="border-b px-6 py-4">
                <h3 class="font-bold text-neutral-700 dark:text-neutral-300">Solicitudes recientes</h3>
              </div>
              @if (cd.solicitudes_recientes.length) {
                <table mat-table [dataSource]="cd.solicitudes_recientes" class="w-full">
                  <ng-container matColumnDef="id">
                    <th mat-header-cell *matHeaderCellDef>Ticket</th>
                    <td mat-cell *matCellDef="let s">#{{ s.id }}</td>
                  </ng-container>
                  <ng-container matColumnDef="descripcion">
                    <th mat-header-cell *matHeaderCellDef>Descripción</th>
                    <td mat-cell *matCellDef="let s">
                      <div class="max-w-60 truncate">{{ s.descripcion || '—' }}</div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="estado">
                    <th mat-header-cell *matHeaderCellDef>Estado</th>
                    <td mat-cell *matCellDef="let s">
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium" [class]="statusSolicitudBg(s.status)">
                        {{ statusSolicitudLabel(s.status) }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha</th>
                    <td mat-cell *matCellDef="let s">{{ s.created_at | date: 'dd/MM/yyyy' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="['id', 'descripcion', 'estado', 'fecha']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['id', 'descripcion', 'estado', 'fecha']"></tr>
                </table>
              } @else {
                <div class="p-10 text-center text-neutral-400">Aún no tienes solicitudes</div>
              }
            </div>
          </div>
        }
      }

      <!-- Quick Access Modules -->
      <section class="space-y-4" aria-labelledby="quick-access-title">
        <div>
          <h2 id="quick-access-title" class="text-lg font-bold text-neutral-800 dark:text-neutral-100">Acceso rápido</h2>
          <p class="mt-1 text-sm text-neutral-500">Entra directamente a tus módulos.</p>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          @for (card of cards(); track card.route) {
            <a [routerLink]="card.route"
               class="group flex min-h-24 items-center gap-x-4 rounded-2xl border border-neutral-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-800">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105" [class]="card.bg">
                <mat-icon [svgIcon]="card.icon" [class]="card.color" />
              </div>
              <div class="min-w-0">
                <div class="truncate font-semibold text-neutral-800 dark:text-neutral-100">{{ card.label }}</div>
                <div class="mt-0.5 text-sm text-neutral-500">{{ card.description }}</div>
              </div>
            </a>
          }
        </div>
      </section>

      <!-- Recent Activity Tables -->
      @if (dashData(); as d) {
        @if (d.empresas_recientes.length || d.solicitudes_recientes.length) {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Recent Empresas -->
            <div class="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-neutral-900">
              <div class="border-b px-6 py-4">
                <h3 class="font-bold text-neutral-700 dark:text-neutral-300">Empresas recientes</h3>
              </div>
              <table mat-table [dataSource]="d.empresas_recientes" class="w-full">
                <ng-container matColumnDef="nombre">
                  <th mat-header-cell *matHeaderCellDef>Nombre</th>
                  <td mat-cell *matCellDef="let e">
                    <a class="font-medium text-blue-600 hover:underline" [routerLink]="['/admin/empresas', e.id]">{{ e.razon_social }}</a>
                  </td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let e">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          [class.bg-green-500]="e.status === 'activo'"
                          [class.bg-amber-500]="e.status === 'prospecto'"
                          [class.bg-red-500]="e.status === 'inactivo'">
                      {{ e.status }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let e">{{ e.created_at | date: 'dd/MM/yyyy' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['nombre', 'estado', 'fecha']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['nombre', 'estado', 'fecha']"></tr>
              </table>
            </div>

            <!-- Recent Solicitudes -->
            <div class="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-neutral-900">
              <div class="border-b px-6 py-4">
                <h3 class="font-bold text-neutral-700 dark:text-neutral-300">Solicitudes recientes</h3>
              </div>
              <table mat-table [dataSource]="d.solicitudes_recientes" class="w-full">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef>Ticket</th>
                  <td mat-cell *matCellDef="let s">#{{ s.id }}</td>
                </ng-container>
                <ng-container matColumnDef="nombre">
                  <th mat-header-cell *matHeaderCellDef>Nombre</th>
                  <td mat-cell *matCellDef="let s">{{ s.nombre || s.cliente_nombre || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let s">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          [class.bg-amber-500]="s.status === 1"
                          [class.bg-green-500]="s.status === 2"
                          [class.bg-blue-500]="s.status === 3 || s.status === 4"
                          [class.bg-red-500]="s.status === 5">
                      {{ statusSolicitud(s.status) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let s">{{ s.created_at | date: 'dd/MM/yyyy' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['id', 'nombre', 'estado', 'fecha']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['id', 'nombre', 'estado', 'fecha']"></tr>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .icon-sm { width: 18px; height: 18px; font-size: 18px; }
  `],
})
export default class HomePage {
  private credentialsService = inject(CredentialsService);
  private api = inject(ApiService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private platformId = inject(PLATFORM_ID);

  protected user = computed(() => this.credentialsService.user);
  protected resumen = signal<Resumen | null>(null);
  protected dashData = signal<DashboardData | null>(null);
  protected clienteData = signal<ClienteDashboard | null>(null);
  protected firstName = computed(() => userFullName(this.user()).split(' ')[0] || '');
  protected initials = computed(() => {
    const name = userFullName(this.user());
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  });
  protected isAdmin = () => this.credentialsService.isAdmin();

  chartColors = ['#0154f9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  copShort = (v: number) =>
    new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  copFull = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.credentialsService.isAdmin()) {
      this.api.informeResumen().subscribe({
        next: (r) => this.resumen.set(r),
        error: () => {},
      });
      this.api.informeDashboard().subscribe({
        next: (d) => this.dashData.set(d),
        error: () => {},
      });
    } else {
      this.api.informeMiResumen().subscribe({
        next: (d) => this.clienteData.set(d),
        error: () => {},
      });
    }
  }

  kpis(r: Resumen) {
    return [
      {
        label: 'Empresas', value: r.empresas, sub: 'Total registradas', icon: 'building',
        route: '/admin/empresas', borderClass: 'border-l-4 border-l-blue-500',
        iconBg: 'bg-blue-50 dark:bg-blue-950', iconColor: 'text-blue-600', valueColor: '',
      },
      {
        label: 'Empleados', value: r.empleados, sub: 'Total activos', icon: 'users',
        route: '/admin/empleados', borderClass: 'border-l-4 border-l-green-500',
        iconBg: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600', valueColor: '',
      },
      {
        label: 'Cartera pendiente', value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.cartera_pendiente),
        sub: 'Por cobrar', icon: 'dollar-sign',
        route: '/admin/pagos', borderClass: 'border-l-4 border-l-red-500',
        iconBg: 'bg-red-50 dark:bg-red-950', iconColor: 'text-red-600', valueColor: 'text-red-600',
      },
      {
        label: 'Servicios pendientes', value: r.servicios_pendientes, sub: 'En proceso', icon: 'handshake',
        route: '/admin/servicios/afiliaciones', borderClass: 'border-l-4 border-l-amber-500',
        iconBg: 'bg-amber-50 dark:bg-amber-950', iconColor: 'text-amber-600', valueColor: '',
      },
      {
        label: 'Tickets abiertos', value: r.tickets_abiertos, sub: 'Soporte activo', icon: 'message-circle',
        route: '/admin/soporte', borderClass: 'border-l-4 border-l-purple-500',
        iconBg: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600', valueColor: '',
      },
    ];
  }

  formatMonth(mes: string): string {
    const [y, m] = mes.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
  }

  statusBg(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-100 text-amber-800',
      'Finalizado': 'bg-green-100 text-green-800',
      'En trámite': 'bg-blue-100 text-blue-800',
      'Verificado': 'bg-indigo-100 text-indigo-800',
      'Cancelado': 'bg-red-100 text-red-800',
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
  }

  estadoCuentaBg(estado: string): string {
    const map: Record<string, string> = {
      'Pagada': 'bg-green-100 text-green-800',
      'Pendiente': 'bg-amber-100 text-amber-800',
      'En trámite': 'bg-blue-100 text-blue-800',
      'Activa': 'bg-indigo-100 text-indigo-800',
      'Rechazada': 'bg-red-100 text-red-800',
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
  }

  statusSolicitudLabel(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      en_proceso: 'En proceso',
      completada: 'Completada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada',
    };
    return map[estado] || estado;
  }

  statusSolicitudBg(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-800',
      aprobada: 'bg-indigo-100 text-indigo-800',
      en_proceso: 'bg-blue-100 text-blue-800',
      completada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
      cancelada: 'bg-neutral-100 text-neutral-700',
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
  }

  statusDiagnosticoBg(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-800',
      en_progreso: 'bg-blue-100 text-blue-800',
      logrado: 'bg-green-100 text-green-800',
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
  }

  statusSoporteBg(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-100 text-amber-800',
      'En proceso': 'bg-blue-100 text-blue-800',
      'Resuelto': 'bg-green-100 text-green-800',
      'Cerrado': 'bg-neutral-100 text-neutral-700',
      'Rechazado': 'bg-red-100 text-red-800',
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
  }

  clienteKpiGridClass(): string {
    return this.user()?.role === 'independiente'
      ? 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4'
      : 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5';
  }

  clienteKpis(cd: ClienteDashboard) {
    const serviciosPend = cd.servicios_por_estado
      .filter((e) => e.estado === 'Pendiente' || e.estado === 'En trámite')
      .reduce((a, e) => a + e.total, 0);
    const esEmpresa = !!this.user()?.empresa?.id;
    return [
      ...(esEmpresa
        ? [{
            label: 'Empleados', value: cd.empleados_activos, sub: 'Activos en nómina', icon: 'users',
            route: '/admin/empleados', borderClass: 'border-l-4 border-l-green-500',
            iconBg: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600', valueColor: '',
          }]
        : []),
      {
        label: 'Por pagar', value: this.copFull(cd.cartera_pendiente), sub: 'Cartera pendiente', icon: 'dollar-sign',
        route: '/admin/pagos', borderClass: 'border-l-4 border-l-red-500',
        iconBg: 'bg-red-50 dark:bg-red-950', iconColor: 'text-red-600', valueColor: 'text-red-600',
      },
      {
        label: 'Servicios', value: serviciosPend, sub: 'Pendientes o en trámite', icon: 'handshake',
        route: '/admin/servicios/afiliaciones', borderClass: 'border-l-4 border-l-purple-500',
        iconBg: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600', valueColor: '',
      },
      {
        label: 'Documentos', value: cd.documentos_total, sub: 'Archivos compartidos', icon: 'folder-tree',
        route: '/admin/documentos', borderClass: 'border-l-4 border-l-teal-500',
        iconBg: 'bg-teal-50 dark:bg-teal-950', iconColor: 'text-teal-600', valueColor: '',
      },
      {
        label: 'Diagnósticos', value: cd.diagnosticos_por_estado.reduce((a, e) => a + e.total, 0),
        sub: 'En seguimiento', icon: 'file-check',
        route: '/admin/diagnosticos', borderClass: 'border-l-4 border-l-blue-500',
        iconBg: 'bg-blue-50 dark:bg-blue-950', iconColor: 'text-blue-600', valueColor: '',
      },
    ];
  }

  statusSolicitud(s: number): string {
    const map: Record<number, string> = { 1: 'Nuevo', 2: 'Finalizado', 3: 'Contactado', 4: 'En trámite', 5: 'Rechazado' };
    return map[s] || '';
  }

  goToNewEmpresa() {
    this.router.navigate(['/admin/empresas']).then(() => {
      import('../../../modules/empresas/components/empresa-form.dialog').then(m => {
        this.dialog.open(m.EmpresaFormDialog, { width: '900px', maxWidth: '95vw', data: {} });
      });
    });
  }

  goToNewIndependiente() {
    this.router.navigate(['/admin/independientes']).then(() => {
      import('../../../modules/independientes/components/persona-form.dialog').then(m => {
        this.dialog.open(m.PersonaFormDialog, { width: '720px', maxWidth: '95vw', data: {} });
      });
    });
  }

  protected cards = computed(() => {
    const all = [
      { route: '/admin/empresas/mi-empresa', icon: 'building', label: 'Mi empresa', description: 'Información de la empresa', modulo: undefined as string | undefined, empresaOnly: true, bg: 'bg-blue-50 dark:bg-blue-950', color: 'text-blue-600' },
      { route: '/admin/empresas', icon: 'building', label: 'Empresas', description: 'Empresas registradas', modulo: 'empresas' as string | undefined, empresaOnly: false, bg: 'bg-blue-50 dark:bg-blue-950', color: 'text-blue-600' },
      { route: '/admin/independientes', icon: 'user-plus', label: 'Independientes', description: 'Trabajadores independientes', modulo: 'independientes' as string | undefined, empresaOnly: false, bg: 'bg-cyan-50 dark:bg-cyan-950', color: 'text-cyan-600' },
      { route: '/admin/empleados', icon: 'users', label: 'Empleados', description: 'Gestión de personal', modulo: 'empleados' as string | undefined, empresaOnly: false, bg: 'bg-green-50 dark:bg-green-950', color: 'text-green-600' },
      { route: '/admin/nominas', icon: 'banknote', label: 'Nóminas', description: 'Nóminas generadas', modulo: 'nominas' as string | undefined, empresaOnly: false, bg: 'bg-amber-50 dark:bg-amber-950', color: 'text-amber-600' },
      { route: '/admin/servicios/afiliaciones', icon: 'handshake', label: 'Servicios', description: 'Servicios contratados', modulo: 'servicios' as string | undefined, empresaOnly: false, bg: 'bg-purple-50 dark:bg-purple-950', color: 'text-purple-600' },
      { route: '/admin/pagos', icon: 'dollar-sign', label: 'Pagos', description: 'Cuentas de cobro', modulo: 'pagos' as string | undefined, empresaOnly: false, bg: 'bg-red-50 dark:bg-red-950', color: 'text-red-600' },
      { route: '/admin/documentos', icon: 'folder-tree', label: 'Documentos', description: 'Archivos compartidos', modulo: 'documentos' as string | undefined, empresaOnly: false, bg: 'bg-teal-50 dark:bg-teal-950', color: 'text-teal-600' },
      { route: '/admin/soporte', icon: 'message-circle', label: 'Soporte', description: 'Tickets de soporte', modulo: 'soportes' as string | undefined, empresaOnly: false, bg: 'bg-indigo-50 dark:bg-indigo-950', color: 'text-indigo-600' },
      { route: '/admin/informes', icon: 'bar-chart-3', label: 'Informes', description: 'Reportes y estadísticas', modulo: 'informes' as string | undefined, empresaOnly: false, bg: 'bg-rose-50 dark:bg-rose-950', color: 'text-rose-600' },
    ];
    return all.filter((card) => {
      if (card.empresaOnly) return !!this.user()?.empresa?.id;
      if (card.modulo) return this.credentialsService.hasModulo(card.modulo);
      return true;
    });
  });
}
