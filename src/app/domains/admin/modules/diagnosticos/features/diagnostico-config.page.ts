import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { DiagnosticoDocConfig, DiagnosticoPregunta } from '@/app/models/negocio.model';

const TIPOS_RESPUESTA = [
  { value: 'texto', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'opciones', label: 'Opciones (una)' },
  { value: 'booleano', label: 'Sí / No' },
];

@Component({
  selector: 'diagnostico-config-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckbox,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatIcon,
    MatProgressSpinner,
    PageHeader,
  ],
  template: `
    <div class="flex flex-col gap-y-6 p-6 sm:p-10">
      <page-header
        title="Configuración de diagnósticos"
        subtitle="Preguntas de la entrevista y documentos requeridos"
      >
        <a matButton="tonal" routerLink="/admin/diagnosticos">
          <mat-icon svgIcon="arrow-left" />
          Volver
        </a>
      </page-header>

      <mat-tab-group
        animationDuration="200ms"
        mat-stretch-tabs="false"
        class="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <!-- ══ PREGUNTAS ══ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon svgIcon="message-circle" class="mr-2" />
            Preguntas
            <span class="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">{{ preguntas().length }}</span>
          </ng-template>

          <div class="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
            <!-- Lista -->
            <div class="space-y-3 lg:col-span-2">
              @if (loadingP()) {
                <div class="flex justify-center py-10"><mat-spinner diameter="36" /></div>
              }
              @for (p of preguntas(); track p.id) {
                <div
                  class="rounded-xl border border-neutral-200 p-4 transition-shadow hover:shadow-sm dark:border-neutral-700"
                  [class.opacity-50]="!p.activo"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 gap-3">
                      <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-950">
                        {{ p.orden }}
                      </span>
                      <div class="min-w-0">
                        <div class="font-medium leading-snug">{{ p.titulo }}</div>
                        @if (p.descripcion) {
                          <p class="mt-1 text-xs leading-relaxed text-neutral-400">{{ p.descripcion }}</p>
                        }
                        <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
                          <span class="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">{{ tipoLabel(p.tipo_respuesta) }}</span>
                          @if (p.es_obligatoria) {
                            <span class="rounded bg-red-50 px-2 py-0.5 text-red-600 dark:bg-red-950 dark:text-red-400">obligatoria</span>
                          }
                          @if (!p.activo) {
                            <span class="rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">inactiva</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-shrink-0">
                      <button matIconButton (click)="editPregunta(p)" title="Editar">
                        <mat-icon svgIcon="pencil" />
                      </button>
                      <button matIconButton class="!text-red-500" (click)="removePregunta(p)" title="Eliminar">
                        <mat-icon svgIcon="trash" />
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Formulario -->
            <div>
              <form
                [formGroup]="preguntaForm"
                (ngSubmit)="savePregunta()"
                class="sticky top-6 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <div class="mb-4 flex items-center gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-700">
                  <mat-icon svgIcon="message-circle" class="text-sky-600" />
                  <span class="font-semibold">{{ editingP() ? 'Editar pregunta' : 'Nueva pregunta' }}</span>
                </div>

                <div class="flex flex-col gap-4">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Título *</mat-label>
                    <textarea matInput rows="2" formControlName="titulo"></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Descripción</mat-label>
                    <input matInput formControlName="descripcion" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Tipo de respuesta</mat-label>
                    <mat-select formControlName="tipo_respuesta">
                      @for (t of tipos; track t.value) {
                        <mat-option [value]="t.value">{{ t.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (preguntaForm.value.tipo_respuesta === 'opciones') {
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                      <mat-label>Opciones (una por línea)</mat-label>
                      <textarea matInput rows="3" formControlName="opciones"></textarea>
                    </mat-form-field>
                  }

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Ayuda contextual</mat-label>
                    <textarea matInput rows="2" formControlName="ayuda_contextual"></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-28">
                    <mat-label>Orden</mat-label>
                    <input matInput type="number" formControlName="orden" />
                  </mat-form-field>

                  <div class="flex items-center gap-5">
                    <mat-checkbox formControlName="es_obligatoria">Obligatoria</mat-checkbox>
                    <mat-checkbox formControlName="activo">Activa</mat-checkbox>
                  </div>

                  <div class="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    @if (editingP()) {
                      <button type="button" matButton="text" (click)="cancelP()">Cancelar</button>
                    }
                    <button matButton="filled" type="submit" [disabled]="preguntaForm.invalid">
                      {{ editingP() ? 'Guardar' : 'Agregar' }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </mat-tab>

        <!-- ══ DOCUMENTOS ══ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon svgIcon="file-text" class="mr-2" />
            Documentos requeridos
            <span class="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">{{ docConfigs().length }}</span>
          </ng-template>

          <div class="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
            <!-- Lista -->
            <div class="space-y-3 lg:col-span-2">
              @if (loadingD()) {
                <div class="flex justify-center py-10"><mat-spinner diameter="36" /></div>
              }
              @for (c of docConfigs(); track c.id) {
                <div
                  class="rounded-xl border border-neutral-200 p-4 transition-shadow hover:shadow-sm dark:border-neutral-700"
                  [class.opacity-50]="!c.activo"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 gap-3">
                      <span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-600 dark:bg-violet-950">
                        {{ c.orden }}
                      </span>
                      <div class="min-w-0">
                        <div class="font-medium leading-snug">{{ c.titulo }}</div>
                        @if (c.descripcion) {
                          <p class="mt-1 text-xs leading-relaxed text-neutral-400">{{ c.descripcion }}</p>
                        }
                        <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
                          @if (c.es_obligatorio) {
                            <span class="rounded bg-red-50 px-2 py-0.5 text-red-600 dark:bg-red-950 dark:text-red-400">obligatorio</span>
                          }
                          @if (c.tipo_archivo) {
                            <span class="rounded bg-neutral-100 px-2 py-0.5 uppercase dark:bg-neutral-800">{{ c.tipo_archivo }}</span>
                          }
                          @if (c.maximo_archivos) {
                            <span class="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">máx {{ c.maximo_archivos }}</span>
                          }
                          @if (!c.activo) {
                            <span class="rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">inactivo</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-shrink-0">
                      <button matIconButton (click)="editDoc(c)" title="Editar">
                        <mat-icon svgIcon="pencil" />
                      </button>
                      <button matIconButton class="!text-red-500" (click)="removeDoc(c)" title="Eliminar">
                        <mat-icon svgIcon="trash" />
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Formulario -->
            <div>
              <form
                [formGroup]="docForm"
                (ngSubmit)="saveDoc()"
                class="sticky top-6 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <div class="mb-4 flex items-center gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-700">
                  <mat-icon svgIcon="file-plus" class="text-violet-600" />
                  <span class="font-semibold">{{ editingD() ? 'Editar documento' : 'Nuevo documento' }}</span>
                </div>

                <div class="flex flex-col gap-4">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Título *</mat-label>
                    <input matInput formControlName="titulo" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Descripción</mat-label>
                    <textarea matInput rows="2" formControlName="descripcion"></textarea>
                  </mat-form-field>

                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <mat-label>Formatos permitidos</mat-label>
                    <input matInput formControlName="tipo_archivo" placeholder="pdf,jpg,png" />
                    <mat-hint>Separados por coma</mat-hint>
                  </mat-form-field>

                  <div class="grid grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                      <mat-label>Máx. archivos</mat-label>
                      <input matInput type="number" formControlName="maximo_archivos" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" subscriptSizing="dynamic">
                      <mat-label>Orden</mat-label>
                      <input matInput type="number" formControlName="orden" />
                    </mat-form-field>
                  </div>

                  <div class="flex items-center gap-5">
                    <mat-checkbox formControlName="es_obligatorio">Obligatorio</mat-checkbox>
                    <mat-checkbox formControlName="activo">Activo</mat-checkbox>
                  </div>

                  <div class="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    @if (editingD()) {
                      <button type="button" matButton="text" (click)="cancelD()">Cancelar</button>
                    }
                    <button matButton="filled" type="submit" [disabled]="docForm.invalid">
                      {{ editingD() ? 'Guardar' : 'Agregar' }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export default class DiagnosticoConfigPage {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  preguntas = signal<DiagnosticoPregunta[]>([]);
  docConfigs = signal<DiagnosticoDocConfig[]>([]);
  loadingP = signal(true);
  loadingD = signal(true);
  editingP = signal<DiagnosticoPregunta | null>(null);
  editingD = signal<DiagnosticoDocConfig | null>(null);
  tipos = TIPOS_RESPUESTA;

  preguntaForm = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    tipo_respuesta: ['texto', Validators.required],
    opciones: [''],
    ayuda_contextual: [''],
    orden: [99],
    es_obligatoria: [false],
    activo: [true],
  });

  docForm = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    tipo_archivo: [''],
    maximo_archivos: [null as number | null],
    orden: [99],
    es_obligatorio: [false],
    activo: [true],
  });

  constructor() {
    this.loadPreguntas();
    this.loadDocs();
  }

  tipoLabel = (t: string) => TIPOS_RESPUESTA.find(x => x.value === t)?.label || t;

  loadPreguntas() {
    this.api.diagPreguntas().subscribe((r) => {
      this.preguntas.set(r.data);
      this.loadingP.set(false);
    });
  }

  loadDocs() {
    this.api.diagDocConfigs().subscribe((r) => {
      this.docConfigs.set(r.data);
      this.loadingD.set(false);
    });
  }

  editPregunta(p: DiagnosticoPregunta) {
    this.editingP.set(p);
    this.preguntaForm.setValue({
      titulo: p.titulo,
      descripcion: p.descripcion ?? '',
      tipo_respuesta: p.tipo_respuesta,
      opciones: (p.opciones || []).join('\n'),
      ayuda_contextual: p.ayuda_contextual ?? '',
      orden: p.orden,
      es_obligatoria: !!p.es_obligatoria,
      activo: !!p.activo,
    });
  }

  cancelP() {
    this.editingP.set(null);
    this.preguntaForm.reset({ tipo_respuesta: 'texto', orden: 99, activo: true, es_obligatoria: false });
  }

  savePregunta() {
    if (this.preguntaForm.invalid) return;
    const v = this.preguntaForm.getRawValue();
    const payload: Partial<DiagnosticoPregunta> = {
      titulo: v.titulo!,
      descripcion: v.descripcion || null,
      tipo_respuesta: v.tipo_respuesta as DiagnosticoPregunta['tipo_respuesta'],
      opciones: v.tipo_respuesta === 'opciones' && v.opciones
        ? v.opciones.split('\n').map(s => s.trim()).filter(Boolean)
        : null,
      ayuda_contextual: v.ayuda_contextual || null,
      orden: v.orden ?? 99,
      es_obligatoria: !!v.es_obligatoria,
      activo: !!v.activo,
    };
    const edit = this.editingP();
    const req: Observable<unknown> = edit ? this.api.updateDiagPregunta(edit.id, payload) : this.api.createDiagPregunta(payload);
    req.subscribe({
      next: () => {
        this.snack.open(edit ? 'Pregunta actualizada' : 'Pregunta creada', 'OK', { duration: 2000 });
        this.cancelP();
        this.loadPreguntas();
      },
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  removePregunta(p: DiagnosticoPregunta) {
    if (!confirm(`¿Eliminar la pregunta "${p.titulo.slice(0, 50)}…"?`)) return;
    this.api.deleteDiagPregunta(p.id).subscribe({
      next: () => this.loadPreguntas(),
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  editDoc(c: DiagnosticoDocConfig) {
    this.editingD.set(c);
    this.docForm.setValue({
      titulo: c.titulo,
      descripcion: c.descripcion ?? '',
      tipo_archivo: c.tipo_archivo ?? '',
      maximo_archivos: c.maximo_archivos,
      orden: c.orden,
      es_obligatorio: !!c.es_obligatorio,
      activo: !!c.activo,
    });
  }

  cancelD() {
    this.editingD.set(null);
    this.docForm.reset({ orden: 99, activo: true, es_obligatorio: false });
  }

  saveDoc() {
    if (this.docForm.invalid) return;
    const v = this.docForm.getRawValue();
    const payload: Partial<DiagnosticoDocConfig> = {
      titulo: v.titulo!,
      descripcion: v.descripcion || null,
      tipo_archivo: v.tipo_archivo || null,
      maximo_archivos: v.maximo_archivos,
      orden: v.orden ?? 99,
      es_obligatorio: !!v.es_obligatorio,
      activo: !!v.activo,
    };
    const edit = this.editingD();
    const req: Observable<unknown> = edit ? this.api.updateDiagDocConfig(edit.id, payload) : this.api.createDiagDocConfig(payload);
    req.subscribe({
      next: () => {
        this.snack.open(edit ? 'Documento actualizado' : 'Documento creado', 'OK', { duration: 2000 });
        this.cancelD();
        this.loadDocs();
      },
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  removeDoc(c: DiagnosticoDocConfig) {
    if (!confirm(`¿Eliminar el documento "${c.titulo}"?`)) return;
    this.api.deleteDiagDocConfig(c.id).subscribe({
      next: () => this.loadDocs(),
      error: (e) => this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3500 }),
    });
  }
}
