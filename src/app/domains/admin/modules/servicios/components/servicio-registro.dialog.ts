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
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { SearchableSelect } from '@/app/core/ui/searchable-select';
import {
  SERVICIO_CATEGORIAS,
  ServicioCatalogo,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

@Component({
  selector: 'servicio-registro-dialog',
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
  templateUrl: './servicio-registro.dialog.html',
})
export class ServicioRegistroDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private ref = inject(MatDialogRef<ServicioRegistroDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{
    registro?: ServicioRegistro;
    categoria?: string;
    empresas?: Empresa[];
  }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as {
    registro?: ServicioRegistro;
    categoria?: string;
    empresas?: Empresa[];
  };

  categorias = SERVICIO_CATEGORIAS;
  isEdit = !!this.data.registro;
  isAdmin = this.creds.isAdmin();
  saving = false;
  catalogo = signal<ServicioCatalogo[]>([]);

  form = this.fb.group({
    empresa_id: [this.data.registro?.empresa_id ?? null as number | null],
    nombre: [this.data.registro?.nombre || this.data.categoria || '', Validators.required],
    paquete: [this.data.registro?.paquete || ''],
    cantidad: [this.data.registro?.cantidad ?? 1],
    valor: [this.data.registro?.valor ? Number(this.data.registro.valor) : null as number | null],
    numero_empleados: [this.data.registro?.numero_empleados ?? 0],
    obs: [this.data.registro?.obs || ''],
  });

  constructor() {
    if (!this.isAdmin) {
      this.api.serviciosCatalogo().subscribe((response) => this.catalogo.set(response.data));
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue();
    const payload: Partial<ServicioRegistro> = {
      nombre: v.nombre ?? undefined,
      paquete: v.paquete || undefined,
      cantidad: v.cantidad ?? 1,
      obs: v.obs || undefined,
    };
    if (this.isAdmin) {
      payload.empresa_id = v.empresa_id ?? undefined;
      payload.valor = v.valor ?? undefined;
      payload.numero_empleados = v.numero_empleados ?? undefined;
    }

    const categoria = this.categorias.find((item) => item.nombre === v.nombre);
    const servicio = this.catalogo().find((item) => item.nombre.toLowerCase() === v.nombre?.toLowerCase());
    const descripcion = [
      categoria?.label || v.nombre,
      v.paquete ? `Detalle: ${v.paquete}` : null,
      Number(v.cantidad) > 1 ? `Cantidad: ${v.cantidad}` : null,
      v.obs ? `Observaciones: ${v.obs}` : null,
    ].filter(Boolean).join(' — ');

    const observer = {
      next: () => {
        this.snack.open(
          this.isEdit ? 'Registro actualizado' : this.isAdmin ? 'Servicio registrado' : 'Solicitud enviada a administración',
          'OK',
          { duration: 2500 }
        );
        this.ref.close(true);
      },
      error: () => {
        this.saving = false;
        this.snack.open('No se pudo guardar', 'Cerrar');
      },
    };

    if (this.isEdit) {
      this.api.updateServicioRegistro(this.data.registro!.id, payload).subscribe(observer);
    } else if (this.isAdmin) {
      this.api.createServicioRegistro(payload).subscribe(observer);
    } else {
      this.api.createSolicitud({ servicio_id: servicio?.id ?? null, descripcion }).subscribe(observer);
    }
  }
}
