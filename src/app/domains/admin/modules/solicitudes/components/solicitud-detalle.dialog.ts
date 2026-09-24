import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { ApiService } from '@/app/core/api/api.service';
import { DialogHeader } from '@/app/core/ui/dialog-header';
import { Solicitud } from '@/app/models/negocio.model';

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

@Component({
  selector: 'solicitud-detalle-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIcon, DialogHeader, DatePipe],
  templateUrl: './solicitud-detalle.dialog.html',
})
export class SolicitudDetalleDialog {
  private api = inject(ApiService);
  data = inject<Solicitud>(MAT_DIALOG_DATA);

  statusLabel = (s: string) => STATUS_LABEL[s] || s;

  downloadRespuesta() {
    this.api.downloadRespuestaSolicitud(this.data.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.data.respuesta_nombre || `respuesta-${this.data.id}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
