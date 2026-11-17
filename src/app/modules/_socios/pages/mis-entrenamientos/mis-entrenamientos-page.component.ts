import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { MisEntrenamientosPortalComponent } from '../../components/mis-entrenamientos-portal/mis-entrenamientos-portal.component';

@Component({
  selector: 'app-mis-entrenamientos-page',
  standalone: true,
  imports: [MisEntrenamientosPortalComponent, TituloHeroComponent],
  template: `<main class="mis-entrenamientos-page">
    <app-titulo-hero icono="actividades" titulo="Mis entrenamientos" subtitulo="Las rutinas que te asignó tu profesor, con sus ejercicios y videos." />
    <app-mis-entrenamientos-portal />
  </main>`,
  styles: [':host, .mis-entrenamientos-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEntrenamientosPageComponent {}
