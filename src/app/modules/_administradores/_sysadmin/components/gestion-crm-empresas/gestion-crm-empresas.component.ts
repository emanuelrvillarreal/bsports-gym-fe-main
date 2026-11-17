import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PlanCrmDto } from '../../../../../core/api/interfaces/crm.interfaces';
import { EmpresaDto } from '../../../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../../../core/api/services/empresa-api.service';
import { SysadminApiService } from '../../../../../core/api/services/sysadmin-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import {
  FormularioSuscripcionCrmComponent,
  ModoFormularioSuscripcionCrm,
  SeleccionSuscripcionCrm,
} from '../../forms/formulario-suscripcion-crm/formulario-suscripcion-crm.component';

interface FilaEmpresaCrm extends EmpresaDto {
  readonly empresa: string;
  readonly plan: string;
  readonly estadoSuscripcion: string | null;
  readonly estadoPago: string | null;
  readonly proximaFacturacion: string;
  readonly fechaGeneracionUltimaFactura: string;
  readonly fechaVencimientoUltimaFactura: string;
}

@Component({
  selector: 'app-gestion-crm-empresas',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioSuscripcionCrmComponent,
    FormsModule,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './gestion-crm-empresas.component.html',
  styleUrl: './gestion-crm-empresas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCrmEmpresasComponent {
  private readonly empresasApi = inject(EmpresaApiService);
  private readonly sysadminApi = inject(SysadminApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly empresas = signal<readonly EmpresaDto[]>([]);
  protected readonly planes = signal<readonly PlanCrmDto[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly cargandoCatalogos = signal(false);
  protected readonly procesando = signal(false);
  protected readonly empresaProcesandoUuid = signal<string | null>(null);
  protected readonly errorListado = signal('');
  protected readonly errorCatalogos = signal('');
  protected readonly errorOperacion = signal('');
  protected readonly popupAbierto = signal(false);
  protected readonly empresaSeleccionada = signal<EmpresaDto | null>(null);
  protected readonly modoFormulario = signal<ModoFormularioSuscripcionCrm>('suscribir');

  protected readonly filas = computed<readonly FilaEmpresaCrm[]>(() =>
    this.empresas().map((empresa) => ({
      ...empresa,
      empresa: empresa.nombreComercial?.trim() || empresa.razonSocial?.trim() || 'Gimnasio sin nombre',
      plan: empresa.suscripcionCrm?.nombrePlan || 'Sin suscripción',
      estadoSuscripcion: empresa.suscripcionCrm?.estado ?? null,
      estadoPago: empresa.ultimaFacturaEstado ?? null,
      proximaFacturacion: empresa.suscripcionCrm?.fechaProximaFacturacion || '—',
      fechaGeneracionUltimaFactura: empresa.ultimaFacturaFechaGeneracion || '—',
      fechaVencimientoUltimaFactura: empresa.ultimaFacturaFechaVencimiento || '—',
    })),
  );

  protected readonly columnas: readonly ColumnaTabla<FilaEmpresaCrm>[] = [
    {
      id: 'logoUrl',
      titulo: 'Empresa',
      tipo: 'avatar',
      ancho: 'minmax(14rem, 1.6fr)',
      avatarIniciales: (empresa) => this.obtenerInicialesEmpresa(empresa.empresa),
      avatarNombre: (empresa) => empresa.empresa,
    },
    { id: 'cuit', titulo: 'CUIT', ancho: '10rem', formatearTexto: (valor) => String(valor || '—') },
    { id: 'plan', titulo: 'Plan', ancho: 'minmax(11rem, 1fr)' },
    {
      id: 'estadoSuscripcion',
      titulo: 'Suscripción',
      tipo: 'estado',
      ancho: '10rem',
      estadoTexto: (estado) => this.obtenerTextoEstadoSuscripcion(estado),
      estadoClase: (estado) => this.obtenerClaseEstado(estado),
    },
    {
      id: 'estadoPago',
      titulo: 'Pago',
      tipo: 'estado',
      ancho: '10rem',
      estadoTexto: (estado) => (typeof estado === 'string' && estado ? estado : '—'),
      estadoClase: (estado) => this.obtenerClaseEstado(estado),
    },
    {
      id: 'status',
      titulo: 'status',
      tipo: 'estado',
      ancho: '11rem',
      estadoTexto: (status) => this.obtenerTextoStatusEmpresa(status),
      estadoClase: (status) => (status === 0 ? null : 'tabla-responsive__estado--inactivo'),
    },
    { id: 'proximaFacturacion', titulo: 'Próxima facturación', ancho: '12rem' },
    {
      id: 'fechaGeneracionUltimaFactura',
      titulo: 'Generación última factura',
      ancho: '12rem',
    },
    {
      id: 'fechaVencimientoUltimaFactura',
      titulo: 'Vencimiento última factura',
      ancho: '12rem',
    },
  ];

  protected readonly acciones: readonly AccionTabla<FilaEmpresaCrm>[] = [
    {
      id: 'suscribir',
      texto: 'Suscribir',
      icono: 'heroPlus',
      color: 'var(--semantic-success)',
      visible: (empresa) => !empresa.suscripcionCrm,
      deshabilitada: () =>
        this.procesando() || this.cargandoCatalogos() || !this.catalogosSuscripcionDisponibles(),
      cargando: (empresa) => this.empresaProcesandoUuid() === empresa.uuid,
    },
    {
      id: 'cambiar-plan',
      texto: 'Cambiar plan',
      icono: 'heroPencilSquare',
      color: 'var(--semantic-warning)',
      visible: (empresa) => !!empresa.suscripcionCrm,
      deshabilitada: (empresa) =>
        this.procesando() ||
        this.cargandoCatalogos() ||
        this.planes().length === 0 ||
        this.esSuscripcionAnulada(empresa),
      descripcionDeshabilitada: 'La suscripción está anulada.',
      cargando: (empresa) => this.empresaProcesandoUuid() === empresa.uuid,
    },
    {
      id: 'dar-de-baja',
      texto: 'Dar de baja',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      visible: (empresa) => !!empresa.suscripcionCrm,
      deshabilitada: (empresa) => this.procesando() || this.esSuscripcionAnulada(empresa),
      descripcionDeshabilitada: 'La suscripción está anulada.',
      cargando: (empresa) => this.empresaProcesandoUuid() === empresa.uuid,
    },
  ];

  constructor() {
    queueMicrotask(() => {
      this.cargarEmpresas();
      this.cargarCatalogos();
    });
  }

  protected buscar(): void {
    this.pagina.set(1);
    this.cargarEmpresas();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarEmpresas();
  }

  protected manejarAccionFila(evento: EventoAccionTabla<FilaEmpresaCrm>): void {
    if (evento.accion === 'suscribir') this.abrirFormulario(evento.fila, 'suscribir');
    if (evento.accion === 'cambiar-plan') this.abrirFormulario(evento.fila, 'cambiar-plan');
    if (evento.accion === 'dar-de-baja') void this.confirmarBaja(evento.fila);
  }

  protected cerrarFormulario(): void {
    if (this.procesando()) return;
    this.popupAbierto.set(false);
    this.empresaSeleccionada.set(null);
    this.errorOperacion.set('');
  }

  protected async guardarSeleccion(seleccion: SeleccionSuscripcionCrm): Promise<void> {
    const empresa = this.empresaSeleccionada();
    if (!empresa || this.procesando()) return;

    if (this.modoFormulario() === 'cambiar-plan') {
      const confirmado = await this.toast.confirm(
        'Los cupos del nuevo plan se aplicarán inmediatamente después del cambio.',
        { titulo: 'Cambiar plan', textoConfirmar: 'Cambiar plan' },
      );
      if (!confirmado) return;
    }

    this.procesando.set(true);
    this.empresaProcesandoUuid.set(empresa.uuid);
    this.errorOperacion.set('');

    const solicitud =
      this.modoFormulario() === 'suscribir'
        ? this.sysadminApi.suscribirEmpresaCrm(empresa.uuid, seleccion)
        : this.sysadminApi.cambiarPlanEmpresaCrm(empresa.uuid, seleccion);

    solicitud
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.procesando.set(false);
          this.empresaProcesandoUuid.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.popupAbierto.set(false);
          this.empresaSeleccionada.set(null);
          this.cargarEmpresas();
        },
        error: (error: unknown) => this.errorOperacion.set(this.mensajeErrorOperacion(error)),
      });
  }

  protected nombreEmpresaSeleccionada(): string {
    const empresa = this.empresaSeleccionada();
    return (
      empresa?.nombreComercial?.trim() ||
      empresa?.razonSocial?.trim() ||
      empresa?.uuid ||
      'este gimnasio'
    );
  }

  protected tituloPopup(): string {
    return this.modoFormulario() === 'suscribir' ? 'Suscribir gimnasio al CRM' : 'Cambiar plan';
  }

  private obtenerTextoEstadoSuscripcion(estado: unknown): string {
    if (typeof estado !== 'string' || !estado.trim()) return '—';

    return estado.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  private obtenerClaseEstado(estado: unknown): string | null {
    if (typeof estado !== 'string') return 'tabla-responsive__estado--inhabilitado';

    const estadoNormalizado = estado.trim().toUpperCase();
    if (estadoNormalizado === 'PENDIENTE' || estadoNormalizado === 'PENDIENTE_PAGO') {
      return 'tabla-responsive__estado--debe';
    }
    if (estadoNormalizado === 'VENCIDA') {
      return 'tabla-responsive__estado--vencida';
    }
    if (estadoNormalizado === 'ACTIVA' || estadoNormalizado === 'PAGADA') return null;

    return 'tabla-responsive__estado--inhabilitado';
  }

  private obtenerTextoStatusEmpresa(status: unknown): string {
    const numeroStatus = typeof status === 'number' ? status : Number(status);
    const etiqueta = numeroStatus === 0 ? 'Activa' : 'Desactivada';
    return `${etiqueta} (${Number.isFinite(numeroStatus) ? numeroStatus : (status ?? '—')})`;
  }

  private obtenerInicialesEmpresa(nombre: string): string {
    return (
      nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((palabra) => palabra.charAt(0))
        .join('')
        .toUpperCase() || 'E'
    );
  }

  private esSuscripcionAnulada(empresa: EmpresaDto): boolean {
    return empresa.suscripcionCrm?.estado?.trim().toUpperCase() === 'ANULADA';
  }

  private abrirFormulario(empresa: EmpresaDto, modo: ModoFormularioSuscripcionCrm): void {
    if (this.procesando()) return;

    const catalogosDisponibles = this.planes().length > 0;
    if (!catalogosDisponibles) {
      this.toast.error(
        'No está disponible el catálogo de planes del CRM. Reintentá la carga.',
        { titulo: 'Catálogos CRM' },
      );
      return;
    }

    this.empresaSeleccionada.set(empresa);
    this.modoFormulario.set(modo);
    this.errorOperacion.set('');
    this.popupAbierto.set(true);
  }

  private async confirmarBaja(empresa: EmpresaDto): Promise<void> {
    if (this.procesando()) return;

    const nombre = empresa.nombreComercial?.trim() || empresa.razonSocial?.trim() || empresa.uuid;
    const confirmado = await this.toast.confirmDanger(
      `Se anularán las suscripciones de ${nombre}, se compensará la deuda asociada y se bloqueará inmediatamente el acceso del gimnasio.`,
      { titulo: 'Dar de baja del CRM', textoConfirmar: 'Dar de baja' },
    );
    if (!confirmado || this.procesando()) return;

    this.procesando.set(true);
    this.empresaProcesandoUuid.set(empresa.uuid);
    this.errorListado.set('');
    this.sysadminApi
      .desuscribirEmpresaCrm(empresa.uuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.procesando.set(false);
          this.empresaProcesandoUuid.set(null);
        }),
      )
      .subscribe({
        next: () => this.cargarEmpresas(),
        error: (error: unknown) => this.errorListado.set(this.mensajeErrorOperacion(error)),
      });
  }

  private cargarEmpresas(): void {
    this.cargando.set(true);
    this.errorListado.set('');
    this.empresasApi
      .paginarClubes({
        page: this.pagina(),
        size: 10,
        search: this.busqueda().trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.empresas.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.errorListado.set('No se pudieron cargar los gimnasios.'),
      });
  }

  protected cargarCatalogos(): void {
    if (this.cargandoCatalogos()) return;
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set('');

    this.sysadminApi
      .obtenerPlanesCrm()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoCatalogos.set(false)),
      )
      .subscribe({
        next: (planes) => this.planes.set(planes),
        error: (error: unknown) => {
          this.planes.set([]);
          this.errorCatalogos.set(
            error instanceof HttpErrorResponse && error.status === 502
              ? 'El CRM no permitió consultar los planes. Confirmá los permisos de integración y reintentá.'
              : 'No se pudo cargar el catálogo de planes del CRM.',
          );
        },
      });
  }

  private catalogosSuscripcionDisponibles(): boolean {
    return this.planes().length > 0;
  }

  private mensajeErrorOperacion(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la operación. Intentá nuevamente.';
    }
    if (error.status === 404) return 'El gimnasio no existe o ya no está disponible.';
    if (error.status === 409)
      return 'La operación entra en conflicto con el estado actual de la suscripción.';
    if (error.status === 400)
      return 'El CRM rechazó los datos enviados. Revisá la selección e intentá nuevamente.';
    if (error.status === 502)
      return 'El CRM no está disponible o no cuenta con los permisos necesarios.';
    return 'No se pudo completar la operación. Intentá nuevamente.';
  }
}
