import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { FacturaDto } from '../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../core/api/services/facturas-api.service';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';

export type EstadoResultadoPagoFactura = 'exito' | 'fallo' | 'pendiente';

@Component({
  selector: 'app-resultado-pago-factura-page',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent],
  templateUrl: './resultado-pago-factura-page.component.html',
  styleUrl: './resultado-pago-factura-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoPagoFacturaPageComponent {
  private readonly api = inject(FacturasApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<EstadoResultadoPagoFactura>(
    this.normalizarEstado(this.route.snapshot.data['estadoResultadoFactura']),
  );
  protected readonly cargando = signal(true);
  protected readonly facturas = signal<readonly FacturaDto[]>([]);
  protected readonly errorConsulta = signal(false);
  protected readonly bloqueada = signal(true);

  protected readonly titulo = computed(() => {
    switch (this.estado()) {
      case 'exito': return 'Recibimos el pago';
      case 'pendiente': return 'El pago está pendiente';
      default: return 'No pudimos procesar el pago';
    }
  });

  protected readonly descripcion = computed(() => {
    switch (this.estado()) {
      case 'exito':
        return 'El CRM confirmará la acreditación mediante webhook. El estado puede tardar unos minutos en actualizarse.';
      case 'pendiente':
        return 'Mercado Pago está procesando la operación. Volvé a consultar la factura más tarde.';
      default:
        return 'La operación fue rechazada o interrumpida. Podés volver e intentar nuevamente.';
    }
  });

  constructor() {
    this.actualizarEstado();
  }

  protected actualizarEstado(): void {
    this.cargando.set(true);
    this.errorConsulta.set(false);
    forkJoin({
      pagina: this.api.paginar({ page: 1, size: 10, orden: 'FECHA_VENCIMIENTO_DESC' }).pipe(
        catchError(() => of(null)),
      ),
      sesion: this.auth.refrescarEstadoSesion().pipe(catchError(() => of(null))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe(({ pagina, sesion }) => {
        if (pagina) this.facturas.set(pagina.content);
        this.errorConsulta.set(!pagina || !sesion);
        this.bloqueada.set(this.auth.empresaActivaBloqueada());
      });
  }

  protected volver(): void {
    void this.router.navigateByUrl(this.bloqueada() ? '/club-bloqueado' : '/admin/crm-manager');
  }

  private normalizarEstado(valor: unknown): EstadoResultadoPagoFactura {
    return valor === 'exito' || valor === 'pendiente' ? valor : 'fallo';
  }
}
