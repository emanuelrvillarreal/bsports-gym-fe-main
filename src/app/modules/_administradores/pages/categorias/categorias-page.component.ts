import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionCategoriasComponent } from '../../components/gestion-categorias/gestion-categorias.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-categorias-page',
  imports: [GestionCategoriasComponent, TituloHeroComponent],
  templateUrl: './categorias-page.component.html',
  styleUrl: './categorias-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPageComponent {}
