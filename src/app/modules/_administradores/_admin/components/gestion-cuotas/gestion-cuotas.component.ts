import { ActivatedRoute } from "@angular/router";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from "@angular/core";
import { NgIcon, provideIcons } from "@ng-icons/core";
import {
  heroBanknotes,
  heroEnvelope,
  heroEye,
  heroTrash,
} from "@ng-icons/heroicons/outline";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, finalize, of } from "rxjs";

import { formatearMoneda } from "../../../../../helpers/moneda-formato";
import {
  formatearEstadoTabla,
  obtenerClaseEstadoTabla,
} from "../../../../../helpers/tabla-estado.helpers";
import {
  CuotaDetalleDto,
  CuotaRowDto,
  EstadoCuota,
  MedioPagoManual,
  TipoCuota,
} from "../../../../../core/api/interfaces/tesoreria.interfaces";
import { TesoreriaApiService } from "../../../../../core/api/services/tesoreria-api.service";
import { EmpresaApiService } from "../../../../../core/api/services/empresa-api.service";
import { AuthSessionService } from "../../../../../core/global-services/services/auth-session.service";
import { BotonComponent } from "../../../../ui/boton/boton.component";
import { CardComponent } from "../../../../ui/card/card.component";
import { PaginacionComponent } from "../../../../ui/paginacion/paginacion.component";
import { PopupComponent } from "../../../../ui/popup/popup.component";
import {
  SelectComponent,
  SelectOption,
} from "../../../../ui/select/select.component";
import {
  AccionCabeceraTabla,
  ColumnaTabla,
  TablaResponsiveComponent,
} from "../../../../ui/tabla-responsive/tabla-responsive.component";
import { ToastAlertService } from "../../../../ui/toast-alert/services/toast-alert.service";
import { TituloHeroComponent } from "../../../../ui/titulo-hero/titulo-hero.component";
import { FormularioAnulacionComponent } from "../../forms/formulario-anulacion/formulario-anulacion.component";
import {
  ContactoEmpresaNotificacion,
  FormularioNotificacionMoraComponent,
  NotificacionMoraPayload,
} from "../../forms/formulario-notificacion-mora/formulario-notificacion-mora.component";
import { PopupCobroCuotasComponent } from "../popup-cobro-cuotas/popup-cobro-cuotas.component";

type CuotaFila = CuotaRowDto & {
  readonly persona: string;
  readonly titular: string;
};
@Component({
  selector: "app-gestion-cuotas",
  imports: [
    BotonComponent,
    CardComponent,
    FormularioAnulacionComponent,
    FormularioNotificacionMoraComponent,
    NgIcon,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
    PopupCobroCuotasComponent,
  ],
  providers: [
    provideIcons({ heroBanknotes, heroEnvelope, heroEye, heroTrash }),
  ],
  templateUrl: "./gestion-cuotas.component.html",
  styleUrl: "./gestion-cuotas.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCuotasComponent {
  private readonly api = inject(TesoreriaApiService);
  private readonly empresaApi = inject(EmpresaApiService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastAlertService);
  private readonly authSession = inject(AuthSessionService);

  protected readonly cuotas = signal<readonly CuotaFila[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly totalElementos = signal(0);
  protected readonly busqueda = signal("");
  protected readonly estado = signal<EstadoCuota | "">("");
  protected readonly tipo = signal<TipoCuota | "">("");
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal("");
  protected readonly detalle = signal<CuotaDetalleDto | null>(null);
  protected readonly cuotaAnular = signal<CuotaFila | null>(null);
  /** Solo cuotas de actividad: null mientras no se eligió si también se da de baja la inscripción. */
  protected readonly bajaActividad = signal<boolean | null>(null);
  protected readonly cuotaNotificacion = signal<CuotaFila | null>(null);
  protected readonly direccionEmpresa = signal("");
  protected readonly popupNuevoCobroAbierto = signal(false);
  protected readonly puedeNotificarMorosos = computed(() =>
    this.tienePermisoNotificarMorosos(),
  );
  protected readonly contactoEmpresa = computed<ContactoEmpresaNotificacion>(
    () => {
      const usuario = this.authSession.obtenerUsuario();
      const companyUuid = this.authSession.obtenerCompanyUuid();
      const asignaciones = usuario?.userCompanyRoles ?? [];
      const empresa = companyUuid
        ? asignaciones.find(
            (asignacion) => asignacion.companyUuid?.trim() === companyUuid,
          )
        : asignaciones.length === 1
          ? asignaciones[0]
          : undefined;

      return {
        nombre:
          empresa?.companyName?.trim() ||
          this.authSession.obtenerCompanyName() ||
          "El gimnasio",
        direccion: this.direccionEmpresa() || null,
        email: empresa?.emailInstitucional?.trim() || null,
        telefono: empresa?.telefono?.trim() || null,
      };
    },
  );
  protected readonly opcionesEstado: readonly SelectOption[] = [
    { value: "", label: "Todos" },
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "VENCIDA", label: "Vencida" },
    { value: "PAGADA", label: "Pagada" },
    { value: "ANULADA", label: "Anulada" },
  ];
  protected readonly opcionesTipo: readonly SelectOption[] = [
    { value: "", label: "Todos" },
    { value: "SOCIAL", label: "Social" },
    { value: "ACTIVIDAD", label: "Actividad" },
    { value: "PASE", label: "Pase / membresía" },
  ];
  protected readonly accionesCabecera: readonly AccionCabeceraTabla[] = [
    { id: "nuevo-cobro", texto: "Nuevo cobro", abreDialogo: true },
  ];

  protected readonly columnas: readonly ColumnaTabla<CuotaFila>[] = [
    { id: "persona", titulo: "Persona", tipo: "texto" },
    { id: "concepto", titulo: "Concepto", tipo: "texto" },
    { id: "tipo", titulo: "Tipo", tipo: "texto" },
    {
      id: "monto",
      titulo: "Monto",
      tipo: "moneda",
      celdaClase: (monto, cuota) => {
        const montoOriginal = Number(monto);
        const montoFinal = Number(cuota.montoFinal);
        return cuota.montoFinal !== null &&
          cuota.montoFinal !== undefined &&
          Number.isFinite(montoOriginal) &&
          Number.isFinite(montoFinal) &&
          montoFinal < montoOriginal
          ? "tabla-responsive__texto--monto-reemplazado"
          : null;
      },
    },
    {
      id: "montoFinal",
      titulo: "Monto final",
      tipo: "moneda",
      formatearTexto: (valor) => formatearMoneda(Number(valor) || 0),
      celdaColor: () => "var(--semantic-success, #16a34a)",
    },
    { id: "vencimiento", titulo: "Vencimiento", tipo: "fecha" },
    { id: "diasMora", titulo: "Días de mora", tipo: "numero" },
    {
      id: "estado",
      titulo: "Estado",
      tipo: "estado",
      estadoClase: (estado) =>
        estado === "VENCIDA"
          ? "tabla-responsive__estado--vencida"
          : obtenerClaseEstadoTabla(estado, estado === "PAGADA"),
    },
    { id: "titular", titulo: "Titular", tipo: "texto" },
  ];

  constructor() {
    // Atajos del inicio: ?accion=cobrar abre el cobro; ?estado=VENCIDA muestra quién debe.
    const params = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap;
    const estado = params?.get("estado");
    if (estado === "VENCIDA" || estado === "PENDIENTE" || estado === "PAGADA") this.estado.set(estado);
    if (params?.get("accion") === "cobrar") this.popupNuevoCobroAbierto.set(true);
    this.cargar();
  }

  protected filtrar(): void {
    this.pagina.set(1);
    this.cargar();
  }
  protected cambiarEstado(estado: string): void {
    this.estado.set(estado as EstadoCuota | "");
    this.filtrar();
  }
  protected cambiarTipo(tipo: string): void {
    this.tipo.set(tipo as TipoCuota | "");
    this.filtrar();
  }
  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }
  protected manejarAccionCabecera(accion: string): void {
    if (accion === "nuevo-cobro") this.popupNuevoCobroAbierto.set(true);
  }
  protected cerrarNuevoCobro(): void {
    this.popupNuevoCobroAbierto.set(false);
  }
  protected actualizarDespuesDeCobro(): void {
    this.cargar();
  }
  /** Atajo de la fila: abre el cobro con toda la deuda de esa persona marcada (no solo esta cuota). */
  protected abrirCobroCuota(cuota: CuotaFila, wizard: PopupCobroCuotasComponent): void {
    wizard.iniciarConSocioDeCuota(cuota);
    this.popupNuevoCobroAbierto.set(true);
  }
  protected abrirNotificacion(cuota: CuotaFila): void {
    if (cuota.estado !== "VENCIDA" || !this.puedeNotificarMorosos()) return;
    this.cuotaNotificacion.set(cuota);
    this.cargarDireccionEmpresa();
  }

  private cargarDireccionEmpresa(): void {
    const companyUuid = this.authSession.obtenerCompanyUuid().trim();
    if (!companyUuid || !this.empresaApi || this.direccionEmpresa()) return;

    this.empresaApi
      .obtenerPerfil(companyUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((perfil) => {
        const domicilio = perfil?.domicilio;
        const partes = [
          domicilio?.direccion,
          domicilio?.localidad,
          domicilio?.codigoPostal,
        ]
          .map((parte) => parte?.trim())
          .filter((parte): parte is string => Boolean(parte));
        this.direccionEmpresa.set(partes.join(", "));
      });
  }
  protected cerrarNotificacion(): void {
    this.cuotaNotificacion.set(null);
  }
  protected abrirCanalNotificacion(payload: NotificacionMoraPayload): void {
    if (typeof window === "undefined") return;

    if (payload.canal === "EMAIL") {
      window.location.href = `mailto:${encodeURIComponent(payload.destinatario)}?subject=${encodeURIComponent(payload.asunto)}&body=${encodeURIComponent(payload.mensaje)}`;
    } else {
      window.open(
        `https://wa.me/${payload.destinatario}?text=${encodeURIComponent(payload.mensaje)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
    this.cerrarNotificacion();
  }
  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  protected formatearAnuladaPor(cuota: CuotaDetalleDto): string {
    return [cuota.anuladaPorNombre, cuota.anuladaPorApellido]
      .map((valor) => valor?.trim())
      .filter((valor): valor is string => !!valor)
      .join(" ") || "Sin información";
  }

  protected montoFinalDifiere(cuota: CuotaDetalleDto): boolean {
    return (
      typeof cuota.montoFinal === "number" &&
      Number.isFinite(cuota.montoFinal) &&
      cuota.montoFinal !== cuota.monto
    );
  }

  protected formatearEstado(estado: EstadoCuota): string {
    return formatearEstadoTabla(estado);
  }

  protected abrirAnulacion(cuota: CuotaFila): void {
    this.bajaActividad.set(null);
    this.cuotaAnular.set(cuota);
  }

  protected cerrarAnulacion(): void {
    this.cuotaAnular.set(null);
    this.bajaActividad.set(null);
  }

  protected anularCuota(payload: { readonly motivo: string }): void {
    const cuota = this.cuotaAnular();
    if (!cuota || this.procesando()) return;
    this.procesando.set(true);
    this.error.set("");
    this.api
      .anularCuota(cuota.cuotaUuid, { ...payload, darDeBajaActividad: cuota.tipo === "ACTIVIDAD" && this.bajaActividad() === true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.cerrarAnulacion();
          this.cargar();
        },
        error: () =>
          this.error.set("No se pudo anular la cuota. El motivo se conservó."),
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set("");
    this.api
      .paginarCuotas({
        page: this.pagina(),
        size: 20,
        ...(this.busqueda().trim() ? { search: this.busqueda().trim() } : {}),
        ...(this.estado() ? { estados: [this.estado() as EstadoCuota] } : {}),
        ...(this.tipo() ? { tipos: [this.tipo() as TipoCuota] } : {}),
        orden: "VENCIMIENTO_ASC",
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.cuotas.set(
            respuesta.content.map((cuota) => ({
              ...cuota,
              persona:
                `${cuota.personaApellido ?? ""}, ${cuota.personaNombre ?? ""}`.replace(
                  /^, /,
                  "",
                ),
              titular:
                `${cuota.titularApellido ?? ""}, ${cuota.titularNombre ?? ""}`.replace(
                  /^, /,
                  "",
                ),
            })),
          );
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
          this.totalElementos.set(respuesta.totalElements);
        },
        error: () => this.error.set("No se pudieron cargar las cuotas."),
      });
  }

  protected cargarDetalle(uuid: string): void {
    this.api
      .obtenerCuota(uuid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => this.detalle.set(detalle),
        error: () =>
          this.error.set("No se pudo cargar el detalle de la cuota."),
      });
  }

  private tienePermisoNotificarMorosos(): boolean {
    const usuario = this.authSession.obtenerUsuario();
    const companyUuid = this.authSession.obtenerCompanyUuid();
    const asignaciones = usuario?.userCompanyRoles ?? [];
    const empresa = companyUuid
      ? asignaciones.find(
          (asignacion) => asignacion.companyUuid?.trim() === companyUuid,
        )
      : asignaciones.length === 1
        ? asignaciones[0]
        : undefined;

    return (
      empresa?.roles?.some((rol) =>
        rol.permissions?.some(
          (permiso) => permiso.name?.trim() === "treasury.notify_delinquent",
        ),
      ) ?? false
    );
  }
}
