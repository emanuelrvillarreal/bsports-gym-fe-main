import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  EventoAccesoDetalleDto,
  EventoAccesoHistorialDetalleDto,
} from '../../../../core/api/interfaces/eventos-acceso.interfaces';
import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { parsearFechaApi } from '../../../../helpers/fecha-api';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import {
  ColumnaTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

interface HistorialEventoAccesoFila {
  readonly uuid: string;
  readonly fecha: string;
  readonly tipo: string;
  readonly nombre: string;
  readonly resultado: string;
  readonly monto: number | null;
  readonly motivo: string;
}

@Component({
  selector: 'app-historial-evento-acceso',
  standalone: true,
  imports: [
    BotonComponent,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './historial-evento-acceso.component.html',
  styleUrl: './historial-evento-acceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialEventoAccesoComponent {
  private readonly api = inject(EventosAccesoApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly evento = input.required<EventoAccesoDetalleDto>();
  readonly cerrar = output<void>();

  protected readonly filas = signal<readonly HistorialEventoAccesoFila[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly columnas: readonly ColumnaTabla<HistorialEventoAccesoFila>[] = [
    { id: 'fecha', titulo: 'Fecha', ancho: '10rem' },
    { id: 'tipo', titulo: 'Tipo', ancho: '7rem' },
    { id: 'nombre', titulo: 'Persona', ancho: 'minmax(10rem, 1fr)' },
    { id: 'resultado', titulo: 'Resultado', ancho: '10rem' },
    { id: 'monto', titulo: 'Monto', tipo: 'moneda', ancho: '8rem' },
    { id: 'motivo', titulo: 'Motivo', ancho: 'minmax(14rem, 1.5fr)' },
  ];

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }
      this.evento().uuid;
      untracked(() => {
        this.paginaActual.set(1);
        this.busqueda.set('');
        this.cargarHistorial();
      });
    });
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected buscar(): void {
    this.paginaActual.set(1);
    this.cargarHistorial();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargarHistorial();
  }

  protected solicitarCierre(): void {
    if (!this.cargando()) {
      this.cerrar.emit();
    }
  }

  private cargarHistorial(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.api
      .paginarHistorial(
        this.evento().uuid,
        {
          page: this.paginaActual(),
          size: 10,
          search: this.busqueda().trim(),
        },
        { mostrarToastError: false },
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (pagina) => {
          this.filas.set(pagina.content.map((item) => this.mapearFila(item)));
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
        error: () => {
          this.filas.set([]);
          this.totalPaginas.set(1);
          this.error.set('No se pudo cargar el historial del evento.');
        },
      });
  }

  private mapearFila(item: EventoAccesoHistorialDetalleDto): HistorialEventoAccesoFila {
    return {
      uuid: item.uuid,
      fecha: formatearFechaHistorial(item.fecha),
      tipo: item.tipo === 'INVITADO' ? 'Invitado' : 'Socio',
      nombre: this.nombreHistorial(item),
      resultado: formatearResultadoHistorial(item.resultado),
      monto: item.monto,
      motivo: item.motivo?.trim() || '—',
    };
  }

  private nombreHistorial(item: EventoAccesoHistorialDetalleDto): string {
    const nombre = item.nombre?.trim();
    const numeroSocio = item.numeroSocio?.trim();
    if (nombre && numeroSocio) {
      return `${nombre} · Socio ${numeroSocio}`;
    }
    return nombre || (numeroSocio ? `Socio ${numeroSocio}` : 'Sin identificar');
  }
}

export function formatearFechaHistorial(
  valor: string | number | readonly number[] | null | undefined,
): string {
  const fecha = normalizarFechaHistorial(valor);
  if (!fecha) {
    return 'Fecha no disponible';
  }
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(fecha);
}

function normalizarFechaHistorial(
  valor: string | number | readonly number[] | null | undefined,
): Date | null {
  let fecha: Date | null = null;
  if (Array.isArray(valor) && valor.length >= 3) {
    const [anio, mes, dia, hora = 0, minuto = 0, segundo = 0] = valor;
    fecha = new Date(anio, mes - 1, dia, hora, minuto, segundo);
  } else if (typeof valor === 'number' && Number.isFinite(valor)) {
    fecha = new Date(Math.abs(valor) < 1_000_000_000_000 ? valor * 1000 : valor);
  } else if (typeof valor === 'string') {
    fecha = parsearFechaApi(valor);
  }

  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

function formatearResultadoHistorial(resultado: string): string {
  switch (resultado) {
    case 'ACCESO_PERMITIDO':
      return 'Acceso permitido';
    case 'DEBE_PAGAR':
      return 'Debe pagar';
    case 'BLOQUEADO':
      return 'Bloqueado';
    default:
      return resultado;
  }
}
