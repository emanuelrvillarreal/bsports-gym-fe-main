import { AppRole } from '../../../../../core/auth/auth-role';
import { IconoApp } from '../../../../../core/icons/iconos-app.service';

export interface OpcionNavegacion {
  readonly etiqueta: string;
  readonly icono: IconoApp;
  readonly ruta?: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly href?: string;
  readonly externa?: boolean;
  readonly roles?: readonly AppRole[];
  /** Otras rutas en las que la opción se ve como activa (pantallas del mismo grupo). */
  readonly activaEn?: readonly string[];
}
