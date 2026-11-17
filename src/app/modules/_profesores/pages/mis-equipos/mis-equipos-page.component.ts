import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { MisEquiposProfesorComponent } from '../../components/mis-equipos-profesor/mis-equipos-profesor.component';

@Component({
  selector: 'app-mis-equipos-page',
  standalone: true,
  imports: [MisEquiposProfesorComponent, TituloHeroComponent],
  template: `<main class="mis-equipos-page">
    <app-titulo-hero icono="eventos" titulo="Mis equipos" subtitulo="Planteles, estadísticas y torneos de los equipos que entrenás." />
    <app-mis-equipos-profesor />
  </main>`,
  styles: [':host, .mis-equipos-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEquiposProfesorPageComponent {}
