import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';
import { extraerMensajeErrorApi } from '../../../../core/api/error-api';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { TEMPLATE_STARTER_CONFIG } from '../../../../template-starter.config';
import {
  FormularioRegistroFotoComponent,
  FormularioRegistroFotoValor,
} from '../../../auth/components/formulario-registro-foto/formulario-registro-foto.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { DarkModeComponent } from '../../../ui/dark-mode/dark-mode.component';
import { LetraGrandeComponent } from '../../../ui/letra-grande/letra-grande.component';
import { LoadSpinnerComponent } from '../../../ui/load-spinner/load-spinner.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { ContadorComponent } from '../../../ui/contador/contador.component';

@Component({
  selector: 'app-header',
  imports: [
    BotonComponent,
    ContadorComponent,
    DarkModeComponent,
    LetraGrandeComponent,
    FormularioRegistroFotoComponent,
    LoadSpinnerComponent,
    NgIcon,
    NgOptimizedImage,
    PopupComponent,
    TituloHeroComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly menuSolapas = inject(MenuSolapasService);
  /** El contador "en el club" se puede apagar desde Configuración › Menú y solapas. */
  protected readonly mostrarContador = this.menuSolapas.mostrarContadorEnClub;
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastAlertService);
  private readonly appName = TEMPLATE_STARTER_CONFIG.appName;

  protected readonly fotoCargando = signal(false);
  protected readonly fotoConError = signal(false);
  protected readonly fotoPopupAbierto = signal(false);
  protected readonly procesandoFoto = signal(false);
  protected readonly mensajeErrorFoto = signal('');
  protected readonly usuarioSesion = computed(() => this.authService.obtenerUsuarioGuardado());
  protected readonly etiquetaBase = this.appName;
  protected readonly saludoUsuario = computed(() => {
    const usuario = this.usuarioSesion();
    const usuarioAnidado =
      usuario && typeof usuario['user'] === 'object' && usuario['user'] !== null
        ? (usuario['user'] as Record<string, unknown>)
        : null;
    const nombreDirecto = typeof usuario?.nombre === 'string' ? usuario.nombre.trim() : '';
    const nombreAnidado =
      usuarioAnidado && typeof usuarioAnidado['nombre'] === 'string'
        ? usuarioAnidado['nombre'].trim()
        : '';
    const nombre = nombreDirecto || nombreAnidado;
    return nombre ? `Hola ${nombre}` : this.etiquetaBase;
  });
  protected readonly inicialesUsuario = computed(() => {
    const usuario = this.usuarioSesion();
    const usuarioAnidado =
      usuario && typeof usuario['user'] === 'object' && usuario['user'] !== null
        ? (usuario['user'] as Record<string, unknown>)
        : null;
    const nombre = typeof usuario?.nombre === 'string' ? usuario.nombre.trim() : '';
    const apellido = typeof usuario?.apellido === 'string' ? usuario.apellido.trim() : '';
    const nombreAnidado = usuarioAnidado && typeof usuarioAnidado['nombre'] === 'string'
      ? usuarioAnidado['nombre'].trim()
      : '';
    const apellidoAnidado = usuarioAnidado && typeof usuarioAnidado['apellido'] === 'string'
      ? usuarioAnidado['apellido'].trim()
      : '';
    const origen = [nombre || nombreAnidado, apellido || apellidoAnidado].filter(Boolean).join(' ').trim();
    if (!origen) {
      return '';
    }

    return origen
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly imagenUsuario = computed(() => {
    const usuario = this.usuarioSesion();
    const usuarioAnidado =
      usuario && typeof usuario['user'] === 'object' && usuario['user'] !== null
        ? (usuario['user'] as Record<string, unknown>)
        : null;

    const directa = typeof usuario?.imageUrl === 'string' ? usuario.imageUrl.trim() : '';
    const anidada = usuarioAnidado && typeof usuarioAnidado['imageUrl'] === 'string'
      ? usuarioAnidado['imageUrl'].trim()
      : '';

    return directa || anidada || '';
  });
  protected readonly imagenUsuarioDisponible = computed(() => !!this.imagenUsuario() && !this.fotoConError());

  constructor() {
    effect(() => {
      const imagen = this.imagenUsuario();
      this.fotoConError.set(false);
      this.fotoCargando.set(!!imagen);
    });
  }

  protected manejarFotoCargada(): void {
    this.fotoCargando.set(false);
    this.fotoConError.set(false);
  }

  protected manejarFotoError(): void {
    this.fotoCargando.set(false);
    this.fotoConError.set(true);
  }

  protected abrirFotoPerfil(): void {
    this.mensajeErrorFoto.set('');
    this.fotoPopupAbierto.set(true);
  }

  protected cerrarFotoPerfil(): void {
    if (this.procesandoFoto()) return;

    this.fotoPopupAbierto.set(false);
    this.mensajeErrorFoto.set('');
  }

  protected guardarFotoPerfil(valor: FormularioRegistroFotoValor): void {
    if (this.procesandoFoto()) return;

    this.procesandoFoto.set(true);
    this.mensajeErrorFoto.set('');
    this.authService
      .subirFotoPerfil(valor.foto)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoFoto.set(false)),
      )
      .subscribe({
        next: () => this.cerrarTrasMutacionFoto(),
        error: (error: unknown) =>
          this.mensajeErrorFoto.set(
            this.obtenerMensajeError(error, 'No se pudo guardar la foto de perfil.'),
          ),
      });
  }

  protected async eliminarFotoPerfil(): Promise<void> {
    if (this.procesandoFoto() || !this.imagenUsuario()) return;

    // La confirmación no debe competir por la capa superior con el diálogo nativo.
    this.fotoPopupAbierto.set(false);
    await new Promise<void>((resolver) => setTimeout(resolver, 0));

    const confirmado = await this.toast.confirmDanger(
      '¿Eliminar tu foto de perfil? Se mostrarán tus iniciales en su lugar.',
      {
        titulo: 'Eliminar foto de perfil',
        textoConfirmar: 'Eliminar foto',
      },
    );
    if (!confirmado || this.procesandoFoto()) {
      this.fotoPopupAbierto.set(true);
      return;
    }

    this.procesandoFoto.set(true);
    this.mensajeErrorFoto.set('');
    this.authService
      .eliminarFotoPerfil()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoFoto.set(false)),
      )
      .subscribe({
        next: () => this.cerrarTrasMutacionFoto(),
        error: (error: unknown) => {
          this.fotoPopupAbierto.set(true);
          this.mensajeErrorFoto.set(
            this.obtenerMensajeError(error, 'No se pudo eliminar la foto de perfil.'),
          );
        },
      });
  }

  private cerrarTrasMutacionFoto(): void {
    this.fotoPopupAbierto.set(false);
    this.mensajeErrorFoto.set('');
  }

  private obtenerMensajeError(error: unknown, mensajePredeterminado: string): string {
    return extraerMensajeErrorApi(error, mensajePredeterminado);
  }
}
