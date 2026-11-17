import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { RouterLink } from '@angular/router';

import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import { IconoApp, IconosAppService } from '../../../../core/icons/iconos-app.service';
import {
  RolAdministrativo,
  SECCIONES_ADMINISTRACION,
  obtenerRutaSolapa,
  obtenerSolapasVisibles,
} from '../../secciones-administracion';

interface TareaRapida {
  readonly titulo: string;
  readonly ayuda: string;
  readonly icono: IconoApp;
  readonly seccion: string;
  readonly solapa: string;
  readonly params?: Readonly<Record<string, string>>;
}

/** Tareas del día a día, en el orden en que se muestran. */
const TAREAS: readonly TareaRapida[] = [
  {
    titulo: 'Cobrar una cuota',
    ayuda: 'Elegís el socio, qué paga y cómo paga.',
    icono: 'tesoreria',
    seccion: 'tesoreria',
    solapa: 'cuotas',
    params: { accion: 'cobrar' },
  },
  {
    titulo: 'Buscar un socio',
    ayuda: 'Ver sus datos, si está al día y sus actividades.',
    icono: 'socios',
    seccion: 'socios',
    solapa: 'socios',
  },
  {
    titulo: 'Agregar un socio nuevo',
    ayuda: 'Cargar a una persona que se hace socia.',
    icono: 'socios',
    seccion: 'socios',
    solapa: 'socios',
    params: { accion: 'nuevo' },
  },
  {
    titulo: 'Anotar en una actividad',
    ayuda: 'Inscribir a un socio en una clase o deporte.',
    icono: 'actividades',
    seccion: 'actividades',
    solapa: 'actividades',
  },
  {
    titulo: 'Registrar un ingreso',
    ayuda: 'Anotar que un socio entró al gimnasio.',
    icono: 'credencial',
    seccion: 'accesos',
    solapa: 'accesos',
  },
  {
    titulo: 'Ver quién debe',
    ayuda: 'Las cuotas vencidas que faltan cobrar.',
    icono: 'tesoreria',
    seccion: 'tesoreria',
    solapa: 'cuotas',
    params: { estado: 'VENCIDA' },
  },
];

/**
 * Inicio "¿Qué querés hacer?": botones grandes con las tareas de todos los días, para quien no conoce el
 * menú. Solo muestra las tareas cuya pantalla el rol puede ver y el club no ocultó.
 */
@Component({
  selector: 'app-acciones-rapidas',
  standalone: true,
  imports: [NgIcon, RouterLink],
  templateUrl: './acciones-rapidas.component.html',
  styleUrl: './acciones-rapidas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccionesRapidasComponent {
  protected readonly iconos = inject(IconosAppService);
  private readonly menuSolapas = inject(MenuSolapasService);

  readonly rol = input.required<RolAdministrativo>();

  protected readonly tareas = computed(() => {
    const rol = this.rol();
    const ocultas = this.menuSolapas.ocultas();
    return TAREAS.flatMap((tarea) => {
      const seccion = SECCIONES_ADMINISTRACION.find((s) => s.id === tarea.seccion);
      const solapa = seccion && obtenerSolapasVisibles(seccion, rol, ocultas).find((s) => s.id === tarea.solapa);
      return seccion && solapa ? [{ ...tarea, ruta: obtenerRutaSolapa(rol, seccion, solapa) }] : [];
    });
  });
}
