import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionCuotaSocialComponent } from '../../components/gestion-cuota-social/gestion-cuota-social.component';
import { GestionPlazosOperativosComponent } from '../../components/gestion-plazos-operativos/gestion-plazos-operativos.component';

/**
 * Contenedor de la gestion de cuota social. La logica de dominio se incorpora
 * mediante su componente dedicado para mantener la page liviana.
 */
@Component({
  selector: 'app-cuota-social-page',
  imports: [GestionCuotaSocialComponent, GestionPlazosOperativosComponent, TituloHeroComponent],
  templateUrl: './cuota-social-page.component.html',
  styleUrl: './cuota-social-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuotaSocialPageComponent {}
