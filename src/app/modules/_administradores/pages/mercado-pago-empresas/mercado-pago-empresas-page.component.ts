import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionMercadoPagoEmpresasComponent } from '../../_sysadmin/components/gestion-mercado-pago-empresas/gestion-mercado-pago-empresas.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-mercado-pago-empresas-page',
  standalone: true,
  imports: [GestionMercadoPagoEmpresasComponent, TituloHeroComponent],
  templateUrl: './mercado-pago-empresas-page.component.html',
  styleUrl: './mercado-pago-empresas-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MercadoPagoEmpresasPageComponent {}
