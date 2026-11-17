import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GestionMovimientosComponent } from '../../_admin/components/gestion-movimientos/gestion-movimientos.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-ingresos-page',
  imports: [GestionMovimientosComponent, TituloHeroComponent],
  templateUrl: './ingresos-page.component.html',
  styleUrl: './ingresos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresosPageComponent {}
