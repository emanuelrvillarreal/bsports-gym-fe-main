import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionFacturasComponent } from '../../_admin/components/gestion-facturas/gestion-facturas.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-crm-manager-admin-page',
  standalone: true,
  imports: [GestionFacturasComponent, TituloHeroComponent],
  templateUrl: './crm-manager-admin-page.component.html',
  styleUrl: './crm-manager-admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmManagerAdminPageComponent {}
