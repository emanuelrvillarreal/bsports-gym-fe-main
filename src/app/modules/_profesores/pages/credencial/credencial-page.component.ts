import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { CredencialProfesorComponent } from '../../components/credencial-profesor/credencial-profesor.component';

@Component({
  selector: 'app-credencial-profesor-page',
  standalone: true,
  imports: [CredencialProfesorComponent, TituloHeroComponent],
  templateUrl: './credencial-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredencialProfesorPageComponent {}
