import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GestionBrandingEmpresaComponent } from '../../../_administradores/components/gestion-branding-empresa/gestion-branding-empresa.component';
import { GestionConfiguracionEmpresaComponent } from '../../../_administradores/components/gestion-configuracion-empresa/gestion-configuracion-empresa.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';

@Component({
  selector: 'app-configuracion-page',
  imports: [
    GestionBrandingEmpresaComponent,
    GestionConfiguracionEmpresaComponent,
    TituloHeroComponent,
    BotonComponent,
    CardComponent,
    LoadSpinnerBlueComponent,
  ],
  templateUrl: './configuracion-page.component.html',
  styleUrl: './configuracion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionPageComponent {
  private readonly datosRuta = inject(ActivatedRoute).snapshot.data;
  private readonly router = inject(Router);
  protected readonly puedeGestionarBranding = this.datosRuta['puedeGestionarBranding'] === true;
  protected readonly puedeGestionarPerfilEmpresa =
    this.datosRuta['puedeGestionarPerfilEmpresa'] === true;
  protected readonly puedeAccederCrmManager = this.datosRuta['puedeAccederCrmManager'] === true;

  protected abrirCrmManager(): void {
    void this.router.navigateByUrl('/admin/crm-manager');
  }
}
