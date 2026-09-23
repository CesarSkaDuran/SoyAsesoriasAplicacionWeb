import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import {
  Diagnostico,
  DiagnosticoDocumento,
  DiagnosticoDocConfig,
  DiagnosticoPregunta,
  Usuario,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';
import { DiagnosticoFormDialog } from '../components/diagnostico-form.dialog';

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  logrado: 'Logrado',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-500',
  en_progreso: 'bg-sky-500',
  logrado: 'bg-emerald-500',
  cancelado: 'bg-neutral-400',
};
const DOC_ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  revisar: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  renovar: 'Renovar',
};
const DOC_ESTADO_CLASS: Record<string, string> = {
  pendiente: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  revisar: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rechazado: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  renovar: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

interface DocItem {
  config: DiagnosticoDocConfig;
  documento: DiagnosticoDocumento | null;
}

@Component({
  selector: 'diagnostico-detail-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatTabsModule,
    MatIcon,
    MatProgressSpinner,
    DatePipe,
  ],
  template: `
    <div class="flex h-full flex-col lg:flex-row">
      @if (loading()) {
        <div class="flex flex-1 justify-center py-20">
          <mat-spinner diameter="48" />
        </div>
      } @else if (diag(); as d) {
        <!-- ── Sidebar resumen (como el sistema anterior) ─────────────────── -->
        <aside class="w-full flex-shrink-0 border-b border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:w-80 lg:border-b-0 lg:border-r">
          <a
            matButton="text"
            routerLink="/admin/diagnosticos"
            class="mb-4 -ml-2"
          >
            <mat-icon svgIcon="arrow-left" />
            Volver
          </a>

          <span class="text-xs font-medium uppercase tracking-wide text-neutral-400">Diagnóstico</span>
          <h1 class="mt-1 text-xl font-bold leading-tight">{{ d.nombre }}</h1>

          <!-- Chips fechas -->
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs dark:border-neutral-700">
              <mat-icon svgIcon="calendar" class="!h-3.5 !w-3.5" />
              {{ d.fecha_inicio | date: 'dd/MM/yyyy' }} al {{ d.fecha_fin | date: 'dd/MM/yyyy' }}
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs dark:border-neutral-700">
              <mat-icon svgIcon="list-check" class="!h-3.5 !w-3.5" />
              {{ duracion() }} días
            </span>
          </div>

          <!-- Estado con menú -->
          <div class="mt-4">
            <button
              class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white {{ estadoColor(d.estado) }}"
              [matMenuTriggerFor]="estadoMenu"
            >
              {{ estadoLabel(d.estado) }}
              <mat-icon svgIcon="chevron-right" class="!h-4 !w-4 rotate-90" />
            </button>
            <mat-menu #estadoMenu="matMenu">
              @for (e of estados; track e) {
                <button
                  mat-menu-item
                  [disabled]="e === d.estado"
                  (click)="setEstado(e)"
                >
                  <span class="mr-2 inline-block h-2 w-2 rounded-full {{ estadoColor(e) }}"></span>
                  {{ estadoLabel(e) }}
                  @if (e === d.estado) {
                    <mat-icon svgIcon="check" class="ml-2 !h-4 !w-4" />
                  }
                </button>
              }
            </mat-menu>
          </div>

          <!-- Cliente -->
          <div class="mt-6 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Cliente</h2>
            <dl class="space-y-1.5 text-sm">
              <div class="flex justify-between gap-2">
                <dt class="text-neutral-400">Nombre</dt>
                <dd class="text-right font-medium">{{ d.empresa_nombre || d.persona_nombre || '—' }}</dd>
              </div>
              @if (d.empresa_nit) {
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400">NIT</dt>
                  <dd class="font-medium">{{ d.empresa_nit }}</dd>
                </div>
              }
              <div class="flex justify-between gap-2">
                <dt class="text-neutral-400">Responsable</dt>
                <dd class="text-right font-medium">{{ d.responsable_nombre || 'Sin asignar' }}</dd>
              </div>
            </dl>
          </div>

          <!-- Avance -->
          @if (d.metricas; as m) {
            <div class="mt-6 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Avance del diagnóstico
              </h2>
              <div class="mb-3">
                <div class="mb-1 flex justify-between text-xs">
                  <span class="text-neutral-500">Preguntas respondidas</span>
                  <span class="font-medium">{{ m.respondidas }}/{{ m.preguntas_total }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div class="h-full rounded-full bg-sky-500 transition-all" [style.width.%]="m.preguntas_pct"></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex justify-between text-xs">
                  <span class="text-neutral-500">Documentos cargados</span>
                  <span class="font-medium">{{ m.docs_cargados }}/{{ m.docs_total }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div class="h-full rounded-full bg-emerald-500 transition-all" [style.width.%]="m.docs_pct"></div>
                </div>
              </div>
            </div>
          }

          @if (isAdmin()) {
            <div class="mt-6 space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <button
                matButton="outlined"
                class="w-full"
                (click)="openEdit()"
              >
                <mat-icon svgIcon="pencil" />
                Editar datos
              </button>
              <button
                matButton="text"
                class="w-full !text-red-600"
                (click)="remove()"
              >
                <mat-icon svgIcon="trash" />
                Eliminar diagnóstico
              </button>
            </div>
          }
        </aside>

        <!-- ── Contenido con pestañas ────────────────────────────────────── -->
        <div class="min-w-0 flex-1 p-6 sm:p-8">
          <mat-tab-group animationDuration="200ms">
            <!-- ══ ENTREVISTA ══ -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon svgIcon="message-circle" class="mr-2" />
                Entrevista
              </ng-template>

              <div class="mt-6 max-w-3xl">
                @if (!preguntas().length) {
                  <div class="rounded-xl border border-dashed border-neutral-300 py-14 text-center text-neutral-400 dark:border-neutral-700">
                    <mat-icon svgIcon="message-circle-dashed" class="!h-10 !w-10" />
                    <h3 class="mt-2 font-semibold text-neutral-500">No hay preguntas configuradas</h3>
                    @if (isAdmin()) {
                      <p class="mt-1 text-sm">Configúralas desde el botón Configurar en el listado.</p>
                    }
                  </div>
                } @else {
                  <form
                    [formGroup]="entrevistaForm"
                    (ngSubmit)="saveRespuestas()"
                    class="space-y-5"
                  >
                    @for (p of preguntas(); track p.id) {
                      <div class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <label class="mb-1 block text-sm font-semibold">
                          {{ p.titulo }}
                          @if (p.es_obligatoria) {
                            <span class="text-red-500">*</span>
                          }
                        </label>
                        @if (p.descripcion) {
                          <p class="mb-2 text-xs text-neutral-400">{{ p.descripcion }}</p>
                        }

                        @switch (p.tipo_respuesta) {
                          @case ('textarea') {
                            <textarea
                              class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
                              rows="3"
                              [formControlName]="'p_' + p.id"
                            ></textarea>
                          }
                          @case ('numero') {
                            <input
                              type="number"
                              class="w-48 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
                              [formControlName]="'p_' + p.id"
                            />
                          }
                          @case ('fecha') {
                            <input
                              type="date"
                              class="w-48 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
                              [formControlName]="'p_' + p.id"
                            />
                          }
                          @case ('booleano') {
                            <div class="flex gap-3">
                              <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">
                                <input type="radio" [value]="'1'" [formControlName]="'p_' + p.id" />
                                Sí
                              </label>
                              <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">
                                <input type="radio" [value]="'0'" [formControlName]="'p_' + p.id" />
                                No
                              </label>
                            </div>
                          }
                          @case ('opciones') {
                            <select
                              class="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
                              [formControlName]="'p_' + p.id"
                            >
                              <option value="">Seleccionar…</option>
                              @for (o of p.opciones || []; track o) {
                                <option [value]="o">{{ o }}</option>
                              }
                            </select>
                          }
                          @default {
                            <input
                              type="text"
                              class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
                              [formControlName]="'p_' + p.id"
                            />
                          }
                        }

                        @if (p.ayuda_contextual) {
                          <p class="mt-2 flex items-start gap-1.5 text-xs text-neutral-400">
                            <mat-icon svgIcon="message-circle" class="!h-3.5 !w-3.5 flex-shrink-0" />
                            {{ p.ayuda_contextual }}
                          </p>
                        }
                      </div>
                    }

                    <button
                      matButton="filled"
                      type="submit"
                      [disabled]="savingRespuestas()"
                    >
                      <mat-icon svgIcon="check" />
                      {{ savingRespuestas() ? 'Guardando…' : 'Guardar respuestas' }}
                    </button>
                  </form>
                }
              </div>
            </mat-tab>

            <!-- ══ DOCUMENTOS ══ -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon svgIcon="file-text" class="mr-2" />
                Documentos
              </ng-template>

              <div class="mt-6 max-w-3xl space-y-4">
                @if (!documentos().length) {
                  <div class="rounded-xl border border-dashed border-neutral-300 py-14 text-center text-neutral-400 dark:border-neutral-700">
                    <mat-icon svgIcon="file-text" class="!h-10 !w-10" />
                    <h3 class="mt-2 font-semibold text-neutral-500">Sin documentos configurados</h3>
                  </div>
                }

                @for (item of documentos(); track item.config.id) {
                  <article class="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    <header class="flex items-start justify-between gap-4 p-5 pb-3">
                      <div>
                        <h3 class="font-semibold">
                          {{ item.config.titulo }}
                          @if (item.config.es_obligatorio) {
                            <span class="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950">Obligatorio</span>
                          }
                        </h3>
                        @if (item.config.descripcion) {
                          <p class="mt-1 text-xs text-neutral-400">{{ item.config.descripcion }}</p>
                        }
                        @if (item.config.tipo_archivo) {
                          <p class="mt-1 text-xs text-neutral-400">
                            Formatos: <span class="font-medium uppercase">{{ item.config.tipo_archivo }}</span>
                          </p>
                        }
                      </div>
                      <span class="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold {{ docEstadoClass(item.documento?.estado || 'pendiente') }}">
                        {{ docEstadoLabel(item.documento?.estado || 'pendiente') }}
                      </span>
                    </header>

                    <div class="flex flex-wrap items-center gap-3 border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
                      @if (item.documento?.ruta_archivo) {
                        <button
                          matButton="tonal"
                          class="!py-1.5"
                          (click)="downloadDoc(item.documento!)"
                        >
                          <mat-icon svgIcon="eye" />
                          {{ item.documento!.nombre_original }}
                        </button>
                      }
                      <label
                        class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:border-sky-400 hover:text-sky-600 dark:border-neutral-600 dark:text-neutral-400"
                      >
                        <mat-icon svgIcon="upload" />
                        {{ item.documento?.ruta_archivo ? 'Reemplazar archivo' : 'Cargar archivo' }}
                        <input
                          type="file"
                          hidden
                          [accept]="acceptFor(item.config.tipo_archivo)"
                          (change)="uploadDoc(item.config, $event)"
                        />
                      </label>
                      @if (uploadingId() === item.config.id) {
                        <mat-spinner diameter="20" />
                      }
                    </div>

                    @if (item.documento?.comentarios_revision) {
                      <div class="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800">
                        <strong>Revisión{{ item.documento!.revisado_por_nombre ? ' · ' + item.documento!.revisado_por_nombre : '' }}:</strong>
                        {{ item.documento!.comentarios_revision }}
                      </div>
                    }

                    <!-- Revisión del staff -->
                    @if (isAdmin() && item.documento?.ruta_archivo) {
                      <div class="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
                        <span class="text-xs font-medium text-neutral-500">Revisar:</span>
                        @for (s of docEstados; track s.value) {
                          <button
                            class="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-sky-500 hover:text-sky-600 dark:border-neutral-600"
                            [class.!border-sky-500]="item.documento!.estado === s.value"
                            [class.!text-sky-600]="item.documento!.estado === s.value"
                            (click)="revisar(item.documento!, s.value)"
                          >
                            {{ s.label }}
                          </button>
                        }
                      </div>
                    }
                  </article>
                }
              </div>
            </mat-tab>

            <!-- ══ INFORME ══ -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon svgIcon="file-check" class="mr-2" />
                Informe
              </ng-template>

              <div class="mt-6 max-w-3xl">
                @if (isAdmin()) {
                  <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    <div class="flex flex-wrap gap-1 border-b border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/40">
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('bold')">B</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs italic hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('italic')">I</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs underline hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('underline')">U</button>
                      <span class="mx-1 w-px bg-neutral-200 dark:bg-neutral-700"></span>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="block('h1')">Título</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="block('h2')">Subtítulo</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="block('p')">Texto normal</button>
                      <span class="mx-1 w-px bg-neutral-200 dark:bg-neutral-700"></span>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('insertUnorderedList')">• Lista</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('insertOrderedList')">1. Lista</button>
                      <span class="mx-1 w-px bg-neutral-200 dark:bg-neutral-700"></span>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('justifyLeft')">◧</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('justifyCenter')">◫</button>
                      <button type="button" class="rounded px-2.5 py-1.5 text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700" (click)="exec('justifyRight')">◨</button>
                    </div>
                    <div
                      #informeEditor
                      contenteditable="true"
                      class="informe-content min-h-72 p-5 text-sm leading-relaxed focus:outline-none"
                    ></div>
                    <div class="flex justify-end border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                      <button
                        matButton="filled"
                        [disabled]="savingInforme()"
                        (click)="saveInforme(informeEditor.innerHTML)"
                      >
                        <mat-icon svgIcon="check" />
                        {{ savingInforme() ? 'Guardando…' : 'Guardar informe' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                    @if (informeHtml()) {
                      <div class="informe-content text-sm leading-relaxed" [innerHTML]="informeHtml()"></div>
                    } @else {
                      <p class="text-neutral-400">El informe aún no está disponible.</p>
                    }
                  </div>
                }
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: `
    .informe-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75em 0 0.4em; }
    .informe-content h2 { font-size: 1.2rem; font-weight: 600; margin: 0.6em 0 0.3em; }
    .informe-content p { margin: 0.4em 0; }
    .informe-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.4em 0; }
    .informe-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4em 0; }
  `,
})
export default class DiagnosticoDetailPage {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  creds = inject(CredentialsService);

  id = Number(this.route.snapshot.paramMap.get('id'));
  diag = signal<Diagnostico | null>(null);
  preguntas = signal<DiagnosticoPregunta[]>([]);
  documentos = signal<DocItem[]>([]);
  informeHtml = signal('');
  loading = signal(true);
  savingRespuestas = signal(false);
  savingInforme = signal(false);
  uploadingId = signal<number | null>(null);

  isAdmin = () => this.creds.isAdmin();
  estados = ['pendiente', 'en_progreso', 'logrado', 'cancelado'];
  docEstados = [
    { value: 'aprobado', label: 'Aprobar' },
    { value: 'revisar', label: 'En revisión' },
    { value: 'rechazado', label: 'Rechazar' },
    { value: 'renovar', label: 'Solicitar renovación' },
    { value: 'pendiente', label: 'Pendiente' },
  ];

  entrevistaForm = this.fb.group<Record<string, FormControl<string | null>>>({});

  duracion = computed(() => {
    const d = this.diag();
    if (!d) return 0;
    const a = new Date(d.fecha_inicio).getTime();
    const b = new Date(d.fecha_fin).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  });

  constructor() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.api.diagnostico(this.id).subscribe({
      next: (d) => {
        this.diag.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadEntrevista();
    this.loadDocumentos();
    this.api.diagnosticoInforme(this.id).subscribe((r) => {
      this.informeHtml.set(r.contenido_html);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('[contenteditable].informe-content');
        if (el && r.contenido_html) el.innerHTML = r.contenido_html;
      });
    });
  }

  loadEntrevista() {
    this.api.diagnosticoEntrevista(this.id).subscribe((r) => {
      this.preguntas.set(r.preguntas);
      const group: Record<string, FormControl<string | null>> = {};
      for (const p of r.preguntas) {
        group['p_' + p.id] = new FormControl<string | null>(p.respuesta ?? '');
      }
      this.entrevistaForm = this.fb.group(group);
    });
  }

  loadDocumentos() {
    this.api.diagnosticoDocumentos(this.id).subscribe((r) => this.documentos.set(r.documentos));
  }

  estadoLabel = (s: string) => ESTADO_LABEL[s] || s;
  estadoColor = (s: string) => ESTADO_COLOR[s] || 'bg-neutral-400';
  docEstadoLabel = (s: string) => DOC_ESTADO_LABEL[s] || s;
  docEstadoClass = (s: string) => DOC_ESTADO_CLASS[s] || DOC_ESTADO_CLASS['pendiente'];

  setEstado(estado: string) {
    this.api.updateDiagnosticoEstado(this.id, estado).subscribe(() => {
      this.diag.update((d) => (d ? { ...d, estado: estado as Diagnostico['estado'] } : d));
      this.snack.open('Estado actualizado', 'OK', { duration: 2000 });
    });
  }

  saveRespuestas() {
    this.savingRespuestas.set(true);
    const raw = this.entrevistaForm.getRawValue();
    const respuestas: Record<number, unknown> = {};
    for (const p of this.preguntas()) {
      const v = raw['p_' + p.id];
      if (v !== undefined && v !== null && v !== '') respuestas[p.id] = v;
    }
    this.api.saveRespuestas(this.id, respuestas).subscribe({
      next: () => {
        this.savingRespuestas.set(false);
        this.snack.open('Respuestas guardadas', 'OK', { duration: 2000 });
        this.api.diagnostico(this.id).subscribe((d) => this.diag.set(d));
      },
      error: () => {
        this.savingRespuestas.set(false);
        this.snack.open('No se pudieron guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  acceptFor(tipos: string | null): string {
    return tipos ? tipos.split(',').map(t => '.' + t.trim()).join(',') : '';
  }

  uploadDoc(config: DiagnosticoDocConfig, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingId.set(config.id);
    this.api.uploadDiagnosticoDoc(this.id, config.id, file).subscribe({
      next: () => {
        this.uploadingId.set(null);
        this.snack.open('Documento cargado', 'OK', { duration: 2000 });
        this.loadDocumentos();
        this.api.diagnostico(this.id).subscribe((d) => this.diag.set(d));
      },
      error: (e) => {
        this.uploadingId.set(null);
        input.value = '';
        this.snack.open(e?.error?.message || 'No se pudo cargar', 'Cerrar', { duration: 3500 });
      },
    });
  }

  revisar(doc: DiagnosticoDocumento, estado: string) {
    this.api.revisarDiagnosticoDoc(doc.id, estado).subscribe({
      next: () => {
        this.snack.open('Revisión registrada', 'OK', { duration: 2000 });
        this.loadDocumentos();
      },
      error: () => this.snack.open('No se pudo revisar', 'Cerrar', { duration: 3000 }),
    });
  }

  downloadDoc(doc: DiagnosticoDocumento) {
    this.http
      .get(this.api.diagnosticoDocDownloadUrl(doc.id).replace(/^\/api/, ''), { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      });
  }

  exec(cmd: string) {
    document.execCommand(cmd);
  }

  block(tag: string) {
    document.execCommand('formatBlock', false, tag);
  }

  saveInforme(html: string) {
    this.savingInforme.set(true);
    this.api.saveDiagnosticoInforme(this.id, html).subscribe({
      next: () => {
        this.savingInforme.set(false);
        this.informeHtml.set(html);
        this.snack.open('Informe guardado', 'OK', { duration: 2000 });
      },
      error: () => {
        this.savingInforme.set(false);
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  openEdit() {
    const d = this.diag();
    if (!d) return;
    this.dialog
      .open(DiagnosticoFormDialog, {
        width: '720px',
        data: { diagnostico: d },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.loadAll());
  }

  remove() {
    const d = this.diag();
    if (!d || !confirm(`¿Eliminar definitivamente "${d.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.api.deleteDiagnostico(d.id).subscribe(() => {
      history.back();
    });
  }
}
