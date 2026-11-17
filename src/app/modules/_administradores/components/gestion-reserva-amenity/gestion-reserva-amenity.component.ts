import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroClock } from '@ng-icons/heroicons/outline';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AmenityDto, CrearReservaAmenityCommand } from '../../../../core/api/interfaces/amenities.interfaces';
import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { formatearDni } from '../../../../helpers/dni-formato';
import { formatearHoraTabla } from '../../../../helpers/tabla-hora-fin.helpers';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { InputHoraComponent } from '../../../ui/input-hora/input-hora.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { TablaResponsiveComponent, ColumnaTabla, AccionTabla, EventoAccionTabla } from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { PasoWizard, WizardPasosComponent } from '../../../ui/wizard-pasos/wizard-pasos.component';

interface FilaAmenityReservable {
  readonly amenityUuid: string;
  readonly nombre: string;
  readonly dias: readonly string[];
  readonly horario: string;
  readonly gratuito: readonly string[];
}

const CANTIDAD_DIAS_SEMANA = 7;
const DIAS_SEMANA_NUMERO: Readonly<Record<string, number>> = {
  DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6,
};

@Component({
  selector: 'app-gestion-reserva-amenity',
  standalone: true,
  imports: [BotonComponent, FormsModule, InputFechaComponent, InputHoraComponent, NgIcon, PaginacionComponent, TablaResponsiveComponent, TituloHeroComponent, WizardPasosComponent],
  providers: [provideIcons({ heroClock })],
  templateUrl: './gestion-reserva-amenity.component.html',
  styleUrl: './gestion-reserva-amenity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionReservaAmenityComponent {
  private readonly sociosApi = inject(SociosApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly amenities = input<readonly AmenityDto[]>([]);
  readonly procesando = input(false);
  readonly confirmar = output<CrearReservaAmenityCommand>();
  readonly cancelar = output<void>();

  protected readonly paso = signal(1);
  readonly pasoActual = this.paso.asReadonly();
  protected readonly pasosWizard: readonly PasoWizard[] = [
    { id: 'socio', etiqueta: 'Socio' },
    { id: 'instalacion', etiqueta: 'Instalación' },
    { id: 'confirmacion', etiqueta: 'Confirmación' },
  ];
  protected readonly pasoWizardActual = computed(() =>
    this.pasosWizard[this.paso() - 1]?.id ?? this.pasosWizard[0].id,
  );
  protected readonly socios = signal<readonly SocioDto[]>([]);
  protected readonly cargandoSocios = signal(false);
  protected readonly errorSocios = signal('');
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly socioSeleccionado = signal<SocioDto | null>(null);
  protected readonly amenitySeleccionado = signal<AmenityDto | null>(null);
  protected readonly filasAmenities = computed<readonly FilaAmenityReservable[]>(() =>
    this.amenities().map((amenity) => ({
      amenityUuid: amenity.amenityUuid,
      nombre: amenity.nombre,
      dias: this.resumirDias(amenity.diasSemana),
      gratuito: [
        amenity.montoHora === 0
        && amenity.porcentajeSena === 0
          ? 'Sí'
          : 'No',
      ],
      horario: `${amenity.horaInicio.slice(0, 5)} – ${amenity.horaFin.slice(0, 5)}`,
    })),
  );
  protected readonly fecha = signal('');
  protected readonly fechaMinima = this.obtenerFechaActual();
  protected readonly fechaMaxima = this.sumarDias(this.fechaMinima, 7);
  protected readonly diasPermitidos = computed<readonly number[]>(() =>
    (this.amenitySeleccionado()?.diasSemana ?? '')
      .split(';')
      .map((dia) => DIAS_SEMANA_NUMERO[dia.trim().toUpperCase()])
      .filter((dia): dia is number => dia !== undefined),
  );
  protected readonly horaInicio = signal('');
  protected readonly horaFin = signal('');
  protected readonly horaInicioDisponible = computed(() => this.amenitySeleccionado()?.horaInicio.slice(0, 5) ?? '');
  protected readonly horaFinDisponible = computed(() => this.amenitySeleccionado()?.horaFin.slice(0, 5) ?? '');
  protected readonly maximoHoraInicio = computed(() => this.sumarMinutos(this.horaFinDisponible(), -1));
  protected readonly minimoHoraFin = computed(() => this.sumarMinutos(this.horaInicio(), 1));
  protected readonly maximoHoraFin = computed(() => this.obtenerMaximoHoraFin(this.horaInicio(), this.horaFinDisponible()));
  protected readonly errorHorario = computed(() =>
    this.fecha() && this.horaInicio() && this.horaFin() && this.horaFin() <= this.horaInicio()
      ? 'La hora de fin debe ser posterior a la de inicio.'
      : '',
  );
  protected readonly puedeAvanzar = computed(() =>
    this.paso() === 1 ? !!this.socioSeleccionado() : this.paso() === 2 ? !!this.amenitySeleccionado() : false,
  );
  readonly puedeConfirmar = computed(() =>
    !!this.socioSeleccionado() && !!this.amenitySeleccionado() && !!this.fecha() && !!this.horaInicio() && !!this.horaFin() && !this.errorHorario(),
  );
  protected readonly columnasSocios: readonly ColumnaTabla<SocioDto>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(8rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(8rem, 1fr)' },
    { id: 'numeroSocio', titulo: 'N.º socio', ancho: '8rem' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
  ];
  protected readonly accionesSocios: readonly AccionTabla<SocioDto>[] = [
    { id: 'seleccionar', texto: 'Seleccionar', icono: 'heroCheck', color: 'var(--semantic-success)' },
  ];
  protected readonly columnasAmenities: readonly ColumnaTabla<FilaAmenityReservable>[] = [
    { id: 'nombre', titulo: 'Instalación', ancho: 'minmax(10rem, 1fr)' },
    { id: 'dias', titulo: 'Días', tipo: 'chips', ancho: 'minmax(10rem, 1fr)' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: '10rem' },
    {
      id: 'gratuito',
      titulo: 'Gratuito',
      tipo: 'chips',
      ancho: '7rem',
      chipClase: (valor) => valor === 'Sí'
        ? 'tabla-responsive__chip--success'
        : 'tabla-responsive__chip--danger',
    },
  ];
  protected readonly accionesAmenities: readonly AccionTabla<FilaAmenityReservable>[] = [
    { id: 'seleccionar', texto: 'Seleccionar', icono: 'heroCheck', color: 'var(--semantic-success)' },
  ];
  protected readonly formatearHora24 = formatearHoraTabla;

  ngOnChanges(): void {
    if (this.abierto()) {
      if (!this.fecha()) this.fecha.set(this.fechaMinima);
      if (!this.socios().length && !this.cargandoSocios()) this.cargarSocios();
    }
    if (!this.abierto()) this.reiniciar();
  }

  protected cambiarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected buscarSocios(): void {
    this.pagina.set(1);
    this.cargarSocios();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarSocios();
  }

  protected manejarAccionSocio(evento: EventoAccionTabla<SocioDto>): void {
    if (evento.accion === 'seleccionar') {
      this.socioSeleccionado.set(evento.fila);
      this.paso.set(2);
    }
  }

  protected manejarAccionAmenity(evento: EventoAccionTabla<FilaAmenityReservable>): void {
    if (evento.accion !== 'seleccionar') return;
    const amenity = this.amenities().find((item) => item.amenityUuid === evento.fila.amenityUuid);
    if (!amenity) return;
    this.amenitySeleccionado.set(amenity);
    this.fecha.set(this.obtenerPrimeraFechaDisponible());
    this.paso.set(3);
  }

  protected actualizarHoraInicio(horaInicio: string): void {
    this.horaInicio.set(horaInicio);
    this.horaFin.set(this.obtenerMaximoHoraFin(horaInicio, this.horaFinDisponible()));
  }

  protected actualizarHoraFin(horaFin: string): void {
    const minimo = this.minimoHoraFin();
    this.horaFin.set(minimo && horaFin && horaFin < minimo ? minimo : horaFin);
  }

  anterior(): void {
    this.paso.update((paso) => Math.max(1, paso - 1));
  }

  confirmarReserva(): void {
    if (!this.puedeConfirmar() || this.procesando()) return;
    this.confirmar.emit({
      memberUuid: this.socioSeleccionado()!.memberUuid,
      amenityUuid: this.amenitySeleccionado()!.amenityUuid,
      inicio: this.construirIso(this.fecha(), this.horaInicio()),
      fin: this.construirIso(this.fecha(), this.horaFin()),
    });
  }

  protected cerrar(): void {
    if (!this.procesando()) this.cancelar.emit();
  }

  private cargarSocios(): void {
    this.cargandoSocios.set(true);
    this.errorSocios.set('');
    this.sociosApi.paginar({ page: this.pagina(), size: 8, search: this.busqueda().trim(), titular: true, estados: ['ACTIVO'] })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoSocios.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.socios.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.errorSocios.set('No se pudieron cargar los socios titulares activos.'),
      });
  }

  private reiniciar(): void {
    this.paso.set(1); this.socioSeleccionado.set(null); this.amenitySeleccionado.set(null);
    this.fecha.set(''); this.horaInicio.set(''); this.horaFin.set(''); this.errorSocios.set('');
  }

  private construirIso(fecha: string, hora: string): string {
    // El backend interpreta un ISO local; convertir a UTC desplazaría el turno.
    return `${fecha}T${hora}:00`;
  }

  private sumarMinutos(hora: string, minutos: number): string {
    if (!/^\d{2}:\d{2}$/.test(hora)) return '';
    const [horas, minutosActuales] = hora.split(':').map(Number);
    const total = horas * 60 + minutosActuales + minutos;
    if (total < 0 || total >= 24 * 60) return '';
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private obtenerMaximoHoraFin(horaInicio: string, horaFinDisponible: string): string {
    if (!horaInicio || !horaFinDisponible) return '';
    const unaHoraDespues = this.sumarMinutos(horaInicio, 60);
    return !unaHoraDespues || unaHoraDespues > horaFinDisponible ? horaFinDisponible : unaHoraDespues;
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private sumarDias(fechaIso: string, dias: number): string {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia + dias);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private obtenerPrimeraFechaDisponible(): string {
    const diasPermitidos = this.diasPermitidos();
    if (!diasPermitidos.length) return '';

    for (let desplazamiento = 0; desplazamiento <= 7; desplazamiento += 1) {
      const fecha = this.sumarDias(this.fechaMinima, desplazamiento);
      const [anio, mes, dia] = fecha.split('-').map(Number);
      if (diasPermitidos.includes(new Date(anio, mes - 1, dia).getDay())) return fecha;
    }

    return '';
  }

  protected resumirDias(diasSemana: string): readonly string[] {
    const dias = [...new Set(diasSemana.split(';').map((dia) => dia.trim()).filter(Boolean))];
    return dias.length === CANTIDAD_DIAS_SEMANA ? ['Todos los días'] : dias;
  }

  protected formatearDni(dni: string | null | undefined): string {
    return dni ? formatearDni(dni) : '—';
  }

}
