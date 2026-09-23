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
import { ApiService } from '@/app/core/api/api.service';
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
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <!-- Welcome Banner -->
      <div class="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:bg-neutral-900">
        <div class="flex items-center gap-4">
          <div class="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xl font-bold text-white">
            {{ initials() }}
          </div>
          <div>
            <h1 class="text-2xl font-bold">Bienvenido de nuevo, {{ firstName() }}!</h1>
            <p class="text-sm text-neutral-500">
              @if (user()?.role === 'admin') {
                Panel de administración — Soy Asesorías
              } @else {
                {{ user()?.empresa?.razon_social || user()?.persona?.primer_nombre || 'Portal de empresa' }}
              }
            </p>
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
                [colors]="['#3b82f6']"
                [yaxis]="{ labels: { formatter: copShort } }"
                [tooltip]="{ y: { formatter: copFull } }"
                [grid]="{ borderColor: '#e5e7eb', strokeDashArray: 4 }"
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

      <!-- Quick Access Modules -->
      <h3 class="text-lg font-bold text-neutral-700 dark:text-neutral-300">Acceso rápido</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of cards(); track card.route) {
          <a [routerLink]="card.route"
             class="flex items-center gap-x-4 rounded-2xl border bg-white p-5 transition-all hover:shadow-md dark:bg-neutral-900">
            <div class="flex size-12 items-center justify-center rounded-xl" [class]="card.bg">
              <mat-icon [svgIcon]="card.icon" [class]="card.color" />
            </div>
            <div>
              <div class="font-semibold">{{ card.label }}</div>
              <div class="text-sm text-neutral-500">{{ card.description }}</div>
            </div>
          </a>
        }
      </div>

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
  protected firstName = computed(() => userFullName(this.user()).split(' ')[0] || '');
  protected initials = computed(() => {
    const name = userFullName(this.user());
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  });
  protected isAdmin = () => this.credentialsService.isAdmin();

  chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    };
    return map[estado] || 'bg-neutral-100 text-neutral-700';
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
      { route: '/admin/soporte', icon: 'message-circle', label: 'Soporte', description: 'Tickets de soporte', modulo: 'soporte' as string | undefined, empresaOnly: false, bg: 'bg-indigo-50 dark:bg-indigo-950', color: 'text-indigo-600' },
      { route: '/admin/informes', icon: 'bar-chart-3', label: 'Informes', description: 'Reportes y estadísticas', modulo: 'informes' as string | undefined, empresaOnly: false, bg: 'bg-rose-50 dark:bg-rose-950', color: 'text-rose-600' },
    ];
    return all.filter((card) => {
      if (card.empresaOnly) return !!this.user()?.empresa?.id;
      if (card.modulo) return this.credentialsService.hasModulo(card.modulo);
      return true;
    });
  });
}
