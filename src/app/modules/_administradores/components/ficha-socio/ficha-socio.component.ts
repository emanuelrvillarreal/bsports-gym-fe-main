import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { CuotaFichaDto, FichaSocioDto } from '../../../../core/api/interfaces/ficha-socio.interfaces';
import { MembresiaDto } from '../../../../core/api/interfaces/membresias.interfaces';
import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { formatearSexo } from '../../../../helpers/sexo-formato';
import {
  textoCobro,
  textoSituacion,
  tonoSituacion,
} from '../../../_compartido-perfiles/components/membresias/membresias.helpers';
import { formatearFechaAsistencia } from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';

const MEDIOS: Readonly<Record<string, string>> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  OTRO: 'Otro',
  DEBITO: 'Tarjeta de débito',
  DEBITO_AUTOMATICO: 'Débito automático',
  CREDITO: 'Tarjeta de crédito',
  CHEQUE: 'Cheque',
  NFC: 'Pago con celular (NFC)',
};

const TIPOS: Readonly<Record<string, string>> = { SOCIAL: 'Social', ACTIVIDAD: 'Actividad', PASE: 'Pase' };

/**
 * Ficha del socio (solo lectura): datos, estado de cuenta, membresías, actividades con historial y últimas
 * cuotas. Se abre tocando la fila en el listado de Socios.
 */
@Component({
  selector: 'app-ficha-socio',
  standalone: true,
  templateUrl: './ficha-socio.component.html',
  styleUrl: './ficha-socio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaSocioComponent {
  private readonly api = inject(SociosApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly socio = input.required<SocioDto>();

  /** Se emite cuando el admin cambia o quita la foto, para refrescar el listado. */
  readonly socioActualizado = output<SocioDto>();

  /** Foto mostrada: arranca con la del listado y se actualiza al cambiarla. */
  protected readonly fotoUrl = signal<string | null>(null);
  protected readonly guardandoFoto = signal(false);
  protected readonly iniciales = computed(() => {
    const s = this.socio();
    return `${s.nombre?.charAt(0) ?? ''}${s.apellido?.charAt(0) ?? ''}`.toUpperCase() || '?';
  });

  protected readonly ficha = signal<FichaSocioDto | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  protected readonly actividadesActivas = computed(() => this.ficha()?.actividades.filter((a) => a.activa) ?? []);
  protected readonly actividadesHistorial = computed(() => this.ficha()?.actividades.filter((a) => !a.activa) ?? []);
  /** Vigentes, programadas o pendientes de pago primero; el resto es historial. */
  protected readonly membresiasActuales = computed(
    () => this.ficha()?.membresias.filter((m) => !['VENCIDA', 'BAJA', 'REEMPLAZADA'].includes(m.situacion)) ?? [],
  );
  protected readonly membresiasHistorial = computed(
    () => this.ficha()?.membresias.filter((m) => ['VENCIDA', 'BAJA', 'REEMPLAZADA'].includes(m.situacion)) ?? [],
  );

  constructor() {
    effect(() => {
      const socio = this.socio();
      const uuid = socio.memberUuid;
      this.fotoUrl.set(socio.imageUrl ?? null);
      queueMicrotask(() => this.cargar(uuid));
    });
  }

  protected cargar(uuid = this.socio().memberUuid): void {
    this.cargando.set(true);
    this.error.set(false);
    this.api
      .obtenerFicha(uuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (ficha) => this.ficha.set(ficha),
        error: () => this.error.set(true),
      });
  }

  protected elegirFoto(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = '';
    if (!archivo) return;
    this.guardarFoto(this.api.subirFoto(this.socio().memberUuid, archivo));
  }

  protected quitarFoto(): void {
    this.guardarFoto(this.api.eliminarFoto(this.socio().memberUuid));
  }

  private guardarFoto(peticion: ReturnType<SociosApiService['eliminarFoto']>): void {
    this.guardandoFoto.set(true);
    peticion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoFoto.set(false)),
      )
      .subscribe({
        next: (socio) => {
          this.fotoUrl.set(socio.imageUrl ?? null);
          this.socioActualizado.emit({ ...this.socio(), imageUrl: socio.imageUrl ?? null });
        },
      });
  }

  protected fecha(valor: string | null | undefined): string {
    return formatearFechaAsistencia(valor);
  }

  protected sexo(valor: string | null | undefined): string {
    return formatearSexo(valor);
  }

  protected moneda(valor: number | null | undefined): string {
    return formatearMoneda(valor ?? 0);
  }

  protected estadoCuota(c: CuotaFichaDto): string {
    if (c.estado === 'PAGADA') return 'Pagada';
    return c.vencida ? 'Vencida' : 'Pendiente';
  }

  protected tonoCuota(c: CuotaFichaDto): string {
    if (c.estado === 'PAGADA') return 'ok';
    return c.vencida ? 'peligro' : 'alerta';
  }

  protected tipo(c: CuotaFichaDto): string {
    return TIPOS[c.tipo] ?? c.tipo;
  }

  protected pago(c: CuotaFichaDto): string {
    if (c.estado !== 'PAGADA') return '';
    const medio = c.medioPago ? MEDIOS[c.medioPago] ?? c.medioPago : '';
    return [c.fechaPago ? `Pagó el ${this.fecha(c.fechaPago)}` : 'Pagada', medio].filter(Boolean).join(' · ');
  }

  protected situacion(m: MembresiaDto): string {
    return textoSituacion(m.situacion);
  }

  protected tonoMembresia(m: MembresiaDto): string {
    return tonoSituacion(m.situacion);
  }

  protected cobro(m: MembresiaDto): string {
    return m.cobro ? textoCobro(m.cobro.estado) : '';
  }

  protected estadoSocio(estado: string): string {
    const texto = estado.toLowerCase().replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
