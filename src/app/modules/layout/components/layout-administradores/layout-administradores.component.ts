import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AuthService } from '../../../../core/global-services/services/auth.service';
import { AvisoFacturaPendienteComponent } from '../../../_administradores/_admin/components/aviso-factura-pendiente/aviso-factura-pendiente.component';
import { LayoutMainComponent } from '../layout-main/layout-main.component';

@Component({
  selector: 'app-layout-administradores',
  imports: [AvisoFacturaPendienteComponent, LayoutMainComponent],
  templateUrl: './layout-administradores.component.html',
  styleUrl: './layout-administradores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutAdministradoresComponent {
  protected readonly mostrarAvisoFacturaPendiente: boolean;

  constructor(authService: AuthService) {
    this.mostrarAvisoFacturaPendiente = authService.obtenerRolUsuario() === 'ADMIN';
  }
}
