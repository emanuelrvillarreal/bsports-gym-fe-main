import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { CalendarioProfesorComponent } from '../../components/calendario-profesor/calendario-profesor.component';

@Component({
  selector: 'app-calendario-profesor-page',
  standalone: true,
  imports: [CalendarioProfesorComponent, TituloHeroComponent],
  templateUrl: './calendario-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioProfesorPageComponent {}
