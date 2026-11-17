import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroQrCode } from '@ng-icons/heroicons/outline';
import { finalize } from 'rxjs';

import { formatearDni } from '../../../../helpers/dni-formato';
import { parseFechaCalendario } from '../../../../helpers/calendario-fecha.helpers';
import {
  obtenerColorTextoContraste,
  obtenerColorTextoContrasteGradiente,
  parsearColorCss,
} from '../../../../helpers/color-texto-contraste';
import { extraerUserUuidDeQr } from '../../../../helpers/extraer-user-uuid-qr';
import { obtenerInicialesDesdeNombreApellido } from '../../../../helpers/tabla-avatar-nombre.helpers';
import {
  AccesoClubDto,
  PresenteClubDto,
} from '../../../../core/api/interfaces/accesos-club.interfaces';
import { AccesosClubApiService } from '../../../../core/api/services/accesos-club-api.service';
import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { CarruselFadeComponent } from '../../../ui/carrusel-fade/carrusel-fade.component';
import { CarruselFadeItemDirective } from '../../../ui/carrusel-fade/carrusel-fade-item.directive';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { EstadoLectorQr, LectorQrComponent } from '../../../ui/lector-qr/lector-qr.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';

const FILAS_HISTORIAL_POR_PAGINA = 8;

type ModoListadoSocios = 'todos' | 'ingresos';

interface FilaSocioAcceso {
  readonly memberUuid: string;
  readonly userUuid?: string | null;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
}

interface FilaHistorialAcceso {
  readonly uid: string;
  readonly persona: string;
  readonly fecha: string;
  readonly tipo: string;
}

function fechaLocal(): string {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60_000;
  return new Date(hoy.getTime() - offset).toISOString().slice(0, 10);
}

function timestampAcceso(acceso: AccesoClubDto): number {
  const timestamp = acceso.fecha ? new Date(acceso.fecha).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatearHoraAcceso(fecha?: string): string {
  const fechaParseada = parseFechaCalendario(fecha);
  if (!fechaParseada) {
    return '--:--';
  }

  return `${String(fechaParseada.getHours()).padStart(2, '0')}:${String(
    fechaParseada.getMinutes(),
  ).padStart(2, '0')}`;
}

/** Mantiene compatibilidad con la lista directa y el objeto actual del endpoint. */
function normalizarPresentes(respuesta: unknown): {
  readonly presentes: readonly PresenteClubDto[];
  readonly count: number;
} {
  if (Array.isArray(respuesta)) {
    return { presentes: respuesta as readonly PresenteClubDto[], count: respuesta.length };
  }

  if (!respuesta || typeof respuesta !== 'object') {
    return { presentes: [], count: 0 };
  }

  const posibleRespuesta = respuesta as Record<string, unknown>;
  const lista =
    posibleRespuesta['content'] ??
    posibleRespuesta['data'] ??
    posibleRespuesta['items'] ??
    posibleRespuesta['presentes'];

  const presentes = Array.isArray(lista) ? (lista as readonly PresenteClubDto[]) : [];
  const count = posibleRespuesta['count'];

  return {
    presentes,
    count:
      typeof count === 'number' && Number.isFinite(count) && count >= 0
        ? Math.floor(count)
        : presentes.length,
  };
}

/** El texto queda centrado sobre el punto medio del gradiente de la insignia. */
function obtenerColorMedioGradiente(colorInicial: string, colorFinal: string): string {
  const inicial = parsearColorCss(colorInicial);
  const final = parsearColorCss(colorFinal);
  if (!inicial || !final) {
    return colorInicial;
  }

  return `rgb(${Math.round((inicial.r + final.r) / 2)}, ${Math.round(
    (inicial.g + final.g) / 2,
  )}, ${Math.round((inicial.b + final.b) / 2)})`;
}

@Component({
  selector: 'app-gestion-accesos',
  imports: [
    BotonComponent,
    CardComponent,
    CarruselFadeComponent,
    CarruselFadeItemDirective,
    FormsModule,
    InputFechaComponent,
    LectorQrComponent,
    LoadSpinnerBlueComponent,
    NgIcon,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideIcons({ heroQrCode })],
  templateUrl: './gestion-accesos.component.html',
  styleUrl: './gestion-accesos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionAccesosComponent implements OnDestroy {
  private readonly api = inject(AccesosClubApiService);
  private readonly sociosApi = inject(SociosApiService);
  private readonly colorTheme = inject(ColorThemeService);
  private readonly themeMode = inject(ThemeModeService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private contadorFrame: number | null = null;

  protected readonly presentes = signal<readonly PresenteClubDto[]>([]);
  protected readonly historial = signal<readonly AccesoClubDto[]>([]);
  private readonly eventosLive = signal<readonly AccesoClubDto[]>([]);
  protected readonly cargandoPresentes = signal(false);
  protected readonly cargandoHistorial = signal(false);
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');
  protected readonly errorPresentes = signal('');
  protected readonly errorHistorial = signal('');
  protected readonly desde = signal(fechaLocal());
  protected readonly hasta = signal(fechaLocal());
  protected readonly paginaHistorial = signal(1);
  protected readonly personasAnimadas = signal(0);
  protected readonly socios = signal<readonly SocioDto[]>([]);
  protected readonly cargandoSocios = signal(false);
  protected readonly errorSocios = signal('');
  protected readonly busquedaSocios = signal('');
  protected readonly paginaSocios = signal(1);
  protected readonly totalPaginasSocios = signal(1);
  protected readonly modoListadoSocios = signal<ModoListadoSocios>('todos');
  protected readonly lectorQrAbierto = signal(false);
  protected readonly lectorQrInicializando = signal(false);
  protected readonly mantenerLectorQrAbierto = signal(false);
  protected readonly opcionesModoListado: readonly SelectOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'ingresos', label: 'Ingresos' },
  ];
  protected readonly formatearDni = formatearDni;
  protected readonly obtenerIniciales = obtenerInicialesDesdeNombreApellido;
  protected readonly colorTextoInsignia = computed(() =>
    obtenerColorTextoContraste(
      obtenerColorMedioGradiente(
        this.colorTheme.colorPrimario(),
        this.colorTheme.colorSecundario(),
      ),
    ),
  );
  protected readonly colorBordeEstadoVacio = computed(() =>
    obtenerColorTextoContraste(this.themeMode.resolvedMode() === 'dark' ? '#101722' : '#f8fafc'),
  );
  protected readonly gradienteLectorQr =
    'linear-gradient(135deg, var(--color-primario), var(--color-secundario))';
  protected readonly colorTextoBotonQr = computed(() =>
    obtenerColorTextoContrasteGradiente(
      this.colorTheme.colorPrimario(),
      this.colorTheme.colorSecundario(),
    ),
  );
  protected readonly lectorQrActivo = computed(
    () => this.lectorQrAbierto() && !this.registrando(),
  );

  protected readonly ultimosTresIngresos = computed(() => this.presentes().slice(0, 3));
  protected readonly filasPresentes = computed<readonly FilaSocioAcceso[]>(() =>
    this.presentes()
      .filter(({ presente }) => presente)
      .map((presente) => ({
        memberUuid: presente.memberUuid ?? presente.userUuid,
        userUuid: presente.userUuid,
        nombre: presente.nombre,
        apellido: presente.apellido,
        dni: presente.dni,
      })),
  );
  protected readonly filasSocios = computed<readonly FilaSocioAcceso[]>(() => {
    if (this.modoListadoSocios() === 'todos') {
      return this.socios();
    }

    const busqueda = this.busquedaSocios().trim().toLocaleLowerCase();
    if (!busqueda) return this.filasPresentes();

    return this.filasPresentes().filter((socio) =>
      `${socio.nombre} ${socio.apellido} ${socio.dni ?? ''}`.toLocaleLowerCase().includes(busqueda),
    );
  });
  protected readonly cargandoListadoSocios = computed(() =>
    this.modoListadoSocios() === 'todos' ? this.cargandoSocios() : this.cargandoPresentes(),
  );
  private readonly usuariosPresentes = computed(
    () =>
      new Set(
        this.presentes()
          .filter(({ presente }) => presente)
          .map(({ userUuid }) => userUuid),
      ),
  );
  protected readonly feedLive = computed(() =>
    this.combinarAccesos(this.eventosLive(), this.historial())
      .sort((a, b) => timestampAcceso(b) - timestampAcceso(a))
      .slice(0, 5),
  );
  protected readonly filasHistorial = computed<readonly FilaHistorialAcceso[]>(() =>
    this.historial().map((acceso, indice) => ({
      uid: acceso.accesoUuid ?? `${acceso.userUuid}-${acceso.fecha ?? indice}-${acceso.tipo}`,
      persona: `${acceso.nombre ?? 'Persona'} ${acceso.apellido ?? ''}`.trim(),
      fecha: acceso.fecha ?? '—',
      tipo: acceso.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso',
    })),
  );
  protected readonly totalPaginasHistorial = computed(() =>
    Math.max(1, Math.ceil(this.filasHistorial().length / FILAS_HISTORIAL_POR_PAGINA)),
  );
  protected readonly historialPaginado = computed(() => {
    const inicio = (this.paginaHistorial() - 1) * FILAS_HISTORIAL_POR_PAGINA;
    return this.filasHistorial().slice(inicio, inicio + FILAS_HISTORIAL_POR_PAGINA);
  });

  protected readonly columnasHistorial: readonly ColumnaTabla<FilaHistorialAcceso>[] = [
    { id: 'tipo', titulo: 'Movimiento', tipo: 'estado' },
    { id: 'persona', titulo: 'Persona' },
    { id: 'fecha', titulo: 'Fecha y hora' },
  ];
  protected readonly columnasSocios: readonly ColumnaTabla<FilaSocioAcceso>[] = [
    { id: 'nombre', titulo: 'Nombre' },
    { id: 'apellido', titulo: 'Apellido' },
    { id: 'dni', titulo: 'DNI' },
  ];
  protected readonly accionesSocios: readonly AccionTabla<FilaSocioAcceso>[] = [
    {
      id: 'registrar-ingreso',
      texto: 'Registrar acceso',
      icono: 'heroArrowRightOnRectangle',
      color: 'var(--semantic-success)',
      visible: (socio) => !this.estaPresente(socio.userUuid),
      cargando: () => this.registrando(),
      deshabilitada: () => this.registrando(),
    },
    {
      id: 'registrar-egreso',
      texto: 'Registrar salida',
      icono: 'heroArrowLeftStartOnRectangle',
      color: 'var(--semantic-danger)',
      visible: (socio) => this.estaPresente(socio.userUuid),
      cargando: () => this.registrando(),
      deshabilitada: () => this.registrando(),
    },
  ];

  constructor() {
    this.api
      .observarEnVivo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ item, presenteCount }) => {
          this.eventosLive.update((eventos) => this.combinarAccesos([item], eventos).slice(0, 5));
          this.animarContador(presenteCount);
          this.cargarPresentes(false);
        },
        // Las consultas HTTP siguen disponibles como respaldo si se corta el stream.
        error: () => undefined,
      });

    queueMicrotask(() => {
      this.cargarPresentes();
      this.cargarHistorial();
      this.cargarSocios();
    });
  }

  ngOnDestroy(): void {
    if (this.contadorFrame !== null) {
      cancelAnimationFrame(this.contadorFrame);
    }
  }

  private registrar(userUuid: string, cerrarLectorQr = false): void {
    if (this.registrando()) return;
    if (!userUuid) {
      this.errorRegistro.set('El socio seleccionado no tiene una credencial disponible.');
      return;
    }

    this.registrando.set(true);
    this.errorRegistro.set('');
    this.api
      .registrar({ userUuid })
      .pipe(finalize(() => this.registrando.set(false)))
      .subscribe({
        next: (resultado) => {
          const tipo = resultado.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso';
          const persona = `${resultado.nombre ?? ''} ${resultado.apellido ?? ''}`.trim() || 'Persona';
          this.toast.success(`${persona} · ${formatearHoraAcceso(resultado.fecha)}`, {
            titulo: `${tipo} exitoso`,
            duracionMs: 4000,
            posicion: 'centrada',
          });
          if (cerrarLectorQr && !this.mantenerLectorQrAbierto()) this.cerrarLectorQr();
          this.cargarPresentes();
          this.cargarHistorial();
        },
        error: () =>
          this.errorRegistro.set(
            'No se pudo registrar el acceso. Verificá el estado del socio y sus permisos.',
          ),
      });
  }

  protected abrirLectorQr(): void {
    if (this.registrando() || this.lectorQrAbierto()) return;

    this.errorRegistro.set('');
    this.lectorQrInicializando.set(true);
    this.lectorQrAbierto.set(true);
  }

  protected cerrarLectorQr(): void {
    this.lectorQrInicializando.set(false);
    this.mantenerLectorQrAbierto.set(false);
    this.lectorQrAbierto.set(false);
  }

  protected actualizarMantenerLectorQrAbierto(evento: Event): void {
    this.mantenerLectorQrAbierto.set((evento.target as HTMLInputElement).checked);
  }

  protected actualizarEstadoLectorQr(estado: EstadoLectorQr): void {
    this.lectorQrInicializando.set(estado === 'iniciando');
  }

  protected procesarCodigoQr(contenido: string): void {
    if (this.registrando()) return;

    const userUuid = extraerUserUuidDeQr(contenido);
    if (!userUuid) {
      this.errorRegistro.set('El código no contiene un identificador válido.');
      return;
    }

    this.registrar(userUuid, !this.mantenerLectorQrAbierto());
  }

  protected actualizarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarPaginaHistorial(pagina: number): void {
    this.paginaHistorial.set(pagina);
  }

  protected actualizarBusquedaSocios(evento: Event): void {
    this.busquedaSocios.set((evento.target as HTMLInputElement).value);
  }

  protected buscarSocios(evento: SubmitEvent): void {
    evento.preventDefault();
    this.paginaSocios.set(1);
    if (this.modoListadoSocios() === 'todos') this.cargarSocios();
  }

  protected cambiarModoListado(valor: string): void {
    if (valor !== 'todos' && valor !== 'ingresos') return;

    this.modoListadoSocios.set(valor);
    this.paginaSocios.set(1);
    if (valor === 'ingresos') {
      this.cargarPresentes();
      return;
    }

    this.cargarSocios();
  }

  protected cambiarPaginaSocios(pagina: number): void {
    this.paginaSocios.set(pagina);
    this.cargarSocios();
  }

  protected seleccionarSocio(evento: EventoAccionTabla<FilaSocioAcceso>): void {
    if (!['registrar-ingreso', 'registrar-egreso'].includes(evento.accion)) return;
    this.registrar(evento.fila.userUuid?.trim() ?? '');
  }

  private estaPresente(userUuid: string | null | undefined): boolean {
    return Boolean(userUuid && this.usuariosPresentes().has(userUuid));
  }

  protected cargarPresentes(mostrarCarga = true): void {
    if (mostrarCarga) this.cargandoPresentes.set(true);
    this.errorPresentes.set('');
    this.api
      .listarPresentes()
      .pipe(
        finalize(() => {
          if (mostrarCarga) this.cargandoPresentes.set(false);
        }),
      )
      .subscribe({
        next: (items) => {
          const respuesta = normalizarPresentes(items);
          this.presentes.set(respuesta.presentes);
          this.animarContador(respuesta.count);
        },
        error: () => this.errorPresentes.set('No se pudo cargar quiénes están presentes.'),
      });
  }

  protected cargarHistorial(): void {
    if (!this.desde() || !this.hasta() || this.desde() > this.hasta()) {
      this.errorHistorial.set('El rango de fechas no es válido.');
      return;
    }

    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.api
      .obtenerHistorial(this.desde(), this.hasta())
      .pipe(finalize(() => this.cargandoHistorial.set(false)))
      .subscribe({
        next: (items) => {
          this.historial.set(items);
          this.paginaHistorial.set(1);
        },
        error: () => this.errorHistorial.set('No se pudo cargar el historial de accesos.'),
      });
  }

  private cargarSocios(): void {
    this.cargandoSocios.set(true);
    this.errorSocios.set('');
    this.sociosApi
      .paginar({
        page: this.paginaSocios(),
        size: 5,
        search: this.busquedaSocios().trim(),
        estados: ['ACTIVO', 'MOROSO'],
      })
      .pipe(finalize(() => this.cargandoSocios.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.socios.set(respuesta.content);
          this.totalPaginasSocios.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.errorSocios.set('No se pudieron cargar los socios disponibles.'),
      });
  }

  private animarContador(destino: number): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.personasAnimadas.set(destino);
      return;
    }

    if (this.contadorFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.contadorFrame);
    }

    const inicio = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duracion = 900;
    const actualizar = (ahora: number): void => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      this.personasAnimadas.set(Math.round(destino * (1 - Math.pow(1 - progreso, 3))));
      if (progreso < 1) this.contadorFrame = requestAnimationFrame(actualizar);
    };
    this.personasAnimadas.set(0);
    this.contadorFrame = requestAnimationFrame(actualizar);
  }

  private combinarAccesos(
    prioritarios: readonly AccesoClubDto[],
    existentes: readonly AccesoClubDto[],
  ): AccesoClubDto[] {
    const vistos = new Set<string>();
    return [...prioritarios, ...existentes].filter((acceso, indice) => {
      const clave =
        acceso.accesoUuid ?? `${acceso.userUuid}-${acceso.fecha ?? indice}-${acceso.tipo}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }
}
