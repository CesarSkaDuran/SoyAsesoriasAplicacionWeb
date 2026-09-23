import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import {
  Embudo,
  Etapa,
  Lead,
  LeadHistorial,
  Usuario,
} from '@/app/models/negocio.model';

interface DialogData {
  embudo?: Embudo;
  etapas?: Etapa[];
  etapaId?: number;
  lead?: Lead | null;
  isAdmin?: boolean;
}

@Component({
  selector: 'lead-form-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatIcon,
    DialogHeader,
    SearchableSelect,
  ],
  template: `
    <dialog-header [title]="lead ? 'Editar lead' : 'Nuevo lead'" />

    <mat-dialog-content class="mat-typography">
      <form
        [formGroup]="form"
        class="grid grid-cols-1 gap-x-4 pt-2 sm:grid-cols-2"
      >
        <!-- Datos del contacto -->
        <div class="col-span-full mb-1 mt-1 border-b border-sky-100 pb-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-900 dark:text-sky-400">
          Datos del lead
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Emprendimiento / Lead *</mat-label>
          <input matInput formControlName="nombre" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nombre del emprendedor</mat-label>
          <input matInput formControlName="nombre_emprendedor" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Empresa</mat-label>
          <input matInput formControlName="empresa" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Etapa</mat-label>
          <mat-select formControlName="etapa_id">
            @for (e of data.etapas || []; track e.id) {
              <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" />
        </mat-form-field>

        <!-- Seguimiento -->
        <div class="col-span-full mb-1 mt-3 border-b border-sky-100 pb-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-900 dark:text-sky-400">
          Seguimiento
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Fuente</mat-label>
          <input matInput formControlName="fuente" placeholder="web-publica, referido…" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Campaña</mat-label>
          <input matInput formControlName="campania" />
        </mat-form-field>

        <searchable-select
          class="col-span-full"
          label="Asignado a"
          nullLabel="Sin asignar"
          [items]="usuarios()"
          displayKey="nombre_completo"
          formControlName="usuario_asignado_id"
        />

        <mat-form-field appearance="outline" class="col-span-full">
          <mat-label>Notas</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="notas"
            placeholder="Seguimiento, acuerdos, pendientes…"
          ></textarea>
        </mat-form-field>
      </form>

      <!-- Vínculos de conversión -->
      @if (lead && (lead.empresa_id || lead.persona_id)) {
        <div class="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <mat-icon svgIcon="user-round-check" />
          Convertido a
          {{ lead.empresa_id ? 'empresa' : 'independiente' }}:
          <strong>
            {{ lead.empresa_convertida_nombre || lead.persona_convertida_nombre || ('#' + (lead.empresa_id || lead.persona_id)) }}
          </strong>
        </div>
      }

      <!-- Historial -->
      @if (lead && historial().length) {
        <div class="mt-4">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Historial
          </div>
          <div class="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
            @for (h of historial(); track h.id) {
              <div class="flex items-start gap-3 text-xs">
                <span class="mt-0.5 whitespace-nowrap text-neutral-400">
                  {{ h.created_at | date: 'dd/MM/yy HH:mm' }}
                </span>
                <div>
                  <span class="font-medium">{{ h.usuario_nombre || 'Sistema' }}</span>
                  — {{ h.nota }}
                  @if (h.etapa_nombre) {
                    <span class="text-neutral-400">({{ h.etapa_nombre }})</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!justify-between">
      <div class="flex gap-2">
        @if (lead) {
          <button
            matButton="text"
            class="!text-red-600"
            [disabled]="saving"
            (click)="remove()"
          >
            <mat-icon svgIcon="trash" />
            Eliminar
          </button>
          @if (!lead.empresa_id && !lead.persona_id) {
            <button
              matButton="tonal"
              [disabled]="saving"
              [matMenuTriggerFor]="convertMenu"
            >
              <mat-icon svgIcon="user-round-check" />
              Convertir
            </button>
            <mat-menu #convertMenu="matMenu">
              <button mat-menu-item (click)="convert('empresa')">
                <mat-icon svgIcon="building-2" />
                <span>A empresa</span>
              </button>
              <button mat-menu-item (click)="convert('independiente')">
                <mat-icon svgIcon="user" />
                <span>A independiente</span>
              </button>
            </mat-menu>
          }
        }
      </div>
      <div class="flex gap-2">
        <button matButton="text" mat-dialog-close>Cancelar</button>
        <button
          matButton="filled"
          [disabled]="form.invalid || saving"
          (click)="save()"
        >
          {{ lead ? 'Guardar cambios' : 'Crear lead' }}
        </button>
      </div>
    </mat-dialog-actions>
  `,
})
export class LeadFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<LeadFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as DialogData;
  lead = this.data.lead ?? null;

  usuarios = signal<(Usuario & { nombre_completo: string })[]>([]);
  historial = signal<LeadHistorial[]>([]);
  saving = false;

  form = this.fb.group({
    nombre: [this.lead?.nombre ?? '', Validators.required],
    nombre_emprendedor: [this.lead?.nombre_emprendedor ?? ''],
    empresa: [this.lead?.empresa ?? ''],
    etapa_id: [this.lead?.etapa_id ?? this.data.etapaId ?? null as number | null],
    email: [this.lead?.email ?? ''],
    telefono: [this.lead?.telefono ?? ''],
    fuente: [this.lead?.fuente ?? ''],
    campania: [this.lead?.campania ?? ''],
    usuario_asignado_id: [this.lead?.usuario_asignado_id ?? null as number | null],
    notas: [this.lead?.notas ?? ''],
  });

  constructor() {
    this.api.usuarios({}).subscribe((r) =>
      this.usuarios.set(r.data.map((u) => ({ ...u, nombre_completo: `${u.name} ${u.lastname ?? ''}`.trim() })))
    );
    if (this.lead) {
      this.api.ventasLead(this.lead.id).subscribe((r) => this.historial.set(r.historial));
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const payload: Partial<Lead> = {
      ...v,
      embudo_id: this.data.embudo?.id,
    } as Partial<Lead>;

    const req = this.lead
      ? this.api.updateLead(this.lead.id, payload)
      : this.api.createLead(payload);

    req.subscribe({
      next: (r) => {
        // Si cambió la etapa en edición, registrar el movimiento
        if (this.lead && v.etapa_id && v.etapa_id !== this.lead.etapa_id) {
          this.api.moveLead(this.lead.id, v.etapa_id).subscribe();
        }
        this.snack.open(this.lead ? 'Lead actualizado' : 'Lead creado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo guardar', 'Cerrar', { duration: 3000 });
      },
    });
  }

  convert(tipo: 'empresa' | 'independiente') {
    if (!this.lead) return;
    this.saving = true;
    this.api.convertirLead(this.lead.id, tipo).subscribe({
      next: () => {
        this.snack.open(
          tipo === 'empresa' ? 'Empresa creada y vinculada' : 'Independiente creado y vinculado',
          'OK',
          { duration: 3000 }
        );
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo convertir', 'Cerrar', { duration: 3000 });
      },
    });
  }

  remove() {
    if (!this.lead || !confirm(`¿Eliminar el lead "${this.lead.nombre}"?`)) return;
    this.saving = true;
    this.api.deleteLead(this.lead.id).subscribe({
      next: () => {
        this.snack.open('Lead eliminado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
