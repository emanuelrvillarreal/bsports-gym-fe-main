import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { GrupoFamiliarCacheService } from '../../../../core/global-services/services/grupo-familiar-cache.service';
import { MisActividadesPortalComponent } from '../../components/mis-actividades-portal/mis-actividades-portal.component';
import { ActividadesPortalComponent } from '../../_socio-titular/components/actividades-portal/actividades-portal.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-actividades-socios-page',
  standalone: true,
  imports: [ActividadesPortalComponent, MisActividadesPortalComponent, TituloHeroComponent],
  providers: [GrupoFamiliarCacheService],
  templateUrl: './actividades-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadesSociosPageComponent {
  private readonly misActividades = viewChild(MisActividadesPortalComponent);
  protected readonly puedeInscribir =
    inject(AuthSessionService).obtenerRolActivo() === 'SOCIO_TITULAR';

  protected recargarMisActividades(): void {
    this.misActividades()?.recargar();
  }
}
