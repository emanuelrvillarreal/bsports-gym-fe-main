import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  DomicilioClubPayload,
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../../../core/api/interfaces/empresa.interfaces';
import {
  OPCIONES_PERIODICIDAD_CUOTA,
  PERIODICIDAD_CUOTA_PREDETERMINADA,
  type PeriodicidadCuota,
} from '../../../../../core/api/interfaces/periodicidad-cuota.interfaces';
import { formatearCuil, limpiarCuil } from '../../../../../helpers/cuil-formato';
import { formatearTelefono, limpiarTelefono } from '../../../../../helpers/telefono-formato';
import { SelectComponent, type SelectOption } from '../../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

type CampoTextoPerfil =
  | 'path'
  | 'nombreComercial'
  | 'razonSocial'
  | 'cuit'
  | 'telefono'
  | 'emailFacturaElectronica'
  | 'emailInstitucional'
  | 'colorPrimario'
  | 'colorSecundario';

type CampoDomicilio = 'direccion' | 'codigoPostal' | 'localidad';
type ClaveDomicilio = 'domicilio' | 'domicilioFacturacion';
type CampoNumeroPerfil = 'diasVencimientoMoroso' | 'diasInhabilitacion';

export type PerfilClubEdicionPayload = PerfilEmpresaPayload;

@Component({
  selector: 'app-formulario-perfil-club',
  standalone: true,
  imports: [SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-perfil-club.component.html',
  styleUrl: './formulario-perfil-club.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioPerfilClubComponent implements OnDestroy {
  readonly perfil = input<PerfilEmpresaDto | null>(null);
  readonly duracionErrorMs = input(5000);
  readonly enviado = output<PerfilClubEdicionPayload>();

  protected readonly path = signal('');
  protected readonly nombreComercial = signal('');
  protected readonly razonSocial = signal('');
  protected readonly cuit = signal('');
  protected readonly telefono = signal('');
  protected readonly emailFacturaElectronica = signal('');
  protected readonly emailInstitucional = signal('');
  protected readonly colorPrimario = signal('#003366');
  protected readonly colorSecundario = signal('#ffffff');
  protected readonly cuotaSocialHabilitada = signal(false);
  protected readonly periodicidadCuotaSocial = signal<PeriodicidadCuota>(
    PERIODICIDAD_CUOTA_PREDETERMINADA,
  );
  protected readonly opcionesPeriodicidadCuota: readonly SelectOption[] =
    OPCIONES_PERIODICIDAD_CUOTA.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta }));
  protected readonly diasVencimientoMoroso = signal<number | null>(null);
  protected readonly diasInhabilitacion = signal<number | null>(null);

  protected readonly domicilioDireccion = signal('');
  protected readonly domicilioCodigoPostal = signal('');
  protected readonly domicilioLocalidad = signal('');
  protected readonly facturacionDireccion = signal('');
  protected readonly facturacionCodigoPostal = signal('');
  protected readonly facturacionLocalidad = signal('');

  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => this.precargar(this.perfil()));
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(campo: CampoTextoPerfil, evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    let valor = elemento.value;
    if (campo === 'cuit') {
      valor = formatearCuil(valor);
      elemento.value = valor;
    } else if (campo === 'telefono') {
      valor = formatearTelefono(valor);
      elemento.value = valor;
    }
    this[campo].set(valor);
  }

  protected actualizarDireccion(clave: ClaveDomicilio, campo: CampoDomicilio, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = campo === 'codigoPostal' ? input.value.slice(0, 6) : input.value;
    input.value = valor;
    const senal = {
      domicilio: {
        direccion: this.domicilioDireccion,
        codigoPostal: this.domicilioCodigoPostal,
        localidad: this.domicilioLocalidad,
      },
      domicilioFacturacion: {
        direccion: this.facturacionDireccion,
        codigoPostal: this.facturacionCodigoPostal,
        localidad: this.facturacionLocalidad,
      },
    }[clave][campo];
    senal.set(valor);
  }

  protected actualizarCuota(evento: Event): void {
    this.cuotaSocialHabilitada.set((evento.target as HTMLInputElement).checked);
  }

  protected actualizarPeriodicidadCuota(valor: string): void {
    const opcion = OPCIONES_PERIODICIDAD_CUOTA.find((item) => item.valor === valor);
    if (opcion) this.periodicidadCuotaSocial.set(opcion.valor);
  }

  protected actualizarNumero(campo: CampoNumeroPerfil, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this[campo].set(valor === '' ? null : Number(valor));
  }

  protected emailEsValido(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
  }

  protected enviar(): void {
    const perfil = this.crearPayload();
    if (!this.validar(perfil)) return;

    this.limpiarError();
    this.enviado.emit(perfil);
  }

  private crearPayload(): PerfilClubEdicionPayload {
    return {
      path: this.path().trim(),
      nombreComercial: this.nombreComercial().trim(),
      razonSocial: this.razonSocial().trim(),
      cuit: limpiarCuil(this.cuit()),
      domicilio: this.crearDomicilio(
        this.domicilioDireccion(),
        this.domicilioCodigoPostal(),
        this.domicilioLocalidad(),
      ),
      domicilioFacturacion: this.crearDomicilio(
        this.facturacionDireccion(),
        this.facturacionCodigoPostal(),
        this.facturacionLocalidad(),
      ),
      telefono: limpiarTelefono(this.telefono()),
      emailFacturaElectronica: this.emailFacturaElectronica().trim().toLowerCase(),
      emailInstitucional: this.emailInstitucional().trim().toLowerCase(),
      colorPrimario: this.colorPrimario().trim(),
      colorSecundario: this.colorSecundario().trim(),
      cuotaSocialHabilitada: this.cuotaSocialHabilitada(),
      periodicidadCuotaSocial: this.periodicidadCuotaSocial(),
      ...(this.diasVencimientoMoroso() !== null
        ? { diasVencimientoMoroso: this.diasVencimientoMoroso() ?? undefined }
        : {}),
      ...(this.diasInhabilitacion() !== null
        ? { diasInhabilitacion: this.diasInhabilitacion() ?? undefined }
        : {}),
    };
  }

  private validar(perfil: PerfilEmpresaPayload): boolean {
    const domicilios = [perfil.domicilio, perfil.domicilioFacturacion];
    const faltanDomicilios = domicilios.some(
      (domicilio) => !domicilio.direccion || !domicilio.codigoPostal || !domicilio.localidad,
    );
    if (
      !perfil.path ||
      !perfil.nombreComercial ||
      !perfil.razonSocial ||
      !/^\d{11}$/.test(perfil.cuit) ||
      !perfil.telefono ||
      !perfil.emailFacturaElectronica ||
      !perfil.emailInstitucional ||
      faltanDomicilios
    ) {
      this.mostrarError('Completa todos los campos obligatorios del perfil.');
      return false;
    }
    if (
      !this.emailEsValido(perfil.emailFacturaElectronica) ||
      !this.emailEsValido(perfil.emailInstitucional)
    ) {
      this.mostrarError('Ingresa emails validos.');
      return false;
    }
    if (
      !/^#[0-9a-f]{6}$/i.test(perfil.colorPrimario) ||
      !/^#[0-9a-f]{6}$/i.test(perfil.colorSecundario)
    ) {
      this.mostrarError('Los colores deben tener formato hexadecimal.');
      return false;
    }
    return true;
  }

  private precargar(perfil: PerfilEmpresaDto | null): void {
    this.path.set(perfil?.path?.trim() || this.generarPath(perfil?.nombreComercial ?? ''));
    this.nombreComercial.set(perfil?.nombreComercial ?? '');
    this.razonSocial.set(perfil?.razonSocial ?? '');
    this.cuit.set(formatearCuil(perfil?.cuit ?? ''));
    this.telefono.set(formatearTelefono(perfil?.telefono ?? ''));
    this.emailFacturaElectronica.set(perfil?.emailFacturaElectronica ?? '');
    this.emailInstitucional.set(perfil?.emailInstitucional ?? '');
    this.colorPrimario.set(perfil?.colorPrimario || '#003366');
    this.colorSecundario.set(perfil?.colorSecundario || '#ffffff');
    this.cuotaSocialHabilitada.set(perfil?.cuotaSocialHabilitada ?? false);
    const periodicidad = OPCIONES_PERIODICIDAD_CUOTA.find(
      (opcion) => opcion.valor === perfil?.periodicidadCuotaSocial,
    );
    this.periodicidadCuotaSocial.set(periodicidad?.valor ?? PERIODICIDAD_CUOTA_PREDETERMINADA);
    this.diasVencimientoMoroso.set(perfil?.diasVencimientoMoroso ?? null);
    this.diasInhabilitacion.set(perfil?.diasInhabilitacion ?? null);
    this.precargarDomicilio('domicilio', perfil?.domicilio);
    this.precargarDomicilio('domicilioFacturacion', perfil?.domicilioFacturacion);
    this.limpiarError();
  }

  private precargarDomicilio(clave: ClaveDomicilio, domicilio?: DomicilioClubPayload | null): void {
    const valores = domicilio ?? { direccion: '', codigoPostal: '', localidad: '' };
    const senales = {
      domicilio: [this.domicilioDireccion, this.domicilioCodigoPostal, this.domicilioLocalidad],
      domicilioFacturacion: [
        this.facturacionDireccion,
        this.facturacionCodigoPostal,
        this.facturacionLocalidad,
      ],
    }[clave];
    senales[0].set(valores.direccion ?? '');
    senales[1].set(valores.codigoPostal ?? '');
    senales[2].set(valores.localidad ?? '');
  }

  private crearDomicilio(
    direccion: string,
    codigoPostal: string,
    localidad: string,
  ): DomicilioClubPayload {
    return {
      direccion: direccion.trim(),
      codigoPostal: codigoPostal.trim(),
      localidad: localidad.trim(),
    };
  }

  private generarPath(nombre: string): string {
    return (
      nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'club'
    );
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
