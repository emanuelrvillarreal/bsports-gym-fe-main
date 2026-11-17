import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { catchError, filter, of } from 'rxjs';

import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import { SolapaNavegable, SolapasComponent } from '../../../ui/solapas/solapas.component';
import { AyudaPantallaComponent } from '../../components/ayuda-pantalla/ayuda-pantalla.component';
import { DatosRutaSeccion } from '../../secciones-administracion.guards';
import {
  obtenerRutaSolapa,
  obtenerSeccionAdministracion,
  obtenerSolapasVisibles,
} from '../../secciones-administracion';

/**
 * Contenedor de una sección del panel administrativo: dibuja las solapas que el rol puede
 * ver y el club no ocultó, y debajo la pantalla de la solapa activa. Con una sola solapa
 * visible no muestra la barra.
 */
@Component({
  selector: 'app-seccion-con-solapas-page',
  imports: [AyudaPantallaComponent, RouterOutlet, SolapasComponent],
  template: `
    @if (solapas().length > 1) {
      <app-solapas [solapas]="solapas()" [etiquetaGrupo]="'Pantallas de ' + seccion.etiqueta" />
    }
    <app-ayuda-pantalla [clave]="solapaActiva()" />
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionConSolapasPageComponent {
  private readonly menuSolapas = inject(MenuSolapasService);
  private readonly sociosApi = inject(SociosApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datos = inject(ActivatedRoute).snapshot.data as DatosRutaSeccion;

  protected readonly seccion = obtenerSeccionAdministracion(this.datos.seccionId);
  private readonly solicitudesPendientes = signal<number | null>(null);
  private readonly router = inject(Router);
  private readonly url = signal(this.router.url);
  /** Id de la solapa que se está viendo (para la ayuda de la pantalla). */
  protected readonly solapaActiva = computed(() => {
    const ruta = this.url().split(/[?#]/)[0];
    const visibles = obtenerSolapasVisibles(this.seccion, this.datos.rolMenu, this.menuSolapas.ocultas());
    // La ruta más larga que coincide gana (la solapa raíz '' coincide con todas).
    const candidatas = visibles
      .map((solapa) => ({ id: solapa.id, ruta: obtenerRutaSolapa(this.datos.rolMenu, this.seccion, solapa) }))
      .filter((c) => ruta === c.ruta || ruta.startsWith(c.ruta + '/'))
      .sort((a, b) => b.ruta.length - a.ruta.length);
    return candidatas[0]?.id ?? null;
  });

  protected readonly solapas = computed((): readonly SolapaNavegable[] =>
    obtenerSolapasVisibles(this.seccion, this.datos.rolMenu, this.menuSolapas.ocultas()).map(
      (solapa) => ({
        etiqueta: solapa.etiqueta,
        icono: solapa.icono,
        ruta: obtenerRutaSolapa(this.datos.rolMenu, this.seccion, solapa),
        contador: solapa.id === 'solicitudes' ? this.solicitudesPendientes() : null,
      }),
    ),
  );

  constructor() {
    this.menuSolapas.asegurarCargado().pipe(takeUntilDestroyed()).subscribe();
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.url.set(this.router.url));

    if (this.seccion.id === 'socios') {
      this.actualizarSolicitudesPendientes();
      // Al aprobar o rechazar una solicitud y cambiar de solapa, el contador se refresca.
      inject(Router)
        .events.pipe(
          filter((evento) => evento instanceof NavigationEnd),
          takeUntilDestroyed(),
        )
        .subscribe(() => this.actualizarSolicitudesPendientes());
    }
  }

  private actualizarSolicitudesPendientes(): void {
    const solicitudesVisible = obtenerSolapasVisibles(
      this.seccion,
      this.datos.rolMenu,
      this.menuSolapas.ocultas(),
    ).some((solapa) => solapa.id === 'solicitudes');
    if (!solicitudesVisible) {
      return;
    }

    this.sociosApi
      .listarSolicitudes({ page: 0, size: 1, search: '' })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((pagina) => this.solicitudesPendientes.set(pagina?.totalElements ?? null));
  }
}
