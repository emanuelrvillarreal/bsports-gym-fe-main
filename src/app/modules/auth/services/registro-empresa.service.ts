import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SysadminApiService } from '../../../core/api/services/sysadmin-api.service';
import {
  RegistroEmpresaPayload,
  RegistroEmpresaResponse,
} from '../interfaces/registro-empresa.interface';

@Injectable({
  providedIn: 'root',
})
export class RegistroEmpresaService {
  private readonly sysadminApi = inject(SysadminApiService);

  registrarEmpresa(payload: RegistroEmpresaPayload): Observable<RegistroEmpresaResponse> {
    return this.sysadminApi.registrarClub(payload);
  }
}
