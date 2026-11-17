import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CongelamientoDto, MembresiaDto } from '../../../../../core/api/interfaces/membresias.interfaces';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { formatearFechaAsistencia } from '../../seguimiento-asistencia/seguimiento-asistencia.helpers';
import { resumenPase, textoCobro, textoOrigen, textoSituacion, tonoSituacion } from '../membresias.helpers';

export type AccionMembresia = 'renovar' | 'congelar' | 'cambiar-plan' | 'baja';

/**
 * Una membresía con su vigencia, cobro, ingresos, congelamientos y últimos ingresos. Las acciones se
 * muestran según lo que el backend habilita (puedeRenovar, puedeCongelar…), no según el rol en el front.
 */
@Component({
  selector: 'app-tarjeta-membresia',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './tarjeta-membresia.component.html',
  styleUrl: './tarjeta-membresia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaMembresiaComponent {
  readonly membresia = input.required<MembresiaDto>();
  /** Muestra quién contrató (en el portal, con varios socios del grupo). */
  readonly mostrarSocio = input(false);
  readonly compacta = input(false);
  readonly accion = output<AccionMembresia>();
  readonly anularCongelamiento = output<CongelamientoDto>();

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly moneda = formatearMoneda;
  protected readonly textoSituacion = textoSituacion;
  protected readonly textoOrigen = textoOrigen;
  protected readonly textoCobro = textoCobro;

  protected readonly tono = computed(() => tonoSituacion(this.membresia().situacion));
  protected readonly resumen = computed(() => resumenPase(this.membresia().pase));
  protected readonly porcentajeIngresos = computed(() => {
    const m = this.membresia();
    return m.ingresosPermitidos ? Math.min(100, Math.round((m.ingresosUsados / m.ingresosPermitidos) * 100)) : 0;
  });
  protected readonly integrantesTexto = computed(() =>
    [this.membresia().socio.nombre, ...this.membresia().integrantes.map((i) => i.nombre)].join(', '),
  );
  protected readonly extendida = computed(() => this.membresia().fechaFin !== this.membresia().fechaFinOriginal);
  protected readonly hayAcciones = computed(() => {
    const m = this.membresia();
    return m.puedeRenovar || m.puedeCongelar || m.puedeCambiarPlan || m.puedeDarDeBaja;
  });
}
