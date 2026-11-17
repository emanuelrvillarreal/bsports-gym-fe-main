import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

import {
  PlanCrmDto,
  SuscribirEmpresaCrmPayload,
  TipoDescuentoSuscripcionCrm,
} from '../../../../../core/api/interfaces/crm.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardsComponent, CatalogCardItem } from '../../../../ui/cards/cards.component';
import { CarruselFadeComponent } from '../../../../ui/carrusel-fade/carrusel-fade.component';
import { CarruselFadeItemDirective } from '../../../../ui/carrusel-fade/carrusel-fade-item.directive';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

export type ModoFormularioSuscripcionCrm = 'suscribir' | 'cambiar-plan';

export type SeleccionSuscripcionCrm = SuscribirEmpresaCrmPayload;

interface PlanCrmVista {
  readonly plan: PlanCrmDto;
  readonly tarjeta: CatalogCardItem;
  readonly esActual: boolean;
}

@Component({
  selector: 'app-formulario-suscripcion-crm',
  standalone: true,
  imports: [
    BotonComponent,
    CardsComponent,
    CarruselFadeComponent,
    CarruselFadeItemDirective,
    SelectComponent,
    ValidacionFormularioDirective,
  ],
  templateUrl: './formulario-suscripcion-crm.component.html',
  styleUrl: './formulario-suscripcion-crm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioSuscripcionCrmComponent {
  readonly modo = input.required<ModoFormularioSuscripcionCrm>();
  readonly planes = input<readonly PlanCrmDto[]>([]);
  readonly codigoPlanActual = input<string | null>(null);
  readonly claveReinicio = input<string | null>(null);
  readonly procesando = input(false);
  readonly mostrarAcciones = input(true);
  readonly enviado = output<SeleccionSuscripcionCrm>();

  protected readonly codigoPlan = signal('');
  protected readonly mostrarErrores = signal(false);
  protected readonly aplicarDescuento = signal(false);
  protected readonly tipoDescuento = signal<TipoDescuentoSuscripcionCrm | ''>('');
  protected readonly montoDescuento = signal('');
  protected readonly porcentajeDescuento = signal('');
  protected readonly cantidadPeriodosDescuento = signal('');
  protected readonly opcionesTipoDescuento: readonly SelectOption[] = [
    { value: 'PORCENTAJE', label: 'Porcentaje' },
    { value: 'MONTO', label: 'Monto fijo' },
  ];

  protected readonly planesVista = computed<readonly PlanCrmVista[]>(() => {
    const planesPorPrecio = [...this.planes()].sort((a, b) => a.precio - b.precio);
    const precioMinimo = planesPorPrecio[0]?.precio;
    const codigoPlanActual = this.codigoPlanActual();
    const ordenados =
      this.modo() === 'cambiar-plan' && codigoPlanActual
        ? [
            ...planesPorPrecio.filter((plan) => plan.codigo === codigoPlanActual),
            ...planesPorPrecio.filter((plan) => plan.codigo !== codigoPlanActual),
          ]
        : planesPorPrecio;

    return ordenados.map((plan) => {
      const esActual = plan.codigo === codigoPlanActual;
      const esMasEconomico = plan.precio === precioMinimo;
      const badge = esActual
        ? `${esMasEconomico ? 'Más económico · ' : ''}Plan actual`
        : esMasEconomico
          ? 'Más económico'
          : null;

      return {
        plan,
        esActual,
        tarjeta: {
          titulo: plan.nombre,
          eyebrow: plan.periodicidad?.codigo || 'Plan CRM',
          monto: plan.precio,
          badge: badge ? { text: badge } : null,
          metadatos: [
            {
              label: 'Precio',
              value: plan.precioEsFinal ? 'Precio final' : `Más IVA (${plan.alicuotaIva}%)`,
            },
          ],
          etiquetas: plan.productos?.map((producto) => `${producto.nombre}: ${producto.unidades}`),
          // El aviso del plan vigente se muestra fuera de la tarjeta para que
          // no quede oculto por la altura acotada del carrusel.
          notaPie: esActual ? null : plan.descripcion,
        },
      };
    });
  });

  protected readonly planSeleccionado = computed(
    () => this.planes().find((plan) => plan.codigo === this.codigoPlan()) ?? null,
  );
  protected readonly esDescuentoPorMonto = computed(() => this.tipoDescuento() === 'MONTO');
  protected readonly esDescuentoPorPorcentaje = computed(
    () => this.tipoDescuento() === 'PORCENTAJE',
  );
  protected readonly mensajeErrorFormulario = computed(() => {
    if (!this.codigoPlan()) return 'Seleccioná un plan.';
    return this.obtenerErrorDescuento();
  });
  protected readonly formularioValido = computed(() => !this.mensajeErrorFormulario());

  constructor() {
    effect(() => {
      this.claveReinicio();
      const planes = this.planes();
      const codigoPlanActual = this.codigoPlanActual();
      const codigoPlanVisible = this.planesVista()[0]?.plan.codigo;
      const codigoPlanInicial =
        this.modo() === 'cambiar-plan' &&
        codigoPlanActual &&
        planes.some((plan) => plan.codigo === codigoPlanActual)
          ? codigoPlanActual
          : codigoPlanVisible;

      if (!codigoPlanInicial) return;

      // La card visible siempre representa el plan que se va a enviar. En
      // cambio de plan se prioriza el plan vigente; al suscribir, el primero
      // del carrusel queda seleccionado desde la apertura.
      this.codigoPlan.set(codigoPlanInicial);
      this.mostrarErrores.set(false);
      this.aplicarDescuento.set(false);
      this.limpiarDescuento();
    });
  }

  protected seleccionarPlan(planVista: PlanCrmVista): void {
    if (this.procesando()) return;
    this.codigoPlan.set(planVista.plan.codigo);
    this.mostrarErrores.set(false);
  }

  protected seleccionarPlanVisible(indice: number): void {
    const planVista = this.planesVista()[indice];
    if (planVista) this.seleccionarPlan(planVista);
  }

  protected actualizarAplicarDescuento(evento: Event): void {
    const aplicarDescuento = (evento.target as HTMLInputElement).checked;
    this.aplicarDescuento.set(aplicarDescuento);
    if (!aplicarDescuento) this.limpiarDescuento();
    this.mostrarErrores.set(false);
  }

  protected actualizarTipoDescuento(valor: string): void {
    if (valor !== 'MONTO' && valor !== 'PORCENTAJE') return;

    this.tipoDescuento.set(valor);
    if (valor === 'MONTO') this.porcentajeDescuento.set('');
    if (valor === 'PORCENTAJE') this.montoDescuento.set('');
    this.mostrarErrores.set(false);
  }

  protected actualizarMontoDescuento(evento: Event): void {
    this.montoDescuento.set((evento.target as HTMLInputElement).value);
    this.mostrarErrores.set(false);
  }

  protected actualizarPorcentajeDescuento(evento: Event): void {
    this.porcentajeDescuento.set((evento.target as HTMLInputElement).value);
    this.mostrarErrores.set(false);
  }

  protected actualizarCantidadPeriodosDescuento(evento: Event): void {
    this.cantidadPeriodosDescuento.set((evento.target as HTMLInputElement).value);
    this.mostrarErrores.set(false);
  }

  protected enviar(): void {
    this.mostrarErrores.set(true);
    if (!this.formularioValido() || this.procesando()) return;

    const descuento = this.construirDescuento();
    this.enviado.emit({
      codigoPlan: this.codigoPlan(),
      ...(descuento ? { descuento } : {}),
    });
  }

  private obtenerErrorDescuento(): string {
    if (!this.aplicarDescuento()) return '';

    const tipoDescuento = this.tipoDescuento();
    if (!tipoDescuento) return 'Seleccioná el tipo de descuento.';

    const cantidadPeriodos = this.cantidadPeriodosDescuento();
    const cantidadPeriodosNumero = Number(cantidadPeriodos);
    if (
      !/^\d+$/.test(cantidadPeriodos) ||
      !Number.isSafeInteger(cantidadPeriodosNumero) ||
      cantidadPeriodosNumero < 1
    ) {
      return 'La cantidad de meses debe ser un número entero mayor o igual a 1.';
    }

    if (tipoDescuento === 'MONTO') {
      const monto = this.montoDescuento();
      const montoNumero = Number(monto);
      if (!/^\d+(?:\.\d{1,2})?$/.test(monto) || !Number.isFinite(montoNumero) || montoNumero < 1) {
        return 'El monto debe ser de al menos $ 1 y admitir hasta dos decimales.';
      }
      return '';
    }

    const porcentaje = this.porcentajeDescuento();
    if (!/^\d+$/.test(porcentaje) || Number(porcentaje) < 1 || Number(porcentaje) > 100) {
      return 'El porcentaje debe ser un número entero entre 1 y 100.';
    }
    return '';
  }

  private construirDescuento(): SuscribirEmpresaCrmPayload['descuento'] {
    const tipoDescuento = this.tipoDescuento();
    if (!this.aplicarDescuento() || !tipoDescuento) return undefined;

    return {
      tipoDescuento,
      monto: tipoDescuento === 'MONTO' ? Number(this.montoDescuento()) : null,
      porcentaje: tipoDescuento === 'PORCENTAJE' ? Number(this.porcentajeDescuento()) : null,
      cantPeriodos: Number(this.cantidadPeriodosDescuento()),
    };
  }

  private limpiarDescuento(): void {
    this.tipoDescuento.set('');
    this.montoDescuento.set('');
    this.porcentajeDescuento.set('');
    this.cantidadPeriodosDescuento.set('');
  }
}
