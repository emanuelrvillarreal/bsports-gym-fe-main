import { Routes } from '@angular/router';

import { authSessionGuard } from '../../core/guards/auth-role.guard';

export type EstadoResultadoPago = 'exito' | 'error';

const cargarResultadoPago = () =>
  import('./pages/resultado-pago/resultado-pago-page.component').then(
    (m) => m.ResultadoPagoPageComponent,
  );

const cargarResultadoPagoFactura = () =>
  import('../_administradores/pages/resultado-pago-factura/resultado-pago-factura-page.component').then(
    (m) => m.ResultadoPagoFacturaPageComponent,
  );

export const PAGO_ROUTES: Routes = [
  {
    path: 'pago',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'error',
      },
      {
        path: 'exito',
        data: { estadoResultado: 'exito' satisfies EstadoResultadoPago },
        loadComponent: cargarResultadoPago,
      },
      {
        path: 'error',
        data: { estadoResultado: 'error' satisfies EstadoResultadoPago },
        loadComponent: cargarResultadoPago,
      },
    ],
  },
  {
    path: 'pago-factura',
    canActivate: [authSessionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'fallo' },
      {
        path: 'exito',
        data: { estadoResultadoFactura: 'exito' },
        loadComponent: cargarResultadoPagoFactura,
      },
      {
        path: 'fallo',
        data: { estadoResultadoFactura: 'fallo' },
        loadComponent: cargarResultadoPagoFactura,
      },
      {
        path: 'pendiente',
        data: { estadoResultadoFactura: 'pendiente' },
        loadComponent: cargarResultadoPagoFactura,
      },
    ],
  },
];
