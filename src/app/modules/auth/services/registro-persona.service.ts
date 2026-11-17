import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../../core/api/api-routes';
import { crearApiUrl } from '../../../core/api/api-url';
import { OMITIR_AUTH } from '../../../core/interceptors/context/auth-context';
import { conCompanyUuid } from '../../../core/interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_ERROR } from '../../../core/interceptors/context/http-toast-context';
import {
  RegistroPersonaPayload,
  RegistroPersonaResponse,
} from '../interfaces/registro-persona.interface';

@Injectable({
  providedIn: 'root',
})
export class RegistroPersonaService {
  private readonly http = inject(HttpClient);

  registrarPersona(
    companyUuid: string,
    valor: RegistroPersonaPayload,
  ): Observable<RegistroPersonaResponse> {
    const payload: RegistroPersonaPayload = {
      nombre: valor.nombre.trim(),
      apellido: valor.apellido.trim(),
      email: valor.email.trim().toLowerCase(),
      ...(valor.password ? { password: valor.password } : {}),
      ...(valor.dni?.trim() ? { dni: valor.dni.trim() } : {}),
      ...(valor.telefono?.trim() ? { telefono: valor.telefono.trim() } : {}),
      ...(valor.fechaNacimiento?.trim() ? { fechaNacimiento: valor.fechaNacimiento.trim() } : {}),
    };

    const contextoPublico = conCompanyUuid(
      new HttpContext().set(OMITIR_AUTH, true),
      companyUuid.trim(),
    ).set(MOSTRAR_TOAST_ERROR, { titulo: 'Solicitud de registro' });

    return this.http.post<RegistroPersonaResponse>(
      crearApiUrl(API_ROUTES.socios.registrarTitularPublico),
      payload,
      { context: contextoPublico },
    );
  }
}
