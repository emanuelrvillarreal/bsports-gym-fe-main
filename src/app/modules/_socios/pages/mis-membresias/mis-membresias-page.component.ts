import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { MisMembresiasPortalComponent } from '../../components/mis-membresias-portal/mis-membresias-portal.component';

@Component({
  selector: 'app-mis-membresias-page',
  standalone: true,
  imports: [MisMembresiasPortalComponent, TituloHeroComponent],
  template: `<main class="mis-membresias-page">
    <app-titulo-hero icono="membresias" titulo="Mis pases" subtitulo="Tus pases, vencimientos, ingresos y renovaciones." />
    <app-mis-membresias-portal />
  </main>`,
  styles: [':host, .mis-membresias-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisMembresiasPageComponent {}
