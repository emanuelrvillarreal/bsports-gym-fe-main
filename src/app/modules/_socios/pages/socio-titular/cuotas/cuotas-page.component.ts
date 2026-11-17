import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { CuotasPortalComponent } from '../../../_socio-titular/components/cuotas-portal/cuotas-portal.component';

@Component({
  selector: 'app-cuotas-socio-titular-page',
  standalone: true,
  imports: [CuotasPortalComponent, TituloHeroComponent],
  templateUrl: './cuotas-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuotasSocioTitularPageComponent {}
