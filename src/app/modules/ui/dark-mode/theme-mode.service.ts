import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, RendererFactory2, inject, signal } from '@angular/core';

export type ThemeModePreference = 'system' | 'dark' | 'light';
export type ThemeModeResolved = 'dark' | 'light';

type PreferenciaGuardada = {
  readonly mode: ThemeModePreference;
};

const CLAVE_TEMA = 'b-spots.theme-mode';
const MEDIA_QUERY_COLOR_SCHEME = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeModeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private readonly mediaQueryList = this.esNavegador ? window.matchMedia(MEDIA_QUERY_COLOR_SCHEME) : null;
  private readonly listenerMediaQuery = (): void => this.aplicarModo();
  private inicializado = false;

  readonly mode = signal<ThemeModePreference>('light');
  readonly resolvedMode = signal<ThemeModeResolved>('light');

  inicializar(): void {
    if (this.inicializado) {
      return;
    }

    this.mode.set(this.obtenerModoInicial());
    this.aplicarModo();
    this.registrarEscuchaSistema();
    this.inicializado = true;
  }

  seleccionarModo(mode: ThemeModePreference): void {
    this.mode.set(mode);
    this.aplicarModo();
    this.guardarModo(mode);
  }

  alternarModo(): void {
    this.seleccionarModo(this.resolvedMode() === 'dark' ? 'light' : 'dark');
  }

  private obtenerModoInicial(): ThemeModePreference {
    if (!this.esNavegador) {
      return 'light';
    }

    try {
      const persistido = localStorage.getItem(CLAVE_TEMA);

      if (!persistido) {
        return 'light';
      }

      const parseado = JSON.parse(persistido) as Partial<PreferenciaGuardada>;
      if (!this.esModoValido(parseado.mode)) {
        return 'light';
      }

      if (parseado.mode === 'system') {
        return this.resolverModo('system');
      }

      return parseado.mode;
    } catch {
      return 'light';
    }
  }

  private guardarModo(mode: ThemeModePreference): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      const preferencia: PreferenciaGuardada = { mode };
      localStorage.setItem(CLAVE_TEMA, JSON.stringify(preferencia));
    } catch {
      return;
    }
  }

  private aplicarModo(): void {
    const resolvedMode = this.resolverModo(this.mode());
    this.resolvedMode.set(resolvedMode);

    if (!this.esNavegador) {
      return;
    }

    const html = this.document.documentElement;
    const body = this.document.body;
    const clases = [
      'theme-mode-dark',
      'theme-mode-light',
      'theme-mode-system',
      'dark-mode-on',
      'dark-mode-off',
    ];

    for (const clase of clases) {
      this.renderer.removeClass(html, clase);
      this.renderer.removeClass(body, clase);
    }

    this.renderer.addClass(html, `theme-mode-${resolvedMode}`);
    this.renderer.addClass(body, `theme-mode-${resolvedMode}`);
    this.renderer.addClass(html, `dark-mode-${resolvedMode === 'dark' ? 'on' : 'off'}`);
    this.renderer.addClass(body, `dark-mode-${resolvedMode === 'dark' ? 'on' : 'off'}`);

    if (this.mode() === 'system') {
      this.renderer.addClass(html, 'theme-mode-system');
      this.renderer.addClass(body, 'theme-mode-system');
    }
  }

  private resolverModo(mode: ThemeModePreference): ThemeModeResolved {
    if (mode === 'dark' || mode === 'light') {
      return mode;
    }

    return this.mediaQueryList?.matches ? 'dark' : 'light';
  }

  private registrarEscuchaSistema(): void {
    if (!this.mediaQueryList) {
      return;
    }

    if (typeof this.mediaQueryList.addEventListener === 'function') {
      this.mediaQueryList.addEventListener('change', this.listenerMediaQuery);
      return;
    }

    this.mediaQueryList.addListener(this.listenerMediaQuery);
  }

  private esModoValido(mode: unknown): mode is ThemeModePreference {
    return mode === 'dark' || mode === 'light' || mode === 'system';
  }
}
