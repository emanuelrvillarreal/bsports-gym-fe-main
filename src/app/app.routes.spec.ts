import { Route, Routes } from '@angular/router';

import { obtenerRutaPrincipalPorRol } from './core/auth/auth-role';
import { routes } from './app.routes';

function buscarRuta(rutas: Routes, path: string): Route | undefined {
  return rutas.find((ruta) => ruta.path === path);
}

function buscarHija(pathPadre: string, pathHija: string): Route | undefined {
  return buscarRuta(routes, pathPadre)?.children?.find((ruta) => ruta.path === pathHija);
}

/** Pantalla montada como solapa dentro de una sección (`/admin/socios/solicitudes`). */
function buscarSolapa(perfil: string, seccion: string, solapa: string): Route | undefined {
  return buscarHija(perfil, seccion)?.children?.find((ruta) => ruta.path === solapa);
}

describe('rutas por perfil', () => {
  it('expone los resultados de pago como rutas públicas sin layout', () => {
    const pago = buscarRuta(routes, 'pago');
    const exito = buscarHija('pago', 'exito');
    const error = buscarHija('pago', 'error');

    expect(pago?.component).toBeUndefined();
    expect(pago?.loadComponent).toBeUndefined();
    expect(pago?.canActivate).toBeUndefined();
    expect(pago?.canActivateChild).toBeUndefined();
    expect(buscarHija('pago', '')).toMatchObject({
      pathMatch: 'full',
      redirectTo: 'error',
    });
    expect(exito?.data?.['estadoResultado']).toBe('exito');
    expect(error?.data?.['estadoResultado']).toBe('error');
    expect(exito?.loadComponent).toBeDefined();
    expect(exito?.loadComponent).toBe(error?.loadComponent);
  });

  it('registra pago antes del wildcard global', () => {
    expect(routes.indexOf(buscarRuta(routes, 'pago')!)).toBeLessThan(
      routes.indexOf(buscarRuta(routes, '**')!),
    );
  });

  it('resuelve la raiz y las rutas desconocidas sin encadenar redirecciones', () => {
    const redireccionInicial = buscarRuta(routes, '')?.redirectTo;

    expect(typeof redireccionInicial).toBe('function');
    expect(buscarRuta(routes, '')?.pathMatch).toBe('full');
    expect(buscarRuta(routes, 'inicio')?.redirectTo).toBe(redireccionInicial);
    expect(buscarRuta(routes, '**')?.redirectTo).toBe(redireccionInicial);
  });

  it('conserva las rutas públicas y elimina aliases privados legacy', () => {
    expect(buscarRuta(routes, 'login')).toBeDefined();
    expect(buscarRuta(routes, 'registro')).toBeDefined();
    expect(buscarRuta(routes, 'forgot-password')).toBeDefined();
    expect(buscarRuta(routes, 'registrate')?.redirectTo).toBe('registro');
    expect(buscarRuta(routes, 'cliente')).toBeUndefined();
    expect(buscarRuta(routes, 'administracion')).toBeUndefined();
    expect(buscarRuta(routes, 'profesores')).toBeUndefined();
  });

  it('unifica la selección de empresa y rol en una sola ruta', () => {
    const seleccionContexto = buscarRuta(routes, 'seleccionar-empresa');

    expect(seleccionContexto?.loadComponent).toBeDefined();
    expect(seleccionContexto?.canActivate?.length).toBeGreaterThan(0);
    expect(buscarRuta(routes, 'seleccionar-rol')).toBeUndefined();
  });

  it('registra socio-familiar como ruta canónica sin alias familiar', () => {
    expect(buscarRuta(routes, 'socio-familiar')).toBeDefined();
    expect(buscarRuta(routes, 'familiar')).toBeUndefined();
    expect(obtenerRutaPrincipalPorRol('FAMILIAR')).toBe('/socio-familiar/credencial');
  });

  it('protege cada layout con el rol canónico correspondiente', () => {
    const rolesPorPerfil = {
      sysadmin: 'SYSADMIN',
      admin: 'ADMIN',
      'adm-recepcion': 'ADM_RECEPCION',
      profesor: 'PROFESOR',
      'socio-titular': 'SOCIO_TITULAR',
      'socio-familiar': 'FAMILIAR',
    } as const;

    for (const [perfil, rol] of Object.entries(rolesPorPerfil)) {
      const ruta = buscarRuta(routes, perfil);
      expect(ruta?.canActivate?.length).toBeGreaterThan(0);
      expect(ruta?.canActivateChild?.length).toBeGreaterThan(0);
      expect(ruta?.data?.['roles']).toEqual([rol]);
    }
  });

  it('redirige cada raíz privada a la page principal de su rol', () => {
    const destinoPorPerfil = {
      sysadmin: 'nueva-empresa',
      admin: 'dashboard',
      'adm-recepcion': 'accesos',
      profesor: 'eventos',
      'socio-titular': 'credencial',
      'socio-familiar': 'credencial',
    } as const;

    for (const [perfil, destino] of Object.entries(destinoPorPerfil)) {
      expect(buscarHija(perfil, '')).toMatchObject({ pathMatch: 'full', redirectTo: destino });
    }
  });

  it('expone la configuración compartida solo en los perfiles administrativos', () => {
    const perfiles = [
      'sysadmin',
      'admin',
      'adm-recepcion',
      'profesor',
      'socio-titular',
      'socio-familiar',
    ] as const;

    const rutasConfiguracion = perfiles.map((perfil) =>
      perfil === 'admin'
        ? buscarSolapa('admin', 'configuracion', 'club')
        : buscarHija(perfil, 'configuracion'),
    );

    expect(rutasConfiguracion.slice(0, 2).every(Boolean)).toBe(true);
    expect(rutasConfiguracion.slice(2).every((ruta) => !ruta)).toBe(true);
    expect(new Set(rutasConfiguracion.slice(0, 2).map((ruta) => ruta?.loadComponent)).size).toBe(1);
  });

  it('expone eventos como page principal del profesor sin inicio ni configuración', () => {
    expect(buscarHija('profesor', 'eventos')?.loadComponent).toBeDefined();
    expect(buscarHija('profesor', 'eventos')?.data?.['roles']).toEqual(['PROFESOR']);
    expect(buscarHija('profesor', 'inicio')).toBeUndefined();
    expect(buscarHija('profesor', 'configuracion')).toBeUndefined();
  });

  it('expone mis actividades como page del profesor', () => {
    expect(buscarHija('profesor', 'mis-actividades')?.loadComponent).toBeDefined();
    expect(buscarHija('profesor', 'mis-actividades')?.data?.['roles']).toEqual(['PROFESOR']);
  });

  it('reutiliza calendario, credencial y actividades entre titular y familiar', () => {
    expect(buscarHija('socio-titular', 'calendario')?.loadComponent).toBe(
      buscarHija('socio-familiar', 'calendario')?.loadComponent,
    );
    expect(buscarHija('socio-titular', 'credencial')?.loadComponent).toBe(
      buscarHija('socio-familiar', 'credencial')?.loadComponent,
    );
    expect(buscarHija('socio-titular', 'actividades')?.loadComponent).toBe(
      buscarHija('socio-familiar', 'actividades')?.loadComponent,
    );
  });

  it('expone cuotas exclusivamente para el socio titular', () => {
    const cuotasTitular = buscarHija('socio-titular', 'cuotas');

    expect(cuotasTitular?.data).toMatchObject({
      title: 'Mis cuotas',
      description: 'Cuotas del socio titular y su grupo familiar.',
      roles: ['SOCIO_TITULAR'],
    });
    expect(cuotasTitular?.loadComponent).toBeDefined();
    expect(buscarHija('socio-familiar', 'cuotas')).toBeUndefined();
  });

  it('expone amenities exclusivamente para el socio titular', () => {
    const amenitiesTitular = buscarHija('socio-titular', 'amenities');

    expect(amenitiesTitular?.data).toMatchObject({
      title: 'Instalaciones',
      description: 'Instalaciones disponibles para reservar en el club.',
      roles: ['SOCIO_TITULAR'],
    });
    expect(amenitiesTitular?.loadComponent).toBeDefined();
    expect(buscarHija('socio-familiar', 'amenities')).toBeUndefined();
  });

  it('expone actividades para titular y familiar con el mismo loader', () => {
    const actividadesTitular = buscarHija('socio-titular', 'actividades');
    const actividadesFamiliar = buscarHija('socio-familiar', 'actividades');

    expect(actividadesTitular?.data).toMatchObject({
      title: 'Actividades',
      description: 'Actividades disponibles para el socio titular y su grupo familiar.',
      roles: ['SOCIO_TITULAR'],
    });
    expect(actividadesFamiliar?.data).toMatchObject({
      title: 'Actividades',
      description: 'Actividades en las que está inscripto el socio familiar.',
      roles: ['FAMILIAR'],
    });
    expect(actividadesTitular?.loadComponent).toBe(actividadesFamiliar?.loadComponent);
  });

  it('reutiliza las pages comunes entre administración y recepción', () => {
    for (const [seccion, solapa] of [
      ['actividades', 'listado'],
      ['actividades', 'eventos'],
      ['socios', 'listado'],
      ['socios', 'solicitudes'],
    ]) {
      const rutaAdmin = buscarSolapa('admin', seccion, solapa);
      const rutaRecepcion = buscarSolapa('adm-recepcion', seccion, solapa);

      expect(rutaAdmin?.loadComponent).toBe(rutaRecepcion?.loadComponent);
      expect(rutaAdmin?.data?.['roles']).toEqual(['ADMIN']);
      expect(rutaRecepcion?.data?.['roles']).toEqual(['ADM_RECEPCION']);
    }

    expect(buscarSolapa('admin', 'actividades', 'listado')?.data).toMatchObject({
      puedeAdministrar: true,
    });
    expect(buscarSolapa('adm-recepcion', 'actividades', 'listado')?.data).toMatchObject({
      puedeAdministrar: true,
    });
    expect(buscarSolapa('admin', 'socios', 'listado')?.data?.['filasVisiblesTabla']).toBe(4);
    expect(buscarSolapa('adm-recepcion', 'socios', 'listado')?.data?.['filasVisiblesTabla']).toBe(
      50,
    );
  });

  it('expone eventos como page independiente de actividades para administración y recepción', () => {
    const eventosAdmin = buscarSolapa('admin', 'actividades', 'eventos');
    const eventosRecepcion = buscarSolapa('adm-recepcion', 'actividades', 'eventos');

    expect(eventosAdmin?.data?.['roles']).toEqual(['ADMIN']);
    expect(eventosRecepcion?.data?.['roles']).toEqual(['ADM_RECEPCION']);
    expect(eventosAdmin?.loadComponent).toBeDefined();
    expect(eventosAdmin?.loadComponent).not.toBe(
      buscarSolapa('admin', 'actividades', 'listado')?.loadComponent,
    );
  });

  it('mantiene dashboard en admin y accesos como entrada de recepción', () => {
    const dashboardAdmin = buscarHija('admin', 'dashboard');
    const dashboardRecepcion = buscarHija('adm-recepcion', 'dashboard');

    expect(buscarHija('admin', '')?.redirectTo).toBe('dashboard');
    expect(buscarHija('adm-recepcion', '')?.redirectTo).toBe('accesos');
    expect(dashboardAdmin?.loadComponent).toBeDefined();
    expect(dashboardAdmin?.data?.['roles']).toEqual(['ADMIN']);
    expect(dashboardRecepcion).toMatchObject({ pathMatch: 'full', redirectTo: 'accesos' });
    expect(buscarHija('admin', 'inicio')).toBeUndefined();
    expect(buscarHija('adm-recepcion', 'inicio')).toBeUndefined();
  });

  it('protege el portal ADMIN y expone el wizard de perfil como ruta exclusiva', () => {
    const admin = buscarRuta(routes, 'admin');
    const wizard = buscarHija('admin', 'completar-perfil');

    expect(admin?.canActivateChild?.length).toBe(2);
    expect(wizard?.data).toMatchObject({
      title: 'Completar perfil del club',
      roles: ['ADMIN'],
    });
    expect(wizard?.loadComponent).toBeDefined();
    expect(buscarHija('adm-recepcion', 'completar-perfil')).toBeUndefined();
    expect(buscarHija('sysadmin', 'completar-perfil')).toBeUndefined();
  });

  it('reutiliza tesorería e ingresos entre administración y recepción', () => {
    for (const solapa of ['cuotas', 'ingresos']) {
      const rutaAdmin = buscarSolapa('admin', 'tesoreria', solapa);
      const rutaRecepcion = buscarSolapa('adm-recepcion', 'tesoreria', solapa);

      expect(rutaAdmin?.loadComponent).toBe(rutaRecepcion?.loadComponent);
      expect(rutaAdmin?.data?.['roles']).toEqual(['ADMIN']);
      expect(rutaRecepcion?.data?.['roles']).toEqual(['ADM_RECEPCION']);
    }
  });

  it('reutiliza descuentos entre administración y recepción', () => {
    const rutaAdmin = buscarSolapa('admin', 'tesoreria', 'descuentos');
    const rutaRecepcion = buscarSolapa('adm-recepcion', 'tesoreria', 'descuentos');

    expect(rutaAdmin?.loadComponent).toBe(rutaRecepcion?.loadComponent);
    expect(rutaAdmin?.loadComponent).toBeDefined();
    expect(rutaAdmin?.data).toMatchObject({
      title: 'Descuentos',
      roles: ['ADMIN'],
    });
    expect(rutaRecepcion?.data).toMatchObject({
      title: 'Descuentos',
      roles: ['ADM_RECEPCION'],
    });
    expect(buscarHija('admin', 'descuento')).toBeUndefined();
    expect(buscarHija('adm-recepcion', 'descuento')).toBeUndefined();
  });

  it('reutiliza entradas a eventos entre administración y recepción', () => {
    const rutaAdmin = buscarSolapa('admin', 'accesos', 'entradas-eventos');
    const rutaRecepcion = buscarSolapa('adm-recepcion', 'accesos', 'entradas-eventos');

    expect(rutaAdmin?.loadComponent).toBe(rutaRecepcion?.loadComponent);
    expect(rutaAdmin?.loadComponent).toBeDefined();
    expect(rutaAdmin?.data).toMatchObject({
      title: 'Entradas a eventos',
      roles: ['ADMIN'],
    });
    expect(rutaRecepcion?.data).toMatchObject({
      title: 'Entradas a eventos',
      roles: ['ADM_RECEPCION'],
    });
  });

  it('expone la gestión de categorías exclusivamente para ADMIN', () => {
    const categoriasAdmin = buscarSolapa('admin', 'actividades', 'categorias');

    expect(categoriasAdmin?.data?.['roles']).toEqual(['ADMIN']);
    expect(categoriasAdmin?.loadComponent).toBeDefined();
    expect(buscarSolapa('adm-recepcion', 'actividades', 'categorias')).toBeUndefined();
  });

  it('expone cuota social a ADMIN y SYSADMIN, y la oculta a recepción', () => {
    const cuotaSocialAdmin = buscarSolapa('admin', 'tesoreria', 'cuota-social');
    const cuotaSocialSysadmin = buscarHija('sysadmin', 'cuota-social');

    expect(cuotaSocialAdmin?.data).toMatchObject({
      title: 'Cuota social',
      roles: ['ADMIN'],
    });
    expect(cuotaSocialAdmin?.loadComponent).toBeDefined();
    expect(cuotaSocialSysadmin?.data).toMatchObject({
      title: 'Cuota social',
      roles: ['SYSADMIN'],
    });
    expect(cuotaSocialSysadmin?.loadComponent).toBe(cuotaSocialAdmin?.loadComponent);
    expect(buscarSolapa('adm-recepcion', 'tesoreria', 'cuota-social')).toBeUndefined();
  });

  it('redirige las direcciones anteriores a su solapa dentro de la sección', () => {
    const redirecciones = {
      'solicitudes-registro': 'socios/solicitudes',
      eventos: 'actividades/eventos',
      ingresos: 'tesoreria/ingresos',
      descuentos: 'tesoreria/descuentos',
      'eventos-acceso': 'accesos/entradas-eventos',
    };

    for (const perfil of ['admin', 'adm-recepcion']) {
      for (const [anterior, destino] of Object.entries(redirecciones)) {
        expect(buscarHija(perfil, anterior)).toMatchObject({
          pathMatch: 'full',
          redirectTo: destino,
        });
      }
    }
    expect(buscarHija('admin', 'profesores')?.redirectTo).toBe('equipo/profesores');
    expect(buscarHija('admin', 'usuarios-recepcion')?.redirectTo).toBe('equipo/recepcion');
  });

  it('envía la raíz de cada sección a su primera solapa visible', () => {
    const raizSocios = buscarSolapa('admin', 'socios', '');

    expect(raizSocios?.canActivate?.length).toBe(1);
    expect(raizSocios?.data).toMatchObject({ seccionId: 'socios', rolMenu: 'ADMIN' });
    expect(buscarSolapa('admin', 'socios', 'solicitudes')?.data).toMatchObject({
      seccionId: 'socios',
      solapaId: 'solicitudes',
      rolMenu: 'ADMIN',
    });
    // Instalaciones tiene una sola pantalla: se monta en la raíz de la sección, sin redirección.
    expect(buscarSolapa('adm-recepcion', 'amenities', '')?.loadComponent).toBeDefined();
  });

  it('envia sysadmin a nueva empresa sin dashboard ni inicio', () => {
    expect(buscarHija('sysadmin', '')?.redirectTo).toBe('nueva-empresa');
    expect(buscarHija('sysadmin', 'nueva-empresa')).toBeDefined();
    expect(buscarHija('sysadmin', 'dashboard')).toBeUndefined();
    expect(buscarHija('sysadmin', 'inicio')).toBeUndefined();
    expect(typeof buscarRuta(routes, 'inicio')?.redirectTo).toBe('function');
  });

  it('expone Mercado Pago exclusivamente para SYSADMIN', () => {
    const mercadoPago = buscarHija('sysadmin', 'mercado-pago');

    expect(mercadoPago?.data).toMatchObject({
      title: 'Mercado Pago por empresa',
      roles: ['SYSADMIN'],
    });
    expect(mercadoPago?.loadComponent).toBeDefined();
    expect(buscarHija('admin', 'mercado-pago')).toBeUndefined();
  });

  it('expone la gestión global de clubes exclusivamente para SYSADMIN', () => {
    const clubes = buscarHija('sysadmin', 'clubes');

    expect(clubes?.data).toMatchObject({
      title: 'Clubes',
      roles: ['SYSADMIN'],
    });
    expect(clubes?.loadComponent).toBeDefined();
    expect(buscarHija('admin', 'clubes')).toBeUndefined();
  });

  it('separa CRM Manager de SYSADMIN y facturas de ADMIN', () => {
    const crmSysadmin = buscarHija('sysadmin', 'crm-manager');
    const crmAdmin = buscarHija('admin', 'crm-manager');

    expect(crmSysadmin?.data?.['roles']).toEqual(['SYSADMIN']);
    expect(crmAdmin?.data?.['roles']).toEqual(['ADMIN']);
    expect(crmSysadmin?.loadComponent).toBeDefined();
    expect(crmAdmin?.loadComponent).toBeDefined();
    expect(buscarHija('adm-recepcion', 'crm-manager')).toBeUndefined();
    expect(
      buscarSolapa('admin', 'configuracion', 'club')?.data?.['puedeAccederCrmManager'],
    ).toBe(true);
    expect(
      buscarHija('sysadmin', 'configuracion')?.data?.['puedeAccederCrmManager'],
    ).toBeUndefined();
  });

  it('monta los tres retornos de factura y la pantalla bloqueada fuera del layout', () => {
    const pagoFactura = buscarRuta(routes, 'pago-factura');
    const retornos = ['exito', 'fallo', 'pendiente'].map((estado) =>
      buscarHija('pago-factura', estado),
    );
    const clubBloqueado = buscarRuta(routes, 'club-bloqueado');

    expect(pagoFactura?.canActivate?.length).toBeGreaterThan(0);
    expect(retornos.map((ruta) => ruta?.data?.['estadoResultadoFactura'])).toEqual([
      'exito',
      'fallo',
      'pendiente',
    ]);
    expect(new Set(retornos.map((ruta) => ruta?.loadComponent)).size).toBe(1);
    expect(clubBloqueado?.canActivate?.length).toBe(2);
    expect(clubBloqueado?.loadComponent).toBeDefined();
  });

  it('mantiene páginas propias para calendario y credencial del profesor', () => {
    expect(buscarHija('profesor', 'calendario')?.loadComponent).not.toBe(
      buscarHija('socio-titular', 'calendario')?.loadComponent,
    );
    expect(buscarHija('profesor', 'credencial')?.loadComponent).not.toBe(
      buscarHija('socio-titular', 'credencial')?.loadComponent,
    );
  });

  it('expone la página de asistencias para PROFESOR', () => {
    const ruta = buscarHija('profesor', 'asistencias');
    expect(ruta?.data).toMatchObject({ title: 'Asistencias', roles: ['PROFESOR'] });
    expect(ruta?.loadComponent).toBeDefined();
  });
});
