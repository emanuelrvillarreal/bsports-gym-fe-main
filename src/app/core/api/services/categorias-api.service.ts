import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  CategoriaDto,
  GuardarCategoriaCommand,
  PaginaCategoriasDto,
  PaginarCategoriasCommand,
} from '../interfaces/categorias.interfaces';

@Injectable({ providedIn: 'root' })
export class CategoriasApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<readonly CategoriaDto[]> {
    return this.http.get<readonly CategoriaDto[]>(crearApiUrl(API_ROUTES.categorias.listar), {
      context: this.contextoConsulta(),
    });
  }

  paginar(command: PaginarCategoriasCommand): Observable<PaginaCategoriasDto> {
    return this.http.post<PaginaCategoriasDto>(
      crearApiUrl(API_ROUTES.categorias.paginar),
      command,
      { context: this.contextoConsulta() },
    );
  }

  crear(command: GuardarCategoriaCommand): Observable<CategoriaDto> {
    return this.http.post<CategoriaDto>(crearApiUrl(API_ROUTES.categorias.crear), command, {
      context: this.contextoMutacion('Categoría creada'),
    });
  }

  actualizar(categoriaUuid: string, command: GuardarCategoriaCommand): Observable<CategoriaDto> {
    return this.http.put<CategoriaDto>(
      crearApiUrl(API_ROUTES.categorias.actualizar(categoriaUuid)),
      command,
      { context: this.contextoMutacion('Categoría actualizada') },
    );
  }

  eliminar(categoriaUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.categorias.eliminar(categoriaUuid)), {
      context: this.contextoMutacion('Categoría desactivada'),
    });
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Categorías' });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return this.contextoConsulta().set(MOSTRAR_TOAST_EXITO, { titulo });
  }
}
