import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionEventosProfesorComponent } from '../../components/gestion-eventos-profesor/gestion-eventos-profesor.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-eventos-profesor-page',
  standalone: true,
  imports: [GestionEventosProfesorComponent, TituloHeroComponent],
  templateUrl: './eventos-page.component.html',
  styleUrl: './eventos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventosProfesorPageComponent {}
