import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ColorHex = `#${string}`;

export type PaletaGuardada = {
  readonly primario: ColorHex;
  readonly secundario: ColorHex;
  readonly terciario: ColorHex;
};

type PaletaPersistida = Pick<PaletaGuardada, 'primario' | 'secundario'>;

const CLAVE_PALETA = 'b-spots.color-theme';
const CLAVE_PALETA_LEGACY = 'b-sports.paleta-colores';
const COLOR_PRIMARIO_PREDETERMINADO: ColorHex = '#4982fd';
const COLOR_SECUNDARIO_PREDETERMINADO: ColorHex = '#2563eb';
const COLOR_TERCIARIO_PREDETERMINADO: ColorHex = '#06b6d4';

/** Motor visual de branding. Solo administra variables CSS y caché local por empresa. */
@Injectable({ providedIn: 'root' })
export class ColorThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private inicializado = false;

  readonly colorPrimario = signal<ColorHex>(COLOR_PRIMARIO_PREDETERMINADO);
  readonly colorSecundario = signal<ColorHex>(COLOR_SECUNDARIO_PREDETERMINADO);
  readonly colorTerciario = signal<ColorHex>(COLOR_TERCIARIO_PREDETERMINADO);

  /** Mantiene compatibilidad con los puntos de arranque existentes. */
  inicializar(_opciones?: { readonly sincronizarBackend?: boolean }): void {
    if (this.inicializado) {
      return;
    }

    this.limpiarCacheContextualLegado();
    this.inicializado = true;
    this.establecerPaletaInterna(
      this.obtenerPaletaPersistida() ?? this.obtenerPaletaPredeterminada(),
      false,
    );
  }

  /** Mantiene la API de contexto, pero el branding persiste en una única clave global. */
  establecerContextoEmpresa(_uuid: string | null): void {
    this.limpiarCacheContextualLegado();
    this.inicializado = true;
    this.establecerPaletaInterna(
      this.obtenerPaletaPersistida() ?? this.obtenerPaletaPredeterminada(),
      false,
    );
  }

  establecerPaleta(paleta: PaletaGuardada): void {
    if (!this.esPaletaValida(paleta)) {
      return;
    }

    this.establecerPaletaInterna(paleta, true);
  }

  /** Aplica branding efímero para rutas públicas, sin modificar la preferencia del usuario. */
  establecerPaletaTemporal(primario?: string | null, secundario?: string | null): void {
    const actual = this.obtenerPaletaActual();
    this.establecerPaletaInterna(
      {
        primario: this.esColorHexValido(primario) ? primario : actual.primario,
        secundario: this.esColorHexValido(secundario) ? secundario : actual.secundario,
        terciario: actual.terciario,
      },
      false,
    );
  }

  /** Guarda el branding resuelto para que las rutas siguientes reutilicen la paleta del club. */
  establecerPaletaEmpresa(primario?: string | null, secundario?: string | null): void {
    const actual = this.obtenerPaletaActual();
    const paleta: PaletaGuardada = {
      primario: this.esColorHexValido(primario) ? primario : actual.primario,
      secundario: this.esColorHexValido(secundario) ? secundario : actual.secundario,
      terciario: actual.terciario,
    };

    if (paleta.primario === actual.primario && paleta.secundario === actual.secundario) {
      return;
    }

    this.establecerPaletaInterna(paleta, true);
  }

  /** Restaura el tema elegido previamente al salir de un flujo público por empresa. */
  restaurarPaletaBase(): void {
    this.establecerPaletaInterna(
      this.obtenerPaletaPersistida() ?? this.obtenerPaletaPredeterminada(),
      false,
    );
  }

  /** Restablece visualmente la paleta original sin reemplazar la preferencia guardada. */
  aplicarPaletaPredeterminadaTemporal(): void {
    this.establecerPaletaInterna(this.obtenerPaletaPredeterminada(), false);
  }

  seleccionarPrimario(color: ColorHex): void {
    this.establecerPaleta({ ...this.obtenerPaletaActual(), primario: color });
  }

  seleccionarSecundario(color: ColorHex): void {
    this.establecerPaleta({ ...this.obtenerPaletaActual(), secundario: color });
  }

  seleccionarTerciario(color: ColorHex): void {
    this.establecerPaleta({ ...this.obtenerPaletaActual(), terciario: color });
  }

  randomizarPaleta(): void {
    const usados = new Set<string>();
    const primario = this.generarColorAleatorio(usados);
    usados.add(primario);
    const secundario = this.generarColorAleatorio(usados);
    usados.add(secundario);

    this.establecerPaleta({
      primario,
      secundario,
      terciario: this.generarColorAleatorio(usados),
    });
  }

  restablecerPredeterminados(): void {
    this.establecerPaleta(this.obtenerPaletaPredeterminada());
  }

  obtenerPaletaActual(): PaletaGuardada {
    return {
      primario: this.colorPrimario(),
      secundario: this.colorSecundario(),
      terciario: this.colorTerciario(),
    };
  }

  obtenerPaletaPredeterminada(): PaletaGuardada {
    return {
      primario: COLOR_PRIMARIO_PREDETERMINADO,
      secundario: COLOR_SECUNDARIO_PREDETERMINADO,
      terciario: COLOR_TERCIARIO_PREDETERMINADO,
    };
  }

  private establecerPaletaInterna(paleta: PaletaGuardada, persistir: boolean): void {
    this.colorPrimario.set(paleta.primario);
    this.colorSecundario.set(paleta.secundario);
    this.colorTerciario.set(paleta.terciario);
    this.aplicarPaleta(paleta);

    if (persistir) {
      this.guardarPaleta(paleta);
    }
  }

  private guardarPaleta(paleta: PaletaGuardada): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      const paletaSerializada = JSON.stringify(this.obtenerPaletaPersistidaSinTerciario(paleta));
      localStorage.setItem(CLAVE_PALETA, paletaSerializada);
    } catch {
      // El preview sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  }

  private obtenerPaletaPersistida(): PaletaGuardada | null {
    if (!this.esNavegador) {
      return null;
    }

    try {
      const persistida =
        localStorage.getItem(CLAVE_PALETA) ?? sessionStorage.getItem(CLAVE_PALETA_LEGACY);
      if (!persistida) {
        return null;
      }

      return this.normalizarPaletaPersistida(JSON.parse(persistida));
    } catch {
      return null;
    }
  }

  private limpiarCacheContextualLegado(): void {
    if (!this.esNavegador) return;

    try {
      const prefijo = `${CLAVE_PALETA}.`;
      for (let indice = localStorage.length - 1; indice >= 0; indice -= 1) {
        const clave = localStorage.key(indice);
        if (clave?.startsWith(prefijo)) localStorage.removeItem(clave);
      }
    } catch {
      // El tema puede seguir aplicandose aunque el storage este bloqueado.
    }
  }

  /** Mantiene el terciario para los estilos existentes, sin persistirlo en nuevas paletas. */
  private normalizarPaletaPersistida(valor: unknown): PaletaGuardada | null {
    if (typeof valor !== 'object' || valor === null) return null;

    const candidata = valor as Partial<PaletaGuardada>;
    if (
      !this.esColorHexValido(candidata.primario) ||
      !this.esColorHexValido(candidata.secundario)
    ) {
      return null;
    }

    return {
      primario: candidata.primario,
      secundario: candidata.secundario,
      terciario: this.esColorHexValido(candidata.terciario)
        ? candidata.terciario
        : COLOR_TERCIARIO_PREDETERMINADO,
    };
  }

  private obtenerPaletaPersistidaSinTerciario(paleta: PaletaGuardada): PaletaPersistida {
    return { primario: paleta.primario, secundario: paleta.secundario };
  }

  private aplicarPaleta(paleta: PaletaGuardada): void {
    if (!this.esNavegador) {
      return;
    }

    const accentSoft = `color-mix(in srgb, ${paleta.primario} 22%, var(--app-bg))`;
    const variables: ReadonlyArray<readonly [string, string]> = [
      ['--color-primario', paleta.primario],
      ['--color-secundario', paleta.secundario],
      ['--color-terciario', paleta.terciario],
      ['--brand-primary', paleta.primario],
      ['--brand-secondary', paleta.secundario],
      ['--brand-tertiary', paleta.terciario],
      ['--interactive-primary', paleta.primario],
      // En modo claro se oscurece (--app-accent-fuerza en styles.scss) para que el texto del color del club
      // se lea sobre blanco; en oscuro queda tal cual.
      ['--app-accent', `color-mix(in srgb, ${paleta.primario} var(--app-accent-fuerza, 100%), #000000)`],
      ['--app-accent-soft', accentSoft],
    ];

    for (const elemento of [this.document.body, this.document.documentElement]) {
      for (const [variable, valor] of variables) {
        elemento.style.setProperty(variable, valor);
      }
    }
  }

  private esPaletaValida(valor: unknown): valor is PaletaGuardada {
    if (typeof valor !== 'object' || valor === null) {
      return false;
    }

    const candidata = valor as Partial<PaletaGuardada>;
    return (
      this.esColorHexValido(candidata.primario) &&
      this.esColorHexValido(candidata.secundario) &&
      this.esColorHexValido(candidata.terciario)
    );
  }

  private esColorHexValido(valor: unknown): valor is ColorHex {
    return typeof valor === 'string' && /^#[\da-fA-F]{6}$/.test(valor);
  }

  private generarColorAleatorio(excluidos: ReadonlySet<string>): ColorHex {
    let color: ColorHex;
    do {
      const canal = (): string =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, '0');
      color = `#${canal()}${canal()}${canal()}`;
    } while (excluidos.has(color));
    return color;
  }
}
