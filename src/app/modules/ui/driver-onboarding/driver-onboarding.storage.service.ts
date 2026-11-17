import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

import {
  DriverOnboardingConfigItem,
  DriverOnboardingDefinition,
  DriverOnboardingRole,
  DriverOnboardingStoredPageState,
  DriverOnboardingStoredRoleState,
  DriverOnboardingStoredState,
} from './driver-onboarding.models';

const CLAVE_DRIVER_ONBOARDING = 'b-spots.driver-onboarding.state';

@Injectable({ providedIn: 'root' })
export class DriverOnboardingStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);

  private readonly estadoInterno = signal<DriverOnboardingStoredState>(this.cargarEstadoInicial());

  readonly estado = computed(() => this.estadoInterno());

  estaCompletado(definition: DriverOnboardingDefinition): boolean {
    const pageState = this.obtenerPageState(definition.role, definition.page);
    return pageState?.completed === true && pageState.version === definition.version;
  }

  marcarCompletado(definition: DriverOnboardingDefinition): void {
    this.actualizarPageState(definition.role, definition.page, {
      completed: true,
      version: definition.version,
    });
  }

  reactivar(definition: DriverOnboardingDefinition): void {
    this.actualizarPageState(definition.role, definition.page, {
      completed: false,
      version: definition.version,
    });
  }

  establecerPendiente(definition: DriverOnboardingDefinition, pending: boolean): void {
    if (pending) {
      this.reactivar(definition);
      return;
    }

    this.marcarCompletado(definition);
  }

  construirPanelPorRol(
    role: DriverOnboardingRole,
    definitions: readonly DriverOnboardingDefinition[],
  ): DriverOnboardingConfigItem[] {
    return definitions.map((definition) => {
      const completed = this.estaCompletado(definition);

      return {
        page: definition.page,
        routePath: definition.routePath,
        label: definition.label,
        description: definition.description,
        version: definition.version,
        completed,
        pending: !completed,
      };
    });
  }

  private actualizarPageState(
    role: DriverOnboardingRole,
    page: DriverOnboardingDefinition['page'],
    nextState: DriverOnboardingStoredPageState,
  ): void {
    const currentState = this.estadoInterno();
    const roleState: DriverOnboardingStoredRoleState = {
      ...(currentState[role] ?? {}),
      [page]: nextState,
    };
    const updatedState: DriverOnboardingStoredState = {
      ...currentState,
      [role]: roleState,
    };

    this.estadoInterno.set(updatedState);
    this.persistir(updatedState);
  }

  private obtenerPageState(
    role: DriverOnboardingRole,
    page: DriverOnboardingDefinition['page'],
  ): DriverOnboardingStoredPageState | undefined {
    return this.estadoInterno()[role]?.[page];
  }

  private cargarEstadoInicial(): DriverOnboardingStoredState {
    if (!this.esNavegador) {
      return {};
    }

    try {
      const persisted = localStorage.getItem(CLAVE_DRIVER_ONBOARDING);
      if (!persisted) {
        return {};
      }

      const parsed = JSON.parse(persisted) as DriverOnboardingStoredState & { socio?: DriverOnboardingStoredRoleState };
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }

      if (parsed.socio && !parsed.miembro) {
        const { socio, ...resto } = parsed;
        return { ...resto, miembro: socio };
      }

      return parsed;
    } catch {
      return {};
    }
  }

  private persistir(state: DriverOnboardingStoredState): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_DRIVER_ONBOARDING, JSON.stringify(state));
    } catch {
      return;
    }
  }
}
