import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { Documento } from '@/app/models/empleado.model';
import {
  CUENTA_STATUS,
  CUENTA_STATUS_COLOR,
  CuentaCobro,
  PAGO_STATUS,
  PAGO_STATUS_COLOR,
  Persona,
  SERVICIO_STATUS,
  SERVICIO_STATUS_COLOR,
  ServicioRegistro,
} from '@/app/models/negocio.model';
import { DocumentoUploadDialog } from '../../documentos/components/documento-upload.dialog';
import { PersonaFormDialog } from '../components/persona-form.dialog';

@Component({
  selector: 'independiente-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIcon,
    MatTabsModule,
    MatProgressSpinner,
    CurrencyPipe,
    DatePipe,
    NgClass,
  ],
  templateUrl: './independiente-detail.page.html',
})
export default class IndependienteDetailPage {
  private api = inject(ApiService);
  private creds = inject(CredentialsService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  persona = signal<Persona | null>(null);
  documentos = signal<Documento[]>([]);
  servicios = signal<ServicioRegistro[]>([]);
  cuentas = signal<CuentaCobro[]>([]);
  loading = signal(true);
  isAdmin = () => this.creds.isAdmin();
  personaId = '';

  constructor() {
    this.personaId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.persona(this.personaId).subscribe({
      next: (r) => {
        this.persona.set(r.persona);
        this.documentos.set(r.documentos || []);
        this.servicios.set(r.servicios || []);
        this.cuentas.set(r.cuentas || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreCompleto(p: Persona) {
    return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
      .filter(Boolean)
      .join(' ');
  }

  servicioLabel = (s: number) => SERVICIO_STATUS[s] || '—';
  servicioColor = (s: number) => SERVICIO_STATUS_COLOR[s] || 'bg-neutral-400';
  pagoLabel = (s: number) => PAGO_STATUS[s] || '—';
  pagoColor = (s: number) => PAGO_STATUS_COLOR[s] || 'bg-neutral-400';
  cuentaLabel = (s: number) => CUENTA_STATUS[s] || '—';
  cuentaColor = (s: number) => CUENTA_STATUS_COLOR[s] || 'bg-neutral-400';

  openEdit(p: Persona) {
    this.dialog
      .open(PersonaFormDialog, { width: '640px', data: { persona: p } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openUpload(p: Persona) {
    this.dialog
      .open(DocumentoUploadDialog, { width: '520px', data: { persona_id: p.id } })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  download(d: Documento) {
    this.api.downloadDocumento(d.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.nombre;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
