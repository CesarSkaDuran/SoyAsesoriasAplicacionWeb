import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CredentialsService } from '@/app/core/authentication/credentials.service';

const MODULO_LABEL: Record<string, string> = {
  home: 'Inicio',
  empresas: 'Empresas',
  independientes: 'Independientes',
  empleados: 'Empleados',
  documentos: 'Documentos',
  nominas: 'Nóminas',
  planillas: 'Planillas',
  servicios: 'Servicios',
  pagos: 'Pagos',
  solicitudes: 'Solicitudes',
  soportes: 'Soporte',
  gastos: 'Gastos',
  informes: 'Informes',
  diagnosticos: 'Diagnósticos',
};

@Component({
  selector: 'sin-acceso',
  imports: [MatButton, MatIcon, RouterLink],
  templateUrl: './sin-acceso.page.html',
})
export default class SinAccesoPage {
  private route = inject(ActivatedRoute);
  private creds = inject(CredentialsService);

  modulo = this.route.snapshot.queryParamMap.get('m') ?? '';
  moduloLabel = MODULO_LABEL[this.modulo] || 'este módulo';

  // Si puede entrar a solicitudes, le ofrecemos crear la solicitud ahí.
  puedeSolicitar = this.creds.hasModulo('solicitudes');
}
