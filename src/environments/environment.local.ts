export const environment = {
  production: false,
  /** URL base de la API levantada localmente con deploy/local.py (backend en Docker). */
  apiBaseUrl: 'http://localhost:7036/api',
  /** URL pública del frontend para enlaces compartibles en desarrollo local. */
  appBaseUrl: 'http://localhost:4200',
  crmRegisterUrl: 'http://localhost:4201/auth/register?uuid_sistema_externo=938059a7-f026-4dec-a848-4a9155b5fcc6',
};
