import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-inicio-socio-titular-page',
  standalone: true,
  imports: [TituloHeroComponent],
  templateUrl: './inicio-page.component.html',
  styleUrl: './inicio-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioSocioTitularPageComponent {}
