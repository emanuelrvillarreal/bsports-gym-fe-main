import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GestionUsuariosInternosComponent } from '../../_admin/components/gestion-usuarios-internos/gestion-usuarios-internos.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-usuarios-recepcion-page',
  imports: [GestionUsuariosInternosComponent, TituloHeroComponent],
  templateUrl: './usuarios-recepcion-page.component.html',
  styleUrl: './usuarios-recepcion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosRecepcionPageComponent {}
