import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CredentialsService } from '@/app/core/authentication/credentials.service';

// Portal empresa: redirige a la ficha de su propia empresa.
@Component({
  selector: 'mi-empresa-redirect',
  imports: [MatProgressSpinner],
  templateUrl: './mi-empresa.redirect.html',
})
export default class MiEmpresaRedirect {
  constructor() {
    const router = inject(Router);
    const empresaId = inject(CredentialsService).user?.empresa?.id;
    router.navigateByUrl(
      empresaId ? `/admin/empresas/${empresaId}` : '/admin/home',
      { replaceUrl: true }
    );
  }
}
