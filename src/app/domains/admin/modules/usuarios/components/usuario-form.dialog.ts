import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { Persona, Usuario } from '@/app/models/negocio.model';
import { Empresa } from '@/app/models/user.model';

const MODULOS: { key: string; label: string }[] = [
  { key: 'home', label: 'Inicio' },
  { key: 'empresas', label: 'Empresas' },
  { key: 'independientes', label: 'Independientes' },
  { key: 'empleados', label: 'Empleados' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'nominas', label: 'Nóminas' },
  { key: 'planillas', label: 'Planillas' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'solicitudes', label: 'Solicitudes' },
  { key: 'soportes', label: 'Soporte' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'informes', label: 'Informes' },
  { key: 'diagnosticos', label: 'Diagnósticos' },
];

@Component({
  selector: 'usuario-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    DialogHeader,
    SearchableSelect,
  ],
  templateUrl: './usuario-form.dialog.html',
})
export class UsuarioFormDialog {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<UsuarioFormDialog>);
  private snack = inject(MatSnackBar);

  data = inject<{ usuario?: Usuario }>(MAT_DIALOG_DATA, { optional: true }) ?? {} as { usuario?: Usuario };

  modulos = MODULOS;
  isEdit = !!this.data.usuario;
  saving = false;
  empresas = signal<Empresa[]>([]);
  personas = signal<(Persona & { nombre_completo: string })[]>([]);

  form = this.fb.group({
    name: [this.data.usuario?.name || '', Validators.required],
    lastname: [this.data.usuario?.lastname || ''],
    email: [this.data.usuario?.email || '', [Validators.required, Validators.email]],
    password: ['', this.isEdit ? [] : [Validators.required, Validators.minLength(6)]],
    role: [this.data.usuario?.role || 'empresa'],
    empresa_id: [null as number | null],
    persona_id: [null as number | null],
    ...Object.fromEntries(MODULOS.map((m) => ['mod_' + m.key, [m.key === 'home']])),
  });

  constructor() {
    this.api.empresas().subscribe((r) => this.empresas.set(r.data));
    this.api.personas({}).subscribe((r) =>
      this.personas.set(
        r.data.map((p) => ({
          ...p,
          nombre_completo: `${p.primer_nombre ?? ''} ${p.primer_apellido ?? ''}`.trim(),
        }))
      )
    );
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.getRawValue() as Record<string, any>;
    const modulos: Record<string, boolean> = {};
    for (const m of MODULOS) modulos[m.key] = !!v['mod_' + m.key];

    const req = this.isEdit
      ? this.api.updateUsuario(this.data.usuario!.id, {
          name: v['name'],
          lastname: v['lastname'],
          modulos,
        })
      : this.api.createUser({
          name: v['name'],
          lastname: v['lastname'] || undefined,
          email: v['email'],
          password: v['password'],
          role: v['role'],
          empresa_id: v['empresa_id'] ?? undefined,
          persona_id: v['persona_id'] ?? undefined,
          modulos,
        });

    req.subscribe({
      next: () => {
        this.snack.open(
          this.isEdit ? 'Usuario actualizado' : 'Usuario creado',
          'OK',
          { duration: 2500 }
        );
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e?.error?.error || 'No se pudo guardar', 'Cerrar');
      },
    });
  }
}
