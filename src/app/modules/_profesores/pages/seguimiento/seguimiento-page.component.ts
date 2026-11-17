import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SeguimientoAsistenciaComponent } from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-seguimiento-profesor-page',
  standalone: true,
  imports: [SeguimientoAsistenciaComponent, TituloHeroComponent],
  template: `<main class="seguimiento-page">
    <app-titulo-hero
      icono="dashboard"
      titulo="Seguimiento de mis alumnos"
      subtitulo="Asistencia, antigüedad e historial de los alumnos de tus actividades."
    />
    <app-seguimiento-asistencia alcance="profesor" />
  </main>`,
  styles: [':host { display: grid; gap: 1.25rem; } .seguimiento-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoProfesorPageComponent {}
