import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
import { Gasto } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'gasto-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './gasto.dialog.html',
})
export class GastoDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<GastoDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ gasto?: Gasto }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { gasto?: Gasto };

  isEdit = !!this.data.gasto;
  saving = false;
  empresas = signal<Empresa[]>([]);
  terceros = signal<CatalogoItem[]>([]);
  sucursales = signal<CatalogoItem[]>([]);
  tiposGasto = signal<CatalogoItem[]>([]);
  bancos = signal<CatalogoItem[]>([]);

  form = this.fb.group({
    proveedor_tipo: [this.data.gasto?.empresa_id ? 'empresa' : 'tercero'],
    lista_gasto_id: [this.data.gasto?.lista_gasto_id ?? (null as number | null)],
    empresa_id: [this.data.gasto?.empresa_id ?? (null as number | null)],
    tercero_id: [this.data.gasto?.tercero_id ?? (null as number | null)],
    sucursal_id: [this.data.gasto?.sucursal_id ?? (null as number | null)],
    nombre: [this.data.gasto?.nombre || '', Validators.required],
    descripcion: [this.data.gasto?.descripcion || ''],
    banco: [this.data.gasto?.banco || ''],
    meses: [this.data.gasto?.meses || '1'],
    valor: [this.data.gasto?.valor ? Number(this.data.gasto.valor) : (null as number | null), Validators.required],
    iva: [this.data.gasto?.iva ? Number(this.data.gasto.iva) : 0],
    fecha: [this.data.gasto?.fecha || ''],
  });

  constructor() {
    this.api.empresas(undefined, 1, 500).subscribe((result) => this.empresas.set(result.data));
    this.api.catalogos().subscribe((catalogos) => {
      this.terceros.set(catalogos['terceros'] ?? []);
      this.sucursales.set(catalogos['sucursales'] ?? []);
      this.tiposGasto.set(catalogos['lista_gastos'] ?? []);
      this.bancos.set(catalogos['bancos'] ?? []);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<Gasto> = {
      lista_gasto_id: v.lista_gasto_id,
      empresa_id: v.proveedor_tipo === 'empresa' ? v.empresa_id : null,
      tercero_id: v.proveedor_tipo === 'tercero' ? v.tercero_id : null,
      sucursal_id: v.sucursal_id,
      nombre: v.nombre || undefined,
      descripcion: v.descripcion || undefined,
      banco: v.banco || null,
      meses: v.meses || null,
      valor: v.valor ?? undefined,
      iva: v.iva ?? 0,
      fecha: v.fecha ? new Date(v.fecha).toISOString().slice(0, 10) : undefined,
    };

    const req = this.isEdit
      ? this.api.updateGasto(this.data.gasto!.id, payload)
      : this.api.createGasto(payload);

    req.subscribe({
      next: () => {
        this.snack.open('Gasto guardado', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snack.open(error?.error?.error || 'No se pudo guardar', 'Cerrar');
      },
    });
  }
}
