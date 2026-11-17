import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  EquipamientoDetalleDto,
  EquipamientoPayload,
  FiltrosEquipamiento,
  MantenimientoPayload,
  PaginaEquipamiento,
  ResumenEquipamientoDto,
} from '../interfaces/equipamiento.interfaces';
import { normalizar } from './entrenamiento-api.service';
import { aFechaIso } from './seguimiento-asistencia-api.service';

/** Inventario de equipamiento y mantenimientos del club (solo ADMIN). */
@Injectable({ providedIn: 'root' })
export class EquipamientoApiService {
  private readonly http = inject(HttpClient);
  private readonly rutas = API_ROUTES.equipamiento;

  listar(filtros: FiltrosEquipamiento): Observable<PaginaEquipamiento> {
    return this.http
      .post<PaginaEquipamiento>(crearApiUrl(this.rutas.paginar), filtros, { context: this.lectura('Equipamiento') })
      .pipe(
        map((pagina) => ({
          ...pagina,
          content: pagina.content.map((f) => ({
            ...f,
            ultimoMantenimiento: aFechaIso(f.ultimoMantenimiento),
            proximoMantenimiento: aFechaIso(f.proximoMantenimiento),
          })),
        })),
      );
  }

  resumen(): Observable<ResumenEquipamientoDto> {
    return this.http.get<ResumenEquipamientoDto>(crearApiUrl(this.rutas.resumen), { context: this.lectura('Equipamiento') });
  }

  obtener(uuid: string): Observable<EquipamientoDetalleDto> {
    return this.http
      .get<EquipamientoDetalleDto>(crearApiUrl(this.rutas.equipo(uuid)), { context: this.lectura('Equipamiento') })
      .pipe(map(normalizarDetalle));
  }

  crear(payload: EquipamientoPayload): Observable<EquipamientoDetalleDto> {
    return this.http
      .post<EquipamientoDetalleDto>(crearApiUrl(this.rutas.base), payload, { context: this.mutacion('Equipamiento creado') })
      .pipe(map(normalizarDetalle));
  }

  editar(uuid: string, payload: EquipamientoPayload): Observable<EquipamientoDetalleDto> {
    return this.http
      .put<EquipamientoDetalleDto>(crearApiUrl(this.rutas.equipo(uuid)), payload, { context: this.mutacion('Equipamiento actualizado') })
      .pipe(map(normalizarDetalle));
  }

  eliminar(uuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(this.rutas.equipo(uuid)), { context: this.mutacion('Equipamiento eliminado') });
  }

  registrarMantenimiento(uuid: string, payload: MantenimientoPayload): Observable<EquipamientoDetalleDto> {
    return this.http
      .post<EquipamientoDetalleDto>(crearApiUrl(this.rutas.mantenimientos(uuid)), payload, {
        context: this.mutacion('Mantenimiento registrado'),
      })
      .pipe(map(normalizarDetalle));
  }

  eliminarMantenimiento(uuid: string): Observable<EquipamientoDetalleDto> {
    return this.http
      .delete<EquipamientoDetalleDto>(crearApiUrl(this.rutas.mantenimiento(uuid)), {
        context: this.mutacion('Mantenimiento eliminado'),
      })
      .pipe(map(normalizarDetalle));
  }

  private lectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }

  private mutacion(exito: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_EXITO, { titulo: exito }).set(MOSTRAR_TOAST_ERROR, { titulo: 'Equipamiento' });
  }
}

function normalizarDetalle(detalle: EquipamientoDetalleDto): EquipamientoDetalleDto {
  const base = normalizar(detalle);
  return {
    ...base,
    fechaAdquisicion: aFechaIso(detalle.fechaAdquisicion),
    proximoMantenimiento: aFechaIso(detalle.proximoMantenimiento),
    mantenimientos: base.mantenimientos.map((m) => ({ ...m, proximoMantenimiento: aFechaIso(m.proximoMantenimiento) })),
  };
}
