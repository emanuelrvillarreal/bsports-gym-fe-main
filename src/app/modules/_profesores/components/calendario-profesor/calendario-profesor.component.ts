import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import {
  Observable,
  Subscription,
  catchError,
  concatMap,
  defaultIfEmpty,
  finalize,
  filter,
  from,
  map,
  of,
  switchMap,
  take,
} from 'rxjs';

import { CalendarioSlotDto } from '../../../../core/api/interfaces/portal.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { obtenerProximoEventoCalendario } from '../../../../helpers/calendario-evento.helpers';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CalendarioComponent, CalendarioEvento } from '../../../ui/calendario/calendario.component';
import { CardComponent } from '../../../ui/card/card.component';

interface EventoCalendarioProfesor extends CalendarioEvento {
  readonly estado?: string;
  readonly ubicacion?: string;
}

@Component({
  selector: 'app-calendario-profesor',
  standalone: true,
  imports: [BotonComponent, CalendarioComponent, CardComponent],
  templateUrl: './calendario-profesor.component.html',
  styleUrl: './calendario-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioProfesorComponent implements OnDestroy {
  private readonly portalProfesorApi = inject(PortalProfesorApiService);
  private solicitudCalendario: Subscription | null = null;

  protected readonly mesActivo = signal(this.mesActual());
  protected readonly semanaActiva = signal<string | null>(null);
  protected readonly eventos = signal<readonly EventoCalendarioProfesor[]>([]);
  protected readonly proximaActividad = signal<EventoCalendarioProfesor | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.solicitudCalendario?.unsubscribe();
  }

  protected cambiarMes(mes: string): void {
    this.mesActivo.set(mes);
    this.semanaActiva.set(null);
    this.cargar();
  }

  protected cambiarSemana(semana: string): void {
    this.semanaActiva.set(semana);
  }

  protected cargar(): void {
    const { desde, hasta } = this.rangoMes(this.mesActivo());

    this.solicitudCalendario?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.solicitudCalendario = this.portalProfesorApi
      .consultarCalendario({ desde, hasta })
      .pipe(
        switchMap((slots) => {
          const eventos = slots.map((slot) => this.mapearEvento(slot));
          this.eventos.set(eventos);
          const proximaActividad = obtenerProximoEventoCalendario(eventos);
          this.proximaActividad.set(proximaActividad);

          if (proximaActividad) {
            return of<readonly CalendarioSlotDto[]>([]);
          }

          return this.consultarProximaActividad();
        }),
        map((slots) => slots.map((slot) => this.mapearEvento(slot))),
      )
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (eventosFuturos) => {
          const proximaActividad = obtenerProximoEventoCalendario(eventosFuturos);
          if (proximaActividad) {
            this.proximaActividad.set(proximaActividad);
          }
        },
        error: () => this.error.set('No se pudo cargar el calendario.'),
      });
  }

  protected claseEvento(evento: CalendarioEvento): string | null {
    const estado = (evento as EventoCalendarioProfesor).estado;
    return estado === 'CANCELADO' ? 'calendario-evento--cancelado' : null;
  }

  private mapearEvento(slot: CalendarioSlotDto): EventoCalendarioProfesor {
    return {
      diaHoraInicio: slot.inicio,
      diaHoraFin: slot.fin,
      titulo: slot.titulo?.trim() || slot.referenciaNombre?.trim() || 'Actividad',
      estado: slot.estado,
      ubicacion: slot.ubicacion ?? undefined,
    };
  }

  private mesActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  private rangoMes(mes: string): { desde: string; hasta: string } {
    const [anio, numeroMes] = mes.split('-').map(Number);
    const ultimoDia = new Date(anio, numeroMes, 0).getDate();
    const mesConDosDigitos = String(numeroMes).padStart(2, '0');

    return {
      desde: `01/${mesConDosDigitos}/${anio}`,
      hasta: `${String(ultimoDia).padStart(2, '0')}/${mesConDosDigitos}/${anio}`,
    };
  }

  private consultarProximaActividad(): Observable<readonly CalendarioSlotDto[]> {
    return from(this.rangosMesesFuturos()).pipe(
      concatMap((rango): Observable<readonly CalendarioSlotDto[]> =>
        this.portalProfesorApi
          .consultarCalendario(rango)
          .pipe(catchError(() => of<readonly CalendarioSlotDto[]>([]))),
      ),
      filter((slots: readonly CalendarioSlotDto[]) => slots.length > 0),
      take(1),
      defaultIfEmpty([] as readonly CalendarioSlotDto[]),
    );
  }

  private rangosMesesFuturos(): readonly { desde: string; hasta: string }[] {
    const [anio, numeroMes] = this.mesActivo().split('-').map(Number);
    const rangos: { desde: string; hasta: string }[] = [];

    for (let mes = numeroMes; mes <= 11; mes += 1) {
      rangos.push(this.rangoMes(`${anio}-${String(mes + 1).padStart(2, '0')}`));
    }

    return rangos;
  }
}
