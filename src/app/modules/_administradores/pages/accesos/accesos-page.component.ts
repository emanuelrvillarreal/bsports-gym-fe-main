import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionAccesosComponent } from '../../components/gestion-accesos/gestion-accesos.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-accesos-page',
  imports: [GestionAccesosComponent, TituloHeroComponent],
  template: '<app-titulo-hero icono="credencial" titulo="Accesos" subtitulo="Registrá ingresos y consultá la ocupación del gimnasio." /><app-gestion-accesos />',
  styles: ':host { display: grid; gap: 1rem; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesosPageComponent {}
