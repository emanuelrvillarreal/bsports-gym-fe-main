import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionAsistenciasProfesorComponent } from '../../components/gestion-asistencias-profesor/gestion-asistencias-profesor.component';

@Component({ selector: 'app-asistencias-profesor-page', standalone: true, imports: [GestionAsistenciasProfesorComponent, TituloHeroComponent], template: `<main class="asistencias-page"><app-titulo-hero icono="actividades" titulo="Asistencias" subtitulo="Registrá la asistencia de tus actividades asignadas." /><app-gestion-asistencias-profesor /></main>`, styles: [':host { display: grid; gap: 1.25rem; }'], changeDetection: ChangeDetectionStrategy.OnPush })
export class AsistenciasProfesorPageComponent {}
