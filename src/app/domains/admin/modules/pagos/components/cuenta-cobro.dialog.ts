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
import { CuentaCobro } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'cuenta-cobro-dialog',
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
  templateUrl: './cuenta-cobro.dialog.html',
})
export class CuentaCobroDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<CuentaCobroDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ cuenta?: CuentaCobro; empresas?: Empresa[] }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { cuenta?: CuentaCobro; empresas?: Empresa[] };

  isEdit = !!this.data.cuenta;
  saving = false;
  sucursales = signal<CatalogoItem[]>([]);
  bancos = signal<CatalogoItem[]>([]);
  terceros = signal<CatalogoItem[]>([]);
  conceptos = [
    'Afiliaciones',
    'Planillas',
    'Asesorias',
    'Comisiones',
    'Honorarios',
    'Servicio Permanente',
    'Incapacidades',
    'Otro',
  ];

  form = this.fb.group({
    cliente_tipo: [this.data.cuenta?.tercero_id ? 'tercero' : 'empresa'],
    empresa_id: [this.data.cuenta?.empresa_id ?? (null as number | null)],
    tercero_id: [this.data.cuenta?.tercero_id ?? (null as number | null)],
    sucursal_id: [this.data.cuenta?.sucursal_id ?? (null as number | null)],
    tipo: [this.data.cuenta?.tipo ?? 1],
    nombre: [this.data.cuenta?.nombre || '', Validators.required],
    banco: [this.data.cuenta?.banco || ''],
    meses: [this.data.cuenta?.meses || '1'],
    fecha: [this.data.cuenta?.fecha || ''],
    valor_total: [this.data.cuenta?.valor_total ? Number(this.data.cuenta.valor_total) : (null as number | null), Validators.required],
    iva: [this.data.cuenta?.iva ? Number(this.data.cuenta.iva) : 0],
    cuatroxmil: [this.data.cuenta?.cuatroxmil ? Number(this.data.cuenta.cuatroxmil) : 0],
    obs: [this.data.cuenta?.obs || ''],
  });

  constructor() {
    this.api.catalogos().subscribe((catalogos) => {
      this.sucursales.set(catalogos['sucursales'] ?? []);
      this.bancos.set(catalogos['bancos'] ?? []);
      this.terceros.set(catalogos['terceros'] ?? []);
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<CuentaCobro> = {
      empresa_id: v.cliente_tipo === 'empresa' ? v.empresa_id : null,
      tercero_id: v.cliente_tipo === 'tercero' ? v.tercero_id : null,
      sucursal_id: v.sucursal_id,
      tipo: v.tipo,
      nombre: v.nombre || undefined,
      banco: v.banco || null,
      meses: v.meses || null,
      fecha: v.fecha ? new Date(v.fecha).toISOString().slice(0, 10) : undefined,
      valor_total: v.valor_total ?? undefined,
      iva: v.iva ?? 0,
      cuatroxmil: v.cuatroxmil ?? 0,
      obs: v.obs || undefined,
    };

    const req = this.isEdit
      ? this.api.updatePago(this.data.cuenta!.id, payload)
      : this.api.createPago(payload);

    req.subscribe({
      next: () => {
        this.snack.open('Cuenta de cobro guardada', 'OK', { duration: 2500 });
        this.ref.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snack.open(error?.error?.error || 'No se pudo guardar', 'Cerrar');
      },
    });
  }
}
