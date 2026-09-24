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
import { SearchableSelect } from '@/app/core/ui/searchable-select';
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
    SearchableSelect,
  ],
  templateUrl: './persona-form.dialog.html',
})
export class PersonaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<PersonaFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ persona?: Persona }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { persona?: Persona };

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
