import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  EventoAccesoCobroCommand,
  EventoAccesoCobroResultDto,
  EventoAccesoDetalleDto,
  EventoAccesoScanResultDto,
} from '../../../../core/api/interfaces/eventos-acceso.interfaces';
import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { limpiarDni } from '../../../../helpers/dni-formato';
import { extraerUserUuidDeQr } from '../../../../helpers/extraer-user-uuid-qr';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { LectorQrComponent } from '../../../ui/lector-qr/lector-qr.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import {
  EstadoOperacionCobroEventoAcceso,
  FormularioCobroEventoAccesoComponent,
  ModoCobroEventoAcceso,
} from '../../forms/formulario-cobro-evento-acceso/formulario-cobro-evento-acceso.component';

export type OperacionEventoAccesoCompletada =
  | { readonly tipo: 'scan'; readonly resultado: EventoAccesoScanResultDto }
  | {
      readonly tipo: 'cobro';
      readonly modo: ModoCobroEventoAcceso;
      readonly resultado: EventoAccesoCobroResultDto;
    };

type EstadoOperacionEvento = 'inicial' | 'exito' | 'pago' | 'rechazado' | 'error';

@Component({
  selector: 'app-operacion-evento-acceso',
  standalone: true,
  imports: [
    BotonComponent,
    FormularioCobroEventoAccesoComponent,
    LectorQrComponent,
    PopupComponent,
    TituloHeroComponent,
  ],
  templateUrl: './operacion-evento-acceso.component.html',
  styleUrl: './operacion-evento-acceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacionEventoAccesoComponent {
  private readonly api = inject(EventosAccesoApiService);
  private readonly sociosApi = inject(SociosApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly codigosProcesados = new Set<string>();

  readonly abierto = input(false);
  readonly evento = input.required<EventoAccesoDetalleDto>();
  readonly cerrar = output<void>();
  readonly operacionCompletada = output<OperacionEventoAccesoCompletada>();

  protected readonly procesando = signal(false);
  protected readonly buscandoSocio = signal(false);
  protected readonly resultado = signal<EventoAccesoScanResultDto | null>(null);
  protected readonly estado = signal<EstadoOperacionEvento>('inicial');
  protected readonly mensaje = signal('');
  protected readonly cobroAbierto = signal(false);
  protected readonly modoCobro = signal<ModoCobroEventoAcceso>('invitado');
  protected readonly userUuidSocio = signal<string | null>(null);
  protected readonly montoSocio = signal<number | null>(null);
  protected readonly guardandoCobro = signal(false);
  protected readonly errorCobro = signal('');
  protected readonly resultadoCobro = signal<EventoAccesoCobroResultDto | null>(null);
  protected readonly lectorActivo = computed(
    () => this.abierto() && !this.procesando() && !this.cobroAbierto() && this.estado() !== 'pago',
  );
  protected readonly montoUnitarioCobro = computed(() =>
    this.modoCobro() === 'socio' ? (this.montoSocio() ?? 0) : this.evento().montoInvitados,
  );
  protected readonly estadoOperacionCobro = computed<EstadoOperacionCobroEventoAcceso>(() => ({
    guardando: this.guardandoCobro(),
    error: this.errorCobro(),
    resultado: this.resultadoCobro(),
  }));

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        this.cobroAbierto.set(false);
        return;
      }
      this.evento().uuid;
      this.reiniciarOperacion();
    });
  }

  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  protected procesarCodigo(contenido: string): void {
    if (this.procesando() || this.cobroAbierto() || this.estado() === 'pago') return;

    const userUuid = extraerUserUuidDeQr(contenido);
    if (!userUuid) {
      this.estado.set('error');
      this.mensaje.set('El código no contiene un identificador válido.');
      return;
    }
    if (this.codigosProcesados.has(userUuid)) {
      this.estado.set('error');
      this.mensaje.set('Este código ya fue procesado durante la operación actual.');
      return;
    }

    this.codigosProcesados.add(userUuid);
    this.procesando.set(true);
    this.resultado.set(null);
    this.estado.set('inicial');
    this.mensaje.set('');
    this.api
      .escanear(
        this.evento().uuid,
        { userUuid },
        { mostrarToastError: false, mostrarToastExito: false },
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: (resultado) => this.procesarResultadoScan(resultado, userUuid),
        error: (error: unknown) => {
          this.codigosProcesados.delete(userUuid);
          this.estado.set('error');
          this.toast.error(
            this.mensajeHttp(error, 'No se pudo validar el ingreso. Intentá nuevamente.'),
            { titulo: 'Error de acceso', duracionMs: 4000, posicion: 'centrada' },
          );
          this.mensaje.set(
            this.mensajeHttp(error, 'No se pudo validar el código. Intentá nuevamente.'),
          );
        },
      });
  }

  protected buscarSocioPorDni(dni: string): void {
    if (this.procesando() || this.buscandoSocio() || this.cobroAbierto()) return;

    const dniNormalizado = limpiarDni(dni);
    if (dniNormalizado.length < 7 || dniNormalizado.length > 11) {
      this.estado.set('error');
      this.mensaje.set('Ingresá un DNI válido para buscar el socio.');
      return;
    }

    this.buscandoSocio.set(true);
    this.estado.set('inicial');
    this.mensaje.set('');
    this.sociosApi
      .paginar({ page: 1, size: 10, search: dniNormalizado, estados: [] })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.buscandoSocio.set(false)),
      )
      .subscribe({
        next: (pagina) => {
          const socio = pagina.content.find(
            (item) => limpiarDni(item.dni ?? '') === dniNormalizado,
          );
          const userUuid = socio?.userUuid?.trim() || socio?.memberUuid?.trim();
          if (!userUuid) {
            this.estado.set('error');
            this.toast.error('No se encontró un socio con ese DNI.', {
              titulo: 'Socio no encontrado', duracionMs: 4000, posicion: 'centrada',
            });
            this.mensaje.set('No se encontró un socio con ese DNI.');
            return;
          }
          this.procesarCodigo(userUuid);
        },
        error: () => {
          this.estado.set('error');
          this.toast.error('No se pudo buscar el socio. Intentá nuevamente.', {
            titulo: 'Error de búsqueda', duracionMs: 4000, posicion: 'centrada',
          });
          this.mensaje.set('No se pudo buscar el socio. Intentá nuevamente.');
        },
      });
  }

  protected abrirCobroSocio(): void {
    if (!this.userUuidSocio() || !this.montoSocio() || this.montoSocio()! <= 0) {
      this.estado.set('error');
      this.mensaje.set('No se pudo determinar el socio o el importe que debe pagar.');
      return;
    }
    this.abrirCobro('socio');
  }

  protected omitirCobroSocio(): void {
    const userUuid = this.userUuidSocio();
    if (userUuid) this.codigosProcesados.delete(userUuid);
    this.resultado.set(null);
    this.userUuidSocio.set(null);
    this.montoSocio.set(null);
    this.estado.set('inicial');
    this.mensaje.set('');
  }

  protected abrirCobroInvitado(): void {
    if (this.procesando() || !this.evento().permiteInvitados) return;
    this.abrirCobro('invitado');
  }

  protected solicitarCobro(command: EventoAccesoCobroCommand): void {
    if (this.guardandoCobro()) return;
    this.guardandoCobro.set(true);
    this.errorCobro.set('');
    this.api
      .cobrar(this.evento().uuid, command, {
        mostrarToastError: false,
        mostrarToastExito: false,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoCobro.set(false)),
      )
      .subscribe({
        next: (resultado) => {
          this.resultadoCobro.set(resultado);
          if (resultado.resultado === 'DEBE_PAGAR' && !resultado.qr?.trim()) {
            this.errorCobro.set('El pago quedó pendiente, pero no se recibió un QR válido.');
          }
          this.estado.set(resultado.resultado === 'ACCESO_PERMITIDO' ? 'exito' : 'pago');
          this.mensaje.set(
            resultado.resultado === 'ACCESO_PERMITIDO'
              ? 'La entrada y el cobro quedaron registrados.'
              : 'El pago quedó pendiente de confirmación por Mercado Pago.',
          );
          this.operacionCompletada.emit({
            tipo: 'cobro',
            modo: this.modoCobro(),
            resultado,
          });
        },
        error: (error: unknown) =>
          this.errorCobro.set(
            this.mensajeHttp(error, 'No se pudo registrar el cobro. Intentá nuevamente.'),
          ),
      });
  }

  protected cerrarCobro(): void {
    if (this.guardandoCobro()) return;
    const userUuid = this.userUuidSocio();
    const resultadoCobro = this.resultadoCobro();
    const accesoConfirmado = resultadoCobro?.resultado === 'ACCESO_PERMITIDO';
    if (this.modoCobro() === 'socio' && userUuid && !accesoConfirmado) {
      this.codigosProcesados.delete(userUuid);
    }
    if (!resultadoCobro || resultadoCobro.resultado === 'DEBE_PAGAR') {
      this.resultado.set(null);
      this.estado.set('inicial');
      this.mensaje.set('');
    }
    this.cobroAbierto.set(false);
    this.userUuidSocio.set(null);
    this.montoSocio.set(null);
    this.resultadoCobro.set(null);
    this.errorCobro.set('');
  }

  protected solicitarCierre(): void {
    if (!this.procesando() && !this.cobroAbierto()) this.cerrar.emit();
  }

  private procesarResultadoScan(resultado: EventoAccesoScanResultDto, userUuid: string): void {
    this.resultado.set(resultado);
    this.operacionCompletada.emit({ tipo: 'scan', resultado });
    switch (resultado.estado) {
      case 'ACCESO_PERMITIDO':
        this.estado.set('exito');
        this.mensaje.set('');
        this.toast.success('Entrada habilitada correctamente.', {
          titulo: 'Acceso permitido', duracionMs: 4000, posicion: 'centrada',
        });
        break;
      case 'DEBE_PAGAR':
        this.userUuidSocio.set(userUuid);
        this.montoSocio.set(resultado.montoAPagar);
        this.estado.set('pago');
        this.mensaje.set('');
        void this.toast.confirm(
          resultado.motivo?.trim() || 'El socio debe pagar para ingresar.',
          {
            titulo: 'Cobro requerido', textoConfirmar: 'Cobrar', textoCancelar: 'Cancelar',
            posicion: 'centrada',
            onConfirmar: () => this.abrirCobroSocio(),
            onCancelar: () => this.omitirCobroSocio(),
          },
        );
        break;
      case 'BLOQUEADO':
        this.estado.set('rechazado');
        this.mensaje.set('');
        this.toast.error(
          resultado.motivo?.trim() || 'El acceso está bloqueado para este evento.',
          { titulo: 'Acceso rechazado', duracionMs: 4000, posicion: 'centrada' },
        );
        break;
    }
  }

  private abrirCobro(modo: ModoCobroEventoAcceso): void {
    this.modoCobro.set(modo);
    if (modo === 'invitado') {
      this.userUuidSocio.set(null);
      this.montoSocio.set(null);
    }
    this.errorCobro.set('');
    this.resultadoCobro.set(null);
    this.cobroAbierto.set(true);
  }

  private reiniciarOperacion(): void {
    this.codigosProcesados.clear();
    this.resultado.set(null);
    this.estado.set('inicial');
    this.mensaje.set('');
    this.userUuidSocio.set(null);
    this.montoSocio.set(null);
    this.cobroAbierto.set(false);
    this.guardandoCobro.set(false);
    this.errorCobro.set('');
    this.resultadoCobro.set(null);
  }

  private mensajeHttp(error: unknown, respaldo: string): string {
    const body =
      error instanceof HttpErrorResponse
        ? (error.error as { message?: unknown; mensaje?: unknown } | null)
        : null;
    const mensaje = body?.message ?? body?.mensaje;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje : respaldo;
  }

}
