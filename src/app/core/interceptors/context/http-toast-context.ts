import { HttpContextToken } from '@angular/common/http';

export interface HttpToastOptions {
  readonly titulo?: string;
  readonly subtitulo?: string;
  readonly duracionMs?: number;
  readonly fondoPeligro4xx?: boolean;
}

export const MOSTRAR_TOAST_EXITO = new HttpContextToken<HttpToastOptions | null>(() => null);
export const MOSTRAR_TOAST_ERROR = new HttpContextToken<HttpToastOptions | null>(() => null);
