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
import { CatalogoItem } from '@/app/models/empleado.model';
import { Empresa } from '@/app/models/user.model';

export interface EmpresaFormData {
  empresa?: Empresa;
}

@Component({
  selector: 'empresa-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './empresa-form.dialog.html',
})
export class EmpresaFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<EmpresaFormDialog>);
  private data = inject<EmpresaFormData>(MAT_DIALOG_DATA, { optional: true }) ?? {} as EmpresaFormData;

  protected editing = !!this.data.empresa;
  protected saving = signal(false);
  protected departamentos = signal<CatalogoItem[]>([]);
  protected ciudades = signal<(CatalogoItem & { departamento_id?: number })[]>([]);
  protected ciudadesFiltradas = signal<CatalogoItem[]>([]);
  protected cajasCompensacion = signal<CatalogoItem[]>([]);
  protected arl = signal<CatalogoItem[]>([]);
  protected eps = signal<CatalogoItem[]>([]);

  protected form = this.fb.group({
    razon_social: [this.data.empresa?.razon_social ?? '', Validators.required],
    tipo_documento: [this.data.empresa?.tipo_documento ?? 'NIT'],
    num_documento: [this.data.empresa?.num_documento ?? '', Validators.required],
    dv: [this.data.empresa?.dv ?? ''],
    tipo_empresa: [this.data.empresa?.tipo_empresa ?? 'juridica'],
    riesgo: [this.data.empresa?.riesgo ?? 'I'],
    email: [this.data.empresa?.email ?? ''],
    email_contacto: [this.data.empresa?.email_contacto ?? ''],
    telefono_fijo: [this.data.empresa?.telefono_fijo ?? ''],
    telefono_movil: [this.data.empresa?.telefono_movil ?? ''],
    direccion: [this.data.empresa?.direccion ?? ''],
    departamento_id: [this.data.empresa?.departamento_id ?? null],
    ciudad_id: [this.data.empresa?.ciudad_id ?? null],
    representante_legal: [this.data.empresa?.representante_legal ?? ''],
    nombre_contacto: [this.data.empresa?.nombre_contacto ?? ''],
    telefono_contacto: [this.data.empresa?.telefono_contacto ?? ''],
    email_responsable: [this.data.empresa?.email_responsable ?? ''],
    telefono_responsable: [this.data.empresa?.telefono_responsable ?? ''],
    email_contacto2: [''],
    caja_compensacion_id: [this.data.empresa?.caja_compensacion_id ?? null],
    arl_id: [this.data.empresa?.arl_id ?? null],
    eps_id: [this.data.empresa?.eps_id ?? null],
    exonerado_parafiscales: [this.data.empresa?.exonerado_parafiscales ?? ''],
    factor_prestacional_pct: [
      this.data.empresa?.factor_prestacional_pct ?? 30,
      [Validators.required, Validators.min(30), Validators.max(100)],
    ],
    observaciones: [this.data.empresa?.observaciones ?? ''],
  });

  constructor() {
    this.api.catalogos().subscribe((cat) => {
      this.departamentos.set(cat['departamentos'] ?? []);
      this.ciudades.set(cat['ciudades'] ?? []);
      this.cajasCompensacion.set(cat['cajas_compensacion'] ?? []);
      this.arl.set(cat['arl'] ?? []);
      this.eps.set(cat['eps'] ?? []);
      this.onDepartamentoChange(false);
    });
  }

  onDepartamentoChange(clear = true) {
    const depId = this.form.value.departamento_id;
    const ciudades = this.ciudades();
    this.ciudadesFiltradas.set(
      depId ? ciudades.filter((c) => !c.departamento_id || c.departamento_id === depId) : ciudades
    );
    if (clear) this.form.patchValue({ ciudad_id: null });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.value;
    const payload: Partial<Empresa> = {};
    const skipKeys = ['email_contacto2'];
    for (const [k, val] of Object.entries(v)) {
      if (skipKeys.includes(k)) continue;
      if (val !== undefined && val !== null && val !== '') {
        (payload as any)[k] = val;
      }
    }

    const request = this.editing
      ? this.api.updateEmpresa(this.data.empresa!.id, payload)
      : this.api.createEmpresa(payload);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editing ? 'Empresa actualizada' : 'Empresa creada',
          'Cerrar',
          { duration: 2500 }
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.error || 'Error al guardar la empresa', 'Cerrar', { duration: 5000 });
      },
    });
  }
}
