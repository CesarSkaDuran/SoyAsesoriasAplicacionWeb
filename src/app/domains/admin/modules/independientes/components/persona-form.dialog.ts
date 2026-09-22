import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { CatalogoItem, Catalogos } from '@/app/models/empleado.model';
import { Persona } from '@/app/models/negocio.model';

@Component({
  selector: 'persona-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DialogHeader,
  ],
  template: `
    <dialog-header [title]="isEdit ? 'Editar independiente' : 'Nuevo independiente'" />

    <mat-dialog-content class="mat-typography">
      <form [formGroup]="form" class="flex flex-col gap-y-1 pt-2">

        <!-- DATOS PERSONALES -->
        <div class="mb-2 mt-1 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Datos personales</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Primer nombre *</mat-label>
            <input matInput formControlName="primer_nombre" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Segundo nombre</mat-label>
            <input matInput formControlName="segundo_nombre" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Primer apellido</mat-label>
            <input matInput formControlName="primer_apellido" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Segundo apellido</mat-label>
            <input matInput formControlName="segundo_apellido" />
          </mat-form-field>
        </div>

        <!-- IDENTIFICACION -->
        <div class="mb-2 mt-3 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Identificación</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <mat-form-field appearance="outline">
            <mat-label>Tipo documento</mat-label>
            <mat-select formControlName="tipo_documento">
              <mat-option value="CC">CC</mat-option>
              <mat-option value="CE">CE</mat-option>
              <mat-option value="PAS">PAS</mat-option>
              <mat-option value="NIT">NIT</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>N° documento</mat-label>
            <input matInput formControlName="num_documento" />
          </mat-form-field>
        </div>

        <!-- CONTACTO -->
        <div class="mb-2 mt-3 border-b border-blue-200 pb-1">
          <h3 class="text-sm font-bold uppercase tracking-wide text-blue-700">Contacto y ubicación</h3>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <mat-form-field class="col-span-2" appearance="outline">
            <mat-label>Dirección</mat-label>
            <input matInput formControlName="direccion" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Departamento</mat-label>
            <mat-select formControlName="departamento_id">
              @for (d of departamentos(); track d.id) {
                <mat-option [value]="d.id">{{ d.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ciudad</mat-label>
            <mat-select formControlName="ciudad_id">
              @for (c of ciudadesFiltradas(); track c.id) {
                <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="2" formControlName="observaciones"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton="text" mat-dialog-close>Cancelar</button>
      <button matButton="filled" [disabled]="form.invalid || saving" (click)="save()">
        {{ isEdit ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class PersonaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<PersonaFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ persona?: Persona }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isEdit = !!this.data.persona;
  saving = false;
  catalogos = signal<Catalogos | null>(null);
  departamentos = signal<CatalogoItem[]>([]);
  ciudadesFiltradas = signal<(CatalogoItem & { departamento_id?: number })[]>([]);

  form = this.fb.group({
    primer_nombre: [this.data.persona?.primer_nombre || '', Validators.required],
    segundo_nombre: [this.data.persona?.segundo_nombre || ''],
    primer_apellido: [this.data.persona?.primer_apellido || ''],
    segundo_apellido: [this.data.persona?.segundo_apellido || ''],
    tipo_documento: [this.data.persona?.tipo_documento || 'CC'],
    num_documento: [this.data.persona?.num_documento || ''],
    direccion: [this.data.persona?.direccion || ''],
    telefono: [this.data.persona?.telefono || ''],
    email: [this.data.persona?.email || ''],
    departamento_id: [this.data.persona?.departamento_id ?? (null as number | null)],
    ciudad_id: [this.data.persona?.ciudad_id ?? (null as number | null)],
    observaciones: [this.data.persona?.['observaciones' as keyof Persona] as string || ''],
  });

  constructor() {
    this.api.catalogos().subscribe((c) => {
      this.catalogos.set(c);
      this.departamentos.set(c['departamentos'] ?? []);
      this.filterCiudades(this.form.value.departamento_id ?? null);
    });
    this.form.controls.departamento_id.valueChanges.subscribe((depId) =>
      this.filterCiudades(depId)
    );
  }

  private filterCiudades(depId: number | null) {
    const ciudades =
      (this.catalogos()?.['ciudades'] as (CatalogoItem & {
        departamento_id?: number;
      })[]) || [];
    this.ciudadesFiltradas.set(
      depId ? ciudades.filter((c) => c.departamento_id === depId) : ciudades
    );
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<Persona> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined && val !== null && val !== '') {
        (payload as any)[k] = val;
      }
    }

    const req = this.isEdit
      ? this.api.updatePersona(this.data.persona!.id, payload)
      : this.api.createPersona(payload);

    req.subscribe({
      next: () => {
        this.snack.open(
          this.isEdit ? 'Independiente actualizado' : 'Independiente creado',
          'OK',
          { duration: 2500 }
        );
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.open('No se pudo guardar', 'Cerrar');
      },
    });
  }
}
