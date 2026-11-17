import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  AsignarDescuentoPayload,
  DescuentoDto,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { SolicitudRegistroSocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { FormularioAsignacionDescuentoComponent } from '../../forms/formulario-asignacion-descuento/formulario-asignacion-descuento.component';
import {
  FiltroSolicitudesPayload,
  FormularioFiltroSolicitudesComponent,
} from '../../forms/formulario-filtro-solicitudes/formulario-filtro-solicitudes.component';
import {
  FormularioRechazoSolicitudComponent,
  RechazoSolicitudPayload,
} from '../../forms/formulario-rechazo-solicitud/formulario-rechazo-solicitud.component';

const SOLICITUDES_POR_PAGINA = 6;

interface FilaDescuentoAprobacion extends AsignarDescuentoPayload {
  readonly titulo: string;
  readonly valor: string;
}

@Component({
  selector: 'app-solicitudes-registro',
  imports: [
    BotonComponent,
    CardComponent,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
    FormularioAsignacionDescuentoComponent,
    FormularioFiltroSolicitudesComponent,
    FormularioRechazoSolicitudComponent,
  ],
  templateUrl: './solicitudes-registro.component.html',
  styleUrl: './solicitudes-registro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesRegistroComponent {
  private readonly sociosApi = inject(SociosApiService);
  private readonly descuentosApi = inject(DescuentosApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly solicitudes = signal<readonly SolicitudRegistroSocioDto[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly filasPorPagina = SOLICITUDES_POR_PAGINA;
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly procesandoUuid = signal<string | null>(null);
  protected readonly solicitudRechazo = signal<SolicitudRegistroSocioDto | null>(null);
  protected readonly solicitudAprobacion = signal<SolicitudRegistroSocioDto | null>(null);
  protected readonly catalogoDescuentos = signal<readonly DescuentoDto[]>([]);
  protected readonly catalogoDescuentosCargado = signal(false);
  protected readonly cargandoCatalogoDescuentos = signal(false);
  protected readonly descuentosAprobacion = signal<readonly AsignarDescuentoPayload[]>([]);
  protected readonly mostrarFormularioDescuento = signal(true);
  protected readonly errorAprobacion = signal('');
  protected readonly error = signal('');

  protected readonly descuentosDisponibles = computed(() => {
    const seleccionados = new Set(
      this.descuentosAprobacion().map((descuento) => descuento.descuentoUuid),
    );
    return this.catalogoDescuentos().filter(
      (descuento) => !seleccionados.has(descuento.descuentoUuid),
    );
  });
  protected readonly filasDescuentosAprobacion = computed<readonly FilaDescuentoAprobacion[]>(() =>
    this.descuentosAprobacion().map((asignacion) => {
      const descuento = this.catalogoDescuentos().find(
        (item) => item.descuentoUuid === asignacion.descuentoUuid,
      );
      return {
        ...asignacion,
        titulo: descuento?.titulo ?? 'Descuento',
        valor: this.formatearValorDescuento(descuento),
      };
    }),
  );

  protected readonly columnas: readonly ColumnaTabla<SolicitudRegistroSocioDto>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(8rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(8rem, 1fr)' },
    { id: 'titularNombre', titulo: 'Titular', ancho: 'minmax(10rem, 1fr)' },
    { id: 'email', titulo: 'Email', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
    { id: 'parentesco', titulo: 'Parentesco', ancho: '9rem' },
  ];
  protected readonly accionesSolicitudes: readonly AccionTabla<SolicitudRegistroSocioDto>[] = [
    {
      id: 'aprobar',
      texto: 'Aprobar',
      icono: 'heroCheck',
      color: 'var(--semantic-success)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'rechazar',
      texto: 'Rechazar',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
  ];
  protected readonly columnasDescuentosAprobacion: readonly ColumnaTabla<FilaDescuentoAprobacion>[] =
    [
      { id: 'titulo', titulo: 'Descuento', ancho: 'minmax(9rem, 1fr)' },
      { id: 'valor', titulo: 'Valor', ancho: '7rem' },
      { id: 'fechaDesde', titulo: 'Desde', tipo: 'fecha', ancho: '8rem' },
      { id: 'fechaHasta', titulo: 'Hasta', tipo: 'fecha', ancho: '8rem' },
    ];
  protected readonly accionesDescuentosAprobacion: readonly AccionTabla<FilaDescuentoAprobacion>[] =
    [
      {
        id: 'quitar',
        texto: 'Quitar',
        icono: 'heroTrash',
        color: 'var(--semantic-danger)',
        deshabilitada: () => !!this.procesandoUuid(),
      },
    ];

  constructor() {
    this.cargar();
  }

  protected buscar(payload: FiltroSolicitudesPayload): void {
    this.busqueda.set(payload.busqueda);
    this.paginaActual.set(1);
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected prepararAprobacion(solicitud: SolicitudRegistroSocioDto): void {
    if (this.procesandoUuid()) return;
    this.solicitudAprobacion.set(solicitud);
    this.descuentosAprobacion.set([]);
    this.errorAprobacion.set('');
    this.mostrarFormularioDescuento.set(true);
    if (!this.catalogoDescuentosCargado() && !this.cargandoCatalogoDescuentos()) {
      this.cargarCatalogoDescuentos(1, []);
    }
  }

  protected cancelarAprobacion(): void {
    if (this.procesandoUuid()) return;
    this.solicitudAprobacion.set(null);
    this.descuentosAprobacion.set([]);
    this.errorAprobacion.set('');
  }

  protected agregarDescuentoAprobacion(payload: AsignarDescuentoPayload): void {
    if (this.descuentosAprobacion().some((item) => item.descuentoUuid === payload.descuentoUuid)) {
      this.errorAprobacion.set('Ese descuento ya fue agregado.');
      return;
    }

    this.errorAprobacion.set('');
    this.descuentosAprobacion.update((actuales) => [...actuales, payload]);
    this.mostrarFormularioDescuento.set(false);
    queueMicrotask(() => {
      if (this.solicitudAprobacion()) this.mostrarFormularioDescuento.set(true);
    });
  }

  protected manejarAccionDescuentoAprobacion(
    evento: EventoAccionTabla<FilaDescuentoAprobacion>,
  ): void {
    if (evento.accion !== 'quitar' || this.procesandoUuid()) return;
    this.descuentosAprobacion.update((actuales) =>
      actuales.filter((item) => item.descuentoUuid !== evento.fila.descuentoUuid),
    );
    this.errorAprobacion.set('');
  }

  protected confirmarAprobacion(): void {
    const solicitud = this.solicitudAprobacion();
    if (!solicitud || this.procesandoUuid()) return;
    this.procesandoUuid.set(solicitud.memberUuid);
    this.errorAprobacion.set('');
    const descuentos = this.descuentosAprobacion();
    this.sociosApi
      .aprobarSolicitud(solicitud.memberUuid, descuentos.length ? { descuentos } : {})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoUuid.set(null)),
      )
      .subscribe({
        next: () => {
          this.solicitudAprobacion.set(null);
          this.descuentosAprobacion.set([]);
          this.cargar();
        },
        error: () => this.errorAprobacion.set('No se pudo aprobar la solicitud.'),
      });
  }

  protected prepararRechazo(solicitud: SolicitudRegistroSocioDto): void {
    this.solicitudRechazo.set(solicitud);
  }

  protected manejarAccionSolicitud(evento: EventoAccionTabla<SolicitudRegistroSocioDto>): void {
    switch (evento.accion) {
      case 'aprobar':
        this.prepararAprobacion(evento.fila);
        break;
      case 'rechazar':
        this.prepararRechazo(evento.fila);
        break;
    }
  }

  protected cancelarRechazo(): void {
    this.solicitudRechazo.set(null);
  }

  protected async confirmarRechazo(payload: RechazoSolicitudPayload): Promise<void> {
    const solicitud = this.solicitudRechazo();
    if (!solicitud || this.procesandoUuid()) return;

    this.solicitudRechazo.set(null);
    const confirmado = await this.toast.confirmDanger(
      `Se rechazará la solicitud de ${solicitud.nombre} ${solicitud.apellido}. Esta acción no se puede deshacer.`,
      { titulo: 'Rechazar solicitud', textoConfirmar: 'Rechazar' },
    );
    if (!confirmado) {
      this.solicitudRechazo.set(solicitud);
      return;
    }

    this.procesandoUuid.set(solicitud.memberUuid);
    this.sociosApi
      .rechazarSolicitud(solicitud.memberUuid, payload.motivo)
      .pipe(finalize(() => this.procesandoUuid.set(null)))
      .subscribe({
        next: () => {
          this.cancelarRechazo();
          this.cargar();
        },
        error: () => {
          this.solicitudRechazo.set(null);
          this.error.set('No se pudo rechazar la solicitud.');
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.sociosApi
      .listarSolicitudes({
        page: this.paginaActual(),
        size: this.filasPorPagina,
        search: this.busqueda().trim(),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.solicitudes.set(respuesta.content ?? []);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages ?? 1));
        },
        error: () => this.error.set('No se pudieron cargar las solicitudes.'),
      });
  }

  private cargarCatalogoDescuentos(pagina: number, acumulados: readonly DescuentoDto[]): void {
    this.cargandoCatalogoDescuentos.set(true);
    this.descuentosApi
      .paginarCatalogo({ page: pagina, size: 100, search: '' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const catalogo = [...acumulados, ...(respuesta.content ?? [])];
          if (pagina < (respuesta.totalPages ?? 1)) {
            this.cargarCatalogoDescuentos(pagina + 1, catalogo);
            return;
          }
          this.catalogoDescuentos.set(catalogo);
          this.catalogoDescuentosCargado.set(true);
          this.cargandoCatalogoDescuentos.set(false);
        },
        error: () => {
          this.cargandoCatalogoDescuentos.set(false);
          this.errorAprobacion.set(
            'No se pudo cargar el catálogo. Podés aprobar la solicitud sin descuentos.',
          );
        },
      });
  }

  private formatearValorDescuento(descuento: DescuentoDto | undefined): string {
    if (!descuento) return '—';
    return descuento.tipoValor === 'PORCENTAJE'
      ? `${descuento.porcentaje ?? 0}%`
      : `$ ${descuento.montoFijo ?? 0}`;
  }
}
