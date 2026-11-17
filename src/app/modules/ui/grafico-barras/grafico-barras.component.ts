import { NgClass, NgStyle } from '@angular/common';

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { NgIcon } from '@ng-icons/core';

import { provideGraficoBarrasIcons } from '../../../core/icons/app-icons.registry';

import {

  formatearEscalaGraficoK,

  formatearEtiquetaValorBarraGrafico,

  generarEscalaGraficoBarras,

} from '../../../helpers/grafico-barras-escala.helpers';

import {

  obtenerClaseEstadoBarraGrafico,

  obtenerPorcentajeBarraGrafico,

  estaBarraGraficoEnTope,

} from '../../../helpers/grafico-barras-estado.helpers';



export type EstiloGraficoBarras = 'normal' | 'compacto' | 'vs';

export type OrientacionGraficoBarras = 'lateral' | 'vertical';



export interface BarraGrafico {

  readonly id?: string | number;

  readonly nombre: string;

  readonly valor: number;

  readonly tope: number;

  readonly etiquetaValor?: string;

  /** Color CSS del relleno para gráficos con series semánticas. */
  readonly color?: string;

  /** Etiqueta compartida por un par de barras cuando se usa el modo VS. */
  readonly grupoNombre?: string;

  /** Override: clase CSS del relleno (default umbrales 80/95/100). */

  readonly barraClase?: (barra: BarraGrafico) => string | null;

  /** Override: etiqueta valor/tope (default formateo numérico). */

  readonly barraEtiqueta?: (barra: BarraGrafico, modoVs: boolean) => string;

}



interface DueloBarras {

  readonly izquierda: BarraGrafico;

  readonly derecha: BarraGrafico | null;

}



@Component({

  selector: 'app-grafico-barras',

  standalone: true,

  imports: [NgClass, NgStyle, NgIcon],

  providers: [provideGraficoBarrasIcons()],

  templateUrl: './grafico-barras.component.html',

  styleUrl: './grafico-barras.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class GraficoBarrasComponent {

  readonly barras = input<readonly BarraGrafico[]>([]);

  readonly estilo = input<EstiloGraficoBarras>('normal');

  readonly orientacion = input<OrientacionGraficoBarras>('lateral');

  readonly escala = input(false);

  readonly altoRendimiento = input(false);

  protected readonly arrastrandoGrafico = signal(false);



  readonly esVs = computed(() => this.estilo() === 'vs');

  readonly mostrarEscalaLateral = computed(() => this.escala() && !this.esVs());

  readonly escalaValores = computed(() => generarEscalaGraficoBarras(this.barras()));

  readonly escalaValoresInversa = computed(() => [...this.escalaValores()].reverse());

  readonly duelos = computed<readonly DueloBarras[]>(() => {

    const lista = this.barras();

    const resultado: DueloBarras[] = [];



    for (let indice = 0; indice < lista.length; indice += 2) {

      resultado.push({

        izquierda: lista[indice],

        derecha: lista[indice + 1] ?? null,

      });

    }



    return resultado;

  });



  private contenedorArrastre: HTMLElement | null = null;

  private inicioArrastreX = 0;

  private inicioArrastreY = 0;

  private scrollInicialX = 0;

  private scrollInicialY = 0;



  protected iniciarArrastreScroll(evento: PointerEvent): void {

    if (this.altoRendimiento()) {

      return;

    }



    if (evento.button !== 0 || !(evento.currentTarget instanceof HTMLElement)) {

      return;

    }



    this.contenedorArrastre = evento.currentTarget;

    this.inicioArrastreX = evento.clientX;

    this.inicioArrastreY = evento.clientY;

    this.scrollInicialX = this.contenedorArrastre.scrollLeft;

    this.scrollInicialY = this.contenedorArrastre.scrollTop;

    this.arrastrandoGrafico.set(true);

    this.contenedorArrastre.setPointerCapture(evento.pointerId);

    evento.stopPropagation();

  }



  protected moverArrastreScroll(evento: PointerEvent): void {

    if (this.altoRendimiento()) {

      return;

    }



    if (!this.contenedorArrastre || !this.arrastrandoGrafico()) {

      return;

    }



    const desplazamientoX = evento.clientX - this.inicioArrastreX;

    const desplazamientoY = evento.clientY - this.inicioArrastreY;



    this.contenedorArrastre.scrollLeft = this.scrollInicialX - desplazamientoX;

    this.contenedorArrastre.scrollTop = this.scrollInicialY - desplazamientoY;

    evento.preventDefault();

    evento.stopPropagation();

  }



  protected finalizarArrastreScroll(evento: PointerEvent): void {

    if (this.altoRendimiento()) {

      return;

    }



    if (!this.contenedorArrastre) {

      return;

    }



    if (this.contenedorArrastre.hasPointerCapture(evento.pointerId)) {

      this.contenedorArrastre.releasePointerCapture(evento.pointerId);

    }



    this.contenedorArrastre = null;

    this.arrastrandoGrafico.set(false);

    evento.stopPropagation();

  }



  protected obtenerPorcentaje(barra: BarraGrafico): number {

    return obtenerPorcentajeBarraGrafico(barra.valor, barra.tope);

  }



  protected obtenerClaseEstado(barra: BarraGrafico): string {

    if (barra.barraClase) {

      const override = barra.barraClase(barra);

      if (override) {

        return override;

      }

    }



    return obtenerClaseEstadoBarraGrafico(barra.valor, barra.tope);

  }



  protected obtenerTrack(index: number, barra: BarraGrafico): string | number {

    return barra.id ?? `${barra.nombre}-${index}`;

  }



  protected obtenerTrackDuelo(index: number): string {

    return `duelo-${index}`;

  }



  protected estaEnTope(barra: BarraGrafico): boolean {

    return estaBarraGraficoEnTope(barra.valor, barra.tope);

  }



  protected obtenerEtiquetaValor(barra: BarraGrafico): string {

    if (barra.barraEtiqueta) {

      return barra.barraEtiqueta(barra, false);

    }



    return formatearEtiquetaValorBarraGrafico(barra, false);

  }



  protected obtenerEtiquetaValorVs(barra: BarraGrafico): string {

    if (barra.barraEtiqueta) {

      return barra.barraEtiqueta(barra, true);

    }



    return formatearEtiquetaValorBarraGrafico(barra, true);

  }



  protected estiloRelleno(barra: BarraGrafico): Record<string, string> {

    return {

      '--barra-valor': `${this.obtenerPorcentaje(barra)}%`,
      ...(barra.color ? { '--barra-color': barra.color } : {}),

    };

  }



  protected formatearEscalaK(valor: number): string {

    return formatearEscalaGraficoK(valor);

  }

}


