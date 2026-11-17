import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { driver, DriveStep, Driver } from 'driver.js';
import { filter } from 'rxjs';

import { AppRole } from '../../../core/auth/auth-role';
import { AuthService } from '../../../core/global-services/services/auth.service';
import { DRIVER_ONBOARDING_BY_ROLE, DRIVER_ONBOARDING_DEFINITIONS } from './driver-onboarding.registry';
import { DriverOnboardingConfigItem, DriverOnboardingDefinition, DriverOnboardingRole } from './driver-onboarding.models';
import { DriverOnboardingStorageService } from './driver-onboarding.storage.service';

@Injectable({ providedIn: 'root' })
export class DriverOnboardingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly storage = inject(DriverOnboardingStorageService);
  private readonly esNavegador = isPlatformBrowser(this.platformId);

  private readonly definitionsByKey = new Map(
    DRIVER_ONBOARDING_DEFINITIONS.map((definition) => [this.crearKey(definition.role, definition.routePath), definition]),
  );

  private routeTrackingInitialized = false;
  private activeDriver: Driver | null = null;
  private activeDriverKey: string | null = null;

  inicializarSeguimientoRutas(): void {
    if (!this.esNavegador || this.routeTrackingInitialized) {
      return;
    }

    this.routeTrackingInitialized = true;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.programarOnboardingDesdeUrl(event.urlAfterRedirects);
      });

    this.programarOnboardingDesdeUrl(this.router.url);
  }

  obtenerPanelPorRol(role: DriverOnboardingRole): DriverOnboardingConfigItem[] {
    return this.storage.construirPanelPorRol(role, DRIVER_ONBOARDING_BY_ROLE[role]);
  }

  actualizarEstadoPendiente(role: DriverOnboardingRole, routePath: string, pending: boolean): void {
    const definition = this.definitionsByKey.get(this.crearKey(role, routePath));
    if (!definition) {
      return;
    }

    this.storage.establecerPendiente(definition, pending);
  }

  actualizarEstadoPendienteRol(role: DriverOnboardingRole, pending: boolean): void {
    for (const definition of DRIVER_ONBOARDING_BY_ROLE[role]) {
      this.storage.establecerPendiente(definition, pending);
    }
  }

  private programarOnboardingDesdeUrl(url: string): void {
    const routePath = this.normalizarPath(url);
    const role = this.mapearRol(this.authService.obtenerRolUsuario());
    if (!role || !routePath) {
      this.destruirActivo();
      return;
    }

    const definition = this.definitionsByKey.get(this.crearKey(role, routePath));
    if (!definition || this.storage.estaCompletado(definition)) {
      this.destruirActivo();
      return;
    }

    const activeKey = this.crearKey(role, routePath);
    this.activeDriverKey = activeKey;

    window.setTimeout(() => {
      if (this.activeDriverKey !== activeKey) {
        return;
      }

      this.iniciar(definition);
    }, 180);
  }

  private iniciar(definition: DriverOnboardingDefinition): void {
    const steps = this.resolverSteps(definition);
    if (!steps.length) {
      return;
    }

    this.destruirActivo();

    const lastStepIndex = steps.length - 1;
    const instance = driver({
      animate: true,
      showProgress: true,
      smoothScroll: true,
      allowClose: true,
      overlayClickBehavior: () => undefined,
      stagePadding: 10,
      stageRadius: 14,
      overlayOpacity: 0.64,
      popoverClass: 'driver-onboarding__popover',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      steps,
      onPopoverRender: () => {
        this.renderizarBotonSkipFlotante(definition, instance);
      },
      onHighlighted: (_element, _step, options) => {
        if (options.state.activeIndex === lastStepIndex) {
          this.storage.marcarCompletado(definition);
        }
      },
      onDestroyed: () => {
        this.removerBotonSkipFlotante();
        if (this.activeDriver === instance) {
          this.activeDriver = null;
        }
      },
    });

    this.activeDriver = instance;
    instance.drive();
  }

  private resolverSteps(definition: DriverOnboardingDefinition): DriveStep[] {
    return definition.steps.map((step) => ({
      element: step.element,
      popover: step.popover,
    }));
  }

  private destruirActivo(): void {
    if (!this.activeDriver) {
      return;
    }

    this.removerBotonSkipFlotante();
    this.activeDriver.destroy();
    this.activeDriver = null;
  }

  private renderizarBotonSkipFlotante(definition: DriverOnboardingDefinition, instance: Driver): void {
    this.removerBotonSkipFlotante();
    const skipButton = document.createElement('button');
    skipButton.type = 'button';
    skipButton.className = 'driver-onboarding-skip-btn';
    skipButton.setAttribute('aria-label', 'Skip onboarding');
    skipButton.innerHTML = '<span class="driver-onboarding-skip-icon" aria-hidden="true">⏭</span><span>Skip</span>';
    skipButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.storage.marcarCompletado(definition);
      instance.destroy();
    });

    document.body.appendChild(skipButton);
  }

  private removerBotonSkipFlotante(): void {
    document.querySelector('.driver-onboarding-skip-btn')?.remove();
  }

  private mapearRol(role: AppRole | null): DriverOnboardingRole | null {
    switch (role) {
      case 'ADMIN':
      case 'ADM_RECEPCION':
      case 'SYSADMIN':
        return 'admin';
      case 'PROFESOR':
        return 'profesor';
      case 'SOCIO_TITULAR':
      case 'FAMILIAR':
        return 'miembro';
      default:
        return null;
    }
  }

  private normalizarPath(url: string): string {
    const [path] = url.split('?');
    return path.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private crearKey(role: DriverOnboardingRole, routePath: string): string {
    return `${role}:${routePath}`;
  }
}
