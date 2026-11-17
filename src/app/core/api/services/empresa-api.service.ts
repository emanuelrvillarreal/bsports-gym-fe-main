import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { OMITIR_AUTH } from '../../interceptors/context/auth-context';
import { conCompanyUuid, sinCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  EmpresaDto,
  EmpresaPublicaDto,
  EmpresasPaginateRequest,
  MenuSolapasDto,
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../interfaces/empresa.interfaces';
import { PageResponse } from '../interfaces/paginate.interface';

@Injectable({ providedIn: 'root' })
export class EmpresaApiService {
  private readonly http = inject(HttpClient);

  obtenerPublicaPorPath(path: string): Observable<EmpresaPublicaDto> {
    return this.http.get<EmpresaPublicaDto>(
      crearApiUrl(API_ROUTES.empresas.obtenerPublicaPorPath(path.trim())),
      {
        context: sinCompanyUuid(new HttpContext().set(OMITIR_AUTH, true)),
      },
    );
  }

  paginarClubes(payload: EmpresasPaginateRequest): Observable<PageResponse<EmpresaDto>> {
    return this.http.post<PageResponse<EmpresaDto>>(
      crearApiUrl(API_ROUTES.empresas.paginarClubes),
      payload,
      { context: sinCompanyUuid().set(MOSTRAR_TOAST_ERROR, { titulo: 'Empresas' }) },
    );
  }

  obtenerPerfil(companyUuid: string): Observable<PerfilEmpresaDto> {
    return this.http.get<PerfilEmpresaDto>(crearApiUrl(API_ROUTES.empresas.obtenerPerfil), {
      context: this.crearContextoEmpresa(companyUuid).set(MOSTRAR_TOAST_ERROR, {
        titulo: 'Perfil del gimnasio',
      }),
    });
  }

  actualizarPerfil(companyUuid: string, payload: PerfilEmpresaPayload): Observable<EmpresaDto> {
    return this.http.put<EmpresaDto>(crearApiUrl(API_ROUTES.empresas.actualizarPerfil), payload, {
      context: this.crearContextoEmpresa(companyUuid)
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Perfil del gimnasio actualizado' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Perfil del gimnasio' }),
    });
  }

  subirLogo(companyUuid: string, archivo: File): Observable<EmpresaDto> {
    const formData = new FormData();
    formData.append('file', archivo);

    return this.http
      .post<unknown>(crearApiUrl(API_ROUTES.empresas.subirLogo), formData, {
        context: this.crearContextoEmpresa(companyUuid)
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Logo del gimnasio guardado' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Logo del gimnasio' }),
      })
      .pipe(map((respuesta) => this.extraerEmpresa(respuesta)));
  }

  eliminarLogo(companyUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.empresas.eliminarLogo), {
      context: this.crearContextoEmpresa(companyUuid)
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Logo del gimnasio eliminado' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Logo del gimnasio' }),
    });
  }

  obtenerMenuSolapas(companyUuid: string): Observable<MenuSolapasDto> {
    return this.http.get<MenuSolapasDto>(crearApiUrl(API_ROUTES.empresas.menuSolapas), {
      context: this.crearContextoEmpresa(companyUuid),
    });
  }

  guardarMenuSolapas(companyUuid: string, payload: MenuSolapasDto): Observable<MenuSolapasDto> {
    return this.http.put<MenuSolapasDto>(crearApiUrl(API_ROUTES.empresas.menuSolapas), payload, {
      context: this.crearContextoEmpresa(companyUuid)
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Menú actualizado' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Menú y solapas' }),
    });
  }

  private extraerEmpresa(respuesta: unknown): EmpresaDto {
    const candidata = this.esEmpresaDto(respuesta)
      ? respuesta
      : typeof respuesta === 'object' && respuesta !== null
        ? (respuesta as { data?: unknown }).data
        : null;

    if (!this.esEmpresaDto(candidata)) {
      throw new Error('La respuesta del logo no contiene una empresa valida.');
    }

    return candidata;
  }

  private esEmpresaDto(valor: unknown): valor is EmpresaDto {
    return (
      typeof valor === 'object' &&
      valor !== null &&
      typeof (valor as Partial<EmpresaDto>).uuid === 'string'
    );
  }

  private crearContextoEmpresa(companyUuid: string): HttpContext {
    return conCompanyUuid(new HttpContext(), companyUuid.trim());
  }
}
