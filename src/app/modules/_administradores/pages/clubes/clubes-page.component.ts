import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionClubesComponent } from '../../_sysadmin/components/gestion-clubes/gestion-clubes.component';

@Component({
  selector: 'app-clubes-page',
  standalone: true,
  imports: [GestionClubesComponent, TituloHeroComponent],
  templateUrl: './clubes-page.component.html',
  styleUrl: './clubes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubesPageComponent {}
