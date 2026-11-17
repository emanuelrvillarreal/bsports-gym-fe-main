import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionDescuentosComponent } from '../../components/gestion-descuentos/gestion-descuentos.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-descuentos-page',
  imports: [GestionDescuentosComponent, TituloHeroComponent],
  templateUrl: './descuentos-page.component.html',
  styleUrl: './descuentos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DescuentosPageComponent {}
