import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EvaluacionesFisicasComponent } from '../../../_compartido-perfiles/components/evaluaciones/evaluaciones-fisicas.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-evaluaciones-profesor-page',
  standalone: true,
  imports: [EvaluacionesFisicasComponent, TituloHeroComponent],
  template: `<main class="evaluaciones-page">
    <app-titulo-hero icono="certificados" titulo="Evaluaciones físicas" subtitulo="Registrá y seguí la evolución física de tus alumnos." />
    <app-evaluaciones-fisicas />
  </main>`,
  styles: [':host, .evaluaciones-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesProfesorPageComponent {}
