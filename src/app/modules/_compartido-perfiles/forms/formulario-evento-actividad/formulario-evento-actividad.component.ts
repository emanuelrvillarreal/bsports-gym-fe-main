import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { EventoActividadCommand } from '../../../../core/api/interfaces/actividades.interfaces';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-evento-actividad',
  standalone: true,
  imports: [InputFechaComponent, SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-evento-actividad.component.html',
  styleUrl: './formulario-evento-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioEventoActividadComponent {
  readonly formId = input('formulario-evento-actividad');
  readonly opcionesActividades = input<readonly SelectOption[]>([]);
  readonly actividadUuidInicial = input('');
  readonly valorInicial = input<EventoActividadCommand | null>(null);
  readonly actividadBloqueada = input(false);
  readonly reinicioVersion = input(0);
  readonly enviado = output<EventoActividadCommand>();

  protected readonly actividadUuid = signal('');
  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly ubicacion = signal('');
  protected readonly inicio = signal('');
  protected readonly fin = signal('');
  protected readonly error = signal('');
  protected readonly nombreActividadSeleccionada = computed(
    () =>
      this.opcionesActividades().find((opcion) => opcion.value === this.actividadUuid())?.label ??
      this.actividadUuid(),
  );

  constructor() {
    effect(() => {
      this.reinicioVersion();
      const valor = this.valorInicial();
      this.actividadUuid.set(valor?.actividadUuid ?? this.actividadUuidInicial());
      this.titulo.set(valor?.titulo ?? '');
      this.descripcion.set(valor?.descripcion ?? '');
      this.ubicacion.set(valor?.ubicacion ?? '');
      this.inicio.set(valor ? this.aInputFecha(valor.inicio) : '');
      this.fin.set(valor ? this.aInputFecha(valor.fin) : '');
      this.error.set('');
    });
  }

  protected actualizarDescripcion(valor: string): void {
    this.descripcion.set(valor.slice(0, 500));
  }

  protected actualizarInicio(valor: string): void {
    this.inicio.set(valor);
    this.fin.set(valor ? this.sumarUnaHora(valor) : '');
    this.error.set('');
  }

  protected actualizarFin(valor: string): void {
    this.fin.set(valor);
    this.error.set('');
  }

  protected enviar(evento: SubmitEvent): void {
    evento.preventDefault();
    const actividadUuid = this.actividadUuid().trim();
    const titulo = this.titulo().trim();
    const ubicacion = this.ubicacion().trim();
    const inicio = this.inicio();
    const fin = this.fin();
    const descripcion = this.descripcion().trim();

    if (!actividadUuid || !titulo || !ubicacion || !inicio || !fin || !descripcion) {
      this.error.set('Completá todos los campos obligatorios.');
      return;
    }

    if (new Date(inicio) >= new Date(fin)) {
      this.error.set('La fecha y hora de inicio debe ser anterior a la fecha y hora de fin.');
      return;
    }

    this.error.set('');
    this.enviado.emit({
      actividadUuid,
      titulo,
      descripcion,
      ubicacion,
      inicio: this.aFormatoApi(inicio),
      fin: this.aFormatoApi(fin),
    });
  }

  private aFormatoApi(valor: string): string {
    const [fecha, hora] = valor.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio} ${hora}:00`;
  }

  private sumarUnaHora(valor: string): string {
    const fecha = new Date(valor);
    fecha.setHours(fecha.getHours() + 1);

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${anio}-${mes}-${dia}T${hora}:${minutos}`;
  }

  private aInputFecha(valor: string): string {
    const coincidencia = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
    return coincidencia
      ? `${coincidencia[3]}-${coincidencia[2]}-${coincidencia[1]}T${coincidencia[4]}`
      : valor.slice(0, 16);
  }
}
