import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionMisActividadesProfesorComponent } from '../../components/gestion-mis-actividades-profesor/gestion-mis-actividades-profesor.component';

@Component({
  selector: 'app-mis-actividades-profesor-page',
  standalone: true,
  imports: [GestionMisActividadesProfesorComponent, TituloHeroComponent],
  templateUrl: './mis-actividades-page.component.html',
  styleUrl: './mis-actividades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisActividadesProfesorPageComponent {}
