import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';

import { CuotaRowDto } from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { WizardCobroCuotasComponent } from '../wizard-cobro-cuotas/wizard-cobro-cuotas.component';

/**
 * Popup "Nuevo cobro": el asistente de cobro de cuotas con sus botones. Lo usan Cobros › Cuotas y el
 * legajo de membresías (para cobrar el pase recién contratado o renovado).
 */
@Component({
  selector: 'app-popup-cobro-cuotas',
  standalone: true,
  imports: [BotonComponent, PopupComponent, WizardCobroCuotasComponent],
  templateUrl: './popup-cobro-cuotas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupCobroCuotasComponent {
  readonly abierto = input(false);
  readonly cerrar = output<void>();
  readonly cobrosActualizados = output<void>();

  private readonly wizard = viewChild.required(WizardCobroCuotasComponent);

  /** Deja elegida esa cuota y arranca directo en "¿Cómo paga?". Llamar antes de abrir. */
  iniciarConCuota(cuota: CuotaRowDto): void {
    this.wizard().iniciarConCuota(cuota);
  }

  /** Arranca con la persona de esa cuota y toda su deuda marcada, en "¿Qué paga?". Llamar antes de abrir. */
  iniciarConSocioDeCuota(cuota: CuotaRowDto): void {
    this.wizard().iniciarConSocioDeCuota(cuota);
  }
}
