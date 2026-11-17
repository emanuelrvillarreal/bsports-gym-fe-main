import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FacturaDto } from '../../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../../core/api/services/facturas-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { CheckoutFacturaComponent } from '../../../components/checkout-factura/checkout-factura.component';
import { FacturaResumenComponent } from '../../../components/factura-resumen/factura-resumen.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';

const PREFIJO_AVISO = 'aviso-factura-pendiente:';

@Component({
  selector: 'app-aviso-factura-pendiente',
  standalone: true,
  imports: [
    BotonComponent,
    CheckoutFacturaComponent,
    FacturaResumenComponent,
    PopupComponent,
  ],
  templateUrl: './aviso-factura-pendiente.component.html',
  styleUrl: './aviso-factura-pendiente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoFacturaPendienteComponent {
  private readonly api = inject(FacturasApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly factura = signal<FacturaDto | null>(null);
  protected readonly facturaPago = signal<FacturaDto | null>(null);

  constructor() {
    this.consultarUnaVez();
  }

  protected descartar(): void {
    this.factura.set(null);
  }

  private consultarUnaVez(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const companyUuid = this.authSession.obtenerCompanyUuid().trim();
    if (!companyUuid) return;

    const clave = `${PREFIJO_AVISO}${companyUuid}`;
    try {
      if (sessionStorage.getItem(clave)) return;
      sessionStorage.setItem(clave, '1');
    } catch {
      // Si el storage no está disponible, el aviso sigue funcionando en este montaje.
    }

    this.api
      .paginar({
        page: 1,
        size: 1,
        estados: ['PENDIENTE'],
        orden: 'FECHA_VENCIMIENTO_ASC',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => this.factura.set(respuesta.content[0] ?? null),
        error: () => {
          try {
            sessionStorage.removeItem(clave);
          } catch {
            // Permite reintentar en un montaje futuro cuando el storage está bloqueado.
          }
        },
      });
  }
}
