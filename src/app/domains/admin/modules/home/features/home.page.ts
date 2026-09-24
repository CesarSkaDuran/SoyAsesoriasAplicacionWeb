import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { NotificationsService } from '@/app/core/notifications/notifications.service';
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
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export default class HomePage {
  private credentialsService = inject(CredentialsService);
  private api = inject(ApiService);
  private notifications = inject(NotificationsService);
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

    this.loadSummary();
    this.notifications.realtimeEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => {
        if (['documento', 'solicitud', 'servicio'].includes(notification.tipo)) {
          this.loadSummary();
        }
      });
  }

  private loadSummary() {
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
