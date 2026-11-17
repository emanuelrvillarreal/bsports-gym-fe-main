import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { GrupoFamiliarPortalComponent } from '../../../_socio-titular/components/grupo-familiar-portal/grupo-familiar-portal.component';

@Component({
  selector: 'app-grupo-familiar-page',
  standalone: true,
  imports: [GrupoFamiliarPortalComponent, TituloHeroComponent],
  templateUrl: './grupo-familiar-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrupoFamiliarPageComponent {}
