import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TesoreriaResumenComponent } from '../../_admin/components/tesoreria-resumen/tesoreria-resumen.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionCuotasComponent } from '../../_admin/components/gestion-cuotas/gestion-cuotas.component';
import { HistoricoBalancesComponent } from '../../_admin/components/historico-balances/historico-balances.component';
import { VisibleParaRolesDirective } from '../../../../core/auth/visible-para-roles.directive';

@Component({
  selector: 'app-tesoreria-page',
  imports: [
    GestionCuotasComponent,
    HistoricoBalancesComponent,
    TesoreriaResumenComponent,
    TituloHeroComponent,
    VisibleParaRolesDirective,
  ],
  templateUrl: './tesoreria-page.component.html',
  styleUrl: './tesoreria-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreriaPageComponent {}
