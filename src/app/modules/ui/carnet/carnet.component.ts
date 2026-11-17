import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroQrCode } from '@ng-icons/heroicons/outline';
import { LoadSpinnerComponent } from '../load-spinner/load-spinner.component';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { BotonComponent } from '../boton/boton.component';

export interface CarnetCampo {
  readonly etiqueta: string;
  readonly valor: string | readonly string[];
}

@Component({
  selector: 'app-carnet',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent, NgIcon, LoadSpinnerComponent],
  providers: [provideIcons({ heroQrCode })],
  templateUrl: './carnet.component.html',
  styleUrl: './carnet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarnetComponent implements OnDestroy {
  private static readonly DURACION_GIRO_MS = 480;
  private static readonly LOGO_FALLBACK_URL = 'assets/Logo BOP Solo.svg';

  readonly foto = input<string>('');
  readonly nombre = input<string>('');
  readonly apellido = input<string>('');
  readonly logo = input<string>('');
  readonly logoAlt = input<string>('Logo de la empresa');
  readonly campos = input<readonly CarnetCampo[]>([]);
  readonly qrContenido = input<string>('QR-CARNET-0001');
  readonly qrImagen = input<string>('');
  readonly altoRendimiento = input(false);
  readonly cargando = input(false);

  protected readonly logoSrc = computed(
    () => this.logo().trim() || CarnetComponent.LOGO_FALLBACK_URL,
  );
  protected readonly logoCargado = signal(false);
  protected readonly logoConError = signal(false);
  protected readonly fotoCargada = signal(false);
  protected readonly fotoConError = signal(false);
  protected readonly qrCargado = signal(false);
  protected readonly mostrandoDorso = signal(false);
  protected readonly animandoGiro = signal(false);
  protected readonly nombreCompleto = computed(() => `${this.nombre()} ${this.apellido()}`.trim());
  protected readonly iniciales = computed(() => {
    const partes = [this.nombre().trim(), this.apellido().trim()].filter(Boolean);
    if (!partes.length) {
      return '';
    }

    return partes
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly fotoSrc = computed(() => this.foto().trim());
  protected readonly fotoDisponible = computed(() => !!this.fotoSrc() && !this.fotoConError());
  protected readonly qrSvgSrc = computed(() => {
    const qrImagen = this.qrImagen().trim();
    return qrImagen
      ? this.normalizarQrImagen(qrImagen)
      : this.generarQrSvgDataUrl(this.qrContenido());
  });

  constructor() {
    effect(() => {
      const foto = this.fotoSrc();
      this.fotoConError.set(false);
      this.fotoCargada.set(!foto);
    });

    effect(() => {
      this.qrContenido();
      this.qrCargado.set(false);
    });

    effect(() => {
      this.logoSrc();
      this.logoCargado.set(false);
      this.logoConError.set(false);
    });
  }

  ngOnDestroy(): void {
    if (this.flipTimeoutId !== null) {
      window.clearTimeout(this.flipTimeoutId);
    }
  }

  protected manejarFotoCargada(): void {
    this.fotoCargada.set(true);
  }

  protected manejarFotoError(): void {
    this.fotoConError.set(true);
    this.fotoCargada.set(true);
  }

  protected manejarLogoCargado(): void {
    this.logoCargado.set(true);
    this.logoConError.set(false);
  }

  protected manejarLogoError(): void {
    this.logoCargado.set(false);
    this.logoConError.set(true);
  }

  protected manejarQrCargado(): void {
    this.qrCargado.set(true);
  }

  protected campoEsLista(campo: CarnetCampo): boolean {
    return Array.isArray(campo.valor);
  }

  protected valorCampo(campo: CarnetCampo): string {
    const valores = (Array.isArray(campo.valor) ? campo.valor : [campo.valor])
      .map((valor) => valor.trim())
      .filter(Boolean);

    return valores.join(', ') || '-';
  }

  protected mostrarDorso(): void {
    if (this.altoRendimiento()) {
      this.animandoGiro.set(false);
      this.mostrandoDorso.set(true);
      return;
    }

    this.iniciarGiro();
    this.mostrandoDorso.set(true);
  }

  protected mostrarFrente(): void {
    if (this.altoRendimiento()) {
      this.animandoGiro.set(false);
      this.mostrandoDorso.set(false);
      return;
    }

    this.iniciarGiro();
    this.mostrandoDorso.set(false);
  }

  private flipTimeoutId: number | null = null;

  private iniciarGiro(): void {
    this.animandoGiro.set(true);

    if (this.flipTimeoutId !== null) {
      window.clearTimeout(this.flipTimeoutId);
    }

    this.flipTimeoutId = window.setTimeout(() => {
      this.animandoGiro.set(false);
      this.flipTimeoutId = null;
    }, CarnetComponent.DURACION_GIRO_MS);
  }

  private generarQrSvgDataUrl(contenido: string): string {
    const valor = contenido.trim() || 'QR-CARNET';
    const tamano = 21;
    const celdas: string[] = [];

    for (let fila = 0; fila < tamano; fila += 1) {
      for (let columna = 0; columna < tamano; columna += 1) {
        if (this.esCeldaFija(fila, columna, tamano) || this.esCeldaActiva(valor, fila, columna)) {
          celdas.push(
            `<rect x="${columna}" y="${fila}" width="1" height="1" rx="0.08" ry="0.08" fill="#0f172a"/>`,
          );
        }
      }
    }

    const etiqueta = this.escaparXml(valor);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges">` +
      `<rect width="21" height="21" rx="1.2" ry="1.2" fill="#ffffff"/>` +
      celdas.join('') +
      `<title>${etiqueta}</title>` +
      `</svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private normalizarQrImagen(valor: string): string {
    if (valor.startsWith('data:image')) {
      return valor;
    }

    return `data:image/png;base64,${valor}`;
  }

  private esCeldaFija(fila: number, columna: number, tamano: number): boolean {
    const esquinas: Array<readonly [number, number]> = [
      [0, 0],
      [0, tamano - 7],
      [tamano - 7, 0],
    ];

    return esquinas.some(([filaInicio, columnaInicio]) => {
      const enArea =
        fila >= filaInicio &&
        fila < filaInicio + 7 &&
        columna >= columnaInicio &&
        columna < columnaInicio + 7;

      if (!enArea) {
        return false;
      }

      const borde =
        fila === filaInicio ||
        fila === filaInicio + 6 ||
        columna === columnaInicio ||
        columna === columnaInicio + 6;
      const centro =
        fila >= filaInicio + 2 &&
        fila <= filaInicio + 4 &&
        columna >= columnaInicio + 2 &&
        columna <= columnaInicio + 4;

      return borde || centro;
    });
  }

  private esCeldaActiva(contenido: string, fila: number, columna: number): boolean {
    const semilla = this.calcularSemilla(contenido, fila, columna);
    return semilla % 5 <= 1;
  }

  private calcularSemilla(contenido: string, fila: number, columna: number): number {
    let acumulado = fila * 31 + columna * 17;

    for (let indice = 0; indice < contenido.length; indice += 1) {
      acumulado =
        (acumulado * 33 + contenido.charCodeAt(indice) + fila + columna + indice) % 104729;
    }

    return acumulado;
  }

  private escaparXml(valor: string): string {
    return valor
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&apos;');
  }
}
