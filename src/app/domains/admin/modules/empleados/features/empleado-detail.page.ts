import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Documento, Empleado } from '@/app/models/empleado.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { BeneficiarioDialog } from '../components/beneficiario.dialog';
import { IncapacidadDialog } from '../components/incapacidad.dialog';
import { EmpleadoFormDialog } from '../components/empleado-form.dialog';

@Component({
  selector: 'empleado-detail-page',
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
      } @else if (empleado(); as e) {
        <div>
          <a
            routerLink="/admin/empleados"
            class="mb-2 inline-flex items-center gap-x-1 text-sm text-neutral-500 hover:text-blue-600"
          >
            <mat-icon svgIcon="arrow-left" class="size-4" />
            Volver a empleados
          </a>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-2xl font-bold">{{ nombreCompleto(e) }}</div>
              <div class="text-neutral-500">
                {{ e.tipo_documento }} {{ e.numero_documento }}
                @if (e.cargo_nombre) {
                  · {{ e.cargo_nombre }}
                }
              </div>
            </div>
            <button
              matButton="filled"
              (click)="openEdit(e)"
            >
              <mat-icon svgIcon="pencil" />
              Editar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Salario base</div>
            <div class="mt-1 text-xl font-bold">
              {{ e.salario_base | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            </div>
            <div class="text-xs text-neutral-400">
              {{ e.subsidio_transporte ? 'Con aux. transporte' : 'Sin aux. transporte' }}
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Ingreso</div>
            <div class="mt-1 text-sm">
              {{ e.fecha_ingreso | date: 'dd/MM/yyyy' }}
            </div>
            <div class="text-xs text-neutral-400">{{ e.tipo_contrato || '—' }}</div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Seguridad social</div>
            <div class="mt-1 text-xs leading-5">
              EPS: {{ e.eps_nombre || '—' }}<br />
              ARL: {{ e.arl_nombre || '—' }} · Riesgo {{ e.riesgo || '—' }}
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Estado</div>
            <div class="mt-1">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                [class.bg-green-500]="e.status === 'activo'"
                [class.bg-neutral-400]="e.status !== 'activo'"
              >
                {{ e.status }}
              </span>
            </div>
          </div>
        </div>

        <mat-tab-group>
          <!-- Beneficiarios -->
          <mat-tab label="Beneficiarios">
            <div class="rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <div class="flex justify-end border-b border-neutral-100 p-3">
                <button
                  matButton="filled"
                  (click)="openBeneficiario(e)"
                >
                  <mat-icon svgIcon="plus" />
                  Agregar beneficiario
                </button>
              </div>
              <table class="w-full">
                <tbody>
                  @for (b of beneficiarios(); track b.id) {
                    <tr class="border-b border-neutral-100 text-sm">
                      <td class="px-4 py-3 font-medium">{{ b.nombre }}</td>
                      <td class="px-4 py-3">{{ b.parentesco || '—' }}</td>
                      <td class="px-4 py-3">{{ b.num_documento || '—' }}</td>
                      <td class="px-4 py-3">{{ b.fecha_nacimiento | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3 text-right">
                        <button matIconButton (click)="removeBeneficiario(e, b)">
                          <mat-icon svgIcon="trash" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!beneficiarios().length) {
                <div class="py-10 text-center text-neutral-400">Sin beneficiarios</div>
              }
            </div>
          </mat-tab>

          <!-- Incapacidades -->
          <mat-tab label="Incapacidades">
            <div class="rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <div class="flex justify-end border-b border-neutral-100 p-3">
                <button
                  matButton="filled"
                  (click)="openIncapacidad(e)"
                >
                  <mat-icon svgIcon="plus" />
                  Reportar incapacidad
                </button>
              </div>
              <table class="w-full">
                <thead>
                  <tr class="border-b border-neutral-200 text-left text-xs font-semibold uppercase text-neutral-500">
                    <th class="px-4 py-3">Inicio</th>
                    <th class="px-4 py-3">Fin</th>
                    <th class="px-4 py-3">Días</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Valor</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (i of incapacidades(); track i.id) {
                    <tr class="border-b border-neutral-100 text-sm">
                      <td class="px-4 py-3">{{ i.fecha_inicio | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3">{{ i.fecha_fin | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3">{{ i.dias || '—' }}</td>
                      <td class="px-4 py-3 capitalize">{{ i.tipo }}</td>
                      <td class="px-4 py-3">{{ i.valor ? (i.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0') : '—' }}</td>
                      <td class="px-4 py-3">{{ i.status }}</td>
                      <td class="px-4 py-3 text-right">
                        <button matIconButton (click)="removeIncapacidad(e, i)">
                          <mat-icon svgIcon="trash" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!incapacidades().length) {
                <div class="py-10 text-center text-neutral-400">Sin incapacidades</div>
              }
            </div>
          </mat-tab>

          <!-- Documentos -->
          <mat-tab label="Documentos">
            <div class="rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <div class="flex justify-end border-b border-neutral-100 p-3">
                <button
                  matButton="filled"
                  (click)="openUpload(e)"
                >
                  <mat-icon svgIcon="upload" />
                  Subir documento
                </button>
              </div>
              <table class="w-full">
                <tbody>
                  @for (d of documentos(); track d.id) {
                    <tr class="border-b border-neutral-100 text-sm">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                          <mat-icon svgIcon="file-text" class="text-neutral-400" />
                          {{ d.nombre }}
                        </div>
                      </td>
                      <td class="px-4 py-3 text-neutral-500">{{ d.descripcion || '—' }}</td>
                      <td class="px-4 py-3">{{ d.created_at | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3 text-right">
                        <button matIconButton (click)="download(d)">
                          <mat-icon svgIcon="download" />
                        </button>
                        <button matIconButton (click)="removeDoc(d)">
                          <mat-icon svgIcon="trash" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!documentos().length) {
                <div class="py-10 text-center text-neutral-400">Sin documentos</div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
})
export default class EmpleadoDetailPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  empleado = signal<Empleado | null>(null);
  beneficiarios = signal<any[]>([]);
  documentos = signal<Documento[]>([]);
  incapacidades = signal<any[]>([]);
  loading = signal(true);
  isAdmin = this.creds.isAdmin;
  empleadoId = '';

  constructor() {
    this.empleadoId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.empleado(this.empleadoId).subscribe({
      next: (r) => {
        this.empleado.set(r.empleado);
        this.beneficiarios.set(r.beneficiarios || []);
        this.documentos.set(r.documentos || []);
        this.incapacidades.set(r.incapacidades || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreCompleto(e: Empleado) {
    return [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  openEdit(e: Empleado) {
    this.dialog
      .open(EmpleadoFormDialog, {
        width: '900px',
        maxWidth: '95vw',
        data: { empresaId: e.empresa_id, empleado: e },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openBeneficiario(e: Empleado) {
    this.dialog
      .open(BeneficiarioDialog, { width: '520px', data: { empleado: e } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  removeBeneficiario(e: Empleado, b: any) {
    this.api.removeBeneficiario(e.id, b.id).subscribe(() => {
      this.snack.open('Beneficiario eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openIncapacidad(e: Empleado) {
    this.dialog
      .open(IncapacidadDialog, { width: '520px', data: { empleado: e } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  removeIncapacidad(e: Empleado, i: any) {
    this.api.removeIncapacidad(e.id, i.id).subscribe(() => {
      this.snack.open('Incapacidad eliminada', 'OK', { duration: 2500 });
      this.load();
    });
  }

  openUpload(e: Empleado) {
    this.dialog
      .open(DocumentoUploadDialog, { width: '520px', data: { empleado_id: e.id } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  download(d: Documento) {
    this.api.downloadDocumento(d.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  removeDoc(d: Documento) {
    this.api.deleteDocumento(d.id).subscribe(() => {
      this.snack.open('Documento eliminado', 'OK', { duration: 2500 });
      this.load();
    });
  }
}
