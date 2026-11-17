import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ConfiguracionMercadoPagoDto,
  EmpresaDto,
  GuardarConfiguracionMercadoPagoPayload,
} from '../../../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../../../core/api/services/empresa-api.service';
import { SysadminApiService } from '../../../../../core/api/services/sysadmin-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { TablaResponsiveComponent, AccionCabeceraTabla, AccionTabla, ColumnaTabla, EventoAccionTabla } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { FormularioMercadoPagoComponent } from '../../forms/formulario-mercado-pago/formulario-mercado-pago.component';

interface FilaEmpresaMercadoPago extends EmpresaDto {
  readonly comercio: string;
}

const TAMANIO_PAGINA = 10;

@Component({
  selector: 'app-gestion-mercado-pago-empresas',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioMercadoPagoComponent,
    FormsModule,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './gestion-mercado-pago-empresas.component.html',
  styleUrl: './gestion-mercado-pago-empresas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionMercadoPagoEmpresasComponent {
  private readonly empresasApi = inject(EmpresaApiService);
  private readonly sysadminApi = inject(SysadminApiService);
  private readonly toastAlert = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly empresas = signal<readonly EmpresaDto[]>([]);
  protected readonly tamanoPagina = TAMANIO_PAGINA;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly empresaSeleccionada = signal<EmpresaDto | null>(null);
  protected readonly configuracion = signal<ConfiguracionMercadoPagoDto | null>(null);
  protected readonly cargandoConfiguracion = signal(false);
  protected readonly guardando = signal(false);
  protected readonly empresaBloqueandoUuid = signal<string | null>(null);
  protected readonly popupConfiguracionAbierto = signal(false);
  protected readonly popupUuidAbierto = signal(false);
  protected readonly uuidManual = signal('');
  protected readonly errorUuidManual = signal('');

  protected readonly filas = computed<readonly FilaEmpresaMercadoPago[]>(() =>
    this.empresas().map((empresa) => ({
      ...empresa,
      comercio: empresa.nombreComercial?.trim() || empresa.razonSocial?.trim() || 'Comercio sin nombre',
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaEmpresaMercadoPago>[] = [
    { id: 'comercio', titulo: 'Comercio', ancho: 'minmax(14rem, 1.5fr)' },
    { id: 'razonSocial', titulo: 'Razón social', ancho: 'minmax(14rem, 1.5fr)' },
    { id: 'cuit', titulo: 'CUIT', ancho: '10rem', formatearTexto: (valor) => String(valor ?? '—') },
  ];
  protected readonly accionesCabecera: readonly AccionCabeceraTabla[] = [
    { id: 'configurar-uuid', texto: 'Configurar por UUID', abreDialogo: true },
  ];
  protected readonly acciones: readonly AccionTabla<FilaEmpresaMercadoPago>[] = [
    {
      id: 'configurar',
      texto: 'Configurar Mercado Pago',
      icono: 'heroCog6Tooth',
      color: 'var(--semantic-warning)',
      deshabilitada: () => this.guardando(),
    },
    {
      id: 'bloquear',
      texto: 'Bloquear Mercado Pago',
      icono: 'heroXMark',
      color: 'var(--semantic-danger)',
      deshabilitada: () => this.guardando(),
      cargando: (empresa) => this.empresaBloqueandoUuid() === empresa.uuid,
    },
  ];

  constructor() {
    queueMicrotask(() => this.cargarEmpresas());
  }

  protected buscar(): void {
    this.pagina.set(1);
    this.cargarEmpresas();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarEmpresas();
  }

  protected manejarAccionCabecera(accion: string): void {
    if (accion !== 'configurar-uuid') return;
    this.uuidManual.set('');
    this.errorUuidManual.set('');
    this.popupUuidAbierto.set(true);
  }

  protected manejarAccionFila(evento: EventoAccionTabla<FilaEmpresaMercadoPago>): void {
    if (evento.accion === 'configurar') this.abrirConfiguracion(evento.fila);
    if (evento.accion === 'bloquear') void this.confirmarBloqueo(evento.fila);
  }

  protected abrirConfiguracionPorUuid(): void {
    const uuid = this.uuidManual().trim();
    if (!uuid) {
      this.errorUuidManual.set('Ingresá el UUID del comercio.');
      return;
    }
    this.popupUuidAbierto.set(false);
    this.abrirConfiguracion({
      uuid,
      nombreComercial: `Comercio ${uuid}`,
      suscripcionCrm: null,
    });
  }

  protected guardar(payload: GuardarConfiguracionMercadoPagoPayload): void {
    const empresa = this.empresaSeleccionada();
    if (!empresa || this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    this.sysadminApi.guardarConfiguracionMercadoPago(empresa.uuid, payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (configuracion) => {
          this.configuracion.set(configuracion);
          this.popupConfiguracionAbierto.set(false);
          this.empresaSeleccionada.set(null);
        },
        error: () => this.error.set('No se pudo guardar la configuración. Revisá los datos e intentá nuevamente.'),
      });
  }

  protected cerrarConfiguracion(): void {
    if (this.guardando()) return;
    this.popupConfiguracionAbierto.set(false);
    this.empresaSeleccionada.set(null);
    this.configuracion.set(null);
  }

  protected cerrarUuid(): void {
    this.popupUuidAbierto.set(false);
    this.uuidManual.set('');
    this.errorUuidManual.set('');
  }

  protected nombreEmpresaSeleccionada(): string {
    const empresa = this.empresaSeleccionada();
    return empresa?.nombreComercial?.trim() || empresa?.razonSocial?.trim() || empresa?.uuid || 'este comercio';
  }

  private async confirmarBloqueo(empresa: EmpresaDto): Promise<void> {
    if (this.guardando()) return;

    const nombre = empresa.nombreComercial?.trim()
      || empresa.razonSocial?.trim()
      || empresa.uuid;
    const confirmado = await this.toastAlert.confirmDanger(
      `Se bloquearán los nuevos cobros por Mercado Pago para ${nombre}. Las credenciales permanecerán guardadas.`,
      {
        titulo: 'Bloquear Mercado Pago',
        textoConfirmar: 'Bloquear',
      },
    );
    if (!confirmado || this.guardando()) return;

    this.guardando.set(true);
    this.empresaBloqueandoUuid.set(empresa.uuid);
    this.error.set('');
    this.sysadminApi
      .guardarConfiguracionMercadoPago(empresa.uuid, { habilitado: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando.set(false);
          this.empresaBloqueandoUuid.set(null);
        }),
      )
      .subscribe({
        error: () => this.error.set('No se pudo bloquear Mercado Pago para este comercio.'),
      });
  }

  private abrirConfiguracion(empresa: EmpresaDto): void {
    if (this.cargandoConfiguracion()) return;
    this.empresaSeleccionada.set(empresa);
    this.configuracion.set(null);
    this.error.set('');
    this.popupConfiguracionAbierto.set(true);
    this.cargandoConfiguracion.set(true);
    this.sysadminApi.obtenerConfiguracionMercadoPago(empresa.uuid)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoConfiguracion.set(false)))
      .subscribe({
        next: (configuracion) => this.configuracion.set(configuracion),
        error: () => this.error.set('No se pudo consultar el estado actual de Mercado Pago.'),
      });
  }

  private cargarEmpresas(): void {
    this.cargando.set(true);
    this.error.set('');
    this.empresasApi.paginarClubes({ page: this.pagina(), size: TAMANIO_PAGINA, search: this.busqueda().trim() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.empresas.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar los comercios. Verificá que el endpoint global esté disponible.'),
      });
  }

}
