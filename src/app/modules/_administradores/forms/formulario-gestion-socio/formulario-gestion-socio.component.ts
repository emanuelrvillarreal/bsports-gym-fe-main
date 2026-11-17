import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  ActualizarSocioPayload,
  AltaFamiliarPayload,
  AltaTitularPayload,
  Parentesco,
  Sexo,
  SocioDto,
} from '../../../../core/api/interfaces/socios.interfaces';
import {
  AsignarDescuentoPayload,
  DescuentoDto,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { formatearDni, limpiarDni } from '../../../../helpers/dni-formato';
import { fechaApiAFechaInput } from '../../../../helpers/fecha-api';
import { formatearTelefono, limpiarTelefono } from '../../../../helpers/telefono-formato';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { InputPasswordComponent } from '../../../ui/input-password/input-password.component';
import { SelectorDescuentosComponent } from '../selector-descuentos/selector-descuentos.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';
import { opcionDescuento } from '../../../../helpers/descuento-opcion';

export type ModoFormularioSocio = 'titular' | 'familiar' | 'editar';
export type GestionSocioPayload =
  | { readonly modo: 'titular'; readonly datos: AltaTitularPayload }
  | { readonly modo: 'familiar'; readonly datos: Omit<AltaFamiliarPayload, 'titularMemberUuid'> }
  | { readonly modo: 'editar'; readonly datos: ActualizarSocioPayload };

type CampoGestionSocio =
  | 'nombre'
  | 'apellido'
  | 'email'
  | 'password'
  | 'dni'
  | 'telefono'
  | 'fechaNacimiento'
  | 'numeroSocio';

@Component({
  selector: 'app-formulario-gestion-socio',
  standalone: true,
  imports: [
    InputFechaComponent,
    InputPasswordComponent,
    SelectorDescuentosComponent,
    SelectComponent,
    ValidacionFormularioDirective,
  ],
  templateUrl: './formulario-gestion-socio.component.html',
  styleUrl: './formulario-gestion-socio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioGestionSocioComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly modo = input.required<ModoFormularioSocio>();
  readonly socio = input<SocioDto | null>(null);
  readonly descuentosDisponibles = input<readonly DescuentoDto[]>([]);
  readonly cargandoDescuentos = input(false);
  /** Número que asignará el backend si en el alta se deja vacío. */
  readonly siguienteNumeroSocio = input<string | null>(null);
  readonly enviado = output<GestionSocioPayload>();
  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly dni = signal('');
  protected readonly telefono = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly numeroSocio = signal('');
  protected readonly parentesco = signal('');
  protected readonly sexo = signal('');
  protected readonly descuentoUuid = signal('');
  protected readonly descuentoFechaDesde = signal('');
  protected readonly descuentoFechaHasta = signal('');
  protected readonly descuentosSeleccionados = signal<readonly AsignarDescuentoPayload[]>([]);
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  protected readonly esAlta = computed(() => this.modo() !== 'editar');
  /** El número se elige en el alta de titular y se puede corregir al editar; los familiares lo reciben solo. */
  protected readonly muestraNumeroSocio = computed(() => this.modo() !== 'familiar');
  protected readonly numeroSocioEsValido = computed(() => {
    const valor = this.numeroSocio().trim();
    // Un número heredado no numérico (p. ej. importado como "SOC-10") se respeta mientras no se cambie.
    return !valor || valor === (this.socio()?.numeroSocio ?? '') || /^[1-9]\d{0,8}$/.test(valor);
  });
  protected readonly ayudaNumeroSocio = computed(() => {
    if (this.modo() === 'titular') {
      const siguiente = this.siguienteNumeroSocio();
      return siguiente ? `Si lo dejás vacío se asigna el ${siguiente}.` : 'Si lo dejás vacío se asigna el siguiente libre.';
    }
    return 'No puede repetirse con el de otro socio del gimnasio.';
  });
  protected readonly esTitular = computed(
    () => this.modo() === 'titular' || (this.modo() === 'editar' && !this.socio()?.parentesco),
  );
  protected readonly dniEsValido = computed(() => {
    const cantidadDigitos = limpiarDni(this.dni()).length;
    return cantidadDigitos >= 7 && cantidadDigitos <= 11;
  });
  protected readonly opcionesSexo: readonly SelectOption[] = [
    { value: 'FEMENINO', label: 'Femenino' },
    { value: 'MASCULINO', label: 'Masculino' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly opcionesParentesco: readonly SelectOption[] = [
    { value: 'CONYUGE', label: 'Cónyuge' },
    { value: 'HIJO', label: 'Hijo' },
    { value: 'HIJA', label: 'Hija' },
    { value: 'PADRE', label: 'Padre' },
    { value: 'MADRE', label: 'Madre' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly opcionesDescuentos = computed<readonly SelectOption[]>(() => {
    const seleccionados = new Set(
      this.descuentosSeleccionados().map((descuento) => descuento.descuentoUuid),
    );
    return this.descuentosDisponibles()
      .filter((descuento) => !seleccionados.has(descuento.descuentoUuid))
      .map((descuento) => opcionDescuento(descuento));
  });

  constructor() {
    effect(() => {
      const socio = this.socio();
      this.nombre.set(socio?.nombre ?? '');
      this.apellido.set(socio?.apellido ?? '');
      this.email.set(socio?.email ?? '');
      this.password.set('');
      this.dni.set(formatearDni(socio?.dni ?? ''));
      this.telefono.set(formatearTelefono(socio?.telefono ?? ''));
      this.fechaNacimiento.set(fechaApiAFechaInput(socio?.fechaNacimiento ?? undefined));
      this.numeroSocio.set(socio?.numeroSocio ?? '');
      this.parentesco.set(socio?.parentesco ?? '');
      this.sexo.set(socio?.sexo ?? '');
      this.descuentoUuid.set('');
      this.descuentoFechaDesde.set(this.modo() === 'editar' ? '' : this.obtenerFechaLocalActual());
      this.descuentoFechaHasta.set('');
      this.descuentosSeleccionados.set([]);
      this.limpiarTimeoutError();
      this.errorVisible.set(false);
    });
  }
  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }
  protected actualizarTexto(campo: CampoGestionSocio, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (campo === 'dni') {
      const dniFormateado = formatearDni(input.value);
      this.dni.set(dniFormateado);
      input.value = dniFormateado;
      return;
    }

    if (campo === 'numeroSocio') {
      const soloDigitos = input.value.replace(/\D/g, '');
      this.numeroSocio.set(soloDigitos);
      input.value = soloDigitos;
      return;
    }

    if (campo === 'telefono') {
      const telefonoFormateado = formatearTelefono(input.value);
      this.telefono.set(telefonoFormateado);
      input.value = telefonoFormateado;
      return;
    }

    this[campo].set(input.value);
  }
  protected cambiarParentesco(valor: string): void {
    this.parentesco.set(valor);
  }

  protected cambiarDescuento(valor: string): void {
    this.descuentoUuid.set(valor);
  }

  protected agregarDescuento(): void {
    const descuento = this.validarBorradorDescuento();
    if (!descuento) return;
    this.descuentosSeleccionados.update((actuales) => [...actuales, descuento]);
    this.descuentoUuid.set('');
    this.descuentoFechaDesde.set(this.obtenerFechaLocalActual());
    this.descuentoFechaHasta.set('');
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  protected quitarDescuento(descuentoUuid: string): void {
    this.descuentosSeleccionados.update((actuales) =>
      actuales.filter((descuento) => descuento.descuentoUuid !== descuentoUuid),
    );
  }

  protected agregarDescuentoSeleccionado(descuento: AsignarDescuentoPayload): void {
    this.descuentosSeleccionados.update((actuales) => [...actuales, descuento]);
  }

  protected descripcionDescuento(descuento: AsignarDescuentoPayload): string {
    const catalogo = this.descuentosDisponibles().find(
      (item) => item.descuentoUuid === descuento.descuentoUuid,
    );
    const vigencia = descuento.fechaHasta
      ? `${descuento.fechaDesde} al ${descuento.fechaHasta}`
      : `desde ${descuento.fechaDesde}, sin fecha de fin`;
    return `${catalogo?.titulo ?? 'Descuento'} · ${vigencia}`;
  }

  protected enviar(): void {
    const nombre = this.nombre().trim();
    const apellido = this.apellido().trim();
    const email = this.email().trim();
    if (!nombre) return this.mostrarError('El nombre es obligatorio.');
    if (!apellido) return this.mostrarError('El apellido es obligatorio.');
    if (!email) return this.mostrarError('El email es obligatorio.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return this.mostrarError('Ingresá un email válido.');
    if (this.esAlta() && !this.password())
      return this.mostrarError('La contraseña es obligatoria.');
    if (!this.fechaNacimiento()) return this.mostrarError('La fecha de nacimiento es obligatoria.');
    const dniNormalizado = limpiarDni(this.dni());
    if (!this.dniEsValido()) return this.mostrarError('El DNI debe tener entre 7 y 11 dígitos.');
    if (!this.esTitular() && !this.parentesco())
      return this.mostrarError('El parentesco es obligatorio.');
    if (!this.numeroSocioEsValido())
      return this.mostrarError('El número de socio debe ser un número mayor a 0.');
    const numeroSocio = this.numeroSocio().trim();
    // Solo se envía si se cargó (alta) o si cambió (edición); vacío al editar conserva el actual.
    const cambioNumero = numeroSocio && numeroSocio !== (this.socio()?.numeroSocio ?? '');
    const numero = cambioNumero ? { numeroSocio: Number(numeroSocio) } : {};
    const descuentos = this.obtenerDescuentosParaEnvio();
    if (descuentos === null) return;
    const opcionales = {
      dni: dniNormalizado,
      ...(limpiarTelefono(this.telefono()) ? { telefono: limpiarTelefono(this.telefono()) } : {}),
      ...(this.sexo() ? { sexo: this.sexo() as Sexo } : {}),
    };
    if (this.modo() === 'titular') {
      this.enviado.emit({
        modo: 'titular',
        datos: {
          nombre,
          apellido,
          email,
          password: this.password(),
          ...opcionales,
          fechaNacimiento: this.fechaNacimiento(),
          fechaAlta: this.obtenerFechaLocalActual(),
          ...numero,
          ...(descuentos.length ? { descuentos } : {}),
        },
      });
    } else if (this.modo() === 'familiar') {
      this.enviado.emit({
        modo: 'familiar',
        datos: {
          parentesco: this.parentesco() as Parentesco,
          nombre,
          apellido,
          email,
          password: this.password(),
          ...opcionales,
          fechaNacimiento: this.fechaNacimiento(),
          fechaAlta: this.obtenerFechaLocalActual(),
          ...(descuentos.length ? { descuentos } : {}),
        },
      });
    } else {
      this.enviado.emit({
        modo: 'editar',
        datos: {
          nombre,
          apellido,
          email,
          ...opcionales,
          fechaNacimiento: this.fechaNacimiento(),
          ...numero,
          ...(!this.esTitular() ? { parentesco: this.parentesco() as Parentesco } : {}),
        },
      });
    }
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }
  private obtenerFechaLocalActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }

  private obtenerDescuentosParaEnvio(): readonly AsignarDescuentoPayload[] | null {
    const hayBorrador = !!this.descuentoUuid() || !!this.descuentoFechaHasta();
    if (!hayBorrador) return this.descuentosSeleccionados();

    const borrador = this.validarBorradorDescuento();
    return borrador ? [...this.descuentosSeleccionados(), borrador] : null;
  }

  private validarBorradorDescuento(): AsignarDescuentoPayload | null {
    const descuentoUuid = this.descuentoUuid().trim();
    const fechaDesde = this.descuentoFechaDesde();
    const fechaHasta = this.descuentoFechaHasta();
    if (!descuentoUuid || !fechaDesde) {
      this.mostrarError('Para agregar un descuento, seleccioná el beneficio y la fecha de inicio.');
      return null;
    }
    if (fechaHasta && fechaHasta < fechaDesde) {
      this.mostrarError('La fecha de fin del descuento no puede ser anterior a la fecha de inicio.');
      return null;
    }
    if (
      this.descuentosSeleccionados().some(
        (descuento) => descuento.descuentoUuid === descuentoUuid,
      )
    ) {
      this.mostrarError('Ese descuento ya fue agregado al alta.');
      return null;
    }
    return { descuentoUuid, fechaDesde, fechaHasta: fechaHasta || null };
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }
  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
