import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionEventosAccesoComponent } from '../../components/gestion-eventos-acceso/gestion-eventos-acceso.component';

@Component({
  selector: 'app-eventos-acceso-page',
  standalone: true,
  imports: [GestionEventosAccesoComponent, TituloHeroComponent],
  templateUrl: './eventos-acceso-page.component.html',
  styleUrl: './eventos-acceso-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventosAccesoPageComponent {}
