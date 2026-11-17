import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GestionUsuariosInternosComponent } from '../../_admin/components/gestion-usuarios-internos/gestion-usuarios-internos.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-profesores-page',
  imports: [GestionUsuariosInternosComponent, TituloHeroComponent],
  templateUrl: './profesores-page.component.html',
  styleUrl: './profesores-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfesoresPageComponent {}
