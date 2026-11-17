import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { MisEvaluacionesPortalComponent } from '../../components/mis-evaluaciones-portal/mis-evaluaciones-portal.component';

@Component({
  selector: 'app-mis-evaluaciones-page',
  standalone: true,
  imports: [MisEvaluacionesPortalComponent, TituloHeroComponent],
  template: `<main class="mis-evaluaciones-page">
    <app-titulo-hero icono="certificados" titulo="Mis evaluaciones" subtitulo="Tus evaluaciones físicas y cómo fuiste evolucionando." />
    <app-mis-evaluaciones-portal />
  </main>`,
  styles: [':host, .mis-evaluaciones-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEvaluacionesPageComponent {}
