import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { CredencialSociosComponent } from '../../components/credencial-socios/credencial-socios.component';

@Component({
  selector: 'app-credencial-socios-page',
  standalone: true,
  imports: [CredencialSociosComponent, TituloHeroComponent],
  templateUrl: './credencial-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredencialSociosPageComponent {}
