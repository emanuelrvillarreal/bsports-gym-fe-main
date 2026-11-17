import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { MiTrayectoriaPortalComponent } from '../../components/mi-trayectoria-portal/mi-trayectoria-portal.component';

@Component({
  selector: 'app-mi-trayectoria-page',
  standalone: true,
  imports: [MiTrayectoriaPortalComponent, TituloHeroComponent],
  template: `<main class="mi-trayectoria-page">
    <app-titulo-hero
      icono="eventos"
      titulo="Mi trayectoria"
      subtitulo="Tus asistencias, tu antigüedad y tu historial en las actividades del gimnasio."
    />
    <app-mi-trayectoria-portal />
  </main>`,
  styles: [':host, .mi-trayectoria-page { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiTrayectoriaPageComponent {}
