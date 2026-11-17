import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import { SelectorSolapasComponent } from '../../components/selector-solapas/selector-solapas.component';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { DomicilioClubPayload, PerfilEmpresaDto, PerfilEmpresaPayload } from '../../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { FormularioRegistroFotoComponent, FormularioRegistroFotoValor } from '../../../auth/components/formulario-registro-foto/formulario-registro-foto.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { ColorModComponent } from '../../../ui/color-mod/color-mod.component';
import { ColorThemeService, PaletaGuardada } from '../../../ui/color-mod/color-theme.service';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';
import { PasoWizard, WizardPasosComponent } from '../../../ui/wizard-pasos/wizard-pasos.component';

type CampoDomicilio = keyof DomicilioClubPayload;
type NombreDomicilio = 'domicilio' | 'domicilioFacturacion';
type CampoPlazo = 'diasVencimientoCuota' | 'diasVencimientoMoroso' | 'diasInhabilitacion';
type DatosContacto = {
  readonly domicilio: DomicilioClubPayload;
  readonly domicilioFacturacion: DomicilioClubPayload;
  readonly telefono: string;
  readonly emailInstitucional: string;
};
type Plazos = Record<CampoPlazo, number>;

const DOMICILIO_VACIO: DomicilioClubPayload = { direccion: '', codigoPostal: '', localidad: '' };
const PLAZOS_PREDETERMINADOS: Plazos = {
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 31,
  diasInhabilitacion: 91,
};

@Component({
  selector: 'app-completar-perfil-page',
  standalone: true,
  imports: [SelectorSolapasComponent, BotonComponent, ColorModComponent, FormularioRegistroFotoComponent, LoadSpinnerBlueComponent, ValidacionFormularioDirective, WizardPasosComponent],
  templateUrl: './completar-perfil-page.component.html',
  styleUrl: './completar-perfil-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompletarPerfilPageComponent implements OnInit {
  private readonly menuSolapas = inject(MenuSolapasService);
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly sesion = inject(AuthSessionService);
  private readonly colores = inject(ColorThemeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pasos: readonly PasoWizard[] = [
    { id: 'contacto', etiqueta: 'Domicilios y contacto' },
    { id: 'plazos', etiqueta: 'Plazos de cuotas' },
    { id: 'identidad', etiqueta: 'Identidad del gimnasio' },
    { id: 'menu', etiqueta: 'Pantallas del menú' },
  ];
  protected readonly paso = signal(0);
  protected readonly pasoActual = computed(() => this.pasos[this.paso()].id);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly perfil = signal<PerfilEmpresaDto | null>(null);
  protected readonly contacto = signal<DatosContacto>({
    domicilio: { ...DOMICILIO_VACIO },
    domicilioFacturacion: { ...DOMICILIO_VACIO },
    telefono: '',
    emailInstitucional: '',
  });
  protected readonly plazos = signal<Plazos>({ ...PLAZOS_PREDETERMINADOS });
  protected readonly cuotaSocialHabilitada = signal<boolean | null>(null);
  protected readonly paleta = signal<PaletaGuardada | null>(null);
  protected readonly logo = signal<File | null>(null);
  protected readonly perfilGuardado = signal(false);
  /** Pantallas que el club elige no ver (las mismas que en Configuración › Menú y solapas). */
  protected readonly ocultasMenu = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.cargar();
    this.menuSolapas
      .asegurarCargado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ocultas) => this.ocultasMenu.set(new Set(ocultas)));
  }

  protected cargar(): void {
    const uuid = this.sesion.obtenerCompanyUuid().trim();
    if (!uuid) {
      this.error.set('No se encontró el gimnasio activo. Volvé a seleccionar un gimnasio.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.empresaApi.obtenerPerfil(uuid).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.contacto.set({
          domicilio: { ...DOMICILIO_VACIO, ...perfil.domicilio },
          domicilioFacturacion: { ...DOMICILIO_VACIO, ...perfil.domicilioFacturacion },
          telefono: perfil.telefono ?? '',
          emailInstitucional: perfil.emailInstitucional ?? '',
        });
        this.plazos.set({
          diasVencimientoCuota: perfil.diasVencimientoCuota ?? PLAZOS_PREDETERMINADOS.diasVencimientoCuota,
          diasVencimientoMoroso: perfil.diasVencimientoMoroso ?? PLAZOS_PREDETERMINADOS.diasVencimientoMoroso,
          diasInhabilitacion: perfil.diasInhabilitacion ?? PLAZOS_PREDETERMINADOS.diasInhabilitacion,
        });
        this.cuotaSocialHabilitada.set(perfil.cuotaSocialHabilitada);
        const actual = this.colores.obtenerPaletaPredeterminada();
        this.paleta.set({
          primario: this.esColor(perfil.colorPrimario) ? perfil.colorPrimario : actual.primario,
          secundario: this.esColor(perfil.colorSecundario) ? perfil.colorSecundario : actual.secundario,
          terciario: actual.terciario,
        });
      },
      error: () => this.error.set('No se pudo consultar el perfil del gimnasio. Reintentá la carga.'),
    });
  }

  protected actualizarDomicilio(nombre: NombreDomicilio, campo: CampoDomicilio, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = campo === 'codigoPostal' ? input.value.slice(0, 6) : input.value;
    input.value = valor;
    this.contacto.update((actual) => ({ ...actual, [nombre]: { ...actual[nombre], [campo]: valor } }));
  }

  protected actualizarContacto(campo: 'telefono' | 'emailInstitucional', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.contacto.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected actualizarPlazo(campo: CampoPlazo, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.plazos.update((actual) => ({ ...actual, [campo]: valor === '' ? Number.NaN : Number(valor) }));
  }

  protected actualizarCuota(evento: Event): void {
    this.cuotaSocialHabilitada.set((evento.target as HTMLInputElement).checked);
  }

  protected avanzar(): void {
    this.error.set('');
    if (this.paso() === 0 && !this.contactoValido()) {
      this.error.set('Completá ambos domicilios, el teléfono y un email institucional válido.');
      return;
    }
    if (this.paso() === 1 && !this.plazosValidos()) {
      this.error.set('Los plazos deben ser números enteros iguales o mayores a cero.');
      return;
    }
    if (this.paso() === 2) {
      if (this.cuotaSocialHabilitada() === null) {
        this.error.set('Indicá si el gimnasio cobrará cuota social.');
        return;
      }
      // Si no cobra cuota social, esa pantalla arranca destildada (y al revés). Igual se puede cambiar.
      this.ocultasMenu.update((actuales) => {
        const siguientes = new Set(actuales);
        if (this.cuotaSocialHabilitada()) siguientes.delete('cuota-social');
        else siguientes.add('cuota-social');
        return siguientes;
      });
    }
    if (this.paso() < 3) this.paso.update((actual) => actual + 1);
  }

  protected volver(): void {
    if (this.paso() > 0) {
      if (this.paso() === 2) this.paleta.set(this.colores.obtenerPaletaActual());
      this.error.set('');
      this.paso.update((actual) => actual - 1);
    }
  }

  protected prepararLogo(valor: FormularioRegistroFotoValor): void {
    this.logo.set(valor.foto);
    this.error.set('');
  }

  protected prepararPaleta(paleta: PaletaGuardada): void {
    this.paleta.set(paleta);
  }

  protected enviar(): void {
    if (this.guardando()) return;
    const actual = this.perfil();
    const uuid = this.sesion.obtenerCompanyUuid().trim();
    if (!actual || !uuid) return;
    if (!this.contactoValido() || !this.plazosValidos()) {
      this.error.set('Revisá los datos de contacto y los plazos antes de enviar.');
      return;
    }
    if (this.cuotaSocialHabilitada() === null) {
      this.error.set('Indicá si el gimnasio cobrará cuota social.');
      return;
    }

    // app-color-mod muestra una vista previa antes de confirmar; se toma la última selección.
    const paleta = this.colores.obtenerPaletaActual();
    this.paleta.set(paleta);
    if (!this.esColor(paleta.primario) || !this.esColor(paleta.secundario)) {
      this.error.set('Elegí dos colores válidos para el gimnasio.');
      return;
    }
    if (this.perfilGuardado()) {
      this.guardarMenuYLogo(uuid);
      return;
    }
    const payload: PerfilEmpresaPayload = {
      nombreComercial: actual.nombreComercial,
      razonSocial: actual.razonSocial,
      cuit: actual.cuit,
      path: actual.path,
      domicilio: this.limpiarDomicilio(this.contacto().domicilio),
      domicilioFacturacion: this.limpiarDomicilio(this.contacto().domicilioFacturacion),
      telefono: this.contacto().telefono.trim(),
      emailFacturaElectronica: actual.emailFacturaElectronica,
      emailInstitucional: this.contacto().emailInstitucional.trim(),
      colorPrimario: paleta.primario,
      colorSecundario: paleta.secundario,
      cuotaSocialHabilitada: this.cuotaSocialHabilitada()!,
      ...(actual.periodicidadCuotaSocial !== undefined
        ? { periodicidadCuotaSocial: actual.periodicidadCuotaSocial }
        : {}),
      ...this.plazos(),
    };
    this.error.set('');
    this.guardando.set(true);
    this.empresaApi.actualizarPerfil(uuid, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.perfilGuardado.set(true);
        this.guardarMenuYLogo(uuid);
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar el perfil. Revisá los datos y volvé a intentar.');
      },
    });
  }

  /** Guarda las pantallas elegidas y después sube el logo. Si falla el menú, sigue igual: se puede cambiar luego. */
  private guardarMenuYLogo(uuid: string): void {
    this.guardando.set(true);
    this.menuSolapas
      .guardar([...this.ocultasMenu()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.subirLogoSiCorresponde(uuid),
        error: () => this.subirLogoSiCorresponde(uuid),
      });
  }

  private subirLogoSiCorresponde(uuid: string): void {
    const archivo = this.logo();
    if (!archivo) {
      this.terminar();
      return;
    }
    this.guardando.set(true);
    this.empresaApi.subirLogo(uuid, archivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (empresa) => {
        if (!empresa.logoUrl?.trim()) {
          this.guardando.set(false);
          this.error.set('Se guardó el perfil, pero no se confirmó el logo. Volvé a intentar.');
          return;
        }
        this.sesion.actualizarCompanyLogoUrl(empresa.logoUrl);
        this.logo.set(null);
        this.terminar();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('Se guardó el perfil, pero falló la carga del logo. Volvé a intentar.');
      },
    });
  }

  private terminar(): void {
    this.guardando.set(false);
    void this.router.navigateByUrl('/admin/dashboard');
  }

  protected continuarSinLogo(): void {
    if (this.perfilGuardado()) this.terminar();
  }

  private contactoValido(): boolean {
    const { domicilio, domicilioFacturacion, telefono, emailInstitucional } = this.contacto();
    const domicilioValido = (valor: DomicilioClubPayload): boolean =>
      Boolean(valor.direccion.trim() && valor.codigoPostal.trim() && valor.localidad.trim());
    return domicilioValido(domicilio) && domicilioValido(domicilioFacturacion) &&
      Boolean(telefono.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInstitucional.trim());
  }

  private plazosValidos(): boolean {
    return Object.values(this.plazos()).every((valor) => Number.isInteger(valor) && valor >= 0);
  }

  private limpiarDomicilio(valor: DomicilioClubPayload): DomicilioClubPayload {
    return { direccion: valor.direccion.trim(), codigoPostal: valor.codigoPostal.trim(), localidad: valor.localidad.trim() };
  }

  private esColor(valor: string | null | undefined): valor is `#${string}` {
    return typeof valor === 'string' && /^#[\da-fA-F]{6}$/.test(valor);
  }
}
