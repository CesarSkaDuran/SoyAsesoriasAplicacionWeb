import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Documento } from '@/app/models/empleado.model';
import {
  CUENTA_STATUS,
  CUENTA_STATUS_COLOR,
  CuentaCobro,
  PAGO_STATUS,
  PAGO_STATUS_COLOR,
  Persona,
  SERVICIO_STATUS,
  SERVICIO_STATUS_COLOR,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { PersonaFormDialog } from '../components/persona-form.dialog';

@Component({
  selector: 'independiente-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    NgClass,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      @if (loading()) {
        <div class="flex justify-center p-10">
          <mat-spinner />
        </div>
      } @else if (persona(); as p) {
        <div>
          <a
            routerLink="/admin/independientes"
            class="mb-2 inline-flex items-center gap-x-1 text-sm text-neutral-500 hover:text-blue-600"
          >
            <mat-icon svgIcon="arrow-left" class="size-4" />
            Volver a independientes
          </a>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-2xl font-bold">{{ nombreCompleto(p) }}</div>
              <div class="text-neutral-500">
                {{ p.tipo_documento }} {{ p.num_documento }}
              </div>
            </div>
            <div class="flex gap-2">
              <button
                matButton="filled"
                (click)="openEdit(p)"
              >
                <mat-icon svgIcon="pencil" />
                Editar
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Contacto</div>
            <div class="mt-2 text-sm">
              <div>{{ p.email || '—' }}</div>
              <div>{{ p.telefono || '—' }}</div>
              <div>{{ p.direccion || '—' }}</div>
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Ubicación</div>
            <div class="mt-2 text-sm">
              <div>{{ p.ciudad_nombre || '—' }}</div>
              <div>{{ p.departamento_nombre || '—' }}</div>
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 bg-white p-5">
            <div class="text-sm font-semibold text-neutral-500">Estado</div>
            <div class="mt-2">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                [class.bg-green-500]="p.status === 'activo'"
                [class.bg-neutral-400]="p.status !== 'activo'"
              >
                {{ p.status }}
              </span>
            </div>
          </div>
        </div>

        <mat-tab-group>
          <mat-tab label="Servicios">
            <div class="overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-neutral-200 text-left text-xs font-semibold uppercase text-neutral-500">
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Servicio</th>
                    <th class="px-4 py-3">Detalle</th>
                    <th class="px-4 py-3">Valor</th>
                    <th class="px-4 py-3">Pago</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of servicios(); track s.id) {
                    <tr class="border-b border-neutral-100 text-sm">
                      <td class="px-4 py-3">{{ s.fecha | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3">{{ s.nombre || '—' }}</td>
                      <td class="px-4 py-3">{{ s.paquete || '—' }}</td>
                      <td class="px-4 py-3">{{ s.valor ? (s.valor | currency: 'COP' : 'symbol-narrow' : '1.0-0') : '—' }}</td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs text-white" [ngClass]="pagoColor(s.status_pago)">
                          {{ pagoLabel(s.status_pago) }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs text-white" [ngClass]="servicioColor(s.status)">
                          {{ servicioLabel(s.status) }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!servicios().length) {
                <div class="py-10 text-center text-neutral-400">Sin servicios registrados</div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Pagos">
            <div class="overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-neutral-200 text-left text-xs font-semibold uppercase text-neutral-500">
                    <th class="px-4 py-3">N°</th>
                    <th class="px-4 py-3">Concepto</th>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Valor</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of cuentas(); track c.id) {
                    <tr class="border-b border-neutral-100 text-sm">
                      <td class="px-4 py-3">{{ c.numero || c.id }}</td>
                      <td class="px-4 py-3">{{ c.nombre || '—' }}</td>
                      <td class="px-4 py-3">{{ c.fecha | date: 'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3">{{ c.valor_total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs text-white" [ngClass]="cuentaColor(c.status)">
                          {{ cuentaLabel(c.status) }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (!cuentas().length) {
                <div class="py-10 text-center text-neutral-400">Sin cuentas de cobro</div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Documentos">
            <div class="rounded-b-xl border border-t-0 border-neutral-200 bg-white">
              <div class="flex justify-end border-b border-neutral-100 p-3">
                <button
                  matButton="filled"
                  (click)="openUpload(p)"
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
export default class IndependienteDetailPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  persona = signal<Persona | null>(null);
  documentos = signal<Documento[]>([]);
  servicios = signal<ServicioRegistro[]>([]);
  cuentas = signal<CuentaCobro[]>([]);
  loading = signal(true);
  isAdmin = this.creds.isAdmin;
  personaId = '';

  constructor() {
    this.personaId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.persona(this.personaId).subscribe({
      next: (r) => {
        this.persona.set(r.persona);
        this.documentos.set(r.documentos || []);
        this.servicios.set(r.servicios || []);
        this.cuentas.set(r.cuentas || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreCompleto(p: Persona) {
    return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  servicioLabel = (s: number) => SERVICIO_STATUS[s] || '—';
  servicioColor = (s: number) => SERVICIO_STATUS_COLOR[s] || 'bg-neutral-400';
  pagoLabel = (s: number) => PAGO_STATUS[s] || '—';
  pagoColor = (s: number) => PAGO_STATUS_COLOR[s] || 'bg-neutral-400';
  cuentaLabel = (s: number) => CUENTA_STATUS[s] || '—';
  cuentaColor = (s: number) => CUENTA_STATUS_COLOR[s] || 'bg-neutral-400';

  openEdit(p: Persona) {
    this.dialog
      .open(PersonaFormDialog, { width: '640px', data: { persona: p } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openUpload(p: Persona) {
    this.dialog
      .open(DocumentoUploadDialog, { width: '520px', data: { persona_id: p.id } })
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
}
