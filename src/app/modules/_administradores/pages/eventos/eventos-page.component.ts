import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionEventosActividadComponent } from '../../components/gestion-eventos-actividad/gestion-eventos-actividad.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-eventos-administradores-page',
  imports: [GestionEventosActividadComponent, TituloHeroComponent],
  templateUrl: './eventos-page.component.html',
  styleUrl: './eventos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventosAdministradoresPageComponent {}
