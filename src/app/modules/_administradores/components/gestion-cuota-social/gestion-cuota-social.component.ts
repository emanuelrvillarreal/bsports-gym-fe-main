import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CuotaSocialRangoDto,
  GuardarCuotaSocialRangoCommand,
} from '../../../../core/api/interfaces/cuotas-sociales-rango.interfaces';
import { PerfilEmpresaDto, PerfilEmpresaPayload } from '../../../../core/api/interfaces/empresa.interfaces';
import { CuotaSocialRangoApiService } from '../../../../core/api/services/cuota-social-rango-api.service';
import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { normalizarValorMoneda } from '../../../../helpers/moneda-formato';
import { CardComponent } from '../../../ui/card/card.component';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  EventoFiltroCabeceraTabla,
  FiltroCabeceraTabla,
  TablaResponsiveComponent,
  ValorInputTabla,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';

const FILAS_POR_PAGINA = 20;

@Component({
  selector: 'app-gestion-cuota-social',
  imports: [CardComponent, PaginacionComponent, TablaResponsiveComponent],
  templateUrl: './gestion-cuota-social.component.html',
  styleUrl: './gestion-cuota-social.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCuotaSocialComponent {
  private readonly rangosApi = inject(CuotaSocialRangoApiService);
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly sesion = inject(AuthSessionService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly colorThemeService = inject(ColorThemeService);

  protected readonly rangos = signal<readonly CuotaSocialRangoDto[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly actualizandoHabilitacion = signal(false);
  protected readonly cuotaSocialHabilitada = signal(false);
  protected readonly error = signal('');
  protected readonly rangoEditandoUuid = signal<string | null>(null);
  protected readonly valoresFormulario = signal<Partial<Record<string, ValorInputTabla>>>({});
  protected readonly versionValoresFormulario = signal(0);
  protected readonly formularioVisible = signal(false);
  protected readonly versionVisibilidadFormulario = signal(0);
  protected readonly mantenerFormularioAbierto = signal(false);

  protected readonly columnas: readonly ColumnaTabla<CuotaSocialRangoDto>[] = [
    { id: 'nombre', titulo: 'Categoría', ancho: 'minmax(10rem, 1fr)' },
    { id: 'descripcion', titulo: 'Descripción', ancho: 'minmax(13rem, 1.4fr)' },
    { id: 'edadHasta', titulo: 'Hasta qué edad', tipo: 'numero', inputType: 'number', inputMode: 'numeric', min: 0, max: 120, ancho: '9rem' },
    { id: 'importe', titulo: 'Importe', tipo: 'moneda', inputMode: 'decimal', min: 0, ancho: '9rem' },
  ];
  protected readonly acciones: readonly AccionTabla<CuotaSocialRangoDto>[] = [
    { predefinida: 'editar', deshabilitada: () => this.guardando() || this.actualizandoHabilitacion() },
    { predefinida: 'borrar', deshabilitada: () => this.guardando() || this.actualizandoHabilitacion() },
  ];
  protected readonly filtrosCabecera = computed<readonly FiltroCabeceraTabla[]>(() => [
    {
      id: 'habilitar-cuota-social',
      texto: 'Activar cuota social',
      activo: this.cuotaSocialHabilitada(),
      deshabilitado: this.actualizandoHabilitacion(),
      variante: 'hold',
      acento: 'primario',
      confirmacionRequerida: true,
    },
  ]);

  constructor() {
    this.cargar();
    this.cargarHabilitacion();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected manejarAccion(evento: EventoAccionTabla<CuotaSocialRangoDto>): void {
    if (evento.accion === 'editar') this.editar(evento.fila);
    if (evento.accion === 'borrar') void this.eliminar(evento.fila);
  }

  protected guardar(valores: Partial<Record<string, ValorInputTabla>>): void {
    if (this.guardando()) return;
    const command = this.construirCommand(valores);
    if (!this.esCommandValido(command)) {
      this.error.set('Completá categoría, edad máxima (0 a 120) e importe válido.');
      return;
    }

    const uuid = this.rangoEditandoUuid();
    const request = uuid ? this.rangosApi.actualizar(uuid, command) : this.rangosApi.crear(command);
    this.guardando.set(true);
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.limpiarFormulario(!this.mantenerFormularioAbierto());
        this.cargar();
      },
      error: () => this.error.set('No se pudo guardar la categoría de cuota social.'),
    });
  }

  protected actualizarHold(activo: boolean): void {
    this.mantenerFormularioAbierto.set(activo);
  }

  protected limpiarFormularioDesdeTabla(): void {
    this.limpiarFormulario(true);
  }

  protected async cambiarHabilitacion(evento: EventoFiltroCabeceraTabla): Promise<void> {
    if (evento.id !== 'habilitar-cuota-social') return;
    const habilitada = evento.activo;
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (this.actualizandoHabilitacion() || !companyUuid) return;

    const confirmado = await this.toast.confirm(
      habilitada
        ? 'Se activará la generación de cuotas sociales para el gimnasio.'
        : 'Se desactivará la generación de cuotas sociales para el gimnasio.',
      {
        titulo: habilitada ? 'Activar cuota social' : 'Desactivar cuota social',
        textoConfirmar: habilitada ? 'Activar' : 'Desactivar',
      },
    );
    if (!confirmado) return;

    const estadoAnterior = this.cuotaSocialHabilitada();
    this.cuotaSocialHabilitada.set(habilitada);
    this.actualizandoHabilitacion.set(true);
    this.error.set('');
    this.empresaApi.obtenerPerfil(companyUuid).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (perfil) => this.guardarHabilitacion(companyUuid, perfil, habilitada),
      error: () => {
        this.actualizandoHabilitacion.set(false);
        this.cuotaSocialHabilitada.set(estadoAnterior);
        this.error.set('No se pudo cargar el perfil para actualizar la cuota social.');
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.rangosApi.paginar({ page: this.paginaActual(), size: FILAS_POR_PAGINA, search: '' }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (pagina) => {
        this.rangos.set(pagina.content);
        this.totalPaginas.set(Math.max(1, pagina.totalPages));
      },
      error: () => this.error.set('No se pudieron cargar las categorías de cuota social.'),
    });
  }

  private cargarHabilitacion(): void {
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (!companyUuid) return;
    this.empresaApi.obtenerPerfil(companyUuid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (perfil) => this.cuotaSocialHabilitada.set(perfil.cuotaSocialHabilitada ?? false),
    });
  }

  private editar(rango: CuotaSocialRangoDto): void {
    this.rangoEditandoUuid.set(rango.cuotaSocialRangoUuid);
    this.valoresFormulario.set({ nombre: rango.nombre, descripcion: rango.descripcion ?? '', edadHasta: rango.edadHasta, importe: rango.importe });
    this.versionValoresFormulario.update((version) => version + 1);
    this.formularioVisible.set(true);
    this.versionVisibilidadFormulario.update((version) => version + 1);
    this.error.set('');
  }

  private async eliminar(rango: CuotaSocialRangoDto): Promise<void> {
    if (rango.esDefault) {
      this.toast.error('La categoría predeterminada no se puede eliminar.', {
        titulo: 'Acción no disponible',
        fondoPeligro: true,
        posicion: 'centrada',
      });
      return;
    }
    const confirmado = await this.toast.confirmDanger('Esta acción da de baja la categoría y no se puede deshacer.', { titulo: 'Eliminar categoría', textoConfirmar: 'Eliminar' });
    if (!confirmado) return;
    this.guardando.set(true);
    this.rangosApi.eliminar(rango.cuotaSocialRangoUuid).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo eliminar la categoría de cuota social.'),
    });
  }

  private guardarHabilitacion(companyUuid: string, perfil: PerfilEmpresaDto, habilitada: boolean): void {
    if (!perfil.domicilio || !perfil.domicilioFacturacion || !perfil.telefono ||
        !perfil.emailInstitucional) {
      this.actualizandoHabilitacion.set(false);
      this.cuotaSocialHabilitada.set(perfil.cuotaSocialHabilitada ?? false);
      this.error.set('Completa el perfil del gimnasio antes de modificar la cuota social.');
      return;
    }
    const estadoAnterior = !habilitada;
    const payload = this.extraerPayload(perfil, habilitada);
    this.empresaApi.actualizarPerfil(companyUuid, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.actualizandoHabilitacion.set(false)),
    ).subscribe({
      next: () => this.cuotaSocialHabilitada.set(habilitada),
      error: () => {
        this.cuotaSocialHabilitada.set(estadoAnterior);
        this.error.set('No se pudo actualizar la habilitación de la cuota social.');
      },
    });
  }

  private extraerPayload(
    perfil: PerfilEmpresaDto,
    cuotaSocialHabilitada: boolean = perfil.cuotaSocialHabilitada ?? false,
  ): PerfilEmpresaPayload {
    const paleta = this.colorThemeService.obtenerPaletaPredeterminada();
    const path = perfil.path?.trim() || perfil.nombreComercial.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!perfil.domicilio || !perfil.domicilioFacturacion || !perfil.telefono ||
        !perfil.emailInstitucional) {
      throw new Error('Completa el perfil del gimnasio antes de modificar la cuota social.');
    }
    return {
      path,
      nombreComercial: perfil.nombreComercial,
      razonSocial: perfil.razonSocial,
      cuit: perfil.cuit,
      domicilio: perfil.domicilio,
      domicilioFacturacion: perfil.domicilioFacturacion,
      telefono: perfil.telefono,
      emailFacturaElectronica: perfil.emailFacturaElectronica,
      emailInstitucional: perfil.emailInstitucional,
      colorPrimario: perfil.colorPrimario ?? paleta.primario,
      colorSecundario: perfil.colorSecundario ?? paleta.secundario,
      cuotaSocialHabilitada,
      ...(perfil.periodicidadCuotaSocial !== undefined
        ? { periodicidadCuotaSocial: perfil.periodicidadCuotaSocial }
        : {}),
      ...(perfil.diasVencimientoCuota !== undefined ? { diasVencimientoCuota: perfil.diasVencimientoCuota } : {}),
      ...(perfil.diasVencimientoMoroso !== undefined ? { diasVencimientoMoroso: perfil.diasVencimientoMoroso } : {}),
      ...(perfil.diasInhabilitacion !== undefined ? { diasInhabilitacion: perfil.diasInhabilitacion } : {}),
    };
  }

  private limpiarFormulario(cerrar: boolean): void {
    this.rangoEditandoUuid.set(null);
    this.valoresFormulario.set({});
    this.versionValoresFormulario.update((version) => version + 1);
    if (cerrar) {
      this.formularioVisible.set(false);
      this.versionVisibilidadFormulario.update((version) => version + 1);
    }
  }

  private construirCommand(valores: Partial<Record<string, ValorInputTabla>>): GuardarCuotaSocialRangoCommand {
    return { nombre: String(valores['nombre'] ?? '').trim(), descripcion: String(valores['descripcion'] ?? '').trim() || null, edadHasta: Number(valores['edadHasta']), importe: normalizarValorMoneda(String(valores['importe'] ?? '')) };
  }

  private esCommandValido(command: GuardarCuotaSocialRangoCommand): boolean {
    return !!command.nombre && Number.isInteger(command.edadHasta) && command.edadHasta >= 0 && command.edadHasta <= 120 && Number.isFinite(command.importe) && command.importe >= 0;
  }
}
