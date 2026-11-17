import { isPlatformBrowser, Location } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { LoadSpinnerComponent } from '../../../ui/load-spinner/load-spinner.component';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-finish-login-page',
  standalone: true,
  imports: [LoadSpinnerComponent],
  templateUrl: './finish-login-page.component.html',
  styleUrl: './finish-login-page.component.scss',
})
export class FinishLoginPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly loginService = inject(LoginService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private intentoCanjeado = false;

  protected readonly procesando = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    if (!this.esNavegador || this.intentoCanjeado) return;
    this.intentoCanjeado = true;

    const code = this.route.snapshot.queryParamMap.get('code')?.trim() ?? '';
    this.location.replaceState('/auth/finish-login');
    if (!code) {
      this.mostrarError('El enlace no es válido o expiró.');
      return;
    }

    this.loginService
      .completarLoginSinContrasena(code)
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (rutaInicio) => void this.router.navigateByUrl(rutaInicio),
        error: () => this.mostrarError('El enlace no es válido o expiró.'),
      });
  }

  private mostrarError(mensaje: string): void {
    this.error.set(mensaje);
    this.procesando.set(false);
  }
}
