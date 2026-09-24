import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApiService } from '@/app/core/api/api.service';
import { PageHeader } from '@/app/core/ui/page-header';
import { EmbudoResumen } from '@/app/models/negocio.model';

const ETAPA_HEX = [
  '#0154f9',
  '#253a94',
  '#8b5cf6',
  '#f59e0b',
  '#f97316',
  '#10b981',
  '#f87171',
];

@Component({
  selector: 'ventas-page',
  imports: [RouterLink, MatButtonModule, MatIcon, MatProgressSpinner, PageHeader, NgApexchartsModule],
  templateUrl: './ventas.page.html',
})
export default class VentasPage {
  private api = inject(ApiService);

  embudos = signal<EmbudoResumen[]>([]);
  loading = signal(true);

  constructor() {
    this.api.ventasEmbudos().subscribe({
      next: (r) => {
        this.embudos.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  etapaHex = ETAPA_HEX;
  fmtInt = (v: number) => `${v} leads`;
}
