import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionActividadesComponent } from '../../components/gestion-actividades/gestion-actividades.component';

@Component({
  selector: 'app-actividades-administradores-page',
  imports: [GestionActividadesComponent, TituloHeroComponent],
  templateUrl: './actividades-page.component.html',
  styleUrl: './actividades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadesAdministradoresPageComponent {
  private readonly datosRuta = inject(ActivatedRoute).snapshot.data;

  protected readonly puedeAdministrar = this.datosRuta['puedeAdministrar'] === true;
  protected readonly subtitulo =
    typeof this.datosRuta['subtituloPagina'] === 'string'
      ? this.datosRuta['subtituloPagina']
      : 'Consultá las actividades del gimnasio.';
}
