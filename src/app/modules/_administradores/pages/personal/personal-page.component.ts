import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionPersonalComponent } from '../../_admin/components/gestion-personal/gestion-personal.component';

@Component({
  selector: 'app-personal-page',
  imports: [GestionPersonalComponent, TituloHeroComponent],
  template: `
    <app-titulo-hero
      icono="usuariosRecepcion"
      titulo="Personal del gimnasio"
      subtitulo="Administradores, recepción y profesores. Una persona puede tener varios roles."
    />
    <app-gestion-personal />
  `,
  styles: `:host { display: grid; gap: 1.25rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalPageComponent {}
