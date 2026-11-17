// Ejemplo de archivos environment para Angular
// Cada entorno de deploy necesita su propio archivo environment.<nombre>.ts
// El campo "environment" en deploy.yml selecciona cuál se usa en el build.

// src/environments/environment.ts  (archivo base, usado en desarrollo local sin Docker)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:9050/api',
  featureNewUi: false,
};

// ---

// src/environments/environment.prod.ts  (deploy.yml: environment: production)
export const environment = {
  production: true,
  apiUrl: 'https://app.blueopendata.com/mi-app/api',
  featureNewUi: true,
};

// ---

// src/environments/environment.st7.ts  (deploy.yml: environment: st7)
export const environment = {
  production: false,
  apiUrl: 'https://stg.blueopendata.com/mi-app/api',
  featureNewUi: true,
};

// ---

// src/environments/environment.local.ts  (deploy.yml local: environment: local)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:9050/api',
  featureNewUi: true,
};
