import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { SolicitudesRegistroComponent } from '../../components/solicitudes-registro/solicitudes-registro.component';

@Component({
  selector: 'app-solicitudes-registro-administradores-page',
  imports: [SolicitudesRegistroComponent, TituloHeroComponent],
  templateUrl: './solicitudes-registro-page.component.html',
  styleUrl: './solicitudes-registro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesRegistroAdministradoresPageComponent {}
