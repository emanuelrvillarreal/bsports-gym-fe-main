import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { SeoRouteData } from './core/routing/seo-route-data';
import { AuthSessionService } from './core/global-services/services/auth-session.service';
import { ColorThemeService } from './modules/ui/color-mod/color-theme.service';
import { ThemeModeService } from './modules/ui/dark-mode/theme-mode.service';

const SEO_POR_DEFECTO: SeoRouteData = {
  title: 'B Sports Gym',
  description: 'Starter reusable con core, layout, tema y componentes UI.',
};
const CLASE_SCROLLBAR_ACTIVA = 'app-scrollbar-activa';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly themeModeService = inject(ThemeModeService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esBrowser = isPlatformBrowser(this.platformId);
  private readonly tiempoVisibleScrollbar = 700;
  private readonly timeoutsScrollbar = new Map<Element, ReturnType<typeof setTimeout>>();
  private removerEscuchaScroll: (() => void) | null = null;

  constructor() {
    this.themeModeService.inicializar();
    this.colorThemeService.establecerContextoEmpresa(
      this.authSessionService.obtenerCompanyUuidBranding() || null,
    );
    this.colorThemeService.inicializar({ sincronizarBackend: false });

    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.actualizarSeoDeRutaActiva());

    this.actualizarSeoDeRutaActiva();
    this.inicializarScrollbarGlobal();
  }

  ngOnDestroy(): void {
    this.removerEscuchaScroll?.();
    this.limpiarTimeoutsScrollbar();
  }

  // Aplica title y description segun la ruta actualmente activa.
  private actualizarSeoDeRutaActiva(): void {
    const data = this.obtenerSeoRutaActiva();

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });
  }

  // Recorre el arbol de rutas hasta la hoja para obtener metadata SEO.
  private obtenerSeoRutaActiva(): SeoRouteData {
    let ruta: ActivatedRoute | null = this.activatedRoute;

    while (ruta?.firstChild) {
      ruta = ruta.firstChild;
    }

    const data = ruta?.snapshot.data as Partial<SeoRouteData> | undefined;

    return {
      title: data?.title ?? SEO_POR_DEFECTO.title,
      description: data?.description ?? SEO_POR_DEFECTO.description,
    };
  }

  private inicializarScrollbarGlobal(): void {
    if (!this.esBrowser) {
      return;
    }

    const handlerScroll = (evento: Event) =>
      this.mostrarScrollbarTemporalmente(this.obtenerElementoScrolleado(evento));

    this.document.addEventListener('scroll', handlerScroll, { capture: true, passive: true });
    this.removerEscuchaScroll = () => {
      this.document.removeEventListener('scroll', handlerScroll, { capture: true });
    };
  }

  private mostrarScrollbarTemporalmente(elemento: Element): void {
    elemento.classList.add(CLASE_SCROLLBAR_ACTIVA);
    this.limpiarTimeoutScrollbar(elemento);

    const timeoutId = setTimeout(() => {
      elemento.classList.remove(CLASE_SCROLLBAR_ACTIVA);
      this.timeoutsScrollbar.delete(elemento);
    }, this.tiempoVisibleScrollbar);

    this.timeoutsScrollbar.set(elemento, timeoutId);
  }

  private obtenerElementoScrolleado(evento: Event): Element {
    const target = evento.target;

    if (target instanceof Element) {
      return target;
    }

    return this.document.scrollingElement ?? this.document.documentElement;
  }

  private limpiarTimeoutScrollbar(elemento: Element): void {
    const timeoutId = this.timeoutsScrollbar.get(elemento);

    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    this.timeoutsScrollbar.delete(elemento);
  }

  private limpiarTimeoutsScrollbar(): void {
    this.timeoutsScrollbar.forEach((timeoutId, elemento) => {
      clearTimeout(timeoutId);
      elemento.classList.remove(CLASE_SCROLLBAR_ACTIVA);
    });

    this.timeoutsScrollbar.clear();
  }
}
