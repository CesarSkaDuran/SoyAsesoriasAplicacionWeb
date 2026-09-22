import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Empresa } from '@/app/models/user.model';
import { Documento, Empleado, Nomina } from '@/app/models/empleado.model';
import { EmpresaServicio } from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { EmpleadoFormDialog } from '../../empleados/components/empleado-form.dialog';
import { EmpresaFormDialog } from '../components/empresa-form.dialog';
import { EmpresaServicioDialog } from '../components/empresa-servicio.dialog';
import { EmpresaUsuarioDialog } from '../components/empresa-usuario.dialog';

@Component({
  selector: 'empresa-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else if (empresa(); as e) {
        <!-- Header -->
        <div>
          <a
            routerLink="/admin/empresas"
            class="mb-2 inline-flex items-center gap-x-1 text-sm text-neutral-500 hover:text-blue-600"
          >
            <mat-icon
              svgIcon="arrow-left"
              class="size-4"
            />
            Volver a empresas
          </a>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-2xl font-bold">{{ e.razon_social }}</div>
              <div class="text-neutral-500">
                NIT {{ e.num_documento }}{{ e.dv ? '-' + e.dv : '' }}
                @if (e.tipo_empresa) {
                  · {{ e.tipo_empresa }}
                }
              </div>
            </div>
            @if (isAdmin()) {
              <div class="flex gap-2">
                <button
                  matButton="outlined"
                  (click)="openUsuario()"
                >
                  <mat-icon svgIcon="user-round" />
                  Usuario de acceso
                </button>
                <button
                  matButton="filled"
                  (click)="openEdit()"
                >
                  <mat-icon svgIcon="pencil" />
                  Editar
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Info cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Contacto</div>
            <div class="mt-1 font-medium">{{ e.email || '—' }}</div>
            <div class="text-sm text-neutral-500">
              {{ e.telefono_movil || e.telefono_fijo || '—' }}
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Representante legal</div>
            <div class="mt-1 font-medium">
              {{ e.representante_legal || '—' }}
            </div>
            <div class="text-sm text-neutral-500">
              {{ e.direccion || '' }}
            </div>
          </div>
          <div class="rounded-2xl border bg-white p-5 dark:bg-neutral-900">
            <div class="text-sm text-neutral-500">Empleados</div>
            <div class="mt-1 text-2xl font-bold">{{ empleadosTotal() }}</div>
          </div>
        </div>

        <!-- Tabs -->
        <mat-tab-group>
          <!-- Empleados -->
          <mat-tab label="Empleados">
            <div class="py-4">
              <div class="mb-3 flex justify-end">
                <button
                  matButton="outlined"
                  (click)="openEmpleado()"
                >
                  <mat-icon svgIcon="plus" />
                  Nuevo empleado
                </button>
              </div>
              @if (!empleados().length) {
                <div class="p-6 text-neutral-500">Sin empleados</div>
              }
              <div class="overflow-hidden rounded-xl border">
                @for (emp of empleados(); track emp.id) {
                  <div
                    class="flex items-center justify-between border-b px-4 py-3 last:border-0"
                  >
                    <div>
                      <div class="font-medium">
                        {{ emp.primer_nombre }} {{ emp.primer_apellido }}
                      </div>
                      <div class="text-sm text-neutral-500">
                        {{ emp.numero_documento }}
                        @if (emp.cargo_nombre) {
                          · {{ emp.cargo_nombre }}
                        }
                      </div>
                    </div>
                    <div class="text-sm text-neutral-500">
                      {{ emp.eps_nombre || '' }}
                    </div>
                  </div>
                }
              </div>
            </div>
          </mat-tab>

          <!-- Nominas -->
          <mat-tab label="Nóminas">
            <div class="py-4">
              @if (!nominas().length) {
                <div class="p-6 text-neutral-500">Sin nóminas generadas</div>
              }
              @for (n of nominas(); track n.id) {
                <div
                  class="mb-2 flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <div class="font-medium">
                      Nómina #{{ n.id }}
                      @if (n.nombre_periodo) {
                        — {{ n.nombre_periodo }}
                      }
                    </div>
                    <div class="text-sm text-neutral-500">
                      {{ n.num_empleados }} empleados · {{ n.status }}
                    </div>
                  </div>
                  <div class="font-semibold">
                    {{ n.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                  </div>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Servicios contratados (empresa_servicios) -->
          <mat-tab label="Servicios">
            <div class="py-4">
              @if (isAdmin()) {
                <div class="mb-3 flex justify-end">
                  <button
                    matButton="outlined"
                    (click)="openServicio()"
                  >
                    <mat-icon svgIcon="plus" />
                    Asignar servicio
                  </button>
                </div>
              }
              @if (!servicios().length) {
                <div class="p-6 text-neutral-500">
                  La empresa no tiene servicios contratados
                </div>
              }
              @for (s of servicios(); track s.id) {
                <div
                  class="mb-2 flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <div class="font-medium">{{ s.servicio_nombre }}</div>
                    <div class="text-sm text-neutral-500">
                      {{ s.tipo || 'servicio' }}
                      @if (s.fecha_inicio) {
                        · desde {{ s.fecha_inicio | date: 'mediumDate' }}
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-x-3">
                    <span class="font-semibold">
                      {{
                        s.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0'
                      }}
                    </span>
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      [class.bg-green-100]="s.status === 'activo'"
                      [class.text-green-700]="s.status === 'activo'"
                      [class.bg-neutral-200]="s.status !== 'activo'"
                      [class.text-neutral-600]="s.status !== 'activo'"
                    >
                      {{ s.status }}
                    </span>
                    @if (isAdmin()) {
                      <button
                        matIconButton
                        title="Quitar"
                        (click)="removeServicio(s)"
                      >
                        <mat-icon
                          svgIcon="trash"
                          class="text-neutral-400"
                        />
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Documentos -->
          <mat-tab label="Documentos">
            <div class="py-4">
              <div class="mb-3 flex justify-end">
                <button
                  matButton="outlined"
                  (click)="openUpload()"
                >
                  <mat-icon svgIcon="upload" />
                  Subir documento
                </button>
              </div>
              @if (!documentos().length) {
                <div class="p-6 text-neutral-500">Sin documentos</div>
              }
              @for (d of documentos(); track d.id) {
                <div
                  class="mb-2 flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div class="flex items-center gap-x-3">
                    <mat-icon
                      svgIcon="file-text"
                      class="text-neutral-400"
                    />
                    <div>
                      <div class="font-medium">{{ d.nombre }}</div>
                      <div class="text-sm text-neutral-500">
                        {{ d.created_at | date: 'mediumDate' }}
                      </div>
                    </div>
                  </div>
                  <button
                    class="text-blue-600 hover:underline"
                    (click)="download(d)"
                  >
                    Descargar
                  </button>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
})
export default class EmpresaDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private credentials = inject(CredentialsService);

  protected isAdmin = () => this.credentials.isAdmin();

  protected empresa = signal<Empresa | null>(null);
  protected empleados = signal<Empleado[]>([]);
  protected empleadosTotal = signal(0);
  protected nominas = signal<Nomina[]>([]);
  protected documentos = signal<Documento[]>([]);
  protected servicios = signal<EmpresaServicio[]>([]);
  protected loading = signal(true);

  protected empresaId = '';

  constructor() {
    this.empresaId = this.route.snapshot.paramMap.get('id')!;
    this.reload();
  }

  reload() {
    const id = this.empresaId;
    this.api.empresa(id).subscribe({
      next: (res: any) => {
        this.empresa.set(res.empresa ?? res);
        this.servicios.set(res.servicios ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.empleados(id).subscribe((res) => {
      this.empleados.set(res.data);
      this.empleadosTotal.set(res.total);
    });
    this.api.nominas(id).subscribe((res) => this.nominas.set(res.data));
    this.api
      .documentos({ empresa_id: id })
      .subscribe((res) => this.documentos.set(res.data));
  }

  openEdit() {
    this.dialog
      .open(EmpresaFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  openUsuario() {
    this.dialog
      .open(EmpresaUsuarioDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.reload();
      });
  }

  openServicio() {
    this.dialog
      .open(EmpresaServicioDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa: this.empresa() },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  removeServicio(s: EmpresaServicio) {
    this.api
      .removeEmpresaServicio(this.empresaId, s.servicio_id)
      .subscribe((res) => this.servicios.set(res.servicios));
  }

  openEmpleado() {
    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId: Number(this.empresaId) },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  openUpload() {
    this.dialog
      .open(DocumentoUploadDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { empresa_id: Number(this.empresaId) },
      })
      .afterClosed()
      .subscribe((uploaded) => {
        if (uploaded) this.reload();
      });
  }

  download(doc: Documento) {
    this.api.downloadDocumento(doc.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
