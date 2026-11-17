import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionCrmEmpresasComponent } from '../../_sysadmin/components/gestion-crm-empresas/gestion-crm-empresas.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-crm-manager-sysadmin-page',
  standalone: true,
  imports: [GestionCrmEmpresasComponent, TituloHeroComponent],
  templateUrl: './crm-manager-sysadmin-page.component.html',
  styleUrl: './crm-manager-sysadmin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmManagerSysadminPageComponent {}
