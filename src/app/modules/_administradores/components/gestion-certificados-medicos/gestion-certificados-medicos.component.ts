import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CertificadoResumenFilaDto,
  CertificadosResumenResponse,
  ETIQUETAS_SITUACION_CERTIFICADO,
  SituacionCertificado,
} from '../../../../core/api/interfaces/certificados-medicos.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { ColumnaTabla, TablaResponsiveComponent } from '../../../ui/tabla-responsive/tabla-responsive.component';

type FilaCertificado = CertificadoResumenFilaDto & {
  /** Texto de "Vence": fecha y días restantes. */
  readonly vence: string;
  /** Texto de la situación. */
  readonly situacionTexto: string;
};

interface TarjetaResumen {
  readonly situacion: SituacionCertificado;
  readonly titulo: string;
  readonly ayuda: string;
}

const TAMANIO_PAGINA = 10;

/** Listado de certificados médicos del club: cuántos están vigentes, por vencer, vencidos o sin cargar. */
@Component({
  selector: 'app-gestion-certificados-medicos',
  standalone: true,
  imports: [CardComponent, PaginacionComponent, TablaResponsiveComponent],
  templateUrl: './gestion-certificados-medicos.component.html',
  styleUrl: './gestion-certificados-medicos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCertificadosMedicosComponent implements OnInit {
  private readonly api = inject(SociosApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tarjetas: readonly TarjetaResumen[] = [
    { situacion: 'VIGENTE', titulo: 'Vigentes', ayuda: 'Al día' },
    { situacion: 'POR_VENCER', titulo: 'Por vencer', ayuda: 'Vencen en 30 días o menos' },
    { situacion: 'VENCIDO', titulo: 'Vencidos', ayuda: 'Tienen que renovarlo' },
    { situacion: 'PENDIENTE_VALIDACION', titulo: 'Por confirmar', ayuda: 'Lo cargó el socio, falta revisarlo' },
    { situacion: 'SIN_CERTIFICADO', titulo: 'Sin certificado', ayuda: 'No cargaron ninguno' },
  ];

  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly respuesta = signal<CertificadosResumenResponse | null>(null);
  protected readonly pagina = signal(1);
  protected readonly busqueda = signal('');
  protected readonly situacion = signal<SituacionCertificado | ''>('');
  protected readonly soloQueLoNecesitan = signal(false);

  protected readonly bloqueados = computed(() => this.respuesta()?.bloqueados ?? 0);
  protected readonly totalPaginas = computed(() => Math.max(1, this.respuesta()?.filas.totalPages ?? 1));
  protected readonly filas = computed<readonly FilaCertificado[]>(() =>
    (this.respuesta()?.filas.content ?? []).map((fila) => ({
      ...fila,
      situacionTexto: ETIQUETAS_SITUACION_CERTIFICADO[fila.situacion],
      vence: this.textoVence(fila),
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaCertificado>[] = [
    { id: 'imageUrl', titulo: 'Socio', tipo: 'avatar', ancho: 'minmax(12rem, 1.3fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '9rem' },
    { id: 'situacionTexto', titulo: 'Certificado', ancho: '11rem' },
    { id: 'vence', titulo: 'Vence', ancho: '12rem' },
    { id: 'actividadesQueLoExigen', titulo: 'Actividades que lo exigen', tipo: 'chips', ancho: 'minmax(12rem, 1.4fr)' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  protected conteo(situacion: SituacionCertificado): number {
    return this.respuesta()?.conteos?.[situacion] ?? 0;
  }

  protected alternarSituacion(situacion: SituacionCertificado): void {
    this.situacion.set(this.situacion() === situacion ? '' : situacion);
    this.pagina.set(1);
    this.cargar();
  }

  protected verBloqueados(): void {
    this.situacion.set('');
    this.soloQueLoNecesitan.set(true);
    this.pagina.set(1);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.situacion.set('');
    this.busqueda.set('');
    this.soloQueLoNecesitan.set(false);
    this.pagina.set(1);
    this.cargar();
  }

  protected hayFiltros(): boolean {
    return !!this.situacion() || !!this.busqueda().trim() || this.soloQueLoNecesitan();
  }

  protected buscar(evento: Event): void {
    evento.preventDefault();
    this.pagina.set(1);
    this.cargar();
  }

  protected alternarSoloNecesitan(evento: Event): void {
    this.soloQueLoNecesitan.set((evento.target as HTMLInputElement).checked);
    this.pagina.set(1);
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .resumenCertificados({
        page: this.pagina() - 1,
        size: TAMANIO_PAGINA,
        search: this.busqueda().trim() || undefined,
        situacion: this.situacion() || null,
        soloQueLoNecesitan: this.soloQueLoNecesitan(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.respuesta.set(respuesta),
        error: () => this.error.set('No se pudieron cargar los certificados médicos.'),
      });
  }

  private textoVence(fila: CertificadoResumenFilaDto): string {
    if (!fila.fechaExpiracion) return '—';
    const dias = fila.diasRestantes;
    if (dias === null || dias === undefined) return fila.fechaExpiracion;
    if (dias < 0) return `${fila.fechaExpiracion} (venció hace ${-dias} ${-dias === 1 ? 'día' : 'días'})`;
    if (dias === 0) return `${fila.fechaExpiracion} (vence hoy)`;
    return `${fila.fechaExpiracion} (en ${dias} ${dias === 1 ? 'día' : 'días'})`;
  }
}
