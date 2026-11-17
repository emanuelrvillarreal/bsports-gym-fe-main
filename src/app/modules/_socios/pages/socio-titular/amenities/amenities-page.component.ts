import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { AmenitiesPortalComponent } from '../../../_socio-titular/components/amenities-portal/amenities-portal.component';

@Component({
  selector: 'app-amenities-socio-titular-page',
  standalone: true,
  imports: [AmenitiesPortalComponent, TituloHeroComponent],
  templateUrl: './amenities-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenitiesSocioTitularPageComponent {}
