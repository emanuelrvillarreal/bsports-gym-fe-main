import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ResetPassPayload } from '../../../core/global-services/interfaces/auth-service.interfaces';
import { AuthService } from '../../../core/global-services/services/auth.service';
import { AuthSessionService } from '../../../core/global-services/services/auth-session.service';
import { LoginFormularioPayload } from '../interfaces/login.interface';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);

  iniciarSesion(payload: LoginFormularioPayload, companyUuid?: string): Observable<string> {
    const companyUuidNormalizado = companyUuid?.trim() ?? '';
    this.authSessionService.guardarCompanyUuidManual(companyUuidNormalizado);
    this.authService.limpiarContextoActivo();

    return this.authService.login({
      username: payload.username.trim(),
      password: payload.password.trim(),
      companyUuid: companyUuidNormalizado || null,
    }).pipe(
      map(() => this.authService.resolverRutaPostAutenticacion()),
    );
  }

  solicitarRecuperacionPassword(email: string, path?: string): Observable<void> {
    const pathNormalizado = path?.trim();

    return this.authService.solicitarRecuperacionContrasena({
      email: email.trim().toLowerCase(),
      ...(pathNormalizado ? { path: pathNormalizado } : {}),
    });
  }

  solicitarLoginSinContrasena(email: string, path?: string): Observable<void> {
    const pathNormalizado = path?.trim();

    return this.authService.solicitarLoginSinContrasena({
      email: email.trim().toLowerCase(),
      ...(pathNormalizado ? { path: pathNormalizado } : {}),
    });
  }

  completarLoginSinContrasena(code: string): Observable<string> {
    this.authSessionService.guardarCompanyUuidManual('');
    this.authService.limpiarContextoActivo();

    return this.authService
      .canjearLoginSinContrasena(code)
      .pipe(map(() => this.authService.resolverRutaPostAutenticacion()));
  }

  cambiarContrasenaConToken(payload: ResetPassPayload): Observable<void> {
    return this.authService.cambiarContrasena({
      email: payload.email.trim().toLowerCase(),
      code: payload.code.trim(),
      password: payload.password.trim(),
    });
  }
}
