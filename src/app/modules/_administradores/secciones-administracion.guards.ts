import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';

import { obtenerRutaPrincipalPorRol } from '../../core/auth/auth-role';
import { MenuSolapasService } from '../../core/global-services/services/menu-solapas.service';
import {
  RolAdministrativo,
  SeccionAdministracion,
  obtenerRutaPrimeraSolapaVisible,
  obtenerSeccionAdministracion,
  obtenerSolapasVisibles,
} from './secciones-administracion';

/** Datos que cada ruta de sección o solapa declara en `data`. */
export interface DatosRutaSeccion {
  readonly seccionId: string;
  readonly rolMenu: RolAdministrativo;
  readonly solapaId?: string;
}

/** Raíz de una sección (`/admin/socios`): envía a su primera solapa visible. */
export const redirigirPrimeraSolapaGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const { seccion, rol } = leerDatos(route);

  return inject(MenuSolapasService)
    .asegurarCargado()
    .pipe(map((ocultas) => crearDestino(router, rol, ocultas, seccion)));
};

/** Solapa puntual: si el club la ocultó, redirige a otra visible en vez de mostrarla. */
export const solapaVisibleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const { seccion, rol, solapaId } = leerDatos(route);

  return inject(MenuSolapasService)
    .asegurarCargado()
    .pipe(
      map((ocultas) =>
        obtenerSolapasVisibles(seccion, rol, ocultas).some((solapa) => solapa.id === solapaId)
          ? true
          : crearDestino(router, rol, ocultas, seccion),
      ),
    );
};

function leerDatos(route: ActivatedRouteSnapshot): {
  seccion: SeccionAdministracion;
  rol: RolAdministrativo;
  solapaId: string | undefined;
} {
  const datos = route.data as Partial<DatosRutaSeccion>;
  if (!datos.seccionId || !datos.rolMenu) {
    throw new Error('La ruta de sección debe declarar seccionId y rolMenu en data.');
  }
  return {
    seccion: obtenerSeccionAdministracion(datos.seccionId),
    rol: datos.rolMenu,
    solapaId: datos.solapaId,
  };
}

function crearDestino(
  router: Router,
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
  seccion: SeccionAdministracion,
): UrlTree {
  const ruta = obtenerRutaPrimeraSolapaVisible(rol, ocultas, seccion) ?? obtenerRutaPrincipalPorRol(rol);
  return router.parseUrl(ruta);
}
