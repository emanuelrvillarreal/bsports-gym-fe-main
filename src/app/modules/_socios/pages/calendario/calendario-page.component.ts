import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { CalendarioSociosComponent } from '../../components/calendario-socios/calendario-socios.component';

@Component({
  selector: 'app-calendario-socios-page',
  standalone: true,
  imports: [CalendarioSociosComponent, TituloHeroComponent],
  templateUrl: './calendario-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioSociosPageComponent {}
