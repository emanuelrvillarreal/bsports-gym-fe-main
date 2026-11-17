import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { FacturaDto } from '../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../core/api/services/facturas-api.service';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { CheckoutFacturaComponent } from '../../../_administradores/components/checkout-factura/checkout-factura.component';
import { FacturaResumenComponent } from '../../../_administradores/components/factura-resumen/factura-resumen.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-club-bloqueado-page',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    CheckoutFacturaComponent,
    FacturaResumenComponent,
    LoadSpinnerBlueComponent,
    TituloHeroComponent,
  ],
  templateUrl: './club-bloqueado-page.component.html',
  styleUrl: './club-bloqueado-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubBloqueadoPageComponent {
  private readonly authService = inject(AuthService);
  private readonly facturasApi = inject(FacturasApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.authService.obtenerRolUsuario() === 'ADMIN';
  protected readonly cargando = signal(false);
  protected readonly verificando = signal(false);
  protected readonly factura = signal<FacturaDto | null>(null);
  protected readonly facturaParaPagar = signal<FacturaDto | null>(null);
  protected readonly error = signal('');

  constructor() {
    if (this.esAdmin) queueMicrotask(() => this.cargarFacturaVencida());
  }

  protected pagar(factura: FacturaDto): void {
    this.facturaParaPagar.set(factura);
  }

  protected cerrarCheckout(): void {
    this.facturaParaPagar.set(null);
  }

  protected reintentar(): void {
    if (this.verificando()) return;
    this.verificando.set(true);
    this.error.set('');

    this.authService
      .refrescarEstadoSesion()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.verificando.set(false)),
      )
      .subscribe({
        next: () => {
          if (!this.authService.empresaActivaBloqueada()) {
            void this.router.navigateByUrl(this.authService.obtenerRutaPrincipalUsuario());
            return;
          }
          if (this.esAdmin) this.cargarFacturaVencida();
        },
        error: () =>
          this.error.set('No se pudo verificar el estado de la empresa. Intentá nuevamente.'),
      });
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe();
  }

  private cargarFacturaVencida(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');

    this.facturasApi
      .paginar({
        page: 1,
        size: 1,
        estados: ['VENCIDA'],
        orden: 'FECHA_VENCIMIENTO_ASC',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.factura.set(respuesta.content[0] ?? null),
        error: () => this.error.set('No se pudo consultar la factura vencida.'),
      });
  }
}
