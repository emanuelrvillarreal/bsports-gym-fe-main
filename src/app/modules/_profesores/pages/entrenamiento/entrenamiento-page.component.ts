import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionEntrenamientoComponent } from '../../../_compartido-perfiles/components/entrenamiento/gestion-entrenamiento.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-entrenamiento-profesor-page',
  standalone: true,
  imports: [GestionEntrenamientoComponent, TituloHeroComponent],
  template: `<main class="entrenamiento-page">
    <app-titulo-hero icono="eventos" titulo="Entrenamiento" subtitulo="Armá rutinas, asignalas a tus alumnos y registrá sus sesiones." />
    <app-gestion-entrenamiento />
  </main>`,
  styles: [':host, .entrenamiento-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenamientoProfesorPageComponent {}
