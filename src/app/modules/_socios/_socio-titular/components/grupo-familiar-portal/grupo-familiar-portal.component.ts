import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  ActualizarPerfilPortalPayload,
  MiembroGrupoFamiliarDto,
} from '../../../../../core/api/interfaces/portal.interfaces';
import {
  AltaFamiliarPortalPayload,
} from '../../../../../core/api/interfaces/socios.interfaces';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { SociosApiService } from '../../../../../core/api/services/socios-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { formatearDni } from '../../../../../helpers/dni-formato';
import { formatearFechaCorta } from '../../../../../helpers/fecha-formato';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { CarnetCampo, CarnetComponent } from '../../../../ui/carnet/carnet.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { PerformanceModeService } from '../../../../ui/performance-mode.service';
import {
  EnvioFormularioGrupoFamiliar,
  FormularioGrupoFamiliarComponent,
  ModoFormularioGrupoFamiliar,
} from '../../forms/formulario-grupo-familiar/formulario-grupo-familiar.component';
import { CertificadosMedicosPortalComponent } from '../../../../_socios/components/certificados-medicos-portal/certificados-medicos-portal.component';

@Component({
  selector: 'app-grupo-familiar-portal',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    CarnetComponent,
    CertificadosMedicosPortalComponent,
    FormularioGrupoFamiliarComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './grupo-familiar-portal.component.html',
  styleUrl: './grupo-familiar-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrupoFamiliarPortalComponent implements OnDestroy {
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly sociosApi = inject(SociosApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly toastAlertService = inject(ToastAlertService);
  private timeoutError: ReturnType<typeof setTimeout> | null = null;

  protected readonly integrantes = signal<readonly FamiliarGrupoVista[]>([]);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly formularioVisible = signal(false);
  protected readonly modoFormulario = signal<ModoFormularioGrupoFamiliar>('alta');
  protected readonly familiarEdicion = signal<FamiliarGrupoVista | null>(null);
  protected readonly credencialSeleccionada = signal<FamiliarGrupoVista | null>(null);
  protected readonly familiarCertificados = signal<FamiliarGrupoVista | null>(null);
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly logoEmpresa = computed(() => this.authSessionService.companyLogoUrl().trim());

  protected readonly columnas: readonly ColumnaTabla<FamiliarGrupoVista>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(8rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(8rem, 1fr)' },
    { id: 'parentesco', titulo: 'Parentesco', ancho: '9rem' },
    {
      id: 'estadoVisual',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '12rem',
      estadoTexto: (estado) => this.etiquetaEstado(estado),
      estadoClase: (estado) =>
        this.estaPendienteConfirmacion(estado) ? 'tabla-responsive__estado--debe' : null,
    },
  ];
  protected readonly acciones: readonly AccionTabla<FamiliarGrupoVista>[] = [
    {
      id: 'credencial',
      texto: 'Ver credencial',
      icono: 'heroIdentification',
      color: 'var(--color-primario)',
      deshabilitada: (familiar) => this.estaPendienteConfirmacion(familiar.estadoVisual),
      descripcionDeshabilitada: 'Pendiente de confirmación.',
    },
    {
      predefinida: 'editar',
      deshabilitada: (familiar) => this.estaPendienteConfirmacion(familiar.estadoVisual),
      descripcionDeshabilitada: 'Pendiente de confirmación.',
    },
    {
      id: 'certificados',
      texto: 'Certificados',
      icono: 'heroDocumentText',
      color: 'var(--color-secundario)',
      deshabilitada: (familiar) => this.estaPendienteConfirmacion(familiar.estadoVisual),
      descripcionDeshabilitada: 'Pendiente de confirmación.',
    },
  ];

  constructor() {
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.timeoutError) {
      clearTimeout(this.timeoutError);
    }
  }

  protected abrirFormulario(): void {
    this.error.set('');
    this.modoFormulario.set('alta');
    this.familiarEdicion.set(null);
    this.formularioVisible.set(true);
  }

  protected abrirEdicion(familiar: FamiliarGrupoVista): void {
    this.error.set('');
    this.modoFormulario.set('edicion');
    this.familiarEdicion.set(familiar);
    this.formularioVisible.set(true);
  }

  protected cerrarFormulario(): void {
    if (this.enviando()) {
      return;
    }

    this.formularioVisible.set(false);
    this.familiarEdicion.set(null);
    this.error.set('');
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.portalApi
      .obtenerGrupoFamiliar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (grupo) => {
          const familiares = grupo.integrantes
            .filter((integrante) => !integrante.member.titular)
            .map((integrante) => {
              const miembro = integrante.member as MiembroGrupoFamiliarDto & {
                readonly status?: unknown;
              };

              return {
                ...miembro,
                estadoVisual: this.estaPendienteConfirmacion(miembro.status)
                  ? miembro.status
                  : miembro.estado,
                userUuid: integrante.userUuid,
                qr: integrante.qr,
              };
            });
          this.integrantes.set(familiares);
          const seleccionado = this.familiarCertificados();
          if (seleccionado) {
            this.familiarCertificados.set(
              familiares.find((familiar) => familiar.memberUuid === seleccionado.memberUuid) ?? null,
            );
          }
        },
        error: () => this.mostrarError('No se pudo cargar el grupo familiar.'),
      });
  }

  protected guardar(evento: EnvioFormularioGrupoFamiliar): void {
    if (this.enviando()) {
      return;
    }

    if (evento.modo === 'edicion') {
      this.guardarEdicion(evento.datos);
      return;
    }

    this.enviando.set(true);
    this.error.set('');
    this.sociosApi
      .crearFamiliarDesdePortal(evento.datos)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.formularioVisible.set(false);
          this.cargar();
          this.toastAlertService.encolarInfo('El familiar aparecerá cuando se confirme la solicitud.', {
            titulo: 'Solicitud pendiente',
          });
        },
        error: () => {
          this.formularioVisible.set(false);
          this.mostrarError('No se pudo crear la solicitud del familiar.');
        },
      });
  }

  protected manejarAccion(evento: EventoAccionTabla<FamiliarGrupoVista>): void {
    switch (evento.accion) {
      case 'credencial':
        this.credencialSeleccionada.set(evento.fila);
        break;
      case 'editar':
        this.abrirEdicion(evento.fila);
        break;
      case 'certificados':
        this.familiarCertificados.set(evento.fila);
        break;
    }
  }

  protected cerrarCredencial(): void {
    this.credencialSeleccionada.set(null);
  }

  protected cerrarCertificados(): void {
    this.familiarCertificados.set(null);
  }

  protected actualizarCertificados(): void {
    this.cargar();
  }

  protected camposCredencial(familiar: FamiliarGrupoVista): readonly CarnetCampo[] {
    return [
      { etiqueta: 'DNI', valor: formatearDni(familiar.dni ?? '') || '-' },
      { etiqueta: 'Parentesco', valor: familiar.parentesco?.trim() || '-' },
      { etiqueta: 'Mail', valor: familiar.email?.trim() || '-' },
      { etiqueta: 'Alta', valor: formatearFechaCorta(familiar.fechaAlta) },
    ];
  }

  private estaPendienteConfirmacion(estado: unknown): boolean {
    return estado === -2 || estado === '-2';
  }

  private etiquetaEstado(estado: unknown): string {
    return this.estaPendienteConfirmacion(estado) ? 'Pendiente de confirmación' : String(estado ?? '');
  }

  private mostrarError(mensaje: string): void {
    if (this.timeoutError) {
      clearTimeout(this.timeoutError);
    }

    this.error.set(mensaje);
    this.timeoutError = setTimeout(() => {
      this.error.set('');
      this.timeoutError = null;
    }, 5000);
  }

  private guardarEdicion(payload: ActualizarPerfilPortalPayload): void {
    const familiar = this.familiarEdicion();
    if (!familiar) {
      return;
    }

    this.enviando.set(true);
    this.error.set('');
    this.portalApi
      .actualizarPerfil(payload, familiar.memberUuid)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.formularioVisible.set(false);
          this.familiarEdicion.set(null);
          this.cargar();
        },
        error: () => this.mostrarError('No se pudo actualizar el familiar.'),
      });
  }

}

interface FamiliarGrupoVista extends MiembroGrupoFamiliarDto {
  /** Normaliza los nombres `status` y `estado` que puede devolver el backend. */
  readonly estadoVisual: unknown;
  readonly userUuid: string;
  readonly qr: string;
}
